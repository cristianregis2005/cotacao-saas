// Variáveis do ambiente do Worker: banco, envio de e-mail e segredos.
// Produção: segredos com "npx wrangler secret put NOME". Local: arquivo .dev.vars.

export interface MensagemEmail {
  to: string;
  from: { email: string; name: string };
  subject: string;
  html: string;
  text: string;
}

// Forma mínima do binding "send_email" da Cloudflare, usada só por este projeto.
export interface EnviadorEmail {
  send(mensagem: MensagemEmail): Promise<unknown>;
}

export interface Env {
  DB: D1Database;
  EMAIL: EnviadorEmail;
  EMAIL_REMETENTE: string;   // ex.: contato@seudominio.com.br (configurado no wrangler.jsonc)
  SEGREDO_LOGIN: string;     // chave para proteger os códigos de login (segredo)
  SUPERFRETE_TOKEN?: string;
  SUPERFRETE_USER_AGENT?: string;
}
