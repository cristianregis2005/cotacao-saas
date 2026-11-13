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
  ENVIA_AMBIENTE?: string;  // "teste" usa a sandbox da Envia (api-test); qualquer outro valor usa a API real
  ASAAS_API_KEY?: string;   // chave de API do Asaas (segredo); sandbox ou produção
  ASAAS_WEBHOOK_TOKEN?: string; // token que o Asaas envia no cabeçalho asaas-access-token (segredo)
  ASAAS_AMBIENTE?: string;  // "producao" usa a API real do Asaas; qualquer outro valor usa a sandbox
  EMAIL_SIMULADO?: string;   // "1" só em desenvolvimento: mostra o código no terminal, sem e-mail
  ORIGENS_EXTRAS?: string;   // origens extras liberadas no simulador (ex.: http://localhost:8787), só para desenvolvimento
  DEMO_USUARIO_ID?: string;   // id do administrador cujos tokens são usados no simulador público (segredo ou variável)
  TURNSTILE_SECRET_KEY?: string; // segredo do Cloudflare Turnstile, usado para confirmar que quem simula é uma pessoa (segredo)
}
