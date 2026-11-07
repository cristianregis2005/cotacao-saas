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
  .msg { min-height: 1em; font-size: 0.8rem; color: var(--suave); margin: 10px 0 0; }
  .msg.erro { color: var(--erro); }
  .msg.ok { color: var(--ok); }
  .grade { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
  @media (max-width: 520px) { .grade { grid-template-columns: 1fr; } }
  .token-linha { display: flex; gap: 8px; align-items: flex-end; }
  .token-linha label { flex: 1; min-width: 0; margin: 10px 0 0; }
  input[readonly] { color: var(--suave); letter-spacing: 2px; cursor: default; }
  .icone { width: 44px; height: 44px; flex: 0 0 44px; display: inline-flex; align-items: center; justify-content: center; padding: 0; margin: 0; background: transparent; color: var(--texto); border: 1px solid var(--borda); }
  .icone:hover { border-color: var(--destaque); }
  .icone.perigo { color: var(--erro); }
  .icone svg { width: 20px; height: 20px; }
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
  <div id="agencias"></div>
  <div id="excluir"></div>
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

  function icone(caminho) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + caminho + '</svg>';
  }
  var LAPIS = icone('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>');
  var CONFIRMAR = icone('<path d="M20 6 9 17l-5-5"/>');
  var CANCELAR = icone('<path d="M18 6 6 18M6 6l12 12"/>');
  var LIXEIRA = icone('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>');

  function montarCartao(t) {
    var cartao = document.createElement("section");
    cartao.className = "cartao";

    var topo = document.createElement("div");
    topo.className = "linha";
    var titulo = document.createElement("strong");
    titulo.textContent = t.nome;
    var status = document.createElement("span");
    status.className = "status" + (t.configurado ? " ok" : "");
    status.textContent = t.configurado ? "Criptografado · termina em " + t.final_token : "Não configurado";
    topo.appendChild(titulo);
    topo.appendChild(status);
    cartao.appendChild(topo);

    // Token salvo: campo mostra asteriscos e os ícones trocam ou removem.
    // Em edição: o ícone da esquerda salva e o da direita cancela.
    var editando = !t.configurado;

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
    rotuloContato.textContent = "E-mail de contato (opcional, usa o seu e-mail se ficar em branco)";
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
      if (!confirm("Remover o token da " + t.nome + "?")) return;
      api("/api/conta/tokens/" + t.transportadora, null, "DELETE").then(function () { carregar(); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      botaoTrocar.disabled = true;
      msg.className = "msg";
      msg.textContent = "";
      api("/api/conta/tokens/" + t.transportadora, { token: inputToken.value.trim(), contato: inputContato.value.trim() }, "PUT").then(function (r) {
        botaoTrocar.disabled = false;
        if (!r.ok) { msg.className = "msg erro"; msg.textContent = r.dados.erro || "Não consegui salvar."; return; }
        msg.className = "msg ok";
        msg.textContent = "Token salvo.";
        carregar();
      });
    });

    cartao.appendChild(form);
    desenhar();
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
    botao.className = "secundario";
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
  carregarDados();
  carregarAgencias();
  montarExcluir();
})();
</script>
</body>
</html>`;
