// Rotas do administrador: usuários, planos, troca de plano e tokens de cada cliente.
// Todas exigem sessão de um usuário com is_admin = 1.
import { Hono } from "hono";
import type { Env } from "../env";
import { usuarioDaSessao } from "../auth/rotas";
import { ehTransportadora, listarTokens, NOMES, removerToken, salvarToken, TRANSPORTADORAS } from "../contas/tokens";
import { validarPlano } from "./planos";
import { registrarAuditoria } from "./auditoria";
import { validarDados } from "../contas/dados";
import { garantirFranquiaUnica } from "../auth/identidade";

export const adminRotas = new Hono<{ Bindings: Env }>();

adminRotas.use("*", async (c, next) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);
  if (!usuario.is_admin) return c.json({ erro: "Acesso restrito ao administrador." }, 403);
  await next();
});

adminRotas.get("/usuarios", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, email, nome, plano_id, is_admin, criado_em FROM usuarios ORDER BY criado_em DESC LIMIT 200",
  ).all();
  return c.json({ usuarios: results });
});

// Histórico de cotações de todos os clientes. Filtros opcionais: inicio, fim (AAAA-MM-DD) e email.
adminRotas.get("/historico", async (c) => {
  const inicio = c.req.query("inicio") ?? "";
  const fim = c.req.query("fim") ?? "";
  const email = (c.req.query("email") ?? "").trim().slice(0, 120);
  const data = /^\d{4}-\d{2}-\d{2}$/;
  if ((inicio && !data.test(inicio)) || (fim && !data.test(fim))) {
    return c.json({ erro: "Datas inválidas. Use o formato AAAA-MM-DD." }, 400);
  }

  const condicoes: string[] = [];
  const valores: (string | number)[] = [];
  if (inicio) { condicoes.push("date(h.criado_em) >= ?"); valores.push(inicio); }
  if (fim) { condicoes.push("date(h.criado_em) <= ?"); valores.push(fim); }
  if (email) { condicoes.push("lower(u.email) LIKE ?"); valores.push("%" + email.toLowerCase() + "%"); }
  const onde = condicoes.length ? "WHERE " + condicoes.join(" AND ") : "";

  const { results } = await c.env.DB.prepare(
    `SELECT h.id, h.criado_em, u.email, u.nome, h.cep_origem, h.cep_destino, h.peso, h.comprimento,
            h.largura, h.altura, h.valor_declarado, h.opcoes, h.menor_preco, h.avisos, h.com_nota
       FROM historico_cotacoes h
       JOIN usuarios u ON u.id = h.usuario_id
       ${onde}
       ORDER BY h.criado_em DESC
       LIMIT 300`,
  )
    .bind(...valores)
    .all();
  return c.json({ historico: results });
});

adminRotas.get("/planos", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, nome, preco_centavos, limite_cotacoes_mes FROM planos ORDER BY preco_centavos, id",
  ).all();
  return c.json({ planos: results });
});

adminRotas.post("/planos", async (c) => {
  const corpo = (await c.req.json<Record<string, unknown>>().catch(() => null)) ?? {};
  const r = validarPlano(corpo, true);
  if ("erro" in r) return c.json({ erro: r.erro }, 400);

  const existe = await c.env.DB.prepare("SELECT id FROM planos WHERE id = ?").bind(r.valor.id).first();
  if (existe) return c.json({ erro: "Já existe um plano com esse código." }, 409);

  await c.env.DB.prepare(
    "INSERT INTO planos (id, nome, preco_centavos, limite_cotacoes_mes) VALUES (?, ?, ?, ?)",
  )
    .bind(r.valor.id, r.valor.nome, r.valor.preco_centavos, r.valor.limite_cotacoes_mes)
    .run();
  return c.json({ ok: true }, 201);
});

// Edita nome, preço e limite. O código do plano não muda.
adminRotas.put("/planos/:id", async (c) => {
  const id = c.req.param("id");
  const corpo = (await c.req.json<Record<string, unknown>>().catch(() => null)) ?? {};
  const r = validarPlano({ ...corpo, id }, false);
  if ("erro" in r) return c.json({ erro: r.erro }, 400);

  const existe = await c.env.DB.prepare("SELECT id FROM planos WHERE id = ?").bind(id).first();
  if (!existe) return c.json({ erro: "Plano não encontrado." }, 404);

  await c.env.DB.prepare(
    "UPDATE planos SET nome = ?, preco_centavos = ?, limite_cotacoes_mes = ? WHERE id = ?",
  )
    .bind(r.valor.nome, r.valor.preco_centavos, r.valor.limite_cotacoes_mes, id)
    .run();
  return c.json({ ok: true });
});

adminRotas.post("/usuarios/:id/plano", async (c) => {
  const corpo: { plano_id?: string } = (await c.req.json<{ plano_id?: string }>().catch(() => null)) ?? {};
  const planoId = corpo.plano_id;
  if (!planoId) return c.json({ erro: "Informe o plano." }, 400);

  const plano = await c.env.DB.prepare("SELECT id FROM planos WHERE id = ?").bind(planoId).first();
  if (!plano) return c.json({ erro: "Esse plano não existe." }, 404);

  await c.env.DB.prepare("UPDATE usuarios SET plano_id = ? WHERE id = ?")
    .bind(planoId, c.req.param("id"))
    .run();
  return c.json({ ok: true });
});

// ---- Dados cadastrais de um cliente (o administrador pode corrigir, com a mesma validação do cliente) ----

adminRotas.get("/usuarios/:id/dados", async (c) => {
  const id = c.req.param("id");
  if (!(await clienteExiste(c.env.DB, id))) return c.json({ erro: "Usuário não encontrado." }, 404);
  const linha = await c.env.DB.prepare(
    "SELECT email, nome, empresa, documento, telefone, origem_cep, origem_logradouro, origem_numero, origem_complemento, origem_bairro, origem_cidade, origem_uf FROM usuarios WHERE id = ?",
  )
    .bind(id)
    .first();
  return c.json({ dados: linha ?? {} });
});

adminRotas.put("/usuarios/:id/dados", async (c) => {
  const admin = await usuarioDaSessao(c);
  if (!admin) return c.json({ erro: "Faça login." }, 401);

  const id = c.req.param("id");
  if (!(await clienteExiste(c.env.DB, id))) return c.json({ erro: "Usuário não encontrado." }, 404);

  const corpo = (await c.req.json<Record<string, unknown>>().catch(() => null)) ?? {};
  const r = validarDados(corpo);
  if ("erro" in r) return c.json({ erro: r.erro }, 400);
  const d = r.valor;

  await c.env.DB.prepare(
    "UPDATE usuarios SET nome = ?, empresa = ?, documento = ?, telefone = ?, origem_cep = ?, origem_logradouro = ?, origem_numero = ?, origem_complemento = ?, origem_bairro = ?, origem_cidade = ?, origem_uf = ? WHERE id = ?",
  )
    .bind(
      d.nome, d.empresa, d.documento, d.telefone, d.origem_cep, d.origem_logradouro,
      d.origem_numero, d.origem_complemento, d.origem_bairro, d.origem_cidade, d.origem_uf, id,
    )
    .run();
  await garantirFranquiaUnica(c.env.DB, c.env.SEGREDO_LOGIN, id, "documento", d.documento);
  await registrarAuditoria(c.env.DB, admin.id, id, "dados_editados", null);
  return c.json({ ok: true });
});

// ---- Tokens de um cliente (o administrador vê só os 4 últimos caracteres) ----

async function clienteExiste(db: D1Database, id: string): Promise<boolean> {
  return !!(await db.prepare("SELECT id FROM usuarios WHERE id = ?").bind(id).first());
}

adminRotas.get("/usuarios/:id/tokens", async (c) => {
  const id = c.req.param("id");
  if (!(await clienteExiste(c.env.DB, id))) return c.json({ erro: "Usuário não encontrado." }, 404);

  const salvos = await listarTokens(c.env.DB, id);
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

adminRotas.put("/usuarios/:id/tokens/:transportadora", async (c) => {
  const admin = await usuarioDaSessao(c);
  if (!admin) return c.json({ erro: "Faça login." }, 401);

  const id = c.req.param("id");
  const transportadora = c.req.param("transportadora");
  if (!ehTransportadora(transportadora)) return c.json({ erro: "Transportadora desconhecida." }, 404);
  if (!(await clienteExiste(c.env.DB, id))) return c.json({ erro: "Usuário não encontrado." }, 404);

  const corpo = (await c.req.json<{ token?: unknown; contato?: unknown }>().catch(() => null)) ?? {};
  const token = typeof corpo.token === "string" ? corpo.token.trim() : "";
  const contato = typeof corpo.contato === "string" ? corpo.contato.trim() : "";
  if (token.length < 10) return c.json({ erro: "Cole o token completo da " + NOMES[transportadora] + "." }, 400);
  if (contato && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato)) {
    return c.json({ erro: "O e-mail de contato não parece válido." }, 400);
  }

  await salvarToken(c.env.DB, c.env.CHAVE_TOKENS, id, transportadora, token, contato || null);
  await registrarAuditoria(c.env.DB, admin.id, id, "token_salvo", transportadora);
  return c.json({ ok: true });
});

adminRotas.delete("/usuarios/:id/tokens/:transportadora", async (c) => {
  const admin = await usuarioDaSessao(c);
  if (!admin) return c.json({ erro: "Faça login." }, 401);

  const id = c.req.param("id");
  const transportadora = c.req.param("transportadora");
  if (!ehTransportadora(transportadora)) return c.json({ erro: "Transportadora desconhecida." }, 404);
  if (!(await clienteExiste(c.env.DB, id))) return c.json({ erro: "Usuário não encontrado." }, 404);

  await removerToken(c.env.DB, id, transportadora);
  await registrarAuditoria(c.env.DB, admin.id, id, "token_removido", transportadora);
  return c.json({ ok: true });
});
