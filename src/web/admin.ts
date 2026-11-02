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
  main { max-width: 900px; margin: 0 auto; padding: 16px; }
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
  .msg { margin: 8px 0; min-height: 1.2em; }
  .erro { color: var(--erro); }
  .ok { color: var(--ok); }
  .suave { color: var(--suave); font-size: 0.9rem; }
  .status { font-size: 0.9rem; color: var(--suave); }
  .status.ok { color: var(--ok); }
  .bloco-token { border: 1px solid var(--borda); border-radius: 8px; padding: 12px; margin-top: 12px; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main>
  <h1>Administração</h1>
  <p class="msg erro" id="msg-acesso" hidden></p>

  <section id="secao" hidden>
    <div class="cartao">
      <h2>Usuários</h2>
      <table>
        <thead><tr><th>E-mail</th><th>Nome</th><th>Plano</th><th>Criado em</th><th></th></tr></thead>
        <tbody id="linhas-usuarios"></tbody>
      </table>
      <p class="msg" id="msg"></p>
    </div>

    <section class="cartao" id="painel-tokens" hidden>
      <div class="linha">
        <h2 id="titulo-tokens">Tokens</h2>
        <button type="button" class="secundario" id="btn-fechar-tokens">Fechar</button>
      </div>
      <p class="suave">Você vê só os 4 últimos caracteres de cada token. O valor completo nunca aparece depois de salvo.</p>
      <div id="cartoes-tokens"></div>
    </section>

    <div class="cartao">
      <h2>Planos</h2>
      <table>
        <thead><tr><th>Código</th><th>Nome</th><th>Preço</th><th>Limite</th><th></th></tr></thead>
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
        <label>Cotações por mês (vazio = ilimitado)
          <input id="plano-limite" inputmode="numeric" placeholder="ilimitado">
        </label>
      </div>
      <button type="submit" id="btn-salvar-plano">Salvar plano</button>
      <button type="button" class="secundario" id="btn-cancelar" hidden>Cancelar edição</button>
      <p class="msg" id="msg-plano"></p>
    </form>
  </section>
</main>
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

  function descricaoLimite(limite) {
    return limite == null ? "ilimitado" : limite + " por mês";
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
        op.textContent = p.nome + " (" + descricaoLimite(p.limite_cotacoes_mes) + ")";
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
      tdAcao.appendChild(botao);
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
      tr.appendChild(celula(descricaoLimite(p.limite_cotacoes_mes)));
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
    $("plano-limite").value = p.limite_cotacoes_mes == null ? "" : String(p.limite_cotacoes_mes);
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
    var limiteTexto = $("plano-limite").value.trim();
    var corpo = {
      id: $("plano-id").value.trim(),
      nome: $("plano-nome").value.trim(),
      preco_centavos: preco,
      limite_cotacoes_mes: limiteTexto === "" ? null : Number(limiteTexto)
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

  // ---- Tokens do cliente selecionado ----

  function abrirTokens(u) {
    clienteAtual = u;
    $("titulo-tokens").textContent = "Tokens de " + u.email;
    $("painel-tokens").hidden = false;
    $("painel-tokens").scrollIntoView({ behavior: "smooth" });
    carregarTokens();
  }

  $("btn-fechar-tokens").addEventListener("click", function () {
    clienteAtual = null;
    $("painel-tokens").hidden = true;
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

  function montarCartaoToken(t, usuarioId) {
    var bloco = document.createElement("div");
    bloco.className = "bloco-token";

    var topo = document.createElement("div");
    topo.className = "linha";
    var titulo = document.createElement("strong");
    titulo.textContent = t.nome;
    var status = document.createElement("span");
    status.className = "status" + (t.configurado ? " ok" : "");
    status.textContent = t.configurado ? "Configurado (termina em " + t.final_token + ")" : "Não configurado";
    topo.appendChild(titulo);
    topo.appendChild(status);
    bloco.appendChild(topo);

    var form = document.createElement("form");
    var rotuloToken = document.createElement("label");
    rotuloToken.textContent = "Novo token da " + t.nome;
    var inputToken = document.createElement("input");
    inputToken.type = "password";
    inputToken.autocomplete = "off";
    inputToken.required = true;
    rotuloToken.appendChild(inputToken);
    form.appendChild(rotuloToken);

    var rotuloContato = document.createElement("label");
    rotuloContato.textContent = "E-mail de contato (opcional)";
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
      var caminho = "/api/admin/usuarios/" + encodeURIComponent(usuarioId) + "/tokens/" + t.transportadora;
      api(caminho, { token: inputToken.value.trim(), contato: inputContato.value.trim() }, "PUT").then(function (r) {
        botao.disabled = false;
        if (!r.ok) { msg.className = "msg erro"; msg.textContent = r.dados.erro || "Não consegui salvar."; return; }
        inputToken.value = "";
        carregarTokens();
      });
    });
    bloco.appendChild(form);

    if (t.configurado) {
      var remover = document.createElement("button");
      remover.type = "button";
      remover.className = "perigo";
      remover.textContent = "Remover token";
      remover.addEventListener("click", function () {
        if (!confirm("Remover o token da " + t.nome + " desta conta?")) return;
        api("/api/admin/usuarios/" + encodeURIComponent(usuarioId) + "/tokens/" + t.transportadora, null, "DELETE").then(function () { carregarTokens(); });
      });
      bloco.appendChild(remover);
    }

    return bloco;
  }

  function carregar() {
    return Promise.all([api("/api/admin/usuarios"), api("/api/admin/planos")]).then(function (res) {
      if (!res[0].ok || !res[1].ok) { acessoNegado("Não consegui carregar os dados."); return; }
      planos = res[1].dados.planos;
      $("secao").hidden = false;
      desenharPlanos();
      desenharUsuarios(res[0].dados.usuarios);
    });
  }

  api("/api/auth/eu").then(function (r) {
    if (!r.ok) { acessoNegado("Entre primeiro na página inicial com seu e-mail."); return; }
    if (!r.dados.admin) { acessoNegado("Esta área é restrita ao administrador."); return; }
    return carregar();
  }).catch(function () { acessoNegado("Sem conexão. Tente de novo."); });
})();
</script>
</body>
</html>`;
