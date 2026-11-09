// Página do administrador: usuários, planos e tokens das transportadoras de cada cliente.
export const ADMIN_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Administração</title>
<style>
  :root { --fundo: #f6f7f9; --cartao: #ffffff; --texto: #1d2330; --suave: #5b6372; --borda: #d8dce3; --destaque: #2563eb; --ok: #15803d; --erro: #b42318; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --fundo: #0f1218; --cartao: #171c26; --texto: #e6e9ef; --suave: #9aa3b2; --borda: #2a3140; --destaque: #5b8cff; --ok: #4ade80; --erro: #f87171; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--fundo); color: var(--texto); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .casca { display: grid; grid-template-columns: 220px minmax(0, 1fr); min-height: 100vh; }
  .menu-lateral { background: var(--cartao); border-right: 1px solid var(--borda); padding: 16px 12px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
  .menu-lateral a.marca-admin { display: block; padding: 0; margin: 0 0 16px 4px; background: none; }
  .menu-lateral a.marca-admin:hover { background: none; }
  .marca-admin img { height: 64px; width: auto; display: block; }
  .menu-lateral a { display: block; padding: 9px 12px; border-radius: 8px; color: var(--texto); text-decoration: none; margin-bottom: 4px; }
  .menu-lateral a:hover { background: var(--fundo); }
  .menu-lateral a.ativo { background: var(--destaque); color: #fff; }
  .menu-lateral .submenu { margin: 0 0 4px 14px; }
  .menu-lateral .submenu a { font-size: 0.9rem; }
  main { max-width: 1200px; width: 100%; padding: 16px 24px; }
  @media (max-width: 760px) {
    .casca { grid-template-columns: 1fr; }
    .menu-lateral { position: sticky; top: 0; z-index: 5; height: auto; overflow: visible; border-right: 0; border-bottom: 1px solid var(--borda); padding: 8px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
    .menu-lateral a { margin: 0; white-space: nowrap; }
    .menu-lateral a.marca-admin { margin: 0 8px 0 0; }
    .marca-admin img { height: 40px; }
    .menu-lateral .submenu { display: flex; gap: 4px; margin: 0 0 0 4px; }
    main { padding: 16px; }
  }
  h1 { font-size: 1.4rem; }
  h2 { font-size: 1.1rem; margin: 0 0 12px; }
  .cartao { background: var(--cartao); border: 1px solid var(--borda); border-radius: 10px; padding: 16px; margin-bottom: 16px; overflow-x: auto; }
  .linha { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
  th, td { text-align: left; padding: 9px 8px; border-bottom: 1px solid var(--borda); white-space: nowrap; }
  th { color: var(--suave); font-size: 0.85rem; }
  select, button, input { font: inherit; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--borda); background: var(--fundo); color: var(--texto); }
  button { background: var(--destaque); color: #fff; border: 0; font-weight: 600; cursor: pointer; }
  button.secundario { background: transparent; color: var(--destaque); border: 1px solid var(--borda); }
  button.perigo { background: transparent; color: var(--erro); border: 1px solid var(--borda); }
  button[disabled] { opacity: 0.6; }
  label { display: block; font-size: 0.9rem; color: var(--suave); margin-bottom: 10px; }
  label input { display: block; width: 100%; margin-top: 4px; }
  .grade { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
  @media (max-width: 520px) { .grade { grid-template-columns: 1fr; } }
  .msg { margin: 10px 0 0; min-height: 1em; font-size: 0.8rem; color: var(--suave); }
  .erro { color: var(--erro); }
  .ok { color: var(--ok); }
  .suave { color: var(--suave); font-size: 0.9rem; }
  .status { font-size: 0.9rem; color: var(--suave); }
  .status.ok { color: var(--ok); }
  .bloco-token { border: 1px solid var(--borda); border-radius: 8px; padding: 12px; margin-top: 12px; }
  .token-linha { display: flex; gap: 8px; align-items: flex-end; }
  .token-linha label { flex: 1; min-width: 0; margin: 0; }
  .token-linha input { height: 42px; }
  input[readonly] { color: var(--suave); letter-spacing: 2px; cursor: default; }
  .icone { width: 42px; height: 42px; flex: 0 0 42px; display: inline-flex; align-items: center; justify-content: center; padding: 0; margin: 0; background: transparent; color: var(--texto); border: 1px solid var(--borda); }
  .icone:hover { border-color: var(--destaque); }
  .icone.perigo { color: var(--erro); }
  .icone svg { width: 20px; height: 20px; }
  .interruptor { position: relative; display: inline-block; width: 46px; height: 26px; margin: 0; }
  .interruptor input { position: absolute; opacity: 0; width: 0; height: 0; margin: 0; display: block; }
  .interruptor .trilho { position: absolute; inset: 0; background: var(--borda); border-radius: 26px; cursor: pointer; transition: background 0.2s; }
  .interruptor .trilho::before { content: ""; position: absolute; width: 20px; height: 20px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
  .interruptor input:checked + .trilho { background: var(--ok); }
  .interruptor input:checked + .trilho::before { transform: translateX(20px); }
  .interruptor input:focus-visible + .trilho { outline: 2px solid var(--destaque); outline-offset: 2px; }
  .interruptor input:disabled + .trilho { opacity: 0.6; cursor: default; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<div class="casca">
<nav class="menu-lateral" aria-label="Menu do administrador">
  <a class="marca-admin" href="https://cliquefrete.com.br/" aria-label="Clique Frete - site"><img src="https://cliquefrete.com.br/assets/logo.png" alt="Clique Frete"></a>
  <a href="#usuarios" data-menu="usuarios">Usuários</a>
  <a href="#planos" data-menu="planos">Planos</a>
  <a href="#transportadoras" data-menu="transportadoras">Transportadoras</a>
  <a href="#historico" data-menu="registros">Registros</a>
  <div class="submenu" id="submenu-registros" hidden>
    <a href="#historico" data-menu="historico">Histórico</a>
    <a href="#auditoria" data-menu="auditoria">Auditoria</a>
  </div>
</nav>
<main>
  <h1>Administração</h1>
  <p class="msg erro" id="msg-acesso" hidden></p>

  <section id="secao" hidden>
    <div data-painel="usuarios">
    <div class="cartao" id="lista-usuarios">
      <h2>Usuários</h2>
      <table>
        <thead><tr><th>E-mail</th><th>Nome</th><th>Plano</th><th>Criado em</th><th></th></tr></thead>
        <tbody id="linhas-usuarios"></tbody>
      </table>
      <p class="msg" id="msg"></p>
    </div>
    </div>

    <div data-painel="historico">
    <div class="cartao" id="secao-historico">
      <h2>Histórico de cotações</h2>
      <form class="grade" id="form-historico">
        <label>De
          <input type="date" id="hist-inicio">
        </label>
        <label>Até
          <input type="date" id="hist-fim">
        </label>
        <label>E-mail do cliente
          <input id="hist-email" placeholder="parte do e-mail">
        </label>
        <div>
          <button type="submit" id="btn-filtrar-historico">Filtrar</button>
          <button type="button" class="secundario" id="btn-limpar-historico">Limpar</button>
        </div>
      </form>
      <p class="msg" id="msg-historico"></p>
      <table>
        <thead><tr><th>Data (UTC)</th><th>Cliente</th><th>Origem</th><th>Destino</th><th>Peso</th><th>Medidas</th><th>Valor declarado</th><th>Opções</th><th>Menor preço</th><th>Avisos</th><th>Nota fiscal</th></tr></thead>
        <tbody id="linhas-historico"></tbody>
      </table>
    </div>
    </div>

    <div data-painel="transportadoras">
    <div class="cartao" id="secao-transportadoras">
      <h2>Transportadoras</h2>
      <p class="suave">Desligue uma plataforma inteira ou uma transportadora dentro dela, para todos os clientes. A lista de transportadoras aparece conforme elas são cotadas. Desligada, ela não é cotada e não aceita pedido.</p>
      <table>
        <thead><tr><th>Transportadora</th><th>Situação</th><th></th></tr></thead>
        <tbody id="linhas-transportadoras"></tbody>
      </table>
      <p class="msg" id="msg-transportadoras"></p>
    </div>
    </div>

    <div data-painel="auditoria">
    <div class="cartao" id="secao-auditoria">
      <h2>Auditoria</h2>
      <p class="suave">Ações feitas pelos administradores no painel.</p>
      <form class="grade" id="form-auditoria">
        <label>De
          <input type="date" id="aud-inicio">
        </label>
        <label>Até
          <input type="date" id="aud-fim">
        </label>
        <label>E-mail do cliente
          <input id="aud-cliente" placeholder="parte do e-mail">
        </label>
        <label>Ação
          <select id="aud-acao">
            <option value="">Todas</option>
            <option value="plano_criado">Plano criado</option>
            <option value="plano_editado">Plano editado</option>
            <option value="plano_alterado">Plano do cliente alterado</option>
            <option value="dados_editados">Dados do cliente editados</option>
            <option value="token_salvo">Token salvo</option>
            <option value="token_removido">Token removido</option>
            <option value="transportadora_ligada">Transportadora ligada</option>
            <option value="transportadora_desligada">Transportadora desligada</option>
          </select>
        </label>
        <div>
          <button type="submit">Filtrar</button>
          <button type="button" class="secundario" id="btn-limpar-auditoria">Limpar</button>
        </div>
      </form>
      <p class="msg" id="msg-auditoria"></p>
      <table>
        <thead><tr><th>Data (UTC)</th><th>Administrador</th><th>Cliente</th><th>Ação</th><th>Detalhe</th></tr></thead>
        <tbody id="linhas-auditoria"></tbody>
      </table>
    </div>
    </div>

    <section class="cartao" id="painel-dados" hidden>
      <div class="linha">
        <h2 id="titulo-dados">Dados do cliente</h2>
        <button type="button" class="secundario" id="btn-fechar-dados">Fechar</button>
      </div>
      <form id="form-dados">
        <div class="grade">
          <label>Nome
            <input id="dados-nome" required maxlength="120">
          </label>
          <label>Empresa (opcional)
            <input id="dados-empresa" maxlength="120">
          </label>
          <label>CPF ou CNPJ
            <input id="dados-documento" inputmode="numeric" required>
          </label>
          <label>Telefone com DDD
            <input id="dados-telefone" inputmode="tel" required>
          </label>
          <label>CEP de origem
            <input id="dados-cep" inputmode="numeric" required>
          </label>
          <label>UF
            <input id="dados-uf" maxlength="2" required>
          </label>
          <label>Logradouro
            <input id="dados-logradouro" maxlength="120" required>
          </label>
          <label>Número
            <input id="dados-numero" maxlength="20" required>
          </label>
          <label>Complemento (opcional)
            <input id="dados-complemento" maxlength="60">
          </label>
          <label>Bairro
            <input id="dados-bairro" maxlength="80" required>
          </label>
          <label>Cidade
            <input id="dados-cidade" maxlength="80" required>
          </label>
        </div>
        <button type="submit" id="btn-salvar-dados">Salvar dados</button>
        <p class="msg" id="msg-dados"></p>
      </form>
    </section>

    <section class="cartao" id="painel-tokens" hidden>
      <div class="linha">
        <h2 id="titulo-tokens">Tokens</h2>
        <button type="button" class="secundario" id="btn-fechar-tokens">Fechar</button>
      </div>
      <p class="suave">Você vê só os 4 últimos caracteres de cada token. O valor completo nunca aparece depois de salvo.</p>
      <div id="cartoes-tokens"></div>
    </section>

    <div data-painel="planos">
    <div class="cartao">
      <h2>Planos</h2>
      <table>
        <thead><tr><th>Código</th><th>Nome</th><th>Preço</th><th>Acesso</th><th></th></tr></thead>
        <tbody id="linhas-planos"></tbody>
      </table>
    </div>

    <form class="cartao" id="form-plano">
      <h2 id="titulo-form">Novo plano</h2>
      <div class="grade">
        <label>Código (ex.: pro)
          <input id="plano-id" required maxlength="30">
        </label>
        <label>Nome
          <input id="plano-nome" required maxlength="60">
        </label>
        <label>Preço mensal (R$)
          <input id="plano-preco" inputmode="decimal" placeholder="0,00" required>
        </label>
        <p class="ajuda">Acesso por prazo: gratuito 7 dias; planos pagos 30 dias; sem limite de cotações.</p>
      </div>
      <button type="submit" id="btn-salvar-plano">Salvar plano</button>
      <button type="button" class="secundario" id="btn-cancelar" hidden>Cancelar edição</button>
      <p class="msg" id="msg-plano"></p>
    </form>
    </div>
  </section>
</main>
</div>
<script>
(function () {
  var planos = [];
  var editando = false;
  var clienteAtual = null;

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

  function acessoNegado(texto) {
    $("msg-acesso").textContent = texto;
    $("msg-acesso").hidden = false;
  }

  function reais(centavos) {
    return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function descricaoLimite() {
    return "Acesso por prazo";
  }

  function celula(texto) {
    var td = document.createElement("td");
    td.textContent = texto;
    return td;
  }

  function desenharUsuarios(usuarios) {
    var corpo = $("linhas-usuarios");
    corpo.textContent = "";
    usuarios.forEach(function (u) {
      var tr = document.createElement("tr");
      tr.appendChild(celula(u.email + (u.is_admin ? " (admin)" : "")));
      tr.appendChild(celula(u.nome || "-"));

      var tdPlano = document.createElement("td");
      var select = document.createElement("select");
      planos.forEach(function (p) {
        var op = document.createElement("option");
        op.value = p.id;
        op.textContent = p.nome + " (" + descricaoLimite() + ")";
        if (p.id === (u.plano_id || "gratuito")) op.selected = true;
        select.appendChild(op);
      });
      tdPlano.appendChild(select);
      tr.appendChild(tdPlano);

      tr.appendChild(celula(u.criado_em ? u.criado_em.slice(0, 10) : "-"));

      var tdAcao = document.createElement("td");
      var botao = document.createElement("button");
      botao.type = "button";
      botao.textContent = "Salvar";
      botao.addEventListener("click", function () {
        botao.disabled = true;
        api("/api/admin/usuarios/" + encodeURIComponent(u.id) + "/plano", { plano_id: select.value }).then(function (r) {
          botao.disabled = false;
          $("msg").className = "msg " + (r.ok ? "ok" : "erro");
          $("msg").textContent = r.ok ? "Plano de " + u.email + " atualizado." : (r.dados.erro || "Não consegui salvar.");
        });
      });
      var tokens = document.createElement("button");
      tokens.type = "button";
      tokens.className = "secundario";
      tokens.textContent = "Tokens";
      tokens.style.marginLeft = "6px";
      tokens.addEventListener("click", function () { abrirTokens(u); });
      var dados = document.createElement("button");
      dados.type = "button";
      dados.className = "secundario";
      dados.textContent = "Dados";
      dados.style.marginLeft = "6px";
      dados.addEventListener("click", function () { abrirDados(u); });
      tdAcao.appendChild(botao);
      tdAcao.appendChild(dados);
      tdAcao.appendChild(tokens);
      tr.appendChild(tdAcao);
      corpo.appendChild(tr);
    });
  }

  function desenharPlanos() {
    var corpo = $("linhas-planos");
    corpo.textContent = "";
    planos.forEach(function (p) {
      var tr = document.createElement("tr");
      tr.appendChild(celula(p.id));
      tr.appendChild(celula(p.nome));
      tr.appendChild(celula(reais(p.preco_centavos)));
      tr.appendChild(celula(descricaoLimite()));
      var tdAcao = document.createElement("td");
      var botao = document.createElement("button");
      botao.type = "button";
      botao.className = "secundario";
      botao.textContent = "Editar";
      botao.addEventListener("click", function () { preencherFormulario(p); });
      tdAcao.appendChild(botao);
      tr.appendChild(tdAcao);
      corpo.appendChild(tr);
    });
  }

  function preencherFormulario(p) {
    editando = true;
    $("titulo-form").textContent = "Editar plano " + p.id;
    $("plano-id").value = p.id;
    $("plano-id").disabled = true;
    $("plano-nome").value = p.nome;
    $("plano-preco").value = (p.preco_centavos / 100).toFixed(2).replace(".", ",");
    $("btn-cancelar").hidden = false;
    $("btn-salvar-plano").textContent = "Salvar alterações";
  }

  function limparFormulario() {
    editando = false;
    $("titulo-form").textContent = "Novo plano";
    $("form-plano").reset();
    $("plano-id").disabled = false;
    $("btn-cancelar").hidden = true;
    $("btn-salvar-plano").textContent = "Salvar plano";
  }

  $("btn-cancelar").addEventListener("click", limparFormulario);

  $("form-plano").addEventListener("submit", function (e) {
    e.preventDefault();
    var precoTexto = $("plano-preco").value.replace(",", ".").trim();
    var preco = Math.round(Number(precoTexto) * 100);
    if (precoTexto === "" || !isFinite(preco)) {
      $("msg-plano").className = "msg erro";
      $("msg-plano").textContent = "Informe o preço mensal.";
      return;
    }
    var corpo = {
      id: $("plano-id").value.trim(),
      nome: $("plano-nome").value.trim(),
      preco_centavos: preco,
      limite_cotacoes_mes: null
    };
    var caminho = editando ? "/api/admin/planos/" + encodeURIComponent(corpo.id) : "/api/admin/planos";
    var metodo = editando ? "PUT" : "POST";
    $("btn-salvar-plano").disabled = true;
    api(caminho, corpo, metodo).then(function (r) {
      $("btn-salvar-plano").disabled = false;
      $("msg-plano").className = "msg " + (r.ok ? "ok" : "erro");
      if (!r.ok) { $("msg-plano").textContent = r.dados.erro || "Não consegui salvar o plano."; return; }
      $("msg-plano").textContent = "Plano salvo.";
      limparFormulario();
      carregar();
    });
  });

  // ---- Dados cadastrais do cliente selecionado ----

  var CAMPOS_DADOS = {
    nome: "dados-nome",
    empresa: "dados-empresa",
    documento: "dados-documento",
    telefone: "dados-telefone",
    origem_cep: "dados-cep",
    origem_logradouro: "dados-logradouro",
    origem_numero: "dados-numero",
    origem_complemento: "dados-complemento",
    origem_bairro: "dados-bairro",
    origem_cidade: "dados-cidade",
    origem_uf: "dados-uf"
  };
  var dadosDoCliente = null;

  function mostrarMsgDados(texto, tipo) {
    $("msg-dados").className = "msg " + (tipo || "");
    $("msg-dados").textContent = texto;
  }

  function abrirDados(u) {
    dadosDoCliente = u.id;
    $("titulo-dados").textContent = "Dados de " + u.email;
    $("lista-usuarios").hidden = true;
    $("painel-tokens").hidden = true;
    $("painel-dados").hidden = false;
    $("painel-dados").scrollIntoView({ behavior: "smooth" });
    mostrarMsgDados("Carregando...");
    api("/api/admin/usuarios/" + encodeURIComponent(u.id) + "/dados").then(function (r) {
      if (dadosDoCliente !== u.id) return;
      if (!r.ok) { mostrarMsgDados(r.dados.erro || "Não consegui carregar os dados.", "erro"); return; }
      var d = r.dados.dados;
      Object.keys(CAMPOS_DADOS).forEach(function (campo) { $(CAMPOS_DADOS[campo]).value = d[campo] || ""; });
      mostrarMsgDados("");
    });
  }

  $("btn-fechar-dados").addEventListener("click", function () {
    dadosDoCliente = null;
    $("painel-dados").hidden = true;
    $("lista-usuarios").hidden = false;
  });

  $("form-dados").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!dadosDoCliente) return;
    var id = dadosDoCliente;
    var corpo = {};
    Object.keys(CAMPOS_DADOS).forEach(function (campo) { corpo[campo] = $(CAMPOS_DADOS[campo]).value.trim(); });
    $("btn-salvar-dados").disabled = true;
    api("/api/admin/usuarios/" + encodeURIComponent(id) + "/dados", corpo, "PUT").then(function (r) {
      $("btn-salvar-dados").disabled = false;
      if (!r.ok) { mostrarMsgDados(r.dados.erro || "Não consegui salvar os dados.", "erro"); return; }
      mostrarMsgDados("Dados salvos.", "ok");
      carregar();
    });
  });

  // ---- Tokens do cliente selecionado ----

  function abrirTokens(u) {
    clienteAtual = u;
    $("titulo-tokens").textContent = "Tokens de " + u.email;
    $("lista-usuarios").hidden = true;
    $("painel-dados").hidden = true;
    $("painel-tokens").hidden = false;
    $("painel-tokens").scrollIntoView({ behavior: "smooth" });
    carregarTokens();
  }

  $("btn-fechar-tokens").addEventListener("click", function () {
    clienteAtual = null;
    $("painel-tokens").hidden = true;
    $("lista-usuarios").hidden = false;
    $("cartoes-tokens").textContent = "";
  });

  function carregarTokens() {
    if (!clienteAtual) return;
    var id = clienteAtual.id;
    api("/api/admin/usuarios/" + encodeURIComponent(id) + "/tokens").then(function (r) {
      if (!clienteAtual || clienteAtual.id !== id) return;
      var area = $("cartoes-tokens");
      area.textContent = "";
      if (!r.ok) { area.textContent = r.dados.erro || "Não consegui carregar os tokens."; return; }
      r.dados.transportadoras.forEach(function (t) { area.appendChild(montarCartaoToken(t, id)); });
    });
  }

  function icone(caminho) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + caminho + '</svg>';
  }
  var LAPIS = icone('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>');
  var CONFIRMAR = icone('<path d="M20 6 9 17l-5-5"/>');
  var CANCELAR = icone('<path d="M18 6 6 18M6 6l12 12"/>');
  var LIXEIRA = icone('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>');

  function montarCartaoToken(t, usuarioId) {
    var bloco = document.createElement("div");
    bloco.className = "bloco-token";

    var topo = document.createElement("div");
    topo.className = "linha";
    var titulo = document.createElement("strong");
    titulo.textContent = t.nome;
    var status = document.createElement("span");
    status.className = "status" + (t.configurado ? " ok" : "");
    status.textContent = t.configurado ? "Criptografado · termina em " + t.final_token : "Não configurado";
    topo.appendChild(titulo);
    topo.appendChild(status);
    bloco.appendChild(topo);

    // Token salvo: campo com asteriscos e ícones. Em edição: salvar à esquerda, cancelar à direita.
    var editando = !t.configurado;
    var caminho = "/api/admin/usuarios/" + encodeURIComponent(usuarioId) + "/tokens/" + t.transportadora;

    var form = document.createElement("form");
    var linha = document.createElement("div");
    linha.className = "token-linha";

    var rotuloToken = document.createElement("label");
    rotuloToken.textContent = "Token da " + t.nome;
    var inputToken = document.createElement("input");
    inputToken.type = "password";
    inputToken.autocomplete = "off";
    inputToken.placeholder = "Cole o token";
    rotuloToken.appendChild(inputToken);
    linha.appendChild(rotuloToken);

    var botaoTrocar = document.createElement("button");
    botaoTrocar.className = "icone";
    var botaoRemover = document.createElement("button");
    botaoRemover.type = "button";
    botaoRemover.className = "icone perigo";
    linha.appendChild(botaoTrocar);
    linha.appendChild(botaoRemover);
    form.appendChild(linha);

    var rotuloContato = document.createElement("label");
    rotuloContato.textContent = "E-mail de contato (opcional)";
    var inputContato = document.createElement("input");
    inputContato.type = "email";
    inputContato.value = t.contato || "";
    rotuloContato.appendChild(inputContato);
    form.appendChild(rotuloContato);

    var msg = document.createElement("p");
    msg.className = "msg";
    form.appendChild(msg);

    function desenhar() {
      if (editando) {
        inputToken.readOnly = false;
        inputToken.required = true;
        botaoTrocar.type = "submit";
        botaoTrocar.innerHTML = CONFIRMAR;
        botaoTrocar.title = "Salvar token";
        botaoTrocar.setAttribute("aria-label", "Salvar token");
        botaoRemover.innerHTML = CANCELAR;
        botaoRemover.title = "Cancelar";
        botaoRemover.setAttribute("aria-label", "Cancelar");
        botaoRemover.hidden = !t.configurado;
      } else {
        inputToken.readOnly = true;
        inputToken.required = false;
        inputToken.value = "*".repeat(24);
        botaoTrocar.type = "button";
        botaoTrocar.innerHTML = LAPIS;
        botaoTrocar.title = "Trocar token";
        botaoTrocar.setAttribute("aria-label", "Trocar token");
        botaoRemover.innerHTML = LIXEIRA;
        botaoRemover.title = "Remover token";
        botaoRemover.setAttribute("aria-label", "Remover token");
        botaoRemover.hidden = false;
      }
    }

    botaoTrocar.addEventListener("click", function () {
      if (editando) return; // em edição, o envio do formulário salva
      editando = true;
      inputToken.value = "";
      msg.className = "msg";
      msg.textContent = "";
      desenhar();
      inputToken.focus();
    });

    botaoRemover.addEventListener("click", function () {
      if (editando) {
        if (!t.configurado) return;
        editando = false;
        inputToken.value = "";
        msg.className = "msg";
        msg.textContent = "";
        desenhar();
        return;
      }
      if (!confirm("Remover o token da " + t.nome + " desta conta?")) return;
      api(caminho, null, "DELETE").then(function () { carregarTokens(); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      botaoTrocar.disabled = true;
      msg.className = "msg";
      msg.textContent = "";
      api(caminho, { token: inputToken.value.trim(), contato: inputContato.value.trim() }, "PUT").then(function (r) {
        botaoTrocar.disabled = false;
        if (!r.ok) { msg.className = "msg erro"; msg.textContent = r.dados.erro || "Não consegui salvar."; return; }
        carregarTokens();
      });
    });

    bloco.appendChild(form);
    desenhar();
    return bloco;
  }

  // ---- Histórico de cotações ----

  function formatarDataHora(texto) {
    if (!texto || texto.length < 16) return texto || "-";
    var p = texto.slice(0, 10).split("-");
    return p[2] + "/" + p[1] + "/" + p[0] + " " + texto.slice(11, 16);
  }

  function formatarCep(c) {
    return c && c.length === 8 ? c.slice(0, 5) + "-" + c.slice(5) : (c || "-");
  }

  function carregarHistorico() {
    var params = [];
    var inicio = $("hist-inicio").value;
    var fim = $("hist-fim").value;
    var email = $("hist-email").value.trim();
    if (inicio) params.push("inicio=" + encodeURIComponent(inicio));
    if (fim) params.push("fim=" + encodeURIComponent(fim));
    if (email) params.push("email=" + encodeURIComponent(email));
    var caminho = "/api/admin/historico" + (params.length ? "?" + params.join("&") : "");

    $("msg-historico").className = "msg";
    $("msg-historico").textContent = "Carregando...";
    return api(caminho).then(function (r) {
      var corpo = $("linhas-historico");
      corpo.textContent = "";
      if (!r.ok) {
        $("msg-historico").className = "msg erro";
        $("msg-historico").textContent = r.dados.erro || "Não consegui carregar o histórico.";
        return;
      }
      var lista = r.dados.historico;
      var aviso = lista.length >= 300 ? " Mostrando as 300 mais recentes. Use os filtros para restringir." : "";
      $("msg-historico").className = "msg";
      $("msg-historico").textContent = (lista.length === 0 ? "Nenhuma cotação encontrada." : lista.length + (lista.length === 1 ? " cotação encontrada." : " cotações encontradas.")) + aviso;

      lista.forEach(function (h) {
        var tr = document.createElement("tr");
        tr.appendChild(celula(formatarDataHora(h.criado_em)));
        tr.appendChild(celula(h.email + (h.nome ? " · " + h.nome : "")));
        tr.appendChild(celula(formatarCep(h.cep_origem)));
        tr.appendChild(celula(formatarCep(h.cep_destino)));
        tr.appendChild(celula(h.peso + " kg"));
        tr.appendChild(celula(h.comprimento + " × " + h.largura + " × " + h.altura + " cm"));
        tr.appendChild(celula(h.valor_declarado ? reais(Math.round(h.valor_declarado * 100)) : "-"));
        tr.appendChild(celula(String(h.opcoes)));
        tr.appendChild(celula(h.menor_preco == null ? "-" : reais(Math.round(h.menor_preco * 100))));
        tr.appendChild(celula(String(h.avisos)));
        tr.appendChild(celula(h.com_nota ? "Sim" : "Não (DC-e)"));
        corpo.appendChild(tr);
      });
    });
  }

  $("form-historico").addEventListener("submit", function (e) {
    e.preventDefault();
    carregarHistorico();
  });

  $("btn-limpar-historico").addEventListener("click", function () {
    $("hist-inicio").value = "";
    $("hist-fim").value = "";
    $("hist-email").value = "";
    carregarHistorico();
  });

  // ---- Auditoria ----

  var NOMES_ACAO = {
    plano_criado: "Plano criado",
    plano_editado: "Plano editado",
    plano_alterado: "Plano do cliente alterado",
    dados_editados: "Dados do cliente editados",
    token_salvo: "Token salvo",
    token_removido: "Token removido",
    transportadora_ligada: "Transportadora ligada",
    transportadora_desligada: "Transportadora desligada"
  };

  function mostrarMsgAuditoria(texto, tipo) {
    $("msg-auditoria").className = "msg " + (tipo || "");
    $("msg-auditoria").textContent = texto;
  }

  function carregarAuditoria() {
    var params = [];
    var inicio = $("aud-inicio").value;
    var fim = $("aud-fim").value;
    var cliente = $("aud-cliente").value.trim();
    var acao = $("aud-acao").value;
    if (inicio) params.push("inicio=" + encodeURIComponent(inicio));
    if (fim) params.push("fim=" + encodeURIComponent(fim));
    if (cliente) params.push("cliente=" + encodeURIComponent(cliente));
    if (acao) params.push("acao=" + encodeURIComponent(acao));
    var caminho = "/api/admin/auditoria" + (params.length ? "?" + params.join("&") : "");

    mostrarMsgAuditoria("Carregando...");
    return api(caminho).then(function (r) {
      var corpo = $("linhas-auditoria");
      corpo.textContent = "";
      if (!r.ok) { mostrarMsgAuditoria(r.dados.erro || "Não consegui carregar a auditoria.", "erro"); return; }
      var lista = r.dados.auditoria;
      var aviso = lista.length >= 300 ? " Mostrando as 300 mais recentes. Use os filtros para restringir." : "";
      mostrarMsgAuditoria((lista.length === 0 ? "Nenhum registro encontrado." : lista.length + (lista.length === 1 ? " registro encontrado." : " registros encontrados.")) + aviso);
      lista.forEach(function (a) {
        var tr = document.createElement("tr");
        tr.appendChild(celula(formatarDataHora(a.criado_em)));
        tr.appendChild(celula(a.admin_email || "-"));
        tr.appendChild(celula(a.cliente_email || "-"));
        tr.appendChild(celula(NOMES_ACAO[a.acao] || a.acao));
        tr.appendChild(celula(a.detalhe || "-"));
        corpo.appendChild(tr);
      });
    });
  }

  $("form-auditoria").addEventListener("submit", function (e) {
    e.preventDefault();
    carregarAuditoria();
  });

  $("btn-limpar-auditoria").addEventListener("click", function () {
    $("aud-inicio").value = "";
    $("aud-fim").value = "";
    $("aud-cliente").value = "";
    $("aud-acao").value = "";
    carregarAuditoria();
  });

  // ---- Transportadoras ligadas ou desligadas ----

  function carregarTransportadoras() {
    return api("/api/admin/transportadoras").then(function (r) {
      var corpo = $("linhas-transportadoras");
      corpo.textContent = "";
      if (!r.ok) { mostrarMsgTransportadoras(r.dados.erro || "Não consegui carregar as transportadoras.", "erro"); return; }
      r.dados.transportadoras.forEach(function (t) {
        var tr = document.createElement("tr");
        var nomeCelula = celula(t.nome);
        if (t.subordinada) nomeCelula.style.paddingLeft = "28px";
        tr.appendChild(nomeCelula);
        tr.appendChild(celula(t.ativa ? "Ligada" : "Desligada"));
        var tdAcao = document.createElement("td");
        var rotulo = document.createElement("label");
        rotulo.className = "interruptor";
        var interruptor = document.createElement("input");
        interruptor.type = "checkbox";
        interruptor.setAttribute("role", "switch");
        interruptor.setAttribute("aria-label", "Ligar ou desligar " + t.nome);
        interruptor.checked = !!t.ativa;
        var trilho = document.createElement("span");
        trilho.className = "trilho";
        trilho.setAttribute("aria-hidden", "true");
        rotulo.appendChild(interruptor);
        rotulo.appendChild(trilho);
        interruptor.addEventListener("change", function () {
          var novo = interruptor.checked;
          interruptor.disabled = true;
          api("/api/admin/transportadoras/" + encodeURIComponent(t.chave), { ativa: novo }, "PUT").then(function (res) {
            interruptor.disabled = false;
            if (!res.ok) {
              interruptor.checked = !novo;
              mostrarMsgTransportadoras(res.dados.erro || "Não consegui alterar.", "erro");
              return;
            }
            mostrarMsgTransportadoras(t.nome + (novo ? " ligada." : " desligada."), "ok");
            carregarTransportadoras();
          });
        });
        tdAcao.appendChild(rotulo);
        tr.appendChild(tdAcao);
        corpo.appendChild(tr);
      });
    });
  }

  function mostrarMsgTransportadoras(texto, tipo) {
    $("msg-transportadoras").className = "msg " + (tipo || "");
    $("msg-transportadoras").textContent = texto;
  }

  var SECOES = ["usuarios", "planos", "transportadoras", "historico", "auditoria"];

  function mostrarSecao(nome) {
    if (SECOES.indexOf(nome) < 0) nome = "usuarios";
    clienteAtual = null;
    dadosDoCliente = null;
    $("painel-dados").hidden = true;
    $("painel-tokens").hidden = true;
    $("lista-usuarios").hidden = false;
    document.querySelectorAll("[data-painel]").forEach(function (el) {
      el.hidden = el.getAttribute("data-painel") !== nome;
    });
    document.querySelectorAll("[data-menu]").forEach(function (a) {
      var m = a.getAttribute("data-menu");
      a.classList.toggle("ativo", m === nome || (m === "registros" && (nome === "historico" || nome === "auditoria")));
    });
    $("submenu-registros").hidden = !(nome === "historico" || nome === "auditoria");
  }

  window.addEventListener("hashchange", function () { mostrarSecao(location.hash.slice(1)); });

  function carregar() {
    return Promise.all([api("/api/admin/usuarios"), api("/api/admin/planos")]).then(function (res) {
      if (!res[0].ok || !res[1].ok) { acessoNegado("Não consegui carregar os dados."); return; }
      planos = res[1].dados.planos;
      $("secao").hidden = false;
      desenharPlanos();
      desenharUsuarios(res[0].dados.usuarios);
      carregarHistorico();
      carregarTransportadoras();
      carregarAuditoria();
    });
  }

  api("/api/auth/eu").then(function (r) {
    if (!r.ok) { acessoNegado("Entre primeiro na página inicial com seu e-mail."); return; }
    if (!r.dados.admin) { acessoNegado("Esta área é restrita ao administrador."); return; }
    return carregar().then(function () { mostrarSecao(location.hash.slice(1)); });
  }).catch(function () { acessoNegado("Sem conexão. Tente de novo."); });
})();
</script>
</body>
</html>`;
