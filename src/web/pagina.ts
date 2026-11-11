// Página única do SaaS: entrar com código por e-mail e fazer a cotação em todas as transportadoras.
// Sem bibliotecas externas: tudo inline, para funcionar só com o próprio Worker.
export const PAGINA_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Comparador de fretes</title>
<style>
  :root { --fundo: #f6f7f9; --cartao: #ffffff; --texto: #1d2330; --suave: #5b6372; --borda: #d8dce3; --destaque: #2563eb; --ok: #15803d; --erro: #b42318; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --fundo: #0f1218; --cartao: #171c26; --texto: #e6e9ef; --suave: #9aa3b2; --borda: #2a3140; --destaque: #5b8cff; --ok: #4ade80; --erro: #f87171; }
  }
  :root[data-theme="dark"] { --fundo: #0f1218; --cartao: #171c26; --texto: #e6e9ef; --suave: #9aa3b2; --borda: #2a3140; --destaque: #5b8cff; --ok: #4ade80; --erro: #f87171; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--fundo); color: var(--texto); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.4; }
  main { max-width: 760px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 1.5rem; margin: 8px 0 16px; }
  h2 { font-size: 1.1rem; margin: 0 0 12px; }
  .cartao { background: var(--cartao); border: 1px solid var(--borda); border-radius: 10px; padding: 16px; margin-bottom: 16px; }
  label { display: block; font-size: 0.9rem; color: var(--suave); margin-bottom: 10px; }
  input { display: block; width: 100%; margin-top: 4px; padding: 10px; font-size: 1rem; border: 1px solid var(--borda); border-radius: 8px; background: var(--fundo); color: var(--texto); }
  .grade { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
  @media (max-width: 520px) { .grade { grid-template-columns: 1fr; } }
  button { padding: 11px 16px; font-size: 1rem; font-weight: 600; border: 0; border-radius: 8px; background: var(--destaque); color: #fff; cursor: pointer; }
  button[disabled] { opacity: 0.6; cursor: wait; }
  button.secundario { background: transparent; color: var(--destaque); border: 1px solid var(--borda); }
  .linha { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .msg { min-height: 1em; margin: 10px 0 0; font-size: 0.8rem; color: var(--suave); }
  .msg.erro { color: var(--erro); }
  .msg.ok { color: var(--ok); }
  .tabela-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
  th, td { text-align: left; padding: 9px 8px; border-bottom: 1px solid var(--borda); white-space: nowrap; }
  th { color: var(--suave); font-weight: 600; font-size: 0.85rem; }
  td.preco, th.preco { text-align: right; }
  tr.melhor td { font-weight: 700; color: var(--ok); }
  .avisos { color: var(--suave); font-size: 0.9rem; margin: 10px 0 0; padding-left: 18px; }
  .dce-item { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 10px; align-items: start; margin-bottom: 10px; }
  .dce-item .icone-acao { margin-top: 22px; }
  .dce-item label { display: flex; flex-direction: column; gap: 4px; font-size: 0.9rem; }
  .dce-cabecalho { display: flex; justify-content: space-between; align-items: center; }
  .dce-cabecalho h3 { margin: 0; }
  .dce-item input { height: 40px; box-sizing: border-box; }
  .icone-acao { width: 40px; height: 40px; padding: 0; margin: 0; display: inline-flex; align-items: center; justify-content: center; }
  .icone-acao svg { width: 20px; height: 20px; }
  @media (max-width: 600px) {
    .dce-item { grid-template-columns: 1fr 1fr 40px; }
    .dce-item label:first-child { grid-column: 1 / -1; }
  }
  button.ordenar { background: none; color: var(--texto); border: 0; padding: 0; font: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; text-decoration: underline dotted; }
  .dica { display: block; margin-top: 4px; font-size: 0.85rem; color: var(--suave); min-height: 1.2em; }
  .dica.erro { color: var(--erro); }
  .cabecalho-recolhivel { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
  .cabecalho-recolhivel h2 { margin: 0; }
  .cabecalho-recolhivel .suave { font-size: 0.85rem; }
  .alternar { width: 32px; height: 32px; flex: 0 0 32px; padding: 0; margin: 0; display: inline-flex; align-items: center; justify-content: center; background: transparent; color: var(--texto); border: 1px solid var(--borda); }
  .alternar:hover { border-color: var(--destaque); color: var(--destaque); }
  .alternar svg { width: 16px; height: 16px; transition: transform 0.2s; }
  .alternar.fechado svg { transform: rotate(-90deg); }
  [hidden] { display: none !important; }
  .etapa-oculta { display: none !important; }
  .etapas { display: flex; gap: 8px; margin: 0 0 16px; }
  .aviso-topo { position: sticky; top: 0; z-index: 10; margin: 0 0 12px; padding: 12px 14px; border: 1px solid var(--borda); border-radius: 8px; background: var(--cartao); color: var(--texto); font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .cabecalho, .fundo-menu, .folha-menu, .barra-inferior, .titulo-mobile { display: none; }
  @media (max-width: 767px) {
  .card-desktop { display: none; }
  .titulo-mobile { display: block; margin: 0 0 14px; font-size: 1.5rem; font-weight: 700; }
  body:has(#cotar:not([hidden])) main > h1 { display: none; }
  body { padding-bottom: 150px; }
  .aviso-topo { position: fixed; top: auto; left: 50%; transform: translateX(-50%); width: min(calc(100% - 32px), 720px); bottom: calc(78px + env(safe-area-inset-bottom)); z-index: 30; margin: 0; padding: 12px 14px; border: 1px solid var(--borda); border-radius: 12px; background: var(--cartao); color: var(--texto); font-weight: 600; box-shadow: 0 6px 18px rgba(0,0,0,0.25); }
  .barra-inferior { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; justify-content: space-around; background: var(--destaque); padding: 6px 8px calc(8px + env(safe-area-inset-bottom)); }
  .barra-inferior[hidden] { display: none; }
  .barra-item { flex: 1; max-width: 140px; min-height: 52px; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border: 0; border-radius: 10px; background: transparent; color: #fff; font: inherit; font-size: 12px; text-decoration: none; cursor: pointer; }
  .barra-item svg { width: 22px; height: 22px; }
  .barra-item.ativo { font-weight: 600; background: rgba(255,255,255,0.18); }
  .cabecalho { display: flex; justify-content: space-between; align-items: center; padding: 4px 0 12px; }
  .logo-cabecalho { height: 60px; width: auto; display: block; mix-blend-mode: multiply; }
  .icone-usuario { width: 44px; height: 44px; padding: 0; display: flex; align-items: center; justify-content: center; border: 0; border-radius: 22px; background: var(--destaque); color: #fff; }
  .icone-usuario svg { width: 20px; height: 20px; }
  .fundo-menu { position: fixed; inset: 0; z-index: 40; background: rgba(0,0,0,0.45); }
  .folha-menu { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 6px; padding: 12px 16px calc(24px + env(safe-area-inset-bottom)); background: var(--cartao); border-radius: 18px 18px 0 0; }
  .folha-menu[hidden], .fundo-menu[hidden] { display: none; }
  .item-menu { width: 100%; min-height: 52px; margin-top: 6px; padding: 0 14px; text-align: left; border: 1px solid var(--borda); border-radius: 10px; background: var(--cartao); color: var(--texto); font: inherit; font-size: 16px; font-weight: 600; }
  .item-menu.perigo { color: var(--erro); }
  .fundo-menu { display: block; }
  }
  .aviso-topo[hidden] { display: none; }
  .aviso-topo.ok { background: #15803d; border-color: #15803d; color: #fff; }
  .aviso-topo.erro { background: #b42318; border-color: #b42318; color: #fff; }
  .aviso-topo.info { background: #1d2330; border-color: #1d2330; color: #fff; }
  .aviso-topo .secundario { background: #fff; color: #1d2330; border: 0; }
  .aviso-texto { margin: 0; }
  .aviso-acoes { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 8px; }
  .aviso-acoes:empty { display: none; }
  [data-aviso] { display: none; }
  .etapas button { flex: 1; padding: 10px 8px; font-size: 0.9rem; background: var(--cartao); color: var(--suave); border: 1px solid var(--borda); }
  .etapas button.ativa { background: var(--destaque); color: #fff; border-color: var(--destaque); }
  .etapas button[disabled] { opacity: 0.5; cursor: default; }
  .navegacao { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; margin: 0 0 16px; }
  .soltar { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 22px 16px; margin: 0 0 12px; border: 2px dashed var(--borda); border-radius: 10px; text-align: center; cursor: pointer; color: var(--suave); position: relative; }
  .soltar strong { color: var(--texto); font-size: 1rem; }
  .soltar.sobre { border-color: var(--destaque); color: var(--destaque); background: var(--fundo); }
  .soltar svg { width: 28px; height: 28px; color: var(--destaque); }
  input.oculto-visual { position: absolute; width: 1px; height: 1px; opacity: 0; margin: 0; padding: 0; border: 0; }
  .resumo-nota { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 12px 0 0; }
  .resumo-nota div { background: var(--fundo); border: 1px solid var(--borda); border-radius: 8px; padding: 10px; min-width: 0; }
  .resumo-nota small { display: block; color: var(--suave); font-size: 0.8rem; }
  .resumo-nota span { display: block; font-weight: 600; overflow-wrap: anywhere; }
  .ordenacao { display: inline-flex; border: 1px solid var(--borda); border-radius: 8px; overflow: hidden; margin: 0 0 12px; }
  .ordenacao button { background: transparent; color: var(--suave); border-radius: 0; padding: 8px 12px; font-size: 0.9rem; font-weight: 600; }
  .ordenacao button.ativa { background: var(--destaque); color: #fff; }
  .opcoes { display: grid; gap: 12px; }
  .opcao { position: relative; border: 1px solid var(--borda); border-radius: 10px; padding: 14px; background: var(--cartao); }
  .opcao.melhor { border-color: var(--ok); }
  .opcao .etiqueta { position: absolute; top: -10px; left: 12px; background: var(--ok); color: #fff; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
  .opcao-topo { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
  .opcao-nome { font-weight: 700; overflow-wrap: anywhere; }
  .opcao-servico { color: var(--suave); font-size: 0.9rem; overflow-wrap: anywhere; }
  .opcao-preco { font-size: 1.25rem; font-weight: 700; text-align: right; white-space: nowrap; }
  .opcao-prazo { color: var(--suave); font-size: 0.9rem; text-align: right; white-space: nowrap; }
  .opcao > button { width: 100%; }
</style>
</head>
<body>
<main>
  <h1>Crie uma cotação</h1>

  <section id="entrar" class="cartao" hidden>
    <h2>Entrar</h2>
    <form id="form-email">
      <label>E-mail
        <input id="email" type="email" autocomplete="email" required>
      </label>
      <button type="submit" id="btn-codigo">Receber código</button>
    </form>
    <form id="form-codigo" hidden>
      <p class="msg" id="msg-codigo">Enviamos um código para o seu e-mail.</p>
      <label>Código de 6 dígitos
        <input id="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required>
      </label>
      <button type="submit" id="btn-entrar">Entrar</button>
    </form>
    <p class="msg erro" id="msg-entrar"></p>
  </section>

  <section id="cotar" hidden>
    <div class="cartao linha card-desktop">
      <span><span id="quem-d"></span><br><small id="uso-d" style="color:var(--suave)"></small></span>
      <span><a href="/conta">Minha conta</a> &nbsp; <button class="secundario" id="btn-sair-d" type="button">Sair</button></span>
    </div>
    <header class="cabecalho">
      <img class="logo-cabecalho" src="https://cliquefrete.com.br/assets/logo.png" alt="Clique Frete">
      <button type="button" class="icone-usuario" id="btn-usuario" aria-label="Abrir menu do usuário" aria-expanded="false" aria-controls="menu-usuario">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>
      </button>
    </header>
    <p class="titulo-mobile">Crie uma cotação</p>
    <div class="fundo-menu" id="fundo-menu" hidden></div>
    <section class="folha-menu" id="menu-usuario" role="dialog" aria-modal="true" aria-label="Menu do usuário" hidden>
      <span class="suave">Conectado como</span>
      <strong id="quem"></strong>
      <small id="uso" class="suave"></small>
      <button type="button" class="item-menu perigo" id="btn-sair">Sair</button>
    </section>

    <nav class="etapas" id="etapas" aria-label="Etapas da cotação">
      <button type="button" data-passo="1" class="ativa">1. Nota fiscal</button>
      <button type="button" data-passo="2">2. Dados do envio</button>
      <button type="button" data-passo="3" disabled>3. Opções de frete</button>
    </nav>
    <div class="aviso-topo" id="aviso-topo" role="status" aria-live="polite" hidden>
      <p class="aviso-texto" id="aviso-texto"></p>
      <div class="aviso-acoes" id="aviso-acoes">
        <button type="button" class="secundario" id="btn-liberar" hidden>Liberar esta nota para novo envio</button>
      </div>
    </div>

    <section class="cartao" id="secao-carrinho" data-etapa="1">
      <div class="cabecalho-recolhivel">
        <h2>Enviar o XML da nota</h2>
        <span class="suave" id="resumo-nfe"></span>
        <button type="button" class="alternar" id="btn-nfe" aria-label="Recolher" title="Recolher"></button>
      </div>
      <div id="corpo-nfe">
        <p class="suave">Envie a nota fiscal (cadastro na plataforma com CNPJ) ou preencha os dados do pacote abaixo (cadastro na plataforma com CPF).</p>
        <label class="soltar" id="zona-nfe">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>
          <strong>Arraste o XML da nota aqui</strong>
          <span>ou toque para escolher o arquivo</span>
          <input type="file" id="arquivoNfe" accept=".xml,text/xml,application/xml" class="oculto-visual">
        </label>
        <div id="nfe-resumo"></div>
        <div class="grade" id="campos-nfe" hidden></div>
        <p class="msg" id="msg-carrinho" data-aviso></p>
      </div>
    </section>

    <section class="cartao" id="secao-dce" data-etapa="1">
      <h2>Sem nota fiscal (DC-e)</h2>
      <p class="suave">Só para pessoa física (CPF no cadastro). Preencha o destinatário e os produtos que está enviando. Essa descrição será utilizada também na declaração de conteúdo que seguirá junto com o seu pedido.</p>
      <div class="grade">
        <label>Nome do destinatário <input id="dce-nome" autocomplete="off"></label>
        <label>CPF ou CNPJ do destinatário <input id="dce-documento" inputmode="numeric"></label>
        <label>CEP <input id="dce-cep" inputmode="numeric"><small class="dica" id="dicaDce"></small></label>
        <label>Rua <input id="dce-logradouro" autocomplete="off"></label>
        <label>Número <input id="dce-numero" autocomplete="off"></label>
        <label>Complemento <input id="dce-complemento" autocomplete="off"></label>
        <label>Bairro <input id="dce-bairro" autocomplete="off"></label>
        <label>Cidade <input id="dce-cidade" autocomplete="off"></label>
        <label>UF <input id="dce-uf" maxlength="2" autocomplete="off"></label>
        <label>Telefone com DDD <input id="dce-telefone" inputmode="numeric"></label>
        <label>E-mail do destinatário <input id="dce-email" inputmode="email" autocomplete="off"></label>
      </div>
      <div class="dce-cabecalho">
        <h3>Produtos</h3>
        <button type="button" class="secundario icone-acao" id="btn-add-item" aria-label="Adicionar produto" title="Adicionar produto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
      </div>
      <div id="dce-itens"></div>
      <p class="suave" id="dce-total"></p>
    </section>

    <div class="navegacao" data-etapa="1">
      <button type="button" id="btn-ir-2">Continuar: dados do envio</button>
    </div>

    <form id="form-cotacao" class="cartao" data-etapa="2">
      <div class="cabecalho-recolhivel">
        <h2>Dados do envio</h2>
        <span class="suave" id="resumo-dados"></span>
        <button type="button" class="alternar" id="btn-dados" aria-label="Recolher" title="Recolher"></button>
      </div>
      <div id="corpo-dados">
      <div class="grade">
        <label>CEP de origem <input id="cepOrigem" inputmode="numeric" required><small class="dica" id="dicaOrigem"></small></label>
        <label>CEP de destino <input id="cepDestino" inputmode="numeric" required><small class="dica" id="dicaDestino"></small></label>
        <label>Peso (kg) <input id="peso" inputmode="decimal" required></label>
        <label>Valor declarado (R$) <input id="valor" inputmode="decimal"></label>
        <label>Comprimento (cm) <input id="comprimento" inputmode="decimal" required></label>
        <label>Largura (cm) <input id="largura" inputmode="decimal" required></label>
        <label>Altura (cm) <input id="altura" inputmode="decimal" required></label>
      </div>
      <button type="submit" id="btn-cotar">Cotar</button>
      <p class="msg erro" id="msg-cotar" data-aviso></p>
      </div>
    </form>
    <div class="navegacao" data-etapa="2">
      <button type="button" class="secundario" id="btn-voltar-1">Voltar</button>
    </div>

    <section class="cartao" id="resultado" data-etapa="3" hidden>
      <h2>Opções de frete</h2>
      <p class="suave" id="frete-nota"></p>
      <div class="ordenacao" id="ordenacao" role="group" aria-label="Ordenar opções">
        <button type="button" data-campo="preco" class="ativa">Menor preço</button>
        <button type="button" data-campo="prazoDias">Menor prazo</button>
      </div>
      <div class="opcoes" id="linhas"></div>
      <ul class="avisos" id="avisos"></ul>
    </section>

    <div id="retorno" data-etapa="3" hidden>
      <p class="msg" id="msg-pedido" data-aviso></p>
    </div>
    <div class="navegacao" data-etapa="3">
      <button type="button" class="secundario" id="btn-voltar-2">Voltar aos dados do envio</button>
    </div>

  </section>
  <footer class="suave" style="text-align:center;margin:24px 0 8px;font-size:0.8rem;color:var(--suave)"><a href="/termos">Termos de uso</a> · <a href="/privacidade">Privacidade</a></footer>
</main>
<nav class="barra-inferior" id="barra-inferior" aria-label="Navegação principal" hidden>
  <button type="button" class="barra-item ativo" id="barra-cotar">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 11l9-7 9 7v9H3z"/></svg>
    <span>Cotar</span>
  </button>
  <a class="barra-item" href="/conta">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>
    <span>Minha conta</span>
  </a>
  <a class="barra-item" href="https://cliquefrete.com.br/faq.html" target="_blank" rel="noopener">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/></svg>
    <span>Ajuda</span>
  </a>
</nav>

<script>
(function () {
  function $(id) { return document.getElementById(id); }

  function api(caminho, corpo, metodo) {
    var opcoes = { method: metodo || (corpo ? "POST" : "GET"), headers: { "Content-Type": "application/json" }, credentials: "same-origin" };
    if (corpo) opcoes.body = JSON.stringify(corpo);
    return fetch(caminho, opcoes).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (dados) {
        return { ok: r.ok, status: r.status, dados: dados };
      });
    });
  }

  function mostrar(secao) {
    $("entrar").hidden = secao !== "entrar";
    $("cotar").hidden = secao !== "cotar";
    $("barra-inferior").hidden = secao !== "cotar";
  }

  // Mensagens de cotação, nota e pedido aparecem só no aviso do topo (verde ou vermelho). Valor vazio limpa o aviso.
  var avisoOrigem = null; // qual mensagem está no topo; só ela pode apagar o aviso
  function texto(el, valor) {
    el.textContent = valor;
    // E-mail e acesso também aparecem no cartão do desktop (ids com sufixo -d).
    var copia = el.id ? document.getElementById(el.id + "-d") : null;
    if (copia) copia.textContent = valor;
    if (el.hasAttribute("data-aviso")) {
      if (!valor) {
        if (avisoOrigem === el) { $("aviso-topo").hidden = true; avisoOrigem = null; }
        return;
      }
      avisoOrigem = el;
      avisar(valor, el.classList.contains("erro") ? "erro" : (el.classList.contains("ok") ? "ok" : "info"));
    }
  }

  // Aviso fixo no topo: resposta do envio, da etiqueta ou do cancelamento aparece sem precisar rolar a tela.
  function avisar(valor, tipo) {
    var a = $("aviso-topo");
    a.className = "aviso-topo " + (tipo || "info");
    $("aviso-texto").textContent = valor;
    // Ações antigas (liberar nota, baixar/cancelar etiqueta) saem com a mensagem anterior.
    $("btn-liberar").hidden = true;
    var acoesAntigas = document.getElementById("acoes-envia");
    if (acoesAntigas) acoesAntigas.parentNode.removeChild(acoesAntigas);
    a.hidden = false;
  }

  function reais(valor) {
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  // A data é gravada em UTC; aqui ela é mostrada no horário de Brasília.
  function formatarAcesso(acessoAte) {
    var d = new Date(acessoAte.replace(" ", "T") + "Z");
    var partes = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
    var p = function (t) { var x = partes.find(function (y) { return y.type === t; }); return x ? x.value : ""; };
    return p("day") + "/" + p("month") + "/" + p("year") + " às " + p("hour") + ":" + p("minute");
  }

  function mostrarUso(uso) {
    if (!uso) return;
    if (uso.ativo && uso.acesso_ate) {
      texto($("uso"), "Acesso ativo até " + formatarAcesso(uso.acesso_ate) + " (horário de Brasília)");
    } else if (uso.motivo === "administrador") {
      texto($("uso"), "Conta de administrador: acesso sem prazo.");
    } else if (uso.motivo === "sem_franquia") {
      texto($("uso"), "Seu acesso gratuito já foi usado. Escolha um plano para continuar.");
    } else {
      texto($("uso"), "Seu período de acesso terminou. Escolha um plano para continuar.");
    }
  }

  function entrarNaTela(usuario, uso) {
    texto($("quem"), usuario.email);
    mostrarUso(uso);
    mostrar("cotar");
    irEtapa(1);
  }

  function iniciar() {
    api("/api/auth/eu").then(function (r) {
      if (r.ok) {
        entrarNaTela(r.dados, r.dados.uso);
        api("/api/conta/dados").then(function (d) {
          var dados = d.ok && d.dados ? d.dados.dados : null;
          if (dados && dados.origem_cep && !$("cepOrigem").value) { $("cepOrigem").value = dados.origem_cep; buscarDica("cepOrigem", "dicaOrigem"); }
        });
      }
      else mostrar("entrar");
    }).catch(function () { mostrar("entrar"); });
  }

  // Etapa 1: pedir o código
  $("form-email").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("email").value.trim();
    var botao = $("btn-codigo");
    botao.disabled = true;
    texto($("msg-entrar"), "");
    api("/api/auth/codigo", { email: email }).then(function (r) {
      botao.disabled = false;
      if (!r.ok) { texto($("msg-entrar"), r.dados.erro || "Não consegui enviar o código."); return; }
      $("form-codigo").hidden = false;
      $("codigo").focus();
    }).catch(function () {
      botao.disabled = false;
      texto($("msg-entrar"), "Sem conexão. Tente de novo.");
    });
  });

  // Etapa 2: confirmar o código
  $("form-codigo").addEventListener("submit", function (e) {
    e.preventDefault();
    var botao = $("btn-entrar");
    botao.disabled = true;
    texto($("msg-entrar"), "");
    api("/api/auth/verificar", { email: $("email").value.trim(), codigo: $("codigo").value.trim() }).then(function (r) {
      botao.disabled = false;
      if (!r.ok) { texto($("msg-entrar"), r.dados.erro || "Código incorreto."); return; }
      $("codigo").value = "";
      iniciar();
    }).catch(function () {
      botao.disabled = false;
      texto($("msg-entrar"), "Sem conexão. Tente de novo.");
    });
  });

  $("btn-sair-d").addEventListener("click", function () {
    api("/api/auth/sair", {}).then(function () { location.reload(); });
  });
  $("btn-sair").addEventListener("click", function () {
    api("/api/auth/sair", {}).then(function () { location.reload(); });
  });

  function numero(id) {
    var v = Number(String($("" + id).value).replace(",", "."));
    return v;
  }

  var resultadoAtual = [];
  var ordem = { campo: "preco", sentido: 1 };

  // Botões "Menor preço" e "Menor prazo": marca o que está em uso.
  function atualizarOrdenacao() {
    var botoes = document.querySelectorAll("#ordenacao button");
    for (var i = 0; i < botoes.length; i++) {
      botoes[i].classList.toggle("ativa", botoes[i].getAttribute("data-campo") === ordem.campo);
    }
  }

  // Cada opção vira um cartão: transportadora, serviço, prazo, preço e o botão de envio.
  function desenharLinhas() {
    var corpo = $("linhas");
    corpo.textContent = "";
    var lista = resultadoAtual.slice().sort(function (a, b) {
      var va = a[ordem.campo], vb = b[ordem.campo];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va - vb) * ordem.sentido;
    });
    lista.forEach(function (c, i) {
      var destaque = i === 0 && ordem.sentido === 1;
      var cartao = document.createElement("div");
      cartao.className = "opcao" + (destaque ? " melhor" : "");
      if (destaque) {
        var etiqueta = document.createElement("span");
        etiqueta.className = "etiqueta";
        etiqueta.textContent = ordem.campo === "preco" ? "Menor preço" : "Menor prazo";
        cartao.appendChild(etiqueta);
      }
      var topo = document.createElement("div");
      topo.className = "opcao-topo";
      var esquerda = document.createElement("div");
      var nome = document.createElement("div");
      nome.className = "opcao-nome";
      nome.textContent = c.transportadora || "-";
      var servico = document.createElement("div");
      servico.className = "opcao-servico";
      servico.textContent = c.origem + " · " + (c.servico || "-");
      esquerda.appendChild(nome);
      esquerda.appendChild(servico);
      var direita = document.createElement("div");
      var preco = document.createElement("div");
      preco.className = "opcao-preco";
      preco.textContent = reais(c.preco);
      var prazo = document.createElement("div");
      prazo.className = "opcao-prazo";
      prazo.textContent = c.prazoDias != null ? c.prazoDias + " dia(s)" : (c.prazoTexto || "-");
      direita.appendChild(preco);
      direita.appendChild(prazo);
      topo.appendChild(esquerda);
      topo.appendChild(direita);
      cartao.appendChild(topo);
      var botaoCarrinho = document.createElement("button");
      botaoCarrinho.type = "button";
      botaoCarrinho.textContent = c.origem === "Envia" ? "Comprar etiqueta" : "Enviar ao carrinho";
      botaoCarrinho.addEventListener("click", function () { enviarCarrinho(c, botaoCarrinho); });
      cartao.appendChild(botaoCarrinho);
      corpo.appendChild(cartao);
    });
    if (!lista.length) {
      var vazio = document.createElement("p");
      vazio.className = "suave";
      vazio.textContent = "Nenhuma opção encontrada para esses dados.";
      corpo.appendChild(vazio);
    }
    atualizarOrdenacao();
  }

  function mostrarResultados(resultado) {
    resultadoAtual = resultado.cotacoes || [];
    atualizarFreteNota();
    ordem = { campo: "preco", sentido: 1 };
    desenharLinhas();
    var avisos = $("avisos");
    avisos.textContent = "";
    (resultado.avisos || []).forEach(function (a) {
      var li = document.createElement("li");
      li.textContent = a;
      avisos.appendChild(li);
    });
    $("resultado").hidden = false;
    liberarPasso3(true);
    irEtapa(3);
  }

  // Escolher "Menor preço" ou "Menor prazo" reordena os cartões.
  $("ordenacao").addEventListener("click", function (e) {
    var botao = e.target.closest ? e.target.closest("button[data-campo]") : null;
    if (!botao) return;
    ordem = { campo: botao.getAttribute("data-campo"), sentido: 1 };
    desenharLinhas();
  });

  // Etapa 3: cotar
  $("form-cotacao").addEventListener("submit", function (e) {
    e.preventDefault();
    var botao = $("btn-cotar");
    botao.disabled = true;
    texto($("msg-cotar"), "Consultando as transportadoras...");
    $("msg-cotar").className = "msg";
    var corpo = {
      cepOrigem: $("cepOrigem").value,
      cepDestino: !dadosNfe && $("dce-cep").value.trim() ? $("dce-cep").value.trim() : $("cepDestino").value,
      peso: numero("peso"),
      comprimento: numero("comprimento"),
      largura: numero("largura"),
      altura: numero("altura"),
      valorDeclarado: numero("valor") || 0,
      destinatario: dadosNfe ? dadosNfe.destinatario : null
    };
    api("/api/cotacoes/todas", corpo).then(function (r) {
      botao.disabled = false;
      if (r.status === 401) { location.reload(); return; }
      if (!r.ok) {
        $("msg-cotar").className = "msg erro";
        texto($("msg-cotar"), r.dados.erro || "Não consegui cotar. Tente de novo.");
        avisar($("msg-cotar").textContent, "erro");
        return;
      }
      texto($("msg-pedido"), "");
      $("retorno").hidden = true;
      $("msg-cotar").className = "msg ok";
      texto($("msg-cotar"), "Cotação concluída: " + (r.dados.cotacoes || []).length + " opção(ões) encontrada(s).");
      ultimaEntrada = { peso: corpo.peso, comprimento: corpo.comprimento, largura: corpo.largura, altura: corpo.altura };
      mostrarUso(r.dados.uso);
      mostrarResultados(r.dados);
    }).catch(function () {
      botao.disabled = false;
      $("msg-cotar").className = "msg erro";
      texto($("msg-cotar"), "Sem conexão. Tente de novo.");
      avisar($("msg-cotar").textContent, "erro");
    });
  });

  // Mostra rua, bairro e cidade do CEP digitado, para o usuário conferir antes de cotar.
  var cacheCep = {};
  function mostrarDica(dica, info) {
    dica.className = info.erro ? "dica erro" : "dica";
    dica.textContent = info.erro ? "CEP não encontrado." : info.texto;
  }
  function buscarDica(campoId, dicaId) {
    var dica = $(dicaId);
    var cep = $(campoId).value.replace(/[^0-9]/g, "");
    if (cep.length !== 8) { dica.className = "dica"; dica.textContent = ""; return; }
    if (cacheCep[cep]) { mostrarDica(dica, cacheCep[cep]); return; }
    dica.className = "dica";
    dica.textContent = "Buscando endereço...";
    fetch("https://viacep.com.br/ws/" + cep + "/json/")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if ($(campoId).value.replace(/[^0-9]/g, "") !== cep) return; // já mudou o CEP
        var info = d.erro
          ? { erro: true }
          : { texto: [d.logradouro, d.bairro, d.localidade + "/" + d.uf].filter(Boolean).join(", ") };
        cacheCep[cep] = info;
        mostrarDica(dica, info);
      })
      .catch(function () { dica.className = "dica"; dica.textContent = ""; });
  }
  ["cepOrigem", "cepDestino"].forEach(function (id) {
    var dicaId = id === "cepOrigem" ? "dicaOrigem" : "dicaDestino";
    $(id).addEventListener("input", function () { buscarDica(id, dicaId); });
    $(id).addEventListener("blur", function () { buscarDica(id, dicaId); });
  });

  // ---- Envio ao carrinho ----
  var dadosNfe = null;
  var ultimaEntrada = null;
  var pendenteLiberar = null; // envio bloqueado por nota já enviada: { origem, chave }
  var CAMPOS_DESTINATARIO = [
    ["name", "Nome"], ["document", "CPF ou CNPJ"], ["phone", "Telefone"], ["postalCode", "CEP"],
    ["street", "Rua"], ["number", "Número"], ["complement", "Complemento"], ["district", "Bairro"],
    ["city", "Cidade"], ["state", "UF"], ["email", "E-mail"]
  ];

  function montarCamposNfe(destinatario) {
    var area = $("campos-nfe");
    area.textContent = "";
    CAMPOS_DESTINATARIO.forEach(function (c) {
      var rotulo = document.createElement("label");
      rotulo.textContent = "Destinatário: " + c[1];
      var input = document.createElement("input");
      input.value = destinatario[c[0]] || "";
      input.addEventListener("input", function () { dadosNfe.destinatario[c[0]] = input.value; });
      rotulo.appendChild(input);
      area.appendChild(rotulo);
    });
    area.hidden = false;
  }

  function processarArquivo(arquivo) {
    if (!arquivo) return; // cancelar a escolha do arquivo não apaga nada
    zerarDados(); // nova nota: apaga a cotação anterior e os campos preenchidos antes
    irEtapa(1);
    $("retorno").hidden = true;
    texto($("msg-pedido"), "");
    $("corpo-nfe").hidden = false;
    marcarBotao("btn-nfe", false);
    $("corpo-dados").hidden = false;
    marcarBotao("btn-dados", false);
    $("msg-carrinho").className = "msg";
    texto($("msg-carrinho"), "Lendo a nota...");
    arquivo.text().then(function (xml) {
      return api("/api/carrinho/ler-nfe", { xml: xml });
    }).then(function (r) {
      if (r.status === 401) { location.reload(); return; }
      if (!r.ok) {
        $("msg-carrinho").className = "msg erro";
        texto($("msg-carrinho"), r.dados.erro || "Não consegui ler esta nota.");
        avisar($("msg-carrinho").textContent, "erro");
        return;
      }
      dadosNfe = r.dados.dados;
      atualizarDce();
      mostrarResumoNota(dadosNfe);
      atualizarFreteNota();
      montarCamposNfe(dadosNfe.destinatario);
      if (dadosNfe.destinatario.postalCode) {
        $("cepDestino").value = dadosNfe.destinatario.postalCode;
        buscarDica("cepDestino", "dicaDestino");
      }
      // Origem = endereço do remetente da nota (de onde a mercadoria sai).
      if (dadosNfe.remetente.postalCode) {
        $("cepOrigem").value = dadosNfe.remetente.postalCode;
        buscarDica("cepOrigem", "dicaOrigem");
      }
      if (dadosNfe.valorDeclarado != null) $("valor").value = String(dadosNfe.valorDeclarado);
      if (dadosNfe.pesoNota > 0 && !$("peso").value) $("peso").value = String(dadosNfe.pesoNota);
      $("msg-carrinho").className = "msg ok";
      texto($("msg-carrinho"), "Nota lida. Confira os dados do destinatário e escolha a opção de frete na tabela.");
      desenharLinhas();
    }).catch(function () {
      $("msg-carrinho").className = "msg erro";
      texto($("msg-carrinho"), "Não consegui ler o arquivo. Tente de novo.");
      avisar($("msg-carrinho").textContent, "erro");
    });
  }

  $("arquivoNfe").addEventListener("change", function (e) {
    processarArquivo(e.target.files && e.target.files[0]);
  });

  // Arrastar o XML para a área pontilhada também lê a nota.
  var zonaNfe = $("zona-nfe");
  zonaNfe.addEventListener("dragover", function (e) { e.preventDefault(); zonaNfe.classList.add("sobre"); });
  zonaNfe.addEventListener("dragleave", function () { zonaNfe.classList.remove("sobre"); });
  zonaNfe.addEventListener("drop", function (e) {
    e.preventDefault();
    zonaNfe.classList.remove("sobre");
    processarArquivo(e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files[0] : null);
  });

  function enviarCarrinho(c, botao) {
    if (!ultimaEntrada) return;
    var dados = dadosNfe;
    if (!dados) {
      dados = montarDce();
      if (typeof dados === "string") {
        $("retorno").hidden = false;
        $("btn-liberar").hidden = true;
        $("msg-pedido").className = "msg erro";
        texto($("msg-pedido"), dados);
        avisar(dados, "erro");
        return;
      }
    }
    var pergunta = c.origem === "Envia"
      ? "Comprar a etiqueta na Envia (" + (c.servico || "-") + ", " + reais(c.preco) + ")?\\n\\n" +
        "O valor é debitado do seu saldo Envia agora. Se algo der errado, você pode cancelar a etiqueta aqui e o valor volta para o seu saldo."
      : "Criar o pedido no carrinho da " + c.origem + " (" + (c.servico || "-") + ", " + reais(c.preco) + ")?\\n\\n" +
        "O pedido fica aguardando pagamento no painel da transportadora. Nada é pago aqui.";
    if (!confirm(pergunta)) return;
    botao.disabled = true;
    $("retorno").hidden = false;
    $("btn-liberar").hidden = true;
    pendenteLiberar = null;
    $("msg-pedido").className = "msg";
    texto($("msg-pedido"), "Criando o pedido...");
    avisar("Criando o pedido...", "info");
    var corpo = {
      dados: dados,
      volume: ultimaEntrada,
      servico: {
        origem: c.origem, transportadora: c.transportadora, servico: c.servico, codigo: c.codigo,
        codigoTransportadora: c.codigoTransportadora, precoBase: c.precoBase, preco: c.preco, prazoDias: c.prazoDias
      }
    };
    api("/api/carrinho/enviar", corpo).then(function (r) {
      botao.disabled = false;
      if (r.status === 401) { location.reload(); return; }
      if (!r.ok) {
        $("msg-pedido").className = "msg erro";
        texto($("msg-pedido"), r.dados.erro || "Não consegui criar o pedido.");
        avisar($("msg-pedido").textContent, "erro");
        if (r.status === 409 && dadosNfe) {
          pendenteLiberar = { origem: c.origem, chave: dadosNfe.chave };
          $("btn-liberar").hidden = false;
        }
        return;
      }
      if (c.origem === "Envia") {
        mostrarEtiquetaEnvia(r.dados);
      } else {
        $("msg-pedido").className = "msg ok";
        texto($("msg-pedido"), "Pedido criado no carrinho da " + r.dados.transportadora + " (código " + r.dados.codigo +
          "). Pague no painel da transportadora.");
        avisar($("msg-pedido").textContent, "ok");
      }
      zerarDados();
      limparDce();
      $("arquivoNfe").value = "";
      irEtapa(3); // mostra o resultado do pedido
    }).catch(function () {
      botao.disabled = false;
      $("msg-pedido").className = "msg erro";
      texto($("msg-pedido"), "Sem conexão. Confira no painel da transportadora antes de tentar de novo.");
      avisar($("msg-pedido").textContent, "erro");
    });
  }

  // ---- Etiqueta comprada na Envia: link para baixar e cancelamento ----

  function mostrarEtiquetaEnvia(d) {
    $("msg-pedido").className = "msg ok";
    texto($("msg-pedido"), "Etiqueta comprada na Envia. Rastreio " + d.codigo + ". Debitado do seu saldo: " + reais(d.preco) + ".");
    avisar($("msg-pedido").textContent, "ok");
    var area = document.getElementById("acoes-envia");
    if (!area) {
      area = document.createElement("div");
      area.id = "acoes-envia";
      area.style.marginTop = "10px";
      $("aviso-acoes").appendChild(area);
    }
    area.textContent = "";
    if (d.etiqueta) {
      var link = document.createElement("a");
      link.href = d.etiqueta;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Baixar etiqueta (PDF)";
      link.style.marginRight = "14px";
      area.appendChild(link);
    }
    var cancelar = document.createElement("button");
    cancelar.type = "button";
    cancelar.className = "secundario";
    cancelar.textContent = "Cancelar etiqueta";
    cancelar.addEventListener("click", function () { cancelarEtiquetaEnvia(d.codigo, cancelar); });
    area.appendChild(cancelar);
  }

  function cancelarEtiquetaEnvia(rastreio, botao) {
    if (!confirm("Cancelar a etiqueta " + rastreio + " na Envia? Se a Envia aceitar, o valor volta para o seu saldo.")) return;
    botao.disabled = true;
    api("/api/carrinho/cancelar-envia", { trackingNumber: rastreio }).then(function (r) {
      botao.disabled = false;
      if (r.status === 401) { location.reload(); return; }
      if (!r.ok) {
        $("msg-pedido").className = "msg erro";
        texto($("msg-pedido"), r.dados.erro || "Não consegui cancelar a etiqueta.");
        avisar($("msg-pedido").textContent, "erro");
        return;
      }
      $("msg-pedido").className = "msg ok";
      texto($("msg-pedido"), r.dados.saldoDevolvido
        ? "Etiqueta cancelada. O valor voltou para o seu saldo na Envia."
        : "Etiqueta cancelada. A Envia ainda não confirmou a devolução do saldo; confira no painel dela.");
      $("acoes-envia").textContent = "";
      avisar($("msg-pedido").textContent, "ok");
    }).catch(function () {
      botao.disabled = false;
      $("msg-pedido").className = "msg erro";
      texto($("msg-pedido"), "Sem conexão. Confira no painel da Envia antes de tentar de novo.");
      avisar($("msg-pedido").textContent, "erro");
    });
  }

  // ---- Etapas: 1 nota fiscal, 2 dados do envio, 3 opções de frete ----
  var etapaAtual = 1;

  // Mostra só a etapa pedida. Usa classe própria para não brigar com o atributo hidden dos cartões.
  function irEtapa(n) {
    etapaAtual = n;
    if (n < 3) $("aviso-topo").hidden = true;
    var itens = document.querySelectorAll("[data-etapa]");
    for (var i = 0; i < itens.length; i++) {
      itens[i].classList.toggle("etapa-oculta", Number(itens[i].getAttribute("data-etapa")) !== n);
    }
    var passos = document.querySelectorAll("#etapas button");
    for (var j = 0; j < passos.length; j++) {
      passos[j].classList.toggle("ativa", Number(passos[j].getAttribute("data-passo")) === n);
    }
    window.scrollTo(0, 0);
  }

  // A terceira etapa só fica disponível depois de uma cotação.
  function liberarPasso3(liberar) {
    document.querySelector('#etapas button[data-passo="3"]').disabled = !liberar;
  }

  $("etapas").addEventListener("click", function (e) {
    var botao = e.target.closest ? e.target.closest("button[data-passo]") : null;
    if (!botao || botao.disabled) return;
    irEtapa(Number(botao.getAttribute("data-passo")));
  });
  $("btn-ir-2").addEventListener("click", function () { irEtapa(2); });
  $("btn-voltar-1").addEventListener("click", function () { irEtapa(1); });
  $("btn-voltar-2").addEventListener("click", function () { irEtapa(2); });

  // Resumo da nota lida: número, remetente, destinatário, valor e frete em cartões pequenos.
  function mostrarResumoNota(d) {
    var caixa = $("nfe-resumo");
    caixa.textContent = "";
    var grade = document.createElement("div");
    grade.className = "resumo-nota";
    [
      ["Nota", d.nota.numero || "-"],
      ["Remetente", d.remetente ? d.remetente.name : "-"],
      ["Destinatário", d.destinatario ? d.destinatario.name : "-"],
      ["Valor", d.valorDeclarado != null ? reais(d.valorDeclarado) : "-"],
      ["Frete na nota", d.valorFrete > 0 ? reais(d.valorFrete) : "não informado"]
    ].forEach(function (par) {
      var item = document.createElement("div");
      var rotulo = document.createElement("small");
      rotulo.textContent = par[0];
      var valor = document.createElement("span");
      valor.textContent = par[1] || "-";
      item.appendChild(rotulo);
      item.appendChild(valor);
      grade.appendChild(item);
    });
    caixa.appendChild(grade);
  }

  // ---- Recolher os cartões de nota e de dados ----
  var SETA_BAIXO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  ["btn-nfe", "btn-dados"].forEach(function (id) { $(id).innerHTML = SETA_BAIXO; });

  // Seta gira quando o cartão está fechado; o texto fica só para leitores de tela e dica ao passar o mouse.
  function marcarBotao(botaoId, fechado) {
    var b = $(botaoId);
    var rotulo = fechado ? "Mostrar" : "Recolher";
    b.classList.toggle("fechado", fechado);
    b.setAttribute("aria-label", rotulo);
    b.title = rotulo;
  }
  function alternarCard(corpoId, botaoId) {
    var corpo = $(corpoId);
    corpo.hidden = !corpo.hidden;
    marcarBotao(botaoId, corpo.hidden);
  }
  $("btn-nfe").addEventListener("click", function () { alternarCard("corpo-nfe", "btn-nfe"); });
  $("btn-dados").addEventListener("click", function () { alternarCard("corpo-dados", "btn-dados"); });

  $("barra-cotar").addEventListener("click", function () { irEtapa(1); });

  // Menu do usuário: abre pelo ícone; fecha pelo fundo ou pela tecla Esc.
  function abrirMenuUsuario(abrir) {
    $("menu-usuario").hidden = !abrir;
    $("fundo-menu").hidden = !abrir;
    $("btn-usuario").setAttribute("aria-expanded", abrir ? "true" : "false");
  }
  $("btn-usuario").addEventListener("click", function () { abrirMenuUsuario($("menu-usuario").hidden); });
  $("fundo-menu").addEventListener("click", function () { abrirMenuUsuario(false); });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") abrirMenuUsuario(false); });

  $("btn-liberar").addEventListener("click", function () {
    if (!pendenteLiberar) return;
    var botao = $("btn-liberar");
    var origem = pendenteLiberar.origem;
    if (!confirm("Confirme que o pedido já foi cancelado ou apagado no painel da " + origem + ". Isso libera a nota para um novo envio. Continuar?")) return;
    botao.disabled = true;
    api("/api/carrinho/pedidos", pendenteLiberar, "DELETE").then(function (r) {
      botao.disabled = false;
      if (!r.ok) {
        $("msg-pedido").className = "msg erro";
        texto($("msg-pedido"), r.dados.erro || "Não consegui liberar a nota.");
        return;
      }
      pendenteLiberar = null;
      botao.hidden = true;
      $("msg-pedido").className = "msg ok";
      texto($("msg-pedido"), "Nota liberada. Você já pode enviar de novo.");
    }).catch(function () {
      botao.disabled = false;
      $("msg-pedido").className = "msg erro";
      texto($("msg-pedido"), "Sem conexão. Tente liberar de novo.");
    });
  });

  // Zera os campos preenchidos e a cotação anterior. O CEP de origem vem do cadastro e é mantido.
  function zerarDados() {
    ["cepDestino", "peso", "valor", "comprimento", "largura", "altura"].forEach(function (id) { $(id).value = ""; });
    $("dicaDestino").className = "dica";
    $("dicaDestino").textContent = "";
    dadosNfe = null;
    atualizarDce();
    $("cepDestino").value = $("dce-cep").value.trim();
    ultimaEntrada = null;
    resultadoAtual = [];
    $("resultado").hidden = true;
    $("avisos").textContent = "";
    $("msg-cotar").className = "msg erro";
    texto($("msg-cotar"), "");
    $("nfe-resumo").textContent = "";
    $("campos-nfe").textContent = "";
    $("campos-nfe").hidden = true;
    $("resumo-nfe").textContent = "";
    $("resumo-dados").textContent = "";
    $("frete-nota").textContent = "";
    desenharLinhas();
    liberarPasso3(false);
  }

  // Mostra o frete cobrado na nota acima da tabela, para comparar com as opções.
  function atualizarFreteNota() {
    $("frete-nota").textContent = dadosNfe && dadosNfe.valorFrete > 0
      ? "Frete cobrado na nota: " + reais(dadosNfe.valorFrete)
      : (dadosNfe ? "A nota não informa valor de frete." : "");
  }

  // ---- Envio sem nota (DC-e) ----
  var CAMPOS_DCE = ["dce-nome", "dce-documento", "dce-cep", "dce-logradouro", "dce-numero", "dce-complemento", "dce-bairro", "dce-cidade", "dce-uf", "dce-telefone", "dce-email"];

  function atualizarDce() {
    $("secao-dce").hidden = !!dadosNfe;
  }

  function criarItem() {
    var linha = document.createElement("div");
    linha.className = "dce-item";
    var campos = [["descricao", "Produto", "text"], ["quantidade", "Quantidade", "numeric"], ["valor", "Valor unitário (R$)", "decimal"]];
    campos.forEach(function (d) {
      var rotulo = document.createElement("label");
      rotulo.appendChild(document.createTextNode(d[1] + " "));
      var campo = document.createElement("input");
      campo.type = "text";
      campo.setAttribute("data-campo", d[0]);
      campo.setAttribute("inputmode", d[2]);
      campo.addEventListener("input", atualizarTotalDce);
      rotulo.appendChild(campo);
      linha.appendChild(rotulo);
    });
    var remover = document.createElement("button");
    remover.type = "button";
    remover.className = "secundario icone-acao";
    remover.setAttribute("aria-label", "Remover produto");
    remover.title = "Remover produto";
    remover.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>';
    remover.addEventListener("click", function () {
      linha.parentNode.removeChild(linha);
      atualizarTotalDce();
    });
    linha.appendChild(remover);
    $("dce-itens").appendChild(linha);
  }

  function lerItensDce() {
    var linhas = $("dce-itens").querySelectorAll(".dce-item");
    var itens = [];
    for (var i = 0; i < linhas.length; i++) {
      var valores = {};
      var entradas = linhas[i].querySelectorAll("input");
      for (var j = 0; j < entradas.length; j++) valores[entradas[j].getAttribute("data-campo")] = entradas[j].value.trim();
      itens.push({
        descricao: valores.descricao,
        quantidade: Number(String(valores.quantidade).replace(",", ".")),
        valorUnitario: Number(String(valores.valor).replace(",", "."))
      });
    }
    return itens;
  }

  function totalDce() {
    return lerItensDce().reduce(function (soma, i) {
      return i.quantidade > 0 && i.valorUnitario > 0 ? soma + i.quantidade * i.valorUnitario : soma;
    }, 0);
  }

  // O total dos produtos vira o valor declarado da cotação (quando não há nota).
  function atualizarTotalDce() {
    var total = totalDce();
    texto($("dce-total"), total > 0 ? "Total declarado: " + reais(total) : "");
    if (!dadosNfe && total > 0) $("valor").value = String(Math.round(total * 100) / 100);
  }

  function montarDce() {
    var itens = lerItensDce();
    if (!itens.length) return "Adicione pelo menos um produto na DC-e.";
    return {
      semNota: true,
      chave: "",
      destinatario: {
        name: $("dce-nome").value.trim(),
        document: $("dce-documento").value.trim(),
        stateRegister: "",
        street: $("dce-logradouro").value.trim(),
        number: $("dce-numero").value.trim(),
        complement: $("dce-complemento").value.trim(),
        district: $("dce-bairro").value.trim(),
        city: $("dce-cidade").value.trim(),
        state: $("dce-uf").value.trim(),
        postalCode: $("dce-cep").value.trim(),
        phone: $("dce-telefone").value.trim(),
        email: $("dce-email").value.trim()
      },
      itens: itens,
      valorDeclarado: totalDce(),
      pesoNota: 0,
      valorFrete: 0,
      nota: { numero: "", serie: "", data: "", cfop: "" },
      remetente: null
    };
  }

  function limparDce() {
    CAMPOS_DCE.forEach(function (id) { $(id).value = ""; });
    $("cepDestino").value = "";
    $("dce-itens").textContent = "";
    texto($("dce-total"), "");
    texto($("dicaDce"), "");
    criarItem();
  }

  $("btn-add-item").addEventListener("click", function () { criarItem(); });

  // Preenche rua, bairro, cidade e UF pelo CEP, como na tela de Meus dados.
  // Sem nota, o CEP de destino da cotação é o mesmo CEP informado na DC-e.
  var ultimoCepDce = "";

  // Busca rua, bairro, cidade e UF assim que o CEP tem 8 dígitos (ou ao sair do campo).
  function buscarCepDce() {
    var cep = $("dce-cep").value.replace(/\\D/g, "");
    if (cep.length !== 8 || cep === ultimoCepDce) return;
    ultimoCepDce = cep;
    fetch("https://viacep.com.br/ws/" + cep + "/json/").then(function (r) { return r.json(); }).then(function (d) {
      if (cep !== ultimoCepDce) return; // o usuário já digitou outro CEP
      if (d.erro) { texto($("dicaDce"), "CEP não encontrado. Preencha o endereço à mão."); return; }
      texto($("dicaDce"), "");
      $("dce-logradouro").value = d.logradouro || "";
      $("dce-bairro").value = d.bairro || "";
      $("dce-cidade").value = d.localidade || "";
      $("dce-uf").value = d.uf || "";
    }).catch(function () { texto($("dicaDce"), "Não consegui buscar o CEP. Preencha o endereço à mão."); });
  }

  $("dce-cep").addEventListener("input", function () {
    if (!dadosNfe) $("cepDestino").value = $("dce-cep").value.trim();
    buscarCepDce();
  });

  $("dce-cep").addEventListener("blur", function () {
    if (!dadosNfe) buscarDica("cepDestino", "dicaDestino");
    // CEP apagado: limpa o endereço que veio da busca (número e complemento são digitados à mão, ficam).
    if ($("dce-cep").value.replace(/\\D/g, "") === "") {
      ultimoCepDce = "";
      ["dce-logradouro", "dce-bairro", "dce-cidade", "dce-uf"].forEach(function (id) { $(id).value = ""; });
      texto($("dicaDce"), "");
      return;
    }
    // Ao sair do campo, busca de novo mesmo que o CEP seja o mesmo: o endereço é sempre atualizado.
    ultimoCepDce = "";
    buscarCepDce();
  });

  criarItem();
  iniciar();
})();
</script>
</body>
</html>`;
