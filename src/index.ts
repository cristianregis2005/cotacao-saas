import { Hono } from "hono";
import type { Env } from "./env";
import { authRotas } from "./auth/rotas";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/saude", (c) => c.json({ ok: true }));

// Login por código de e-mail: /api/auth/codigo, /api/auth/verificar, /api/auth/eu, /api/auth/sair
app.route("/api/auth", authRotas);

// As rotas de cotação só serão liberadas para usuários logados (usuarioDaSessao),
// para que os tokens das transportadoras não sejam usados por visitantes.

export default app;
