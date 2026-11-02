// Tela "Minha conta": cadastrar, trocar e remover os tokens das transportadoras.
export const CONTA_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Minha conta</title>
<style>
  :root { --fundo: #f6f7f9; --cartao: #ffffff; --texto: #1d2330; --suave: #5b6372; --borda: #d8dce3; --destaque: #2563eb; --ok: #15803d; --erro: #b42318; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --fundo: #0f1218; --cartao: #171c26; --texto: #e6e9ef; --suave: #9aa3b2; --borda: #2a3140; --destaque: #5b8cff; --ok: #4ade80; --erro: #f87171; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--fundo); color: var(--texto); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.4; }
  main { max-width: 640px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 1.4rem; }
  a { color: var(--destaque); }
  .cartao { background: var(--cartao); border: 1px solid var(--borda); border-radius: 10px; padding: 16px; margin-bottom: 16px; }
  .linha { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .status { font-size: 0.9rem; color: var(--suave); }
  .status.ok { color: var(--ok); }
  label { display: block; font-size: 0.9rem; color: var(--suave); margin: 10px 0; }
  input { display: block; width: 100%; margin-top: 4px; padding: 10px; font-size: 1rem; border: 1px solid var(--borda); border-radius: 8px; background: var(--fundo); color: var(--texto); }
  button { padding: 10px 14px; font: inherit; font-weight: 600; border: 0; border-radius: 8px; background: var(--destaque); color: #fff; cursor: pointer; margin-top: 6px; }
  button.secundario { background: transparent; color: var(--erro); border: 1px solid var(--borda); }
  button[disabled] { opacity: 0.6; }
  .msg { min-height: 1.2em; font-size: 0.95rem; margin: 8px 0 0; }
  .msg.erro { color: var(--erro); }
  .msg.ok { color: var(--ok); }
  .grade { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
  @media (max-width: 520px) { .grade { grid-template-columns: 1fr; } }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main>
  <p><a href="/">← Voltar para as cotações</a></p>
  <h1>Minha conta</h1>
  <p class="msg erro" id="msg-acesso" hidden></p>
  <p class="status" id="quem"></p>
  <div id="dados"></div>
  <div id="cartoes"></div>
</main>
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

  function montarCartao(t) {
    var cartao = document.createElement("section");
    cartao.className = "cartao";

    var topo = document.createElement("div");
    topo.className = "linha";
    var titulo = document.createElement("strong");
    titulo.textContent = t.nome;
    var status = document.createElement("span");
    status.className = "status" + (t.configurado ? " ok" : "");
    status.textContent = t.configurado ? "Configurado (termina em " + t.final_token + ")" : "Não configurado";
    topo.appendChild(titulo);
    topo.appendChild(status);
    cartao.appendChild(topo);

    var form = document.createElement("form");
    var rotuloToken = document.createElement("label");
    rotuloToken.textContent = "Token da " + t.nome;
    var inputToken = document.createElement("input");
    inputToken.type = "password";
    inputToken.autocomplete = "off";
    inputToken.required = true;
    rotuloToken.appendChild(inputToken);
    form.appendChild(rotuloToken);

    var rotuloContato = document.createElement("label");
    rotuloContato.textContent = "E-mail de contato (opcional, usa o seu e-mail se ficar em branco)";
    var inputContato = document.createElement("input");
    inputContato.type = "email";
    inputContato.value = t.contato || "";
    rotuloContato.appendChild(inputContato);
    form.appendChild(rotuloContato);

    var botao = document.createElement("button");
    botao.type = "submit";
    botao.textContent = t.configurado ? "Trocar token" : "Salvar token";
    form.appendChild(botao);

    var msg = document.createElement("p");
    msg.className = "msg";
    form.appendChild(msg);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      botao.disabled = true;
      msg.className = "msg";
      msg.textContent = "";
      api("/api/conta/tokens/" + t.transportadora, { token: inputToken.value.trim(), contato: inputContato.value.trim() }, "PUT").then(function (r) {
        botao.disabled = false;
        if (!r.ok) { msg.className = "msg erro"; msg.textContent = r.dados.erro || "Não consegui salvar."; return; }
        msg.className = "msg ok";
        msg.textContent = "Token salvo.";
        carregar();
      });
    });
    cartao.appendChild(form);

    if (t.configurado) {
      var remover = document.createElement("button");
      remover.type = "button";
      remover.className = "secundario";
      remover.textContent = "Remover token";
      remover.addEventListener("click", function () {
        if (!confirm("Remover o token da " + t.nome + "?")) return;
        api("/api/conta/tokens/" + t.transportadora, null, "DELETE").then(function () { carregar(); });
      });
      cartao.appendChild(remover);
    }

    return cartao;
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
      r.dados.transportadoras.forEach(function (t) { cartoes.appendChild(montarCartao(t)); });
    });
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

    cartao.appendChild(form);
    return cartao;
  }

  function carregarDados() {
    api("/api/conta/dados").then(function (r) {
      if (!r.ok) return;
      var area = $("dados");
      area.textContent = "";
      area.appendChild(montarDados(r.dados.dados || {}));
    });
  }

  carregar();
  carregarDados();
})();
</script>
</body>
</html>`;
