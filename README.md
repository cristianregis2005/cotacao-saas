# cotacao-saas

Versão em Cloudflare Workers (TypeScript + Hono + D1) do comparador de fretes.
A versão Python (Streamlit) continua em outro repositório e segue em uso.

## Primeira vez (no seu computador)

```bash
npm install
npm test          # testes das integrações de frete
npm run typecheck
npx wrangler d1 create cotacao-saas   # copie o database_id para wrangler.jsonc
npm run dev       # roda localmente
```

## Segredos


Produção: `npx wrangler secret put SUPERFRETE_TOKEN`.

Nunca cole tokens no chat nem no código.

## Login por código

- Antes de rodar localmente, copie `.dev.vars.exemplo` para `.dev.vars` e troque o `SEGREDO_LOGIN`.
- Em `npm run dev`, o e-mail com o código é salvo em arquivo na pasta `.wrangler` (não é enviado de verdade).
- Em produção: `npx wrangler secret put SEGREDO_LOGIN` e configurar o domínio em `EMAIL_REMETENTE` no `wrangler.jsonc`.
