// Variáveis do ambiente do Worker.
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
  CHAVE_TOKENS: string;      // chave que criptografa os tokens dos clientes: 32 bytes em base64 (segredo)
  FRENET_PARTNER_TOKEN?: string; // token de parceiro da Frenet, único para o sistema (segredo); exigido para enviar ao carrinho
  ENVIA_AGENCIA_ORIGEM?: string; // código da agência de origem na Envia (serviço branch to home)
  ENVIA_AMBIENTE?: string;  // "teste" usa a sandbox da Envia (api-test); qualquer outro valor usa a API real
  EMAIL_SIMULADO?: string;   // "1" só em desenvolvimento: mostra o código no terminal, sem e-mail
}
