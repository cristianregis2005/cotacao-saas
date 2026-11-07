// Tela "Minha conta": o cliente cadastra os próprios tokens das transportadoras.
// O token nunca volta inteiro para a tela: só os últimos 4 caracteres.
import { Hono } from "hono";
import type { Env } from "../env";
import { usuarioDaSessao } from "../auth/rotas";
import { ehTransportadora, listarTokens, NOMES, removerToken, salvarToken, TRANSPORTADORAS } from "./tokens";
import { validarDados } from "./dados";
import { garantirFranquiaUnica } from "../auth/identidade";
import { deleteCookie } from "hono/cookie";
import { baseConsultasEnvia } from "../carriers/envia";
import { lerCredenciais } from "./tokens";
import { slug } from "../transportadoras/chaves";

export const contaRotas = new Hono<{ Bindings: Env }>();

contaRotas.get("/tokens", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);

  const salvos = await listarTokens(c.env.DB, usuario.id);
  const porNome = new Map(salvos.map((s) => [s.transportadora, s]));
  return c.json({
    transportadoras: TRANSPORTADORAS.map((t) => {
      const s = porNome.get(t);
      return {
        transportadora: t,
        nome: NOMES[t],
        configurado: !!s,
        final_token: s?.final_token ?? null,
        contato: s?.contato ?? null,
        atualizado_em: s?.atualizado_em ?? null,
      };
    }),
  });
});

contaRotas.put("/tokens/:transportadora", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);

  const transportadora = c.req.param("transportadora");
  if (!ehTransportadora(transportadora)) return c.json({ erro: "Transportadora desconhecida." }, 404);

  const corpo = (await c.req.json<{ token?: unknown; contato?: unknown }>().catch(() => null)) ?? {};
  const token = typeof corpo.token === "string" ? corpo.token.trim() : "";
  const contato = typeof corpo.contato === "string" ? corpo.contato.trim() : "";
  if (token.length < 10) return c.json({ erro: "Cole o token completo da " + NOMES[transportadora] + "." }, 400);
  if (contato && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato)) {
    return c.json({ erro: "O e-mail de contato não parece válido." }, 400);
  }

  await salvarToken(c.env.DB, c.env.CHAVE_TOKENS, usuario.id, transportadora, token, contato || null);
  return c.json({ ok: true });
});

contaRotas.delete("/tokens/:transportadora", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);

  const transportadora = c.req.param("transportadora");
  if (!ehTransportadora(transportadora)) return c.json({ erro: "Transportadora desconhecida." }, 404);
  await removerToken(c.env.DB, usuario.id, transportadora);
  return c.json({ ok: true });
});

// ---- Agências de coleta da Envia (uma por transportadora, escolhida em Meus dados) ----

const CODIGOS_AGENCIA = ["jadlog", "jtexpress", "loggi"];

contaRotas.get("/agencias", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);
  const { results } = await c.env.DB.prepare(
    "SELECT transportadora, branch_code, descricao FROM agencias_envia WHERE usuario_id = ?",
  )
    .bind(usuario.id)
    .all();
  return c.json({ agencias: results });
});

// Busca as agências da transportadora perto do CEP de origem do cliente (tipo 1 = origem).
// Consulta as agências na Envia. Devolve a lista ou o erro com o status HTTP.
async function consultarAgencias(
  base: string,
  transportadora: string,
  token: string,
  parametros: URLSearchParams,
): Promise<{ ok: true; lista: Record<string, unknown>[]; total: number } | { ok: false; status: number; corpo: string }> {
  const url = base + "/branches/" + transportadora + "/BR?" + parametros.toString();
  let resp: Response;
  try {
    resp = await fetch(url, { headers: { Authorization: "Bearer " + token, Accept: "application/json" } });
  } catch (exc) {
    console.log("[agencias] falha de conexão: " + String(exc));
    return { ok: false, status: 0, corpo: "" };
  }
  const bruto = await resp.text();
  console.log("[agencias] " + transportadora + " " + url.replace(/zipcode=\d+/, "zipcode=***") + " -> HTTP " + resp.status + " (" + bruto.length + " bytes)");
  if (!resp.ok) return { ok: false, status: resp.status, corpo: bruto.slice(0, 300) };
  let lista: unknown;
  try {
    lista = JSON.parse(bruto);
  } catch {
    return { ok: false, status: 200, corpo: bruto.slice(0, 300) };
  }
  const todas = Array.isArray(lista) ? (lista as Record<string, unknown>[]) : [];
  return { ok: true, lista: todas, total: todas.length };
}

// Descobre latitude e longitude da cidade pelo OpenStreetMap (Nominatim). Devolve null se falhar.
async function geocodificarCidade(cidade: string, uf: string): Promise<{ latitude: number; longitude: number } | null> {
  const consulta = encodeURIComponent(cidade + ", " + uf + ", Brasil");
  try {
    const resp = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=" + consulta, {
      headers: { "User-Agent": "CliqueFrete/1.0", Accept: "application/json" },
    });
    if (!resp.ok) {
      console.log("[agencias] geocodificação falhou: HTTP " + resp.status);
      return null;
    }
    const lista = (await resp.json()) as { lat: string; lon: string }[];
    if (!lista.length) return null;
    return { latitude: Number(lista[0].lat), longitude: Number(lista[0].lon) };
  } catch (exc) {
    console.log("[agencias] geocodificação falhou: " + String(exc));
    return null;
  }
}

function descricaoAgencia(a: Record<string, unknown>): { branch_code: string; descricao: string; distancia: null } {
  const codigo = String(a.branch_code ?? "");
  const e = (a.address ?? {}) as Record<string, unknown>;
  const endereco = [e.street, e.number].filter((x) => x !== undefined && x !== null && String(x) !== "").join(", ");
  const descricao = [a.reference, endereco].filter((x) => x !== undefined && x !== null && String(x) !== "").join(" · ");
  return { branch_code: codigo, descricao: descricao || codigo, distancia: null };
}

// Busca as agências de origem perto do cliente. Primeiro usa a busca normal da Envia (como antes).
// Se ela não trouxer nenhuma agência da UF do cliente (caso da Correios), busca mais e filtra pela cidade.
contaRotas.get("/agencias/buscar/:transportadora", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);
  const transportadora = c.req.param("transportadora");
  if (!CODIGOS_AGENCIA.includes(transportadora)) return c.json({ erro: "Transportadora desconhecida." }, 404);

  const cad = await c.env.DB.prepare("SELECT origem_cep, origem_cidade, origem_uf FROM usuarios WHERE id = ?")
    .bind(usuario.id)
    .first<{ origem_cep: string | null; origem_cidade: string | null; origem_uf: string | null }>();
  const cep = (cad?.origem_cep ?? "").replace(/\D/g, "");
  if (cep.length !== 8) return c.json({ erro: "Complete o CEP de origem em Meus dados antes de buscar agências." }, 400);
  const cidade = (cad?.origem_cidade ?? "").trim();
  const uf = (cad?.origem_uf ?? "").trim().toUpperCase();

  const credenciais = await lerCredenciais(c.env.DB, c.env.CHAVE_TOKENS, usuario.id);
  if (!credenciais.envia) return c.json({ erro: "Configure seu token da Envia em Minha conta." }, 400);
  const base = baseConsultasEnvia(c.env.ENVIA_AMBIENTE);
  const token = credenciais.envia.token;

  // 1) Busca normal da Envia, com CEP, cidade e UF, limitada a 10.
  const normal = new URLSearchParams({ zipcode: cep, type: "1", limitBranches: "10" });
  if (cidade) normal.set("locality", cidade);
  if (uf) normal.set("state", uf);
  const primeira = await consultarAgencias(base, transportadora, token, normal);
  if (!primeira.ok) {
    if (primeira.status === 0) return c.json({ erro: "Não consegui falar com a Envia agora. Tente de novo." }, 502);
    console.log("[agencias] " + transportadora + " recusou: " + primeira.corpo);
    return c.json({ erro: "A Envia não retornou as agências desta transportadora agora." }, 502);
  }
  const daUf = primeira.lista.filter((a) => String((((a.address ?? {}) as Record<string, unknown>).state) ?? "").toUpperCase() === uf);
  if (daUf.length > 0) {
    console.log("[agencias] " + transportadora + ": busca normal trouxe " + daUf.length + " agências de " + uf);
    return c.json({ agencias: daUf.slice(0, 10).map(descricaoAgencia).filter((a) => a.branch_code) });
  }

  // 2) Busca pela localização: a Envia devolve as agências mais próximas (até 50 km), da mais perto para a mais longe.
  const coordenadas = cidade && uf ? await geocodificarCidade(cidade, uf) : null;
  if (coordenadas) {
    const proximas = await consultarAgencias(base, transportadora, token, new URLSearchParams({
      type: "1",
      latitude: String(coordenadas.latitude),
      longitude: String(coordenadas.longitude),
      limitBranches: "10",
    }));
    if (proximas.ok && proximas.lista.length > 0) {
      console.log("[agencias] " + transportadora + ": busca por localização trouxe " + proximas.lista.length + " agências próximas de " + cidade + "/" + uf);
      return c.json({ agencias: proximas.lista.slice(0, 10).map(descricaoAgencia).filter((a) => a.branch_code) });
    }
  }

  // 3) Última tentativa: busca ampla e filtro pela cidade e UF do cadastro.
  const ampla = await consultarAgencias(base, transportadora, token, new URLSearchParams({ type: "1", allBranch: "true", limitBranches: "5000" }));
  if (!ampla.ok) {
    return c.json({ erro: "A Envia não retornou as agências desta transportadora agora." }, 502);
  }
  const chaveCidade = slug(cidade);
  const daCidade = ampla.lista.filter((a) => {
    const e = (a.address ?? {}) as Record<string, unknown>;
    if (!chaveCidade || String(e.state ?? "").toUpperCase() !== uf) return false;
    return slug(String(e.city ?? "")) === chaveCidade || slug(String(e.locality ?? "")) === chaveCidade;
  });
  console.log("[agencias] " + transportadora + ": busca ampla achou " + daCidade.length + " agências em " + cidade + "/" + uf + " de " + ampla.total + " devolvidas");
  return c.json({ agencias: daCidade.slice(0, 10).map(descricaoAgencia).filter((a) => a.branch_code) });
});

contaRotas.put("/agencias/:transportadora", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);
  const transportadora = c.req.param("transportadora");
  if (!CODIGOS_AGENCIA.includes(transportadora)) return c.json({ erro: "Transportadora desconhecida." }, 404);

  const corpo = (await c.req.json<{ branch_code?: unknown; descricao?: unknown }>().catch(() => null)) ?? {};
  const codigo = typeof corpo.branch_code === "string" ? corpo.branch_code.trim().slice(0, 40) : "";
  const descricao = typeof corpo.descricao === "string" ? corpo.descricao.trim().slice(0, 160) : "";
  if (!codigo) return c.json({ erro: "Escolha uma agência da lista." }, 400);

  await c.env.DB.prepare(
    "INSERT INTO agencias_envia (usuario_id, transportadora, branch_code, descricao, atualizado_em) VALUES (?, ?, ?, ?, datetime('now')) ON CONFLICT(usuario_id, transportadora) DO UPDATE SET branch_code = excluded.branch_code, descricao = excluded.descricao, atualizado_em = excluded.atualizado_em",
  )
    .bind(usuario.id, transportadora, codigo, descricao || codigo)
    .run();
  return c.json({ ok: true });
});

contaRotas.delete("/agencias/:transportadora", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);
  const transportadora = c.req.param("transportadora");
  if (!CODIGOS_AGENCIA.includes(transportadora)) return c.json({ erro: "Transportadora desconhecida." }, 404);
  await c.env.DB.prepare("DELETE FROM agencias_envia WHERE usuario_id = ? AND transportadora = ?")
    .bind(usuario.id, transportadora)
    .run();
  return c.json({ ok: true });
});

// ---- Dados cadastrais do cliente ----

contaRotas.get("/dados", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);

  const linha = await c.env.DB.prepare(
    "SELECT nome, empresa, documento, telefone, origem_cep, origem_logradouro, origem_numero, origem_complemento, origem_bairro, origem_cidade, origem_uf FROM usuarios WHERE id = ?",
  )
    .bind(usuario.id)
    .first();
  return c.json({ dados: linha ?? {} });
});

contaRotas.put("/dados", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);

  const corpo = (await c.req.json<Record<string, unknown>>().catch(() => null)) ?? {};
  const r = validarDados(corpo);
  if ("erro" in r) return c.json({ erro: r.erro }, 400);
  const d = r.valor;

  await c.env.DB.prepare(
    "UPDATE usuarios SET nome = ?, empresa = ?, documento = ?, telefone = ?, origem_cep = ?, origem_logradouro = ?, origem_numero = ?, origem_complemento = ?, origem_bairro = ?, origem_cidade = ?, origem_uf = ? WHERE id = ?",
  )
    .bind(
      d.nome, d.empresa, d.documento, d.telefone, d.origem_cep, d.origem_logradouro,
      d.origem_numero, d.origem_complemento, d.origem_bairro, d.origem_cidade, d.origem_uf, usuario.id,
    )
    .run();
  await garantirFranquiaUnica(c.env.DB, c.env.SEGREDO_LOGIN, usuario.id, "documento", d.documento);
  return c.json({ ok: true });
});

// Exclui a conta: apaga dados pessoais, tokens, sessões, cotações e pedidos.
// Guarda só o HMAC do e-mail e do CPF/CNPJ, para impedir nova franquia gratuita.
// Corpo: { confirmar: "EXCLUIR" }
contaRotas.delete("/", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);
  if (usuario.is_admin) return c.json({ erro: "Administradores não podem excluir a conta por esta tela." }, 400);

  const corpo = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!corpo || corpo.confirmar !== "EXCLUIR") {
    return c.json({ erro: "Para confirmar, digite EXCLUIR." }, 400);
  }

  const id = usuario.id;
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM tokens_transportadoras WHERE usuario_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM sessoes WHERE usuario_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM codigos_login WHERE email = ?").bind(usuario.email),
    c.env.DB.prepare("DELETE FROM cotacoes_realizadas WHERE usuario_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM historico_cotacoes WHERE usuario_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM agencias_envia WHERE usuario_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM pedidos_carrinho WHERE usuario_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM assinaturas WHERE usuario_id = ?").bind(id),
    c.env.DB.prepare("UPDATE identidades SET usuario_id = NULL WHERE usuario_id = ?").bind(id),
    c.env.DB.prepare(
      `UPDATE usuarios SET email = ?, nome = NULL, empresa = NULL, documento = NULL, telefone = NULL,
         origem_cep = NULL, origem_logradouro = NULL, origem_numero = NULL, origem_complemento = NULL,
         origem_bairro = NULL, origem_cidade = NULL, origem_uf = NULL, plano_id = 'sem_franquia',
         excluido_em = datetime('now') WHERE id = ?`,
    ).bind(`excluida-${id}@removido.invalid`, id),
  ]);

  deleteCookie(c, "sessao", { path: "/" });
  return c.json({ ok: true });
});
