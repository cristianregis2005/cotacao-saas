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

const CODIGOS_AGENCIA = ["correios", "jadlog", "jtexpress", "loggi"];

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
contaRotas.get("/agencias/buscar/:transportadora", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);
  const transportadora = c.req.param("transportadora");
  if (!CODIGOS_AGENCIA.includes(transportadora)) return c.json({ erro: "Transportadora desconhecida." }, 404);

  const cad = await c.env.DB.prepare("SELECT origem_cep FROM usuarios WHERE id = ?")
    .bind(usuario.id)
    .first<{ origem_cep: string | null }>();
  const cep = (cad?.origem_cep ?? "").replace(/\D/g, "");
  if (cep.length !== 8) return c.json({ erro: "Complete o CEP de origem em Meus dados antes de buscar agências." }, 400);

  const credenciais = await lerCredenciais(c.env.DB, c.env.CHAVE_TOKENS, usuario.id);
  if (!credenciais.envia) return c.json({ erro: "Configure seu token da Envia em Minha conta." }, 400);

  const url = baseConsultasEnvia(c.env.ENVIA_AMBIENTE) + "/branches/" + transportadora + "/BR?zipcode=" + cep + "&type=1";
  let resp: Response;
  try {
    resp = await fetch(url, { headers: { Authorization: "Bearer " + credenciais.envia.token, Accept: "application/json" } });
  } catch (exc) {
    console.log("[agencias] falha de conexão: " + String(exc));
    return c.json({ erro: "Não consegui falar com a Envia agora. Tente de novo." }, 502);
  }
  const bruto = await resp.text();
  if (!resp.ok) {
    console.log("[agencias] Envia HTTP " + resp.status + ": " + bruto.slice(0, 300));
    return c.json({ erro: "A Envia não retornou as agências desta transportadora agora." }, 502);
  }
  let lista: unknown;
  try {
    lista = JSON.parse(bruto);
  } catch {
    return c.json({ erro: "A Envia não respondeu como esperado." }, 502);
  }
  const agencias = Array.isArray(lista)
    ? lista.slice(0, 50).map((a) => {
        const o = (a ?? {}) as Record<string, unknown>;
        const codigo = String(o.branch_code ?? "");
        return {
          branch_code: codigo,
          descricao: String(o.reference ?? codigo),
          distancia: typeof o.distance === "number" ? o.distance : null,
        };
      }).filter((a) => a.branch_code)
    : [];
  return c.json({ agencias });
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
