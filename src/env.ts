// Variáveis do ambiente do Worker: banco, e-mail e segredos.
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
  EMAIL_REMETENTE: string;   // endereço do domínio configurado no Email Service (wrangler.jsonc)
  SEGREDO_LOGIN: string;     // protege os códigos de login (segredo)
  EMAIL_SIMULADO?: string;   // "1" só em desenvolvimento: mostra o código no terminal, sem e-mail
  SUPERFRETE_TOKEN?: string;
  SUPERFRETE_USER_AGENT?: string;
  FRENET_TOKEN?: string;
  ME_TOKEN?: string;         // token do Melhor Envio (segredo)
  ME_CONTACT?: string;       // e-mail de contato, usado no User-Agent exigido pelo Melhor Envio
}
