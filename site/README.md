# Site público (www.cliquefrete.com.br)

Site separado do app. Páginas estáticas em `public/` e um Worker em `src/index.js`
que recebe o formulário de contato em `/api/contato` e envia por e-mail.

## Publicar

```
cd site
npx wrangler deploy
```

Depois, no painel da Cloudflare: **Workers & Pages → cliquefrete-site → Settings → Domains & Routes → Add → Custom domain** e informe `www.cliquefrete.com.br`.

## Antes de divulgar

- Trocar as datas de publicação das notícias em `public/noticias/` quando publicar novas.
- Enviar `https://www.cliquefrete.com.br/sitemap.xml` no Google Search Console.
- Confirmar as fontes de cada notícia antes de publicar.
