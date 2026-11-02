// Envio ao carrinho das transportadoras. Exige login e os tokens do próprio cliente.
import { Hono } from "hono";
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

export const carrinhoRotas = new Hono<{ Bindings: Env }>();

// Nome da origem na tabela de cotações -> transportadora que recebe o pedido.
const ORIGENS: Record<string, TransportadoraCarrinho> = {
  SuperFrete: "superfrete",
  Frenet: "frenet",
  "Melhor Envio": "melhorenvio",
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
    nota: {
      numero: texto(nota.numero, 20),
      serie: texto(nota.serie, 5),
      data: texto(nota.data, 10),
      cfop: texto(nota.cfop, 6),
    },
    itens,
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
  const dados = lerDados(corpo.dados);
  if (typeof dados === "string") return c.json({ erro: dados }, 400);

  const volume = lerVolume(corpo.volume);
  if (!volume) return c.json({ erro: "Informe peso e as três medidas, maiores que zero." }, 400);

  const servico = lerServico(corpo.servico);
  if (!servico) return c.json({ erro: "Escolha uma opção de frete na tabela." }, 400);

  const transportadora = ORIGENS[servico.origem];
  if (!transportadora) {
    return c.json({ erro: `O envio ao carrinho da ${servico.origem} ainda não está disponível.` }, 400);
  }

  const credenciais = await lerCredenciais(c.env.DB, c.env.CHAVE_TOKENS, usuario.id);
  const cred = credenciais[transportadora as Transportadora];
  if (!cred) return c.json({ erro: `Configure seu token da ${NOMES[transportadora as Transportadora]} em Minha conta.` }, 400);

  if (transportadora === "frenet" && !c.env.FRENET_PARTNER_TOKEN) {
    return c.json({ erro: "Token de parceiro da Frenet não configurado no sistema." }, 500);
  }

  // Não cria a mesma nota duas vezes na mesma transportadora.
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
