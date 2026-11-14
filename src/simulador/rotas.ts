// Simulador público do site: cotação sem login, usando os tokens da conta de demonstração (administrador).
// Protegido por Turnstile, limite de uso por IP e cache de 24 horas. Não gera histórico nem consome o plano.
import { Hono, type Context } from "hono";
import type { Env } from "../env";
import { lerCredenciais } from "../contas/tokens";
import { transportadorasDesligadas } from "../cotacoes/rotas";
import { cotarTodas, type Credenciais, type ExtrasCotacao } from "../cotacoes/todas";
import { baseEnvia } from "../carriers/envia";
import type { EntradaFrete } from "../carriers/tipos";
import type { EnderecoEnvia } from "../carriers/envia";

const ORIGENS_PERMITIDAS = ["https://www.cliquefrete.com.br", "https://cliquefrete-site.comparativo.workers.dev"];
const LIMITE_POR_HORA = 5;
const OPCOES_NA_RESPOSTA = 5;
const CACHE_HORAS = 24;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const simuladorRotas = new Hono<{ Bindings: Env }>();

type Ctx = Context<{ Bindings: Env }>;

const numeroPositivo = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const cep8 = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const d = v.replace(/\D/g, "");
  return d.length === 8 ? d : null;
};

function cabecalhosCors(c: Ctx): void {
  const origem = c.req.header("Origin") ?? "";
  const extras = (c.env.ORIGENS_EXTRAS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  if (!ORIGENS_PERMITIDAS.includes(origem) && !extras.includes(origem)) return;
  c.header("Access-Control-Allow-Origin", origem);
  c.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type");
  c.header("Vary", "Origin");
}

async function sha256Hex(texto: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Confirma o desafio do Turnstile no servidor. Sem segredo configurado, recusa (fecha a porta).
async function humanoValido(segredo: string, token: string, ip: string): Promise<boolean> {
  const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret: segredo, response: token, remoteip: ip }),
  });
  const dados = (await resp.json().catch(() => ({}))) as { success?: boolean };
  return dados.success === true;
}

// Conta a simulação na hora atual. Devolve true se o IP já passou do limite.
async function excedeuLimite(db: D1Database, chave: string): Promise<boolean> {
  const janela = new Date().toISOString().slice(0, 13); // AAAA-MM-DDTHH
  await db
    .prepare("INSERT INTO simulacoes_publicas_limite (chave, janela, contador) VALUES (?, ?, 1) ON CONFLICT(chave, janela) DO UPDATE SET contador = contador + 1")
    .bind(chave, janela)
    .run();
  const linha = await db
    .prepare("SELECT contador FROM simulacoes_publicas_limite WHERE chave = ? AND janela = ?")
    .bind(chave, janela)
    .first<{ contador: number }>();
  return (linha?.contador ?? 0) > LIMITE_POR_HORA;
}

export interface OpcaoPublica {
  transportadora: string;
  servico: string;
  preco: number;
  prazoDias: number | null;
  prazoTexto: string | null;
}

// Destino a partir do CEP (ViaCEP), com número "S/N". Sem logradouro no CEP, a Envia fica de fora.
async function enderecoDestinoPorCep(cep: string, telefone: string): Promise<EnderecoEnvia | null> {
  const resp = await fetch("https://viacep.com.br/ws/" + cep + "/json/");
  const dados = (await resp.json().catch(() => ({}))) as { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean };
  if (!resp.ok || dados.erro || !dados.logradouro || !dados.localidade || !dados.uf) return null;
  return {
    name: "Destinatário",
    phone: telefone,
    street: dados.logradouro,
    number: "S/N",
    district: dados.bairro || "NA",
    city: dados.localidade,
    state: dados.uf,
    postalCode: cep,
  };
}

// Retorna as opções mais baratas. Usa o cache de 24 horas e, se não houver, cota com a conta de demonstração.
async function obterOpcoes(env: Env, entrada: EntradaFrete & { cepDestino: string }): Promise<OpcaoPublica[] | null> {
  const demoId = env.DEMO_USUARIO_ID;
  if (!demoId) return null;
  const conta = await env.DB
    .prepare("SELECT nome, empresa, telefone, origem_cep, origem_logradouro, origem_numero, origem_bairro, origem_cidade, origem_uf FROM usuarios WHERE id = ?")
    .bind(demoId)
    .first<Record<string, string | null>>();
  const cepOrigem = cep8(conta?.origem_cep);
  if (!conta || !cepOrigem) return null;
  const telefone = (conta.telefone ?? "").replace(/\D/g, "");

  const chave = [cepOrigem, entrada.cepDestino, entrada.peso, entrada.comprimento, entrada.largura, entrada.altura].join("|");
  const emCache = await env.DB
    .prepare("SELECT resultado FROM simulacoes_publicas_cache WHERE chave = ? AND criado_em > datetime('now', ?)")
    .bind(chave, "-" + CACHE_HORAS + " hours")
    .first<{ resultado: string }>();
  if (emCache) return JSON.parse(emCache.resultado) as OpcaoPublica[];

  const credenciais = await lerCredenciais(env.DB, env.CHAVE_TOKENS, demoId);
  if (Object.keys(credenciais).length === 0) return null;
  const desligadas = await transportadorasDesligadas(env.DB);
  const extras: ExtrasCotacao = { enviaBase: baseEnvia(env.ENVIA_AMBIENTE), desligadas };
  if (conta.origem_logradouro && conta.origem_numero && conta.origem_bairro && conta.origem_cidade && conta.origem_uf && telefone) {
    extras.enviaOrigem = {
      name: conta.empresa || conta.nome || "Remetente",
      phone: telefone,
      street: conta.origem_logradouro,
      number: conta.origem_numero,
      district: conta.origem_bairro,
      city: conta.origem_cidade,
      state: conta.origem_uf,
      postalCode: cepOrigem,
    };
  }
  if (telefone) extras.enviaDestino = await enderecoDestinoPorCep(entrada.cepDestino, telefone);
  const resultado = await cotarTodas(
    { ...entrada, cepOrigem, valor: 0 },
    credenciais as Credenciais,
    extras,
  );
  const opcoes: OpcaoPublica[] = resultado.cotacoes.slice(0, OPCOES_NA_RESPOSTA).map((c) => ({
    transportadora: c.transportadora ?? c.origem,
    servico: c.servico ?? "",
    preco: c.preco,
    prazoDias: c.prazoDias ?? null,
    prazoTexto: c.prazoTexto ?? null,
  }));
  if (opcoes.length === 0) return null;

  await env.DB
    .prepare("INSERT OR REPLACE INTO simulacoes_publicas_cache (chave, resultado, criado_em) VALUES (?, ?, datetime('now'))")
    .bind(chave, JSON.stringify(opcoes))
    .run();
  return opcoes;
}

simuladorRotas.options("/cotacao", (c) => {
  cabecalhosCors(c);
  return c.body(null, 204);
});

// POST /api/simulador/cotacao
// Corpo: { cepDestino, peso (kg), comprimento, largura, altura (cm), valorPagoHoje?, email?, consentimento?, turnstile }
simuladorRotas.post("/cotacao", async (c) => {
  cabecalhosCors(c);
  const desligado = await c.env.DB.prepare("SELECT valor FROM configuracoes WHERE chave = 'simulador_ativo'").first<{ valor: string }>();
  if (desligado && desligado.valor !== "1") return c.json({ erro: "Simulador indisponível no momento." }, 503);

  const corpo = (await c.req.json<Record<string, unknown>>().catch(() => null)) ?? {};

  const cepDestino = cep8(corpo.cepDestino);
  if (!cepDestino || !numeroPositivo(corpo.peso) || !numeroPositivo(corpo.comprimento) || !numeroPositivo(corpo.largura) || !numeroPositivo(corpo.altura)) {
    return c.json({ erro: "Informe o CEP de destino, o peso e as três medidas do pacote, todos maiores que zero." }, 400);
  }
  const valorPagoHoje = numeroPositivo(corpo.valorPagoHoje) ? corpo.valorPagoHoje : null;
  const email = typeof corpo.email === "string" ? corpo.email.trim().toLowerCase().slice(0, 200) : "";
  const consentimento = corpo.consentimento === true;
  if (email && (!EMAIL.test(email) || !consentimento)) {
    return c.json({ erro: "Para receber o resultado por e-mail, informe um e-mail válido e aceite a política de privacidade." }, 400);
  }

  const segredo = c.env.TURNSTILE_SECRET_KEY;
  if (!segredo || !c.env.DEMO_USUARIO_ID) return c.json({ erro: "Simulação indisponível no momento." }, 503);
  const ip = c.req.header("CF-Connecting-IP") ?? "desconhecido";
  const token = typeof corpo.turnstile === "string" ? corpo.turnstile : "";
  if (!token || !(await humanoValido(segredo, token, ip))) {
    return c.json({ erro: "Não foi possível confirmar que você não é um robô. Tente de novo." }, 403);
  }

  if (await excedeuLimite(c.env.DB, await sha256Hex(ip))) {
    return c.json({ erro: "Você fez várias simulações nesta hora. Tente de novo mais tarde." }, 429);
  }

  const opcoes = await obterOpcoes(c.env, {
    cepOrigem: "",
    cepDestino,
    peso: corpo.peso as number,
    comprimento: corpo.comprimento as number,
    largura: corpo.largura as number,
    altura: corpo.altura as number,
    valor: 0,
  });
  if (!opcoes) return c.json({ erro: "Não conseguimos simular agora. Tente de novo em instantes." }, 503);

  const menorPreco = opcoes[0].preco;
  if (email) {
    try {
      await c.env.DB
        .prepare("INSERT INTO leads (id, email, cep_destino, valor_pago_hoje, menor_preco, consentimento_em) VALUES (?, ?, ?, ?, ?, datetime('now'))")
        .bind(crypto.randomUUID(), email, cepDestino, valorPagoHoje, menorPreco)
        .run();
    } catch (exc) {
      console.log("[simulador] não registrei o lead: " + String(exc));
    }
  }

  const economia = valorPagoHoje && valorPagoHoje > menorPreco ? Math.round((valorPagoHoje - menorPreco) * 100) / 100 : null;
  return c.json({ opcoes, menorPreco, referencia: valorPagoHoje, economia });
});
