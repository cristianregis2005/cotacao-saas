import { Hono } from "hono";
import type { Env } from "./env";
import { authRotas } from "./auth/rotas";
import { cotacaoRotas } from "./cotacoes/rotas";
import { adminRotas } from "./admin/rotas";
import { contaRotas } from "./contas/rotas";
import { carrinhoRotas } from "./carrinho/rotas";
import { CONTA_HTML } from "./web/conta";
import { PAGINA_HTML } from "./web/pagina";
import { ADMIN_HTML } from "./web/admin";
import { PRIVACIDADE_HTML, TERMOS_HTML } from "./web/legal";
import { montarAjuda } from "./web/ajuda";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => c.html(PAGINA_HTML));
app.get("/admin", (c) => c.html(ADMIN_HTML));
app.get("/conta", (c) => c.html(CONTA_HTML));
app.get("/termos", (c) => c.html(TERMOS_HTML));
app.get("/privacidade", (c) => c.html(PRIVACIDADE_HTML));

// Ajuda: as perguntas frequentes do site, exibidas dentro do app.
app.get("/ajuda", async (c) => {
  const { html, ok } = await montarAjuda();
  return c.html(html, ok ? 200 : 503);
});

app.get("/api/saude", (c) => c.json({ ok: true }));

// Login por código de e-mail: /api/auth/codigo, /api/auth/verificar, /api/auth/eu, /api/auth/sair
app.route("/api/auth", authRotas);

// Cotações (exigem login): /api/cotacoes/todas
app.route("/api/cotacoes", cotacaoRotas);

// Tokens do próprio cliente (exigem login): /api/conta/tokens
app.route("/api/conta", contaRotas);

// Envio ao carrinho das transportadoras (exige login): /api/carrinho/ler-nfe, /api/carrinho/enviar
app.route("/api/carrinho", carrinhoRotas);

// Administração (exige administrador): /api/admin/usuarios, /api/admin/planos
app.route("/api/admin", adminRotas);

export default app;
