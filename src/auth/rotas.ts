// Login por código enviado por e-mail, sessão em cookie HttpOnly, logout e "quem sou eu".
import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Env } from "../env";
import { gerarCodigo, gerarToken, hashCodigo, hashToken, iguais } from "./codigos";
import { verificarLimite } from "../planos";

const COOKIE = "sessao";
const VALIDADE_CODIGO_MIN = 10;
const MAX_TENTATIVAS = 5;
const INTERVALO_REENVIO_S = 60;
const VALIDADE_SESSAO_DIAS = 30;

interface UsuarioRow {
  id: string;
  email: string;
  nome: string | null;
  is_admin: number;
  plano_id: string | null;
}

const emailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const authRotas = new Hono<{ Bindings: Env }>();

// Usuário da sessão atual, ou null. Use em rotas que exigem login.
export async function usuarioDaSessao(c: Context<{ Bindings: Env }>): Promise<UsuarioRow | null> {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  return c.env.DB.prepare(
    `SELECT u.id, u.email, u.nome, u.is_admin, u.plano_id
       FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.id = ? AND s.expira_em > ?`,
  )
    .bind(await hashToken(token), new Date().toISOString())
    .first<UsuarioRow>();
}

// 1) Pede o código: gera, guarda o hash e envia por e-mail.
authRotas.post("/codigo", async (c) => {
  const corpo = await c.req.json<{ email?: string }>().catch(() => ({} as { email?: string }));
  const email = (corpo.email ?? "").trim().toLowerCase();
  if (!emailValido(email)) return c.json({ erro: "E-mail inválido." }, 400);

  // Evita spam: só um código por intervalo. Responde igual, para não revelar quem tem conta.
  const recente = await c.env.DB.prepare(
    `SELECT 1 FROM codigos_login WHERE email = ? AND criado_em > datetime('now', ?)`,
  )
    .bind(email, `-${INTERVALO_REENVIO_S} seconds`)
    .first();
  if (recente) return c.json({ ok: true });

  const codigo = gerarCodigo();
  const expira = new Date(Date.now() + VALIDADE_CODIGO_MIN * 60_000).toISOString();
  await c.env.DB.prepare(
    "INSERT INTO codigos_login (id, email, codigo_hash, expira_em) VALUES (?, ?, ?, ?)",
  )
    .bind(crypto.randomUUID(), email, await hashCodigo(c.env.SEGREDO_LOGIN, email, codigo), expira)
    .run();

  if (c.env.EMAIL_SIMULADO === "1") {
    // Só para desenvolvimento local (.dev.vars): mostra o código no terminal em vez de enviar e-mail.
    console.log(`[DEV] Código de login para ${email}: ${codigo}`);
    return c.json({ ok: true });
  }

  try {
    await c.env.EMAIL.send({
      to: email,
      from: { email: c.env.EMAIL_REMETENTE, name: "Comparador de Fretes" },
      subject: `Seu código de acesso: ${codigo}`,
      text: `Seu código de acesso é ${codigo}. Ele vale por ${VALIDADE_CODIGO_MIN} minutos. Se não foi você, ignore este e-mail.`,
      html: `<p>Seu código de acesso é <strong>${codigo}</strong>.</p><p>Ele vale por ${VALIDADE_CODIGO_MIN} minutos. Se não foi você, ignore este e-mail.</p>`,
    });
  } catch (exc) {
    console.error("Falha ao enviar e-mail de login:", exc);
    return c.json({ erro: "Não consegui enviar o e-mail agora. Tente de novo em instantes." }, 502);
  }
  return c.json({ ok: true });
});

// 2) Confere o código e abre a sessão.
authRotas.post("/verificar", async (c) => {
  const corpo = await c.req.json<{ email?: string; codigo?: string }>().catch(() => ({} as { email?: string; codigo?: string }));
  const email = (corpo.email ?? "").trim().toLowerCase();
  const codigo = (corpo.codigo ?? "").trim();
  if (!emailValido(email) || !/^\d{6}$/.test(codigo)) {
    return c.json({ erro: "Código inválido." }, 400);
  }

  const registro = await c.env.DB.prepare(
    `SELECT id, codigo_hash, tentativas FROM codigos_login
      WHERE email = ? AND usado = 0 AND expira_em > ?
      ORDER BY criado_em DESC LIMIT 1`,
  )
    .bind(email, new Date().toISOString())
    .first<{ id: string; codigo_hash: string; tentativas: number }>();

  if (!registro || registro.tentativas >= MAX_TENTATIVAS) {
    return c.json({ erro: "Código inválido ou expirado. Peça um novo." }, 400);
  }

  const esperado = await hashCodigo(c.env.SEGREDO_LOGIN, email, codigo);
  if (!iguais(esperado, registro.codigo_hash)) {
    await c.env.DB.prepare("UPDATE codigos_login SET tentativas = tentativas + 1 WHERE id = ?")
      .bind(registro.id)
      .run();
    return c.json({ erro: "Código incorreto." }, 400);
  }

  await c.env.DB.prepare("UPDATE codigos_login SET usado = 1 WHERE id = ?").bind(registro.id).run();
  await c.env.DB.prepare("INSERT OR IGNORE INTO usuarios (id, email) VALUES (?, ?)")
    .bind(crypto.randomUUID(), email)
    .run();
  const usuario = await c.env.DB.prepare("SELECT id, email, nome, is_admin FROM usuarios WHERE email = ?")
    .bind(email)
    .first<UsuarioRow>();
  if (!usuario) return c.json({ erro: "Não consegui abrir sua conta." }, 500);

  // O cookie leva o token; o banco guarda só o hash dele.
  const token = gerarToken();
  const expira = new Date(Date.now() + VALIDADE_SESSAO_DIAS * 86_400_000).toISOString();
  await c.env.DB.prepare("INSERT INTO sessoes (id, usuario_id, expira_em) VALUES (?, ?, ?)")
    .bind(await hashToken(token), usuario.id, expira)
    .run();

  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    secure: new URL(c.req.url).protocol === "https:",
    maxAge: VALIDADE_SESSAO_DIAS * 86_400,
  });
  return c.json({ ok: true, usuario: { email: usuario.email, nome: usuario.nome, admin: !!usuario.is_admin } });
});

// 3) Quem está logado?
authRotas.get("/eu", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Não logado." }, 401);
  const situacao = await verificarLimite(c.env.DB, usuario.id, usuario.plano_id);
  return c.json({
    email: usuario.email,
    nome: usuario.nome,
    admin: !!usuario.is_admin,
    uso: { usadas: situacao.usadas, limite: situacao.limite },
  });
});

// 4) Sair: apaga a sessão no banco e o cookie no navegador.
authRotas.post("/sair", async (c) => {
  const token = getCookie(c, COOKIE);
  if (token) {
    await c.env.DB.prepare("DELETE FROM sessoes WHERE id = ?").bind(await hashToken(token)).run();
  }
  deleteCookie(c, COOKIE, { path: "/" });
  return c.json({ ok: true });
});
