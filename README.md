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

Local: crie `.dev.vars` (já ignorado pelo git) com `SUPERFRETE_TOKEN=...`.
Produção: `npx wrangler secret put SUPERFRETE_TOKEN`.

Nunca cole tokens no chat nem no código.
