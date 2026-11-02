import { Hono } from "hono";
import type { Env } from "./env";
import { authRotas } from "./auth/rotas";
import { cotacaoRotas } from "./cotacoes/rotas";
import { adminRotas } from "./admin/rotas";
import { PAGINA_HTML } from "./web/pagina";
import { ADMIN_HTML } from "./web/admin";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => c.html(PAGINA_HTML));
app.get("/admin", (c) => c.html(ADMIN_HTML));

app.get("/api/saude", (c) => c.json({ ok: true }));

// Login por código de e-mail: /api/auth/codigo, /api/auth/verificar, /api/auth/eu, /api/auth/sair
app.route("/api/auth", authRotas);

// Cotações (exigem login): /api/cotacoes/todas e /api/cotacoes/superfrete
app.route("/api/cotacoes", cotacaoRotas);

// Administração (exige administrador): /api/admin/usuarios, /api/admin/planos
app.route("/api/admin", adminRotas);

export default app;
