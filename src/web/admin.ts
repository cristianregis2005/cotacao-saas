// Página do administrador: lista de usuários com o plano de cada um, editável.
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
  body { margin: 0; background: var(--fundo); color: var(--texto); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 900px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 1.4rem; }
  .cartao { background: var(--cartao); border: 1px solid var(--borda); border-radius: 10px; padding: 16px; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
  th, td { text-align: left; padding: 9px 8px; border-bottom: 1px solid var(--borda); white-space: nowrap; }
  th { color: var(--suave); font-size: 0.85rem; }
  select, button { font: inherit; padding: 7px 10px; border-radius: 8px; border: 1px solid var(--borda); background: var(--fundo); color: var(--texto); }
  button { background: var(--destaque); color: #fff; border: 0; font-weight: 600; cursor: pointer; }
  .msg { margin: 12px 0; min-height: 1.2em; }
  .erro { color: var(--erro); }
  .ok { color: var(--ok); }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main>
  <h1>Administração</h1>
  <p class="msg erro" id="msg-acesso" hidden></p>
  <section class="cartao" id="secao" hidden>
    <table>
      <thead><tr><th>E-mail</th><th>Nome</th><th>Plano</th><th>Criado em</th><th></th></tr></thead>
      <tbody id="linhas"></tbody>
    </table>
  </section>
  <p class="msg" id="msg"></p>
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

  function acessoNegado(texto) {
    $("msg-acesso").textContent = texto;
    $("msg-acesso").hidden = false;
  }

  function desenhar(usuarios, planos) {
    var corpo = $("linhas");
    corpo.textContent = "";
    usuarios.forEach(function (u) {
      var tr = document.createElement("tr");

      var tdEmail = document.createElement("td");
      tdEmail.textContent = u.email + (u.is_admin ? " (admin)" : "");
      tr.appendChild(tdEmail);

      var tdNome = document.createElement("td");
      tdNome.textContent = u.nome || "-";
      tr.appendChild(tdNome);

      var tdPlano = document.createElement("td");
      var select = document.createElement("select");
      planos.forEach(function (p) {
        var op = document.createElement("option");
        op.value = p.id;
        op.textContent = p.nome + (p.limite_cotacoes_mes == null ? " (ilimitado)" : " (" + p.limite_cotacoes_mes + "/mês)");
        if (p.id === (u.plano_id || "gratuito")) op.selected = true;
        select.appendChild(op);
      });
      tdPlano.appendChild(select);
      tr.appendChild(tdPlano);

      var tdData = document.createElement("td");
      tdData.textContent = u.criado_em ? u.criado_em.slice(0, 10) : "-";
      tr.appendChild(tdData);

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
      tdAcao.appendChild(botao);
      tr.appendChild(tdAcao);

      corpo.appendChild(tr);
    });
  }

  api("/api/auth/eu").then(function (r) {
    if (!r.ok) { acessoNegado("Entre primeiro na página inicial com seu e-mail."); return; }
    if (!r.dados.admin) { acessoNegado("Esta área é restrita ao administrador."); return; }
    return Promise.all([api("/api/admin/usuarios"), api("/api/admin/planos")]).then(function (res) {
      if (!res[0].ok || !res[1].ok) { acessoNegado("Não consegui carregar os dados."); return; }
      $("secao").hidden = false;
      desenhar(res[0].dados.usuarios, res[1].dados.planos);
    });
  }).catch(function () { acessoNegado("Sem conexão. Tente de novo."); });
})();
</script>
</body>
</html>`;
