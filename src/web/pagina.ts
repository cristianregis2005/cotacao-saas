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
  .msg { min-height: 1.2em; margin-top: 8px; font-size: 0.95rem; }
  .msg.erro { color: var(--erro); }
  .msg.ok { color: var(--ok); }
  .tabela-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
  th, td { text-align: left; padding: 9px 8px; border-bottom: 1px solid var(--borda); white-space: nowrap; }
  th { color: var(--suave); font-weight: 600; font-size: 0.85rem; }
  td.preco, th.preco { text-align: right; }
  tr.melhor td { font-weight: 700; color: var(--ok); }
  .avisos { color: var(--suave); font-size: 0.9rem; margin: 10px 0 0; padding-left: 18px; }
  button.ordenar { background: none; color: var(--texto); border: 0; padding: 0; font: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; text-decoration: underline dotted; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main>
  <h1>Comparador de fretes</h1>

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
    <div class="cartao linha">
      <span><span id="quem"></span><br><small id="uso" style="color:var(--suave)"></small></span>
      <button class="secundario" id="btn-sair" type="button">Sair</button>
    </div>

    <form id="form-cotacao" class="cartao">
      <h2>Dados do envio</h2>
      <div class="grade">
        <label>CEP de origem <input id="cepOrigem" inputmode="numeric" required></label>
        <label>CEP de destino <input id="cepDestino" inputmode="numeric" required></label>
        <label>Peso (kg) <input id="peso" inputmode="decimal" required></label>
        <label>Valor declarado (R$) <input id="valor" inputmode="decimal"></label>
        <label>Comprimento (cm) <input id="comprimento" inputmode="decimal" required></label>
        <label>Largura (cm) <input id="largura" inputmode="decimal" required></label>
        <label>Altura (cm) <input id="altura" inputmode="decimal" required></label>
      </div>
      <button type="submit" id="btn-cotar">Cotar</button>
      <p class="msg erro" id="msg-cotar"></p>
    </form>

    <section class="cartao" id="resultado" hidden>
      <h2>Opções de frete</h2>
      <div class="tabela-wrap">
        <table>
          <thead id="cabecalho"><tr><th>Origem</th><th>Transportadora</th><th>Serviço</th><th><button type="button" class="ordenar" data-campo="prazoDias" data-rotulo="Prazo">Prazo</button></th><th class="preco"><button type="button" class="ordenar" data-campo="preco" data-rotulo="Preço">Preço</button></th></tr></thead>
          <tbody id="linhas"></tbody>
        </table>
      </div>
      <ul class="avisos" id="avisos"></ul>
    </section>
  </section>
</main>

<script>
(function () {
  function $(id) { return document.getElementById(id); }

  function api(caminho, corpo) {
    var opcoes = { method: corpo ? "POST" : "GET", headers: { "Content-Type": "application/json" }, credentials: "same-origin" };
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
  }

  function texto(el, valor) { el.textContent = valor; }

  function reais(valor) {
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function mostrarUso(uso) {
    if (!uso) return;
    var limite = uso.limite === null ? "ilimitado" : uso.limite;
    texto($("uso"), "Cotações usadas neste mês: " + uso.usadas + " de " + limite);
  }

  function entrarNaTela(usuario, uso) {
    texto($("quem"), usuario.email);
    mostrarUso(uso);
    mostrar("cotar");
  }

  function iniciar() {
    api("/api/auth/eu").then(function (r) {
      if (r.ok) entrarNaTela(r.dados, r.dados.uso);
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

  $("btn-sair").addEventListener("click", function () {
    api("/api/auth/sair", {}).then(function () { location.reload(); });
  });

  function numero(id) {
    var v = Number(String($("" + id).value).replace(",", "."));
    return v;
  }

  var resultadoAtual = [];
  var ordem = { campo: "preco", sentido: 1 };

  function atualizarSetas() {
    var botoes = document.querySelectorAll("button.ordenar");
    for (var i = 0; i < botoes.length; i++) {
      var b = botoes[i];
      var seta = "";
      if (b.getAttribute("data-campo") === ordem.campo) seta = ordem.sentido === 1 ? " ▲" : " ▼";
      b.textContent = b.getAttribute("data-rotulo") + seta;
    }
  }

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
      var tr = document.createElement("tr");
      if (ordem.campo === "preco" && ordem.sentido === 1 && i === 0) tr.className = "melhor";
      [c.origem, c.transportadora || "-", c.servico || "-", (c.prazoDias != null ? c.prazoDias + " dia(s)" : "-")].forEach(function (t) {
        var td = document.createElement("td");
        td.textContent = t;
        tr.appendChild(td);
      });
      var preco = document.createElement("td");
      preco.className = "preco";
      preco.textContent = reais(c.preco);
      tr.appendChild(preco);
      corpo.appendChild(tr);
    });
    if (!lista.length) {
      var vazio = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 5;
      td.textContent = "Nenhuma opção encontrada para esses dados.";
      vazio.appendChild(td);
      corpo.appendChild(vazio);
    }
    atualizarSetas();
  }

  function mostrarResultados(resultado) {
    resultadoAtual = resultado.cotacoes || [];
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
  }

  // Clicar no cabeçalho ordena; clicar de novo inverte.
  $("cabecalho").addEventListener("click", function (e) {
    var botao = e.target.closest ? e.target.closest("button.ordenar") : null;
    if (!botao) return;
    var campo = botao.getAttribute("data-campo");
    if (ordem.campo === campo) ordem.sentido = -ordem.sentido;
    else ordem = { campo: campo, sentido: 1 };
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
      cepDestino: $("cepDestino").value,
      peso: numero("peso"),
      comprimento: numero("comprimento"),
      largura: numero("largura"),
      altura: numero("altura"),
      valorDeclarado: numero("valor") || 0
    };
    api("/api/cotacoes/todas", corpo).then(function (r) {
      botao.disabled = false;
      if (r.status === 401) { location.reload(); return; }
      if (!r.ok) {
        $("msg-cotar").className = "msg erro";
        texto($("msg-cotar"), r.dados.erro || "Não consegui cotar. Tente de novo.");
        return;
      }
      texto($("msg-cotar"), "");
      mostrarUso(r.dados.uso);
      mostrarResultados(r.dados);
    }).catch(function () {
      botao.disabled = false;
      $("msg-cotar").className = "msg erro";
      texto($("msg-cotar"), "Sem conexão. Tente de novo.");
    });
  });

  iniciar();
})();
</script>
</body>
</html>`;
