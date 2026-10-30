import { Hono } from "hono";

// Variáveis do ambiente: banco D1 e segredos (produção: "wrangler secret put NOME").
export interface Env {
  DB: D1Database;
  SUPERFRETE_TOKEN?: string;
  SUPERFRETE_USER_AGENT?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api/saude", (c) => c.json({ ok: true }));

// Ainda sem rotas de cotação: elas só serão liberadas depois do login,
// para que os tokens das transportadoras não fiquem expostos a qualquer visitante.

export default app;
