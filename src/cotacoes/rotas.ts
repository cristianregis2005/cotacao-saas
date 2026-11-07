// Rotas de cotação. Exigem login e usam os tokens do próprio cliente.
import { Hono } from "hono";
import type { Env } from "../env";
import { usuarioDaSessao } from "../auth/rotas";
import type { EntradaFrete } from "../carriers/tipos";
import { lerCredenciais } from "../contas/tokens";
import { registrarCotacao, verificarLimite } from "../planos";
import { cotarTodas, type ExtrasCotacao } from "./todas";
import { baseEnvia, type EnderecoEnvia } from "../carriers/envia";

const digitos = (v: unknown): string => (typeof v === "string" ? v.replace(/\D/g, "") : "");
const texto = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const cotacaoRotas = new Hono<{ Bindings: Env }>();

// Chaves das transportadoras que o administrador desligou.
export async function transportadorasDesligadas(db: D1Database): Promise<string[]> {
  const { results } = await db.prepare("SELECT transportadora FROM transportadoras_ativas WHERE ativa = 0").all<{ transportadora: string }>();
  return results.map((r) => r.transportadora);
}

const numeroPositivo = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const cepValido = (v: unknown): v is string => typeof v === "string" && v.replace(/\D/g, "").length === 8;

// Valida o corpo da cotação. Devolve null se algo estiver faltando.
function lerEntrada(corpo: Record<string, unknown>): EntradaFrete | null {
  if (
    !cepValido(corpo.cepOrigem) ||
    !cepValido(corpo.cepDestino) ||
    !numeroPositivo(corpo.peso) ||
    !numeroPositivo(corpo.comprimento) ||
    !numeroPositivo(corpo.largura) ||
    !numeroPositivo(corpo.altura)
  ) {
    return null;
  }
  const valor = typeof corpo.valorDeclarado === "number" && corpo.valorDeclarado >= 0 ? corpo.valorDeclarado : 0;
  return {
    cepOrigem: corpo.cepOrigem,
    cepDestino: corpo.cepDestino,
    peso: corpo.peso,
    comprimento: corpo.comprimento,
    largura: corpo.largura,
    altura: corpo.altura,
    valor,
  };
}

// POST /api/cotacoes/todas
// Corpo: { cepOrigem, cepDestino, peso (kg), comprimento, largura, altura (cm), valorDeclarado? }
cotacaoRotas.post("/todas", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login para cotar." }, 401);

  const corpo = (await c.req.json<Record<string, unknown>>().catch(() => null)) ?? {};
  const entrada = lerEntrada(corpo);
  if (!entrada) {
    return c.json(
      { erro: "Informe os dois CEPs e peso e as três medidas, todos preenchidos e maiores que zero." },
      400,
    );
  }

  const credenciais = await lerCredenciais(c.env.DB, c.env.CHAVE_TOKENS, usuario.id);
  for (const chave of Object.keys(credenciais)) {
    const cred = credenciais[chave as keyof typeof credenciais];
    if (cred && !cred.contato) cred.contato = usuario.email;
  }
  if (Object.keys(credenciais).length === 0) {
    return c.json({ erro: "Cadastre pelo menos um token em Minha conta para cotar." }, 400);
  }

  const situacao = await verificarLimite(c.env.DB, usuario.id, usuario.plano_id);
  if (usuario.plano_id === "sem_franquia") {
    return c.json(
      { erro: "Seu acesso gratuito já foi usado por este e-mail ou CPF/CNPJ. Escolha um plano para continuar cotando." },
      403,
    );
  }
  if (!situacao.permitido) {
    return c.json(
      { erro: `Você já usou ${situacao.usadas} de ${situacao.limite} cotações deste mês. Troque de plano para cotar mais.` },
      403,
    );
  }

  await registrarCotacao(c.env.DB, usuario.id);
  // A Envia exige endereço completo: origem vem do cadastro e destino da nota fiscal.
  const cadastro = await c.env.DB.prepare(
    "SELECT nome, empresa, telefone, origem_cep, origem_logradouro, origem_numero, origem_bairro, origem_cidade, origem_uf, origem_complemento FROM usuarios WHERE id = ?",
  )
    .bind(usuario.id)
    .first<Record<string, string | null>>();
  const desligadas = await transportadorasDesligadas(c.env.DB);
  const extras: ExtrasCotacao = { enviaBase: baseEnvia(c.env.ENVIA_AMBIENTE), desligadas };
  if (cadastro && cadastro.origem_logradouro && cadastro.origem_numero && cadastro.origem_bairro && cadastro.origem_cidade && cadastro.origem_uf && cadastro.origem_cep && cadastro.telefone) {
    extras.enviaOrigem = {
      name: cadastro.empresa || cadastro.nome || "Remetente",
      phone: digitos(cadastro.telefone),
      street: cadastro.origem_logradouro,
      number: cadastro.origem_numero,
      district: cadastro.origem_bairro,
      city: cadastro.origem_cidade,
      state: cadastro.origem_uf,
      postalCode: digitos(cadastro.origem_cep),
    };
  }
  const dest = (corpo.destinatario ?? null) as Record<string, unknown> | null;
  if (dest && typeof dest === "object") {
    extras.enviaDestino = {
      name: texto(dest.name, 120) || "Destinatário",
      phone: digitos(dest.phone),
      street: texto(dest.street, 120),
      number: texto(dest.number, 20) || "S/N",
      district: texto(dest.district, 80) || "NA",
      city: texto(dest.city, 80),
      state: texto(dest.state, 2).toUpperCase(),
      postalCode: digitos(dest.postalCode) || entrada.cepDestino.replace(/\D/g, ""),
    } as EnderecoEnvia;
    if (!extras.enviaDestino.street || !extras.enviaDestino.city || !extras.enviaDestino.state) extras.enviaDestino = null;
  }

  const resultado = await cotarTodas(entrada, credenciais as Parameters<typeof cotarTodas>[1], extras);

  // Histórico da cotação. Se o registro falhar, a cotação continua funcionando.
  const precos = resultado.cotacoes.map((x) => x.preco);
  try {
    await c.env.DB.prepare(
      "INSERT INTO historico_cotacoes (id, usuario_id, cep_origem, cep_destino, peso, comprimento, largura, altura, valor_declarado, opcoes, menor_preco, avisos, com_nota) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        crypto.randomUUID(),
        usuario.id,
        digitos(entrada.cepOrigem),
        digitos(entrada.cepDestino),
        entrada.peso,
        entrada.comprimento,
        entrada.largura,
        entrada.altura,
        entrada.valor ?? null,
        precos.length,
        precos.length ? Math.min(...precos) : null,
        resultado.avisos.length,
        dest ? 1 : 0,
      )
      .run();
  } catch (exc) {
    console.log("[historico] falha ao registrar cotação: " + String(exc));
  }

  return c.json({ ...resultado, uso: { usadas: situacao.usadas + 1, limite: situacao.limite } });
});
