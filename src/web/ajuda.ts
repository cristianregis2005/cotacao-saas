// Tela "Ajuda": mostra as perguntas frequentes publicadas no site, dentro do app.
// A fonte é o site (uma só): aqui só pegamos o artigo, ajustamos os links e o colocamos na tela do app.
const SITE = "https://cliquefrete.com.br";
const ORIGEM_FAQ = SITE + "/faq";

// Pega só o conteúdo de <main> do site, sem o cabeçalho e o rodapé dele.
export function extrairArtigo(htmlSite: string): string | null {
  const inicio = htmlSite.indexOf("<main>");
  const fim = htmlSite.indexOf("</main>");
  if (inicio < 0 || fim < 0 || fim < inicio) return null;
  return htmlSite.slice(inicio + "<main>".length, fim);
}

// Links relativos do site viram absolutos. Os links para /faq passam a apontar para /ajuda, dentro do app.
export function ajustarLinks(trecho: string): string {
  return trecho
    .replace(/href="\/(?!\/)/g, 'href="' + SITE + "/")
    .replace(/src="\/(?!\/)/g, 'src="' + SITE + "/")
    .split('href="' + ORIGEM_FAQ + '"').join('href="/ajuda"');
}

function pagina(corpo: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ajuda</title>
<link rel="icon" type="image/svg+xml" href="https://cliquefrete.com.br/assets/favicon.svg">
<style>
  :root { --fundo: #f6f7f9; --cartao: #ffffff; --texto: #1d2330; --suave: #5b6372; --borda: #d8dce3; --destaque: #2563eb; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --fundo: #0f1218; --cartao: #171c26; --texto: #e6e9ef; --suave: #9aa3b2; --borda: #2a3140; --destaque: #5b8cff; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--fundo); color: var(--texto); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; padding-bottom: 110px; }
  main { max-width: 760px; margin: 0 auto; padding: 16px; }
  .artigo { background: var(--cartao); border: 1px solid var(--borda); border-radius: 10px; padding: 16px; }
  .artigo h1 { font-size: 1.4rem; margin: 4px 0 12px; }
  .artigo h2 { font-size: 1.05rem; margin: 18px 0 6px; }
  .artigo p { margin: 0 0 8px; }
  .artigo a { color: var(--destaque); }
  .artigo .acoes { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
  .artigo .botao { display: inline-block; padding: 10px 14px; border-radius: 8px; background: var(--destaque); color: #fff; font-weight: 600; text-decoration: none; }
  .artigo .botao.secundario { background: transparent; color: var(--destaque); border: 1px solid var(--borda); }
  .artigo .container { max-width: none; padding: 0; margin: 0; }
  .aviso { color: var(--suave); }
  .barra-inferior { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; justify-content: space-around; background: var(--destaque); padding: 6px 8px calc(8px + env(safe-area-inset-bottom)); }
  .barra-item { flex: 1; max-width: 140px; min-height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border-radius: 10px; color: #fff; font-size: 12px; text-decoration: none; }
  .barra-item svg { width: 22px; height: 22px; }
  .barra-item.ativo { font-weight: 600; background: rgba(255,255,255,0.18); }
  .cabecalho { display: flex; justify-content: space-between; align-items: center; padding: 4px 0 12px; }
  .logo-cabecalho { height: 60px; width: auto; display: block; mix-blend-mode: multiply; }
  .icone-usuario { width: 44px; height: 44px; padding: 0; display: flex; align-items: center; justify-content: center; border: 0; border-radius: 22px; background: var(--destaque); color: #fff; }
  .icone-usuario svg { width: 20px; height: 20px; }
  .fundo-menu { position: fixed; inset: 0; z-index: 40; background: rgba(0,0,0,0.45); }
  .fundo-menu[hidden], .folha-menu[hidden] { display: none; }
  .folha-menu { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 6px; padding: 12px 16px calc(24px + env(safe-area-inset-bottom)); background: var(--cartao); border-radius: 18px 18px 0 0; }
  .folha-menu .suave { font-size: 0.85rem; color: var(--suave); }
  .item-menu { width: 100%; min-height: 52px; margin-top: 6px; padding: 0 14px; text-align: left; border: 1px solid var(--borda); border-radius: 10px; background: var(--cartao); color: #b42318; font: inherit; font-size: 16px; font-weight: 600; }
</style>
</head>
<body>
<main>
<header class="cabecalho">
  <img class="logo-cabecalho" src="https://cliquefrete.com.br/assets/logo.png" alt="Clique Frete">
  <button type="button" class="icone-usuario" id="btn-usuario" aria-label="Abrir menu do usuário" aria-expanded="false" aria-controls="menu-usuario">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>
  </button>
</header>
${corpo}
</main>
<div class="fundo-menu" id="fundo-menu" hidden></div>
<section class="folha-menu" id="menu-usuario" role="dialog" aria-modal="true" aria-label="Menu do usuário" hidden>
  <span class="suave">Conectado como</span>
  <strong id="quem"></strong>
  <small id="uso" class="suave"></small>
  <button type="button" class="item-menu" id="btn-sair">Sair</button>
</section>
<nav class="barra-inferior" aria-label="Navegação principal">
  <a class="barra-item" href="/">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 11l9-7 9 7v9H3z"/></svg>
    <span>Cotar</span>
  </a>
  <a class="barra-item" href="/conta">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>
    <span>Minha conta</span>
  </a>
  <a class="barra-item ativo" href="/ajuda" aria-current="page">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/></svg>
    <span>Ajuda</span>
  </a>
</nav>
<script>
(function () {
  function $(id) { return document.getElementById(id); }
  function abrirMenu(abrir) {
    $("menu-usuario").hidden = !abrir;
    $("fundo-menu").hidden = !abrir;
    $("btn-usuario").setAttribute("aria-expanded", abrir ? "true" : "false");
  }
  $("btn-usuario").addEventListener("click", function () { abrirMenu($("menu-usuario").hidden); });
  $("fundo-menu").addEventListener("click", function () { abrirMenu(false); });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") abrirMenu(false); });
  $("btn-sair").addEventListener("click", function () {
    fetch("/api/auth/sair", { method: "POST", credentials: "same-origin" }).then(function () { location.href = "/"; });
  });
  fetch("/api/auth/eu", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d) return;
    $("quem").textContent = d.email;
    $("uso").textContent = d.uso && d.uso.ativo ? "Acesso ativo" : "";
  });
})();
</script>
</body>
</html>`;
}

// Busca o FAQ no site (com cache de 1 hora na borda da Cloudflare). Se o site não responder, mostra um aviso.
export async function montarAjuda(): Promise<{ html: string; ok: boolean }> {
  try {
    const r = await fetch(ORIGEM_FAQ, { cf: { cacheTtl: 3600, cacheEverything: true } } as RequestInit);
    if (!r.ok) throw new Error("status " + r.status);
    const artigo = extrairArtigo(await r.text());
    if (!artigo) throw new Error("artigo nao encontrado");
    return { html: pagina(ajustarLinks(artigo)), ok: true };
  } catch (e) {
    return {
      html: pagina('    <p class="aviso">Não consegui carregar as perguntas frequentes agora. Tente de novo em instantes, ou acesse <a href="' + ORIGEM_FAQ + '">cliquefrete.com.br/faq</a>.</p>'),
      ok: false,
    };
  }
}
