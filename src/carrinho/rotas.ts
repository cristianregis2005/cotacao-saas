// Envio ao carrinho das transportadoras. Exige login e os tokens do próprio cliente.
import { Hono, type Context } from "hono";
import type { Env } from "../env";
import { usuarioDaSessao } from "../auth/rotas";
import { lerCredenciais, NOMES, type Transportadora } from "../contas/tokens";
import { lerNfe, type DadosNfe, type ItemNota, type Pessoa } from "./nfe";
import {
  CarrinhoError,
  montarCarrinhoME,
  montarPedidoFrenet,
  montarPedidoSuperFrete,
  type ServicoEscolhido,
  type Volume,
} from "./montar";
import { criarNoCarrinho, type TransportadoraCarrinho } from "./enviar";
import { baseEnvia, type EnderecoEnvia } from "../carriers/envia";
import { cancelarEtiquetaEnvia, gerarEtiquetaEnvia } from "../carriers/enviaEtiqueta";
import { recusaCarrinho } from "../erros";
import { transportadorasDesligadas } from "../cotacoes/rotas";
import { chaveTransportadora } from "../transportadoras/chaves";

export const carrinhoRotas = new Hono<{ Bindings: Env }>();

// Nome da origem na tabela de cotações -> transportadora que recebe o pedido.
const ORIGENS: Record<string, TransportadoraCarrinho | "envia"> = {
  SuperFrete: "superfrete",
  Frenet: "frenet",
  "Melhor Envio": "melhorenvio",
  Envia: "envia",
};

const TAMANHO_MAX_XML = 2_000_000;

type Registro = Record<string, unknown>;

const objeto = (v: unknown): Registro => (v && typeof v === "object" && !Array.isArray(v) ? (v as Registro) : {});

function texto(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function pessoa(v: unknown): Pessoa {
  const o = objeto(v);
  return {
    name: texto(o.name, 120),
    document: texto(o.document, 20),
    stateRegister: texto(o.stateRegister, 20),
    street: texto(o.street, 120),
    number: texto(o.number, 20),
    complement: texto(o.complement, 60),
    district: texto(o.district, 80),
    city: texto(o.city, 80),
    state: texto(o.state, 2).toUpperCase(),
    postalCode: texto(o.postalCode, 12),
    phone: texto(o.phone, 30),
    email: texto(o.email, 120),
  };
}

// Valida os dados da nota que o cliente conferiu na tela. Devolve texto de erro se algo faltar.
function lerDados(v: unknown): DadosNfe | string {
  const o = objeto(v);
  const chave = texto(o.chave, 44);
  if (!/^\d{44}$/.test(chave)) return "Chave da NF-e inválida. Envie o XML da nota de novo.";

  const remetente = pessoa(o.remetente);
  const destinatario = pessoa(o.destinatario);
  const docDest = destinatario.document.replace(/\D/g, "");
  if (docDest.length !== 11 && docDest.length !== 14) return "CPF ou CNPJ do destinatário inválido.";
  if (!destinatario.name || !destinatario.street || !destinatario.city || destinatario.postalCode.replace(/\D/g, "").length !== 8) {
    return "Preencha nome, rua, cidade e CEP do destinatário.";
  }
  if (!remetente.name || !remetente.street || !remetente.postalCode) return "Os dados do remetente estão incompletos na nota.";

  const nota = objeto(o.nota);
  const itens: ItemNota[] = Array.isArray(o.itens)
    ? o.itens.slice(0, 200).map((i) => {
        const r = objeto(i);
        return {
          descricao: texto(r.descricao, 120) || "Item",
          quantidade: typeof r.quantidade === "number" && r.quantidade > 0 ? r.quantidade : 1,
          valorUnitario: typeof r.valorUnitario === "number" && r.valorUnitario >= 0 ? r.valorUnitario : 0,
        };
      })
    : [];

  return {
    chave,
    remetente,
    destinatario,
    valorDeclarado: typeof o.valorDeclarado === "number" && o.valorDeclarado >= 0 ? o.valorDeclarado : null,
    pesoNota: typeof o.pesoNota === "number" && o.pesoNota >= 0 ? o.pesoNota : 0,
    valorFrete: typeof o.valorFrete === "number" && o.valorFrete >= 0 ? o.valorFrete : 0,
    nota: {
      numero: texto(nota.numero, 20),
      serie: texto(nota.serie, 5),
      data: texto(nota.data, 10),
      cfop: texto(nota.cfop, 6),
    },
    itens,
  };
}

// Envio sem nota (DC-e): o remetente vem do cadastro e só pode ser pessoa física (CPF).
async function remetenteDoCadastro(db: D1Database, usuarioId: string): Promise<Pessoa | string> {
  const cad = await db
    .prepare(
      "SELECT nome, empresa, documento, telefone, origem_cep, origem_logradouro, origem_numero, origem_complemento, origem_bairro, origem_cidade, origem_uf FROM usuarios WHERE id = ?",
    )
    .bind(usuarioId)
    .first<Record<string, string | null>>();
  if (!cad) return "Cadastro não encontrado. Entre de novo.";
  const documento = (cad.documento ?? "").replace(/\D/g, "");
  if (documento.length !== 11) {
    return "Sem nota fiscal, o envio só é permitido para pessoa física. Cadastre seu CPF em Meus dados ou envie a nota fiscal.";
  }
  const nome = cad.empresa || cad.nome || "";
  if (!nome) return "Preencha seu nome em Meus dados.";
  if (!cad.origem_cep || !cad.origem_logradouro || !cad.origem_cidade || !cad.origem_uf) {
    return "Complete o endereço de origem em Meus dados.";
  }
  return {
    name: nome,
    document: documento,
    stateRegister: "",
    street: cad.origem_logradouro,
    number: cad.origem_numero ?? "",
    complement: cad.origem_complemento ?? "",
    district: cad.origem_bairro ?? "",
    city: cad.origem_cidade,
    state: cad.origem_uf,
    postalCode: cad.origem_cep,
    phone: cad.telefone ?? "",
  };
}

// Dados da DC-e: destinatário, produtos com valor e quantidade. Sem chave de nota.
function lerDadosSemNota(v: unknown, remetente: Pessoa): DadosNfe | string {
  const o = objeto(v);
  const destinatario = pessoa(o.destinatario);
  const docDest = destinatario.document.replace(/\D/g, "");
  if (docDest.length !== 11 && docDest.length !== 14) return "CPF ou CNPJ do destinatário inválido.";
  if (!destinatario.name || !destinatario.street || !destinatario.city || destinatario.postalCode.replace(/\D/g, "").length !== 8) {
    return "Preencha nome, rua, cidade e CEP do destinatário.";
  }

  const itens: ItemNota[] = Array.isArray(o.itens)
    ? o.itens.slice(0, 200).map((i) => {
        const r = objeto(i);
        return {
          descricao: texto(r.descricao, 120),
          quantidade: typeof r.quantidade === "number" ? r.quantidade : 0,
          valorUnitario: typeof r.valorUnitario === "number" ? r.valorUnitario : 0,
        };
      })
    : [];
  if (!itens.length) return "Adicione pelo menos um produto na DC-e.";
  for (const i of itens) {
    if (!i.descricao) return "Preencha a descrição de todos os produtos.";
    if (!Number.isInteger(i.quantidade) || i.quantidade < 1) return "A quantidade de cada produto deve ser um número inteiro maior que zero.";
    if (!(i.valorUnitario > 0)) return "Informe o valor unitário de cada produto.";
  }

  const valor = Math.round(itens.reduce((soma, i) => soma + i.quantidade * i.valorUnitario, 0) * 100) / 100;
  return {
    chave: `dce-${crypto.randomUUID()}`,
    remetente,
    destinatario,
    valorDeclarado: valor,
    pesoNota: 0,
    valorFrete: 0,
    nota: { numero: "", serie: "", data: "", cfop: "" },
    itens,
    semNota: true,
  };
}

const positivo = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

function lerVolume(v: unknown): Volume | null {
  const o = objeto(v);
  if (!positivo(o.peso) || !positivo(o.comprimento) || !positivo(o.largura) || !positivo(o.altura)) return null;
  return { peso: o.peso, comprimento: o.comprimento, largura: o.largura, altura: o.altura };
}

function lerServico(v: unknown): ServicoEscolhido | null {
  const o = objeto(v);
  if (typeof o.origem !== "string") return null;
  if (typeof o.codigo !== "string" && typeof o.codigo !== "number") return null;
  if (typeof o.preco !== "number") return null;
  return {
    origem: o.origem,
    transportadora: typeof o.transportadora === "string" ? o.transportadora : undefined,
    servico: typeof o.servico === "string" ? o.servico : undefined,
    codigo: o.codigo,
    codigoTransportadora:
      typeof o.codigoTransportadora === "string" || typeof o.codigoTransportadora === "number"
        ? o.codigoTransportadora
        : undefined,
    precoBase: typeof o.precoBase === "number" ? o.precoBase : undefined,
    preco: o.preco,
    prazoDias: typeof o.prazoDias === "number" ? o.prazoDias : undefined,
  };
}

// ---- Envia: compra direta da etiqueta (debita o saldo na hora; cancelamento devolve o saldo) ----

function enderecoEnvia(p: Pessoa): EnderecoEnvia {
  return {
    name: p.name,
    email: p.email ?? "",
    identificationNumber: p.document.replace(/\D/g, ""),
    phone: p.phone.replace(/\D/g, ""),
    street: p.street,
    number: p.number || "S/N",
    district: p.district || "NA",
    city: p.city,
    state: p.state,
    postalCode: p.postalCode.replace(/\D/g, ""),
  };
}

// Agência de coleta que o cliente escolheu para esta transportadora da Envia.
async function usuarioIdAgencia(db: D1Database, usuarioId: string, transportadora: string): Promise<string | null> {
  const linha = await db
    .prepare("SELECT branch_code FROM agencias_envia WHERE usuario_id = ? AND transportadora = ?")
    .bind(usuarioId, transportadora)
    .first<{ branch_code: string }>();
  return linha ? linha.branch_code : null;
}

async function comprarEtiquetaEnvia(
  c: Context<{ Bindings: Env }>,
  usuarioId: string,
  dados: DadosNfe,
  volume: Volume,
  servico: ServicoEscolhido,
  token: string,
) {
  if (servico.codigoTransportadora === undefined || servico.codigo === undefined) {
    return c.json({ erro: "Cotação da Envia incompleta. Refaça a cotação e tente de novo." }, 400);
  }
  // Confere antes de chamar a Envia: sem e-mail do destinatário a compra nunca é aceita.
  if (!dados.destinatario.email) {
    return c.json({ erro: "Informe o e-mail do destinatário para comprar a etiqueta na Envia." }, 400);
  }
  // Teste: para os Correios a etiqueta sai sem código de agência, e o pacote pode ser postado em qualquer agência.
  // Para as outras transportadoras a agência escolhida em Meus dados continua obrigatória.
  const agenciaSalva = await usuarioIdAgencia(c.env.DB, usuarioId, String(servico.codigoTransportadora));
  const ehCorreios = String(servico.codigoTransportadora).toLowerCase().includes("correio");
  if (!agenciaSalva && !ehCorreios) {
    return c.json({ erro: "Escolha a agência de coleta da Envia em Meus dados antes de comprar a etiqueta." }, 400);
  }
  const agencia = agenciaSalva ?? undefined;
  const resultado = await gerarEtiquetaEnvia(
    {
      nota: dados.semNota
        ? null
        : { chave: dados.chave, numero: dados.nota.numero, serie: dados.nota.serie, data: dados.nota.data, valor: dados.valorDeclarado ?? 0 },
      origem: enderecoEnvia(dados.remetente),
      destino: enderecoEnvia(dados.destinatario),
      pacote: {
        peso: volume.peso,
        comprimento: volume.comprimento,
        largura: volume.largura,
        altura: volume.altura,
        valorDeclarado: dados.valorDeclarado ?? 0,
        itens: dados.itens.map((i) => ({ descricao: i.descricao, quantidade: i.quantidade, valorUnitario: i.valorUnitario })),
      },
      carrier: String(servico.codigoTransportadora),
      service: String(servico.codigo),
      agenciaOrigem: agencia,
    },
    { token, base: baseEnvia(c.env.ENVIA_AMBIENTE) },
  );

  if (!resultado.ok) {
    // Status 0: a conexão caiu. A etiqueta pode ter sido comprada, então o cliente confere antes de tentar de novo.
    if (resultado.status === 0) {
      return c.json(
        { erro: "Não consegui falar com a Envia agora. Confira no painel da Envia se a etiqueta foi comprada antes de tentar de novo." },
        502,
      );
    }
    if (resultado.mensagem) {
      return c.json({ erro: "A Envia recusou o pedido: " + resultado.mensagem }, 502);
    }
    return c.json({ erro: recusaCarrinho("Envia", resultado.status, resultado.corpo) }, 502);
  }

  const e = resultado.etiqueta;
  try {
    await c.env.DB.prepare(
      "INSERT INTO pedidos_carrinho (id, usuario_id, transportadora, chave_nfe, codigo_externo, status, preco, transportadora_envia, etiqueta_url) VALUES (?, ?, 'envia', ?, ?, 'comprada', ?, ?, ?)",
    )
      .bind(crypto.randomUUID(), usuarioId, dados.chave, e.rastreio, e.valor, e.carrier, e.etiquetaUrl)
      .run();
  } catch (exc) {
    console.log("[carrinho] etiqueta Envia comprada e não registrada. Rastreio " + e.rastreio + ": " + String(exc));
    return c.json(
      { erro: "A etiqueta foi comprada (rastreio " + e.rastreio + "), mas não consegui registrar. Avise o suporte antes de tentar de novo." },
      500,
    );
  }

  return c.json({
    ok: true,
    transportadora: "Envia",
    codigo: e.rastreio,
    status: "comprada",
    preco: e.valor,
    etiqueta: e.etiquetaUrl,
  });
}

// DELETE /api/carrinho/pedidos
// Corpo: { origem, chave }. Remove o registro local do envio para liberar a nota.
// Use só depois de cancelar ou apagar o pedido no painel da transportadora.
carrinhoRotas.delete("/pedidos", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login para continuar." }, 401);

  const corpo = objeto(await c.req.json().catch(() => null));
  const transportadora = typeof corpo.origem === "string" ? ORIGENS[corpo.origem] : undefined;
  const chave = texto(corpo.chave, 44);
  if (!transportadora || !/^\d{44}$/.test(chave)) return c.json({ erro: "Envio inválido." }, 400);

  const removido = await c.env.DB.prepare(
    "DELETE FROM pedidos_carrinho WHERE usuario_id = ? AND transportadora = ? AND chave_nfe = ?",
  )
    .bind(usuario.id, transportadora, chave)
    .run();
  return c.json({ ok: true, liberados: removido.meta.changes });
});

// POST /api/carrinho/ler-nfe
// Corpo: { xml }. Devolve os dados da nota para o cliente conferir antes de enviar.
carrinhoRotas.post("/ler-nfe", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login para continuar." }, 401);

  const corpo = objeto(await c.req.json().catch(() => null));
  const xml = typeof corpo.xml === "string" ? corpo.xml : "";
  if (!xml || xml.length > TAMANHO_MAX_XML) return c.json({ erro: "Envie o arquivo XML da nota fiscal." }, 400);

  try {
    return c.json({ dados: lerNfe(xml) });
  } catch (exc) {
    const motivo = exc instanceof Error ? exc.message : "";
    return c.json({ erro: motivo || "Não consegui ler esta nota. Confira se é um XML de NF-e." }, 400);
  }
});

// POST /api/carrinho/enviar
// Corpo: { dados (nota conferida), volume: {peso, comprimento, largura, altura}, servico (linha escolhida na cotação) }
carrinhoRotas.post("/enviar", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login para continuar." }, 401);

  const corpo = objeto(await c.req.json().catch(() => null));
  let dados: DadosNfe | string;
  if (objeto(corpo.dados).semNota === true) {
    const remetente = await remetenteDoCadastro(c.env.DB, usuario.id);
    if (typeof remetente === "string") return c.json({ erro: remetente }, 400);
    dados = lerDadosSemNota(corpo.dados, remetente);
  } else {
    dados = lerDados(corpo.dados);
  }
  if (typeof dados === "string") return c.json({ erro: dados }, 400);

  const volume = lerVolume(corpo.volume);
  if (!volume) return c.json({ erro: "Informe peso e as três medidas, maiores que zero." }, 400);

  const servico = lerServico(corpo.servico);
  if (!servico) return c.json({ erro: "Escolha uma opção de frete na tabela." }, 400);

  const transportadora = ORIGENS[servico.origem];
  if (!transportadora) {
    return c.json({ erro: `O envio ao carrinho da ${servico.origem} ainda não está disponível.` }, 400);
  }
  const desligadas = await transportadorasDesligadas(c.env.DB);
  if (desligadas.includes(transportadora)) {
    return c.json({ erro: `A ${servico.origem} está desativada no momento. Escolha outra transportadora.` }, 400);
  }
  const chaveServico = chaveTransportadora(servico.origem, servico.codigoTransportadora, servico.transportadora);
  if (chaveServico && desligadas.includes(chaveServico)) {
    return c.json({ erro: "Esta transportadora da Envia está desativada no momento. Escolha outra opção de frete." }, 400);
  }

  const credenciais = await lerCredenciais(c.env.DB, c.env.CHAVE_TOKENS, usuario.id);
  const cred = credenciais[transportadora as Transportadora];
  if (!cred) return c.json({ erro: `Configure seu token da ${NOMES[transportadora as Transportadora]} em Minha conta.` }, 400);

  if (transportadora === "frenet" && !c.env.FRENET_PARTNER_TOKEN) {
    return c.json({ erro: "Token de parceiro da Frenet não configurado no sistema." }, 500);
  }

  // Não cria a mesma nota duas vezes na mesma transportadora (a DC-e tem chave nova a cada envio).
  if (!dados.semNota) {
    const existente = await c.env.DB.prepare(
      "SELECT 1 AS achou FROM pedidos_carrinho WHERE usuario_id = ? AND transportadora = ? AND chave_nfe = ?",
    )
      .bind(usuario.id, transportadora, dados.chave)
      .first();
    if (existente) {
      return c.json(
        { erro: `Esta nota já foi enviada ao carrinho da ${NOMES[transportadora as Transportadora]}. Confira no painel antes de tentar de novo.` },
        409,
      );
    }
  }

  if (transportadora === "envia") {
    return comprarEtiquetaEnvia(c, usuario.id, dados, volume, servico, cred.token);
  }

  let payload: unknown;
  try {
    payload =
      transportadora === "superfrete"
        ? montarPedidoSuperFrete(dados, volume, servico)
        : transportadora === "melhorenvio"
          ? montarCarrinhoME(dados, volume, servico)
          : montarPedidoFrenet(dados, volume, servico);
  } catch (exc) {
    if (exc instanceof CarrinhoError) return c.json({ erro: exc.message }, 400);
    throw exc;
  }

  let resultado;
  try {
    resultado = await criarNoCarrinho(transportadora, payload, {
      token: cred.token,
      contato: cred.contato ?? usuario.email,
      partnerToken: c.env.FRENET_PARTNER_TOKEN,
    });
  } catch (exc) {
    if (exc instanceof CarrinhoError) return c.json({ erro: exc.message }, 502);
    throw exc;
  }

  await c.env.DB.prepare(
    "INSERT INTO pedidos_carrinho (id, usuario_id, transportadora, chave_nfe, codigo_externo, status, preco) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      crypto.randomUUID(),
      usuario.id,
      transportadora,
      dados.chave,
      resultado.codigo,
      resultado.status,
      resultado.preco ?? servico.preco,
    )
    .run();

  return c.json({
    ok: true,
    transportadora: NOMES[transportadora as Transportadora],
    codigo: resultado.codigo,
    status: resultado.status,
    preco: resultado.preco ?? servico.preco,
  });
});

// POST /api/carrinho/cancelar-envia
// Corpo: { trackingNumber }. Cancela a etiqueta na Envia (devolve o saldo, se a Envia permitir) e libera o registro.
carrinhoRotas.post("/cancelar-envia", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login para continuar." }, 401);

  const corpo = objeto(await c.req.json().catch(() => null));
  const rastreio = texto(corpo.trackingNumber, 60);
  if (!rastreio) return c.json({ erro: "Informe o rastreio da etiqueta." }, 400);

  const pedido = await c.env.DB.prepare(
    "SELECT id, transportadora_envia FROM pedidos_carrinho WHERE usuario_id = ? AND transportadora = 'envia' AND codigo_externo = ?",
  )
    .bind(usuario.id, rastreio)
    .first<{ id: string; transportadora_envia: string | null }>();
  if (!pedido) return c.json({ erro: "Etiqueta não encontrada na sua conta." }, 404);

  const credenciais = await lerCredenciais(c.env.DB, c.env.CHAVE_TOKENS, usuario.id);
  const cred = credenciais.envia;
  if (!cred) return c.json({ erro: "Configure seu token da Envia em Minha conta." }, 400);

  const resultado = await cancelarEtiquetaEnvia(pedido.transportadora_envia ?? "", rastreio, {
    token: cred.token,
    base: baseEnvia(c.env.ENVIA_AMBIENTE),
  });
  if (!resultado.ok) {
    if (resultado.status === 0) {
      return c.json({ erro: "Não consegui falar com a Envia agora. Tente de novo." }, 502);
    }
    return c.json({ erro: recusaCarrinho("Envia", resultado.status, resultado.corpo) }, 502);
  }

  await c.env.DB.prepare("DELETE FROM pedidos_carrinho WHERE id = ?").bind(pedido.id).run();
  return c.json({ ok: true, saldoDevolvido: resultado.saldoDevolvido });
});
