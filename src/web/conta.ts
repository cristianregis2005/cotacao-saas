// Tela "Minha conta": cadastrar, trocar e remover os tokens das transportadoras.
export const CONTA_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Minha conta</title>
<link rel="icon" type="image/svg+xml" href="https://cliquefrete.com.br/assets/favicon.svg">
<style>
  :root { --fundo: #f6f7f9; --cartao: #ffffff; --texto: #1d2330; --suave: #5b6372; --borda: #d8dce3; --destaque: #2563eb; --ok: #15803d; --erro: #b42318; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --fundo: #0f1218; --cartao: #171c26; --texto: #e6e9ef; --suave: #9aa3b2; --borda: #2a3140; --destaque: #5b8cff; --ok: #4ade80; --erro: #f87171; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--fundo); color: var(--texto); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.4; }
  main { max-width: 760px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 1.5rem; margin: 8px 0 16px; }
  h2 { font-size: 1.1rem; margin: 0 0 12px; }
  a { color: var(--destaque); }
  .cartao { background: var(--cartao); border: 1px solid var(--borda); border-radius: 10px; padding: 16px; margin-bottom: 16px; }
  .linha { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .suave { color: var(--suave); font-size: 0.9rem; }
  .status { font-size: 0.85rem; color: var(--suave); }
  .status.ok { color: var(--ok); }
  label { display: block; font-size: 0.9rem; color: var(--suave); margin-bottom: 10px; }
  input { display: block; width: 100%; margin-top: 4px; padding: 10px; font-size: 1rem; border: 1px solid var(--borda); border-radius: 8px; background: var(--fundo); color: var(--texto); }
  input[readonly] { color: var(--suave); letter-spacing: 2px; cursor: default; }
  .grade { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
  @media (max-width: 520px) { .grade { grid-template-columns: 1fr; } }
  button, .botao { display: inline-block; padding: 11px 16px; font: inherit; font-size: 1rem; font-weight: 600; border: 0; border-radius: 8px; background: var(--destaque); color: #fff; cursor: pointer; text-decoration: none; }
  button[disabled] { opacity: 0.6; cursor: wait; }
  button.secundario, .botao.secundario { background: transparent; color: var(--destaque); border: 1px solid var(--borda); }
  button.perigo { background: transparent; color: var(--erro); border: 1px solid var(--borda); }
  .msg { min-height: 1em; margin: 10px 0 0; font-size: 0.8rem; color: var(--suave); }
  .msg.erro { color: var(--erro); }
  .msg.ok { color: var(--ok); }
  .token-linha { display: flex; gap: 8px; align-items: flex-end; }
  .token-linha label { flex: 1; min-width: 0; margin-bottom: 0; }
  .icone { width: 40px; height: 40px; flex: 0 0 40px; display: inline-flex; align-items: center; justify-content: center; padding: 0; margin: 0; background: transparent; color: var(--texto); border: 1px solid var(--borda); }
  .icone:hover { border-color: var(--destaque); }
  .icone.perigo { color: var(--erro); }
  .icone svg { width: 20px; height: 20px; }
  .bloco-token { border: 1px solid var(--borda); border-radius: 10px; padding: 12px; margin-top: 10px; background: var(--fundo); }
  .bloco-token input[type="radio"] { display: inline-block; width: auto; margin: 0 6px 0 0; }
  .bloco-token .msg:empty { margin: 0; min-height: 0; }
  .cabecalho, .fundo-menu, .folha-menu, .barra-inferior { display: none; }
  @media (max-width: 767px) {
    .card-desktop { display: none; }
    body { padding-bottom: 110px; }
    .cabecalho { display: flex; justify-content: space-between; align-items: center; padding: 4px 0 12px; }
    .logo-cabecalho { height: 60px; width: auto; display: block; mix-blend-mode: multiply; }
    .icone-usuario { width: 44px; height: 44px; padding: 0; display: flex; align-items: center; justify-content: center; border: 0; border-radius: 22px; background: var(--destaque); color: #fff; }
    .icone-usuario svg { width: 20px; height: 20px; }
    .fundo-menu { display: block; position: fixed; inset: 0; z-index: 40; background: rgba(0,0,0,0.45); }
    .folha-menu { display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; max-width: 720px; margin: 0 auto; flex-direction: column; gap: 6px; padding: 12px 16px calc(24px + env(safe-area-inset-bottom)); background: var(--cartao); border-radius: 18px 18px 0 0; }
    .item-menu { width: 100%; min-height: 52px; margin-top: 6px; padding: 0 14px; text-align: left; border: 1px solid var(--borda); border-radius: 10px; background: var(--cartao); color: var(--texto); font: inherit; font-size: 16px; font-weight: 600; }
    .item-menu.perigo { color: var(--erro); }
    .barra-inferior { display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; justify-content: space-around; background: var(--destaque); padding: 6px 8px calc(8px + env(safe-area-inset-bottom)); }
    .barra-item { flex: 1; max-width: 140px; min-height: 52px; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border: 0; border-radius: 10px; background: transparent; color: #fff; font: inherit; font-size: 12px; text-decoration: none; cursor: pointer; }
    .barra-item svg { width: 22px; height: 22px; }
    .barra-item.ativo { font-weight: 600; background: rgba(255,255,255,0.18); }
  }
  .item-token { padding: 12px 0; border-top: 1px solid var(--borda); }
  .item-token .acoes { display: flex; gap: 8px; flex-wrap: wrap; }
  .item-token .acoes button { padding: 8px 12px; font-size: 0.9rem; }
  .form-token { margin-top: 12px; }
  .form-token .acoes { display: flex; gap: 8px; }
  .form-token .acoes button { padding: 10px 14px; }
  .dica-campo { font-size: 0.8rem; color: var(--suave); margin: -4px 0 12px; }
  [hidden] { display: none !important; }
  .cabecalho { display: flex; justify-content: flex-start; align-items: center; padding: 4px 0 0; }
  .logo-cabecalho { height: 72px; width: auto; display: block; mix-blend-mode: multiply; }
  .cabecalho + h1 { margin-top: 4px; }
  .cabecalho .icone-usuario { display: none; }
  @media (max-width: 767px) { .logo-cabecalho { height: 90px; } .cabecalho { justify-content: space-between; } .cabecalho .icone-usuario { display: flex; } }
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
  <h1>Minha conta</h1>
  <section class="cartao linha card-desktop">
    <span class="suave">Tokens, dados e agências de coleta.</span>
    <a class="botao secundario" href="/">Voltar para as cotações</a>
  </section>
  <p class="msg erro" id="msg-acesso" hidden></p>
  <div id="assinatura"></div>
  <div id="dados"></div>
  <div id="cartoes"></div>
  <div id="agencias"></div>
  <div id="excluir"></div>
</main>
<div class="fundo-menu" id="fundo-menu" hidden></div>
<section class="folha-menu" id="menu-usuario" role="dialog" aria-modal="true" aria-label="Menu do usuário" hidden>
  <span class="suave">Conectado como</span>
  <strong id="quem"></strong>
  <small id="uso" class="suave"></small>
  <button type="button" class="item-menu perigo" id="btn-sair">Sair</button>
</section>
<nav class="barra-inferior" id="barra-inferior" aria-label="Navegação principal">
  <a class="barra-item" href="/">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 11l9-7 9 7v9H3z"/></svg>
    <span>Cotar</span>
  </a>
  <a class="barra-item ativo" href="/conta" aria-current="page">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>
    <span>Minha conta</span>
  </a>
  <a class="barra-item" href="/ajuda">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/></svg>
    <span>Ajuda</span>
  </a>
</nav>
<script>
(function () {
  function $(id) { return document.getElementById(id); }

  // Menu do usuário (mesmo comportamento da página de cotação).
  function abrirMenuUsuario(abrir) {
    $("menu-usuario").hidden = !abrir;
    $("fundo-menu").hidden = !abrir;
    $("btn-usuario").setAttribute("aria-expanded", abrir ? "true" : "false");
  }
  $("btn-usuario").addEventListener("click", function () { abrirMenuUsuario($("menu-usuario").hidden); });
  $("fundo-menu").addEventListener("click", function () { abrirMenuUsuario(false); });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") abrirMenuUsuario(false); });

  $("btn-sair").addEventListener("click", function () {
    fetch("/api/auth/sair", { method: "POST", credentials: "same-origin" }).then(function () { location.href = "/"; });
  });

  // A data é gravada em UTC; aqui ela é mostrada no horário de Brasília.
  function formatarAcesso(acessoAte) {
    var d = new Date(acessoAte.replace(" ", "T") + "Z");
    var partes = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
    var p = function (t) { var x = partes.find(function (y) { return y.type === t; }); return x ? x.value : ""; };
    return p("day") + "/" + p("month") + "/" + p("year") + " às " + p("hour") + ":" + p("minute");
  }
  // Aviso de vencimento: em vermelho quando faltam 7 dias ou menos, ou quando o acesso já acabou.
  function avaliarAcesso(uso) {
    if (uso.ativo && uso.acesso_ate) {
      var faltam = new Date(uso.acesso_ate.replace(" ", "T") + "Z").getTime() - Date.now();
      var alerta = faltam <= 7 * 86400000;
      return { texto: "Seu acesso vai até " + formatarAcesso(uso.acesso_ate) + " (horário de Brasília)." + (alerta ? " Efetue o pagamento para obter mais 30 dias de acesso!" : ""), alerta: alerta };
    }
    if (uso.motivo === "administrador") return { texto: "Conta de administrador: acesso sem prazo.", alerta: false };
    if (uso.motivo === "sem_franquia") return { texto: "Seu acesso gratuito já foi usado. Escolha um plano para continuar.", alerta: true };
    return { texto: "Seu acesso terminou. Efetue o pagamento para obter mais 30 dias de acesso!", alerta: true };
  }

  function mostrarUso(uso) {
    if (!uso) return;
    var resumo = $("assinatura-status");
    if (resumo) {
      var a = avaliarAcesso(uso);
      resumo.textContent = a.texto;
      resumo.style.color = a.alerta ? "var(--erro)" : "";
      resumo.style.fontWeight = a.alerta ? "600" : "";
    }
    if (uso.ativo && uso.acesso_ate) {
      $("uso").textContent = "Acesso ativo até " + formatarAcesso(uso.acesso_ate) + " (horário de Brasília)";
    } else if (uso.motivo === "administrador") {
      $("uso").textContent = "Conta de administrador: acesso sem prazo.";
    } else if (uso.motivo === "sem_franquia") {
      $("uso").textContent = "Seu acesso gratuito já foi usado. Escolha um plano para continuar.";
    } else {
      $("uso").textContent = "Seu período de acesso terminou. Escolha um plano para continuar.";
    }
  }
  api("/api/auth/eu").then(function (r) {
    if (!r.ok) return;
    $("quem").textContent = r.dados.email;
    mostrarUso(r.dados.uso);
  });

  function api(caminho, corpo, metodo) {
    var opcoes = { method: metodo || (corpo ? "POST" : "GET"), headers: { "Content-Type": "application/json" }, credentials: "same-origin" };
    if (corpo) opcoes.body = JSON.stringify(corpo);
    return fetch(caminho, opcoes).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (dados) {
        return { ok: r.ok, status: r.status, dados: dados };
      });
    });
  }

  function icone(caminho) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + caminho + '</svg>';
  }
  var LAPIS = icone('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>');
  var CONFIRMAR = icone('<path d="M20 6 9 17l-5-5"/>');
  var CANCELAR = icone('<path d="M18 6 6 18M6 6l12 12"/>');
  var LIXEIRA = icone('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>');

  // Um único cartão "Tokens": uma linha por transportadora. O formulário só aparece ao trocar ou adicionar.
  function montarTokens(lista) {
    var cartao = document.createElement("section");
    cartao.className = "cartao";
    var titulo = document.createElement("h2");
    titulo.textContent = "Tokens";
    cartao.appendChild(titulo);
    var ajuda = document.createElement("p");
    ajuda.className = "suave";
    ajuda.textContent = "Chaves de cada plataforma usadas nas cotações. Os tokens são guardados criptografados.";
    cartao.appendChild(ajuda);
    lista.forEach(function (t) { cartao.appendChild(montarItem(t)); });
    return cartao;
  }

  function montarItem(t) {
    var item = document.createElement("div");
    item.className = "item-token";

    var linha = document.createElement("div");
    linha.className = "linha";
    var info = document.createElement("div");
    var nome = document.createElement("strong");
    nome.textContent = t.nome;
    var situacao = document.createElement("div");
    situacao.className = "status" + (t.configurado ? " ok" : "");
    situacao.textContent = t.configurado ? "Configurado · final " + t.final_token : "Não configurado";
    info.appendChild(nome);
    info.appendChild(situacao);

    var acoes = document.createElement("div");
    acoes.className = "acoes";
    var botaoEditar = document.createElement("button");
    botaoEditar.type = "button";
    botaoEditar.className = "secundario";
    botaoEditar.textContent = t.configurado ? "Trocar" : "Adicionar";
    acoes.appendChild(botaoEditar);
    var botaoRemover = null;
    if (t.configurado) {
      botaoRemover = document.createElement("button");
      botaoRemover.type = "button";
      botaoRemover.className = "perigo";
      botaoRemover.textContent = "Remover";
      acoes.appendChild(botaoRemover);
    }
    linha.appendChild(info);
    linha.appendChild(acoes);
    item.appendChild(linha);

    var form = document.createElement("form");
    form.className = "form-token";
    form.hidden = true;
    var rotuloToken = document.createElement("label");
    rotuloToken.textContent = "Token da " + t.nome;
    var inputToken = document.createElement("input");
    inputToken.type = "password";
    inputToken.autocomplete = "off";
    inputToken.placeholder = "Cole o token aqui";
    inputToken.required = true;
    rotuloToken.appendChild(inputToken);
    var rotuloContato = document.createElement("label");
    rotuloContato.textContent = "E-mail de contato (opcional)";
    var inputContato = document.createElement("input");
    inputContato.type = "email";
    inputContato.value = t.contato || "";
    rotuloContato.appendChild(inputContato);
    var dica = document.createElement("p");
    dica.className = "dica-campo";
    dica.textContent = "Se ficar em branco, usamos o seu e-mail.";
    var botoesForm = document.createElement("div");
    botoesForm.className = "acoes";
    var botaoSalvar = document.createElement("button");
    botaoSalvar.type = "submit";
    botaoSalvar.textContent = "Salvar";
    var botaoCancelar = document.createElement("button");
    botaoCancelar.type = "button";
    botaoCancelar.className = "secundario";
    botaoCancelar.textContent = "Cancelar";
    botoesForm.appendChild(botaoSalvar);
    botoesForm.appendChild(botaoCancelar);
    var msg = document.createElement("p");
    msg.className = "msg";
    form.appendChild(rotuloToken);
    form.appendChild(rotuloContato);
    form.appendChild(dica);
    form.appendChild(botoesForm);
    form.appendChild(msg);
    item.appendChild(form);

    function abrirForm() {
      form.hidden = false;
      acoes.hidden = true;
      inputToken.value = "";
      msg.className = "msg";
      msg.textContent = "";
      inputToken.focus();
    }
    function fecharForm() {
      form.hidden = true;
      acoes.hidden = false;
      inputToken.value = "";
      msg.className = "msg";
      msg.textContent = "";
    }

    botaoEditar.addEventListener("click", abrirForm);
    botaoCancelar.addEventListener("click", fecharForm);
    if (botaoRemover) {
      botaoRemover.addEventListener("click", function () {
        if (!confirm("Remover o token da " + t.nome + "?")) return;
        api("/api/conta/tokens/" + t.transportadora, null, "DELETE").then(function () { carregar(); });
      });
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      botaoSalvar.disabled = true;
      msg.className = "msg";
      msg.textContent = "";
      api("/api/conta/tokens/" + t.transportadora, { token: inputToken.value.trim(), contato: inputContato.value.trim() }, "PUT").then(function (r) {
        botaoSalvar.disabled = false;
        if (!r.ok) { msg.className = "msg erro"; msg.textContent = r.dados.erro || "Não consegui salvar."; return; }
        carregar();
      });
    });
    return item;
  }

  function carregar() {
    api("/api/conta/tokens").then(function (r) {
      if (!r.ok) {
        $("msg-acesso").textContent = "Entre primeiro na página inicial com seu e-mail.";
        $("msg-acesso").hidden = false;
        return;
      }
      var cartoes = $("cartoes");
      cartoes.textContent = "";
      cartoes.appendChild(montarTokens(r.dados.transportadoras));
    });
  }

  // ---- Agências de coleta da Envia ----

  var NOMES_AGENCIA = { jadlog: "Jadlog", jtexpress: "J&T Express", loggi: "Loggi" };

  function carregarAgencias() {
    api("/api/conta/agencias").then(function (r) {
      var salvas = {};
      if (r.ok) r.dados.agencias.forEach(function (a) { salvas[a.transportadora] = a; });
      var area = $("agencias");
      area.textContent = "";
      var cartao = document.createElement("section");
      cartao.className = "cartao";
      var titulo = document.createElement("h2");
      titulo.textContent = "Agências de coleta (Envia)";
      cartao.appendChild(titulo);
      var ajuda = document.createElement("p");
      ajuda.className = "suave";
      ajuda.textContent = "Escolha a agência de onde a transportadora vai coletar seu pacote. A busca usa o CEP de origem do seu cadastro.";
      cartao.appendChild(ajuda);
      Object.keys(NOMES_AGENCIA).forEach(function (codigo) {
        cartao.appendChild(montarLinhaAgencia(codigo, salvas[codigo]));
      });
      area.appendChild(cartao);
    });
  }

  function montarLinhaAgencia(codigo, salva) {
    var bloco = document.createElement("div");
    bloco.className = "bloco-token";

    var topo = document.createElement("div");
    topo.className = "linha";
    var nome = document.createElement("strong");
    nome.textContent = NOMES_AGENCIA[codigo];
    var status = document.createElement("span");
    status.className = "status" + (salva ? " ok" : "");
    status.textContent = salva ? "Escolhida: " + salva.descricao : "Não escolhida";
    topo.appendChild(nome);
    topo.appendChild(status);
    bloco.appendChild(topo);

    var acoes = document.createElement("div");
    acoes.style.marginTop = "8px";
    var escolher = document.createElement("button");
    escolher.type = "button";
    escolher.className = "secundario";
    escolher.textContent = salva ? "Trocar agência" : "Escolher agência";
    acoes.appendChild(escolher);
    if (salva) {
      var remover = document.createElement("button");
      remover.type = "button";
      remover.className = "secundario";
      remover.style.marginLeft = "6px";
      remover.textContent = "Remover";
      remover.addEventListener("click", function () {
        api("/api/conta/agencias/" + codigo, null, "DELETE").then(function () { carregarAgencias(); });
      });
      acoes.appendChild(remover);
    }
    bloco.appendChild(acoes);

    var msg = document.createElement("p");
    msg.className = "msg";
    var lista = document.createElement("div");
    lista.style.marginTop = "8px";
    bloco.appendChild(msg);
    bloco.appendChild(lista);

    escolher.addEventListener("click", function () {
      lista.textContent = "";
      msg.className = "msg";
      msg.textContent = "Buscando agências...";
      api("/api/conta/agencias/buscar/" + codigo).then(function (r) {
        if (!r.ok) { msg.className = "msg erro"; msg.textContent = r.dados.erro || "Não consegui buscar as agências."; return; }
        var agencias = r.dados.agencias;
        msg.textContent = agencias.length ? "Escolha uma agência:" : "Nenhuma agência encontrada perto do seu CEP de origem.";
        agencias.forEach(function (a) {
          var label = document.createElement("label");
          label.style.display = "block";
          var radio = document.createElement("input");
          radio.type = "radio";
          radio.name = "agencia-" + codigo;
          radio.value = a.branch_code;
          radio.setAttribute("data-descricao", a.descricao);
          radio.style.width = "auto";
          label.appendChild(radio);
          var texto = " " + a.descricao + (a.distancia !== null ? " (" + a.distancia.toFixed(1) + " km)" : "") + " · " + a.branch_code;
          label.appendChild(document.createTextNode(texto));
          lista.appendChild(label);
        });
        if (agencias.length) {
          var salvar = document.createElement("button");
          salvar.type = "button";
          salvar.textContent = "Salvar agência";
          salvar.addEventListener("click", function () {
            var marcada = lista.querySelector('input[name="agencia-' + codigo + '"]:checked');
            if (!marcada) { msg.className = "msg erro"; msg.textContent = "Marque uma agência antes de salvar."; return; }
            api("/api/conta/agencias/" + codigo, { branch_code: marcada.value, descricao: marcada.getAttribute("data-descricao") }, "PUT").then(function (res) {
              if (!res.ok) { msg.className = "msg erro"; msg.textContent = res.dados.erro || "Não consegui salvar."; return; }
              carregarAgencias();
            });
          });
          lista.appendChild(salvar);
        }
      });
    });
    return bloco;
  }

  var CAMPOS = [
    ["nome", "Nome completo", "text"],
    ["empresa", "Empresa (opcional)", "text"],
    ["documento", "CPF ou CNPJ", "text"],
    ["telefone", "Telefone com DDD", "tel"],
    ["origem_cep", "CEP de origem", "text"],
    ["origem_logradouro", "Rua / Avenida", "text"],
    ["origem_numero", "Número", "text"],
    ["origem_complemento", "Complemento (opcional)", "text"],
    ["origem_bairro", "Bairro", "text"],
    ["origem_cidade", "Cidade", "text"],
    ["origem_uf", "UF", "text"]
  ];

  function montarDados(dados) {
    var cartao = document.createElement("section");
    cartao.className = "cartao";
    var titulo = document.createElement("h2");
    titulo.textContent = "Meus dados";
    cartao.appendChild(titulo);

    var form = document.createElement("form");
    var grade = document.createElement("div");
    grade.className = "grade";
    var inputs = {};
    CAMPOS.forEach(function (c) {
      var rotulo = document.createElement("label");
      rotulo.textContent = c[1];
      var input = document.createElement("input");
      input.type = c[2];
      input.value = dados[c[0]] || "";
      rotulo.appendChild(input);
      grade.appendChild(rotulo);
      inputs[c[0]] = input;
    });
    form.appendChild(grade);

    var botao = document.createElement("button");
    botao.type = "submit";
    botao.textContent = "Salvar dados";
    form.appendChild(botao);

    var msg = document.createElement("p");
    msg.className = "msg";
    form.appendChild(msg);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var corpo = {};
      CAMPOS.forEach(function (c) { corpo[c[0]] = inputs[c[0]].value.trim(); });
      botao.disabled = true;
      msg.className = "msg";
      msg.textContent = "";
      api("/api/conta/dados", corpo, "PUT").then(function (r) {
        botao.disabled = false;
        msg.className = "msg " + (r.ok ? "ok" : "erro");
        msg.textContent = r.ok ? "Dados salvos." : (r.dados.erro || "Não consegui salvar.");
      });
    });

    // Ao digitar um CEP completo, busca rua, bairro, cidade e UF.
    var ultimoCep = "";
    function buscarCep() {
      var cep = inputs.origem_cep.value.replace(/[^0-9]/g, "");
      if (cep.length !== 8 || cep === ultimoCep) return;
      ultimoCep = cep;
      fetch("https://viacep.com.br/ws/" + cep + "/json/")
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (cep !== ultimoCep) return; // o usuário já digitou outro CEP
          if (d.erro) {
            msg.className = "msg erro";
            msg.textContent = "CEP não encontrado. Preencha o endereço à mão.";
            return;
          }
          inputs.origem_logradouro.value = d.logradouro || "";
          inputs.origem_bairro.value = d.bairro || "";
          inputs.origem_cidade.value = d.localidade || "";
          inputs.origem_uf.value = d.uf || "";
          msg.className = "msg";
          msg.textContent = "Endereço encontrado. Confira e informe o número.";
        })
        .catch(function () {
          ultimoCep = "";
          msg.className = "msg erro";
          msg.textContent = "Não consegui buscar o CEP agora. Preencha o endereço à mão.";
        });
    }
    inputs.origem_cep.addEventListener("input", buscarCep);
    inputs.origem_cep.addEventListener("blur", buscarCep);

    cartao.appendChild(form);
    return cartao;
  }

  // Cartão de acesso: gera a cobrança de 30 dias e leva a pessoa para a página de pagamento do Asaas.
  function montarAssinatura() {
    var cartao = document.createElement("section");
    cartao.className = "cartao";
    var titulo = document.createElement("h2");
    titulo.textContent = "Controle de Acesso";
    var resumo = document.createElement("p");
    resumo.id = "assinatura-status";
    resumo.className = "suave";
    var botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = "Pagar R$ 19,90";
    var msg = document.createElement("p");
    msg.className = "msg";
    botao.addEventListener("click", function () {
      botao.disabled = true;
      msg.className = "msg";
      msg.textContent = "Gerando o pagamento...";
      api("/api/pagamentos/assinar", {}, "POST").then(function (r) {
        if (r.ok && r.dados.link) { location.href = r.dados.link; return; }
        botao.disabled = false;
        msg.className = "msg erro";
        msg.textContent = r.dados.erro || "Não consegui gerar o pagamento agora.";
      });
    });
    cartao.appendChild(titulo);
    cartao.appendChild(resumo);
    cartao.appendChild(botao);
    cartao.appendChild(msg);
    $("assinatura").appendChild(cartao);
  }

  function carregarDados() {
    api("/api/conta/dados").then(function (r) {
      if (!r.ok) return;
      var area = $("dados");
      area.textContent = "";
      area.appendChild(montarDados(r.dados.dados || {}));
    });
  }

  function montarExcluir() {
    var cartao = document.createElement("section");
    cartao.className = "cartao";
    var titulo = document.createElement("h2");
    titulo.textContent = "Excluir minha conta";
    var descricao = document.createElement("p");
    descricao.className = "suave";
    descricao.textContent = "Seus dados pessoais, tokens, cotações e pedidos serão apagados e não será possível desfazer. Seu e-mail e CPF/CNPJ continuam registrados para evitar novas franquias gratuitas.";
    var botao = document.createElement("button");
    botao.type = "button";
    botao.className = "perigo";
    botao.textContent = "Excluir minha conta";
    var msg = document.createElement("p");
    msg.className = "msg";
    botao.addEventListener("click", function () {
      var resposta = prompt("Para confirmar, digite EXCLUIR:");
      if (resposta !== "EXCLUIR") {
        msg.className = "msg erro";
        msg.textContent = resposta === null ? "" : "Confirmação incorreta. Nada foi excluído.";
        return;
      }
      botao.disabled = true;
      api("/api/conta", { confirmar: "EXCLUIR" }, "DELETE").then(function (r) {
        if (r.ok) { location.href = "/"; return; }
        botao.disabled = false;
        msg.className = "msg erro";
        msg.textContent = r.dados.erro || "Não consegui excluir a conta.";
      });
    });
    cartao.appendChild(titulo);
    cartao.appendChild(descricao);
    cartao.appendChild(botao);
    cartao.appendChild(msg);
    $("excluir").appendChild(cartao);
  }

  carregar();
  montarAssinatura();
  carregarDados();
  carregarAgencias();
  montarExcluir();
})();
</script>
</body>
</html>`;
