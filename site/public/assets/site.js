// Formulário de contato: envia para /api/contato e mostra o resultado na tela.
(function () {
  var form = document.getElementById("form-contato");
  if (!form) return;

  var msg = document.getElementById("msg-contato");
  var botao = document.getElementById("btn-enviar");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    msg.className = "msg";
    msg.textContent = "Enviando...";
    botao.disabled = true;

    var dados = {
      nome: form.nome.value,
      email: form.email.value,
      telefone: form.telefone.value,
      mensagem: form.mensagem.value,
      site: form.site.value
    };

    fetch("/api/contato", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (corpo) {
        return { ok: r.ok, corpo: corpo };
      });
    }).then(function (resultado) {
      botao.disabled = false;
      if (!resultado.ok) {
        msg.className = "msg erro";
        msg.textContent = resultado.corpo.erro || "Não consegui enviar. Tente de novo.";
        return;
      }
      msg.className = "msg ok";
      msg.textContent = "Mensagem enviada. Respondemos pelo e-mail informado.";
      form.reset();
    }).catch(function () {
      botao.disabled = false;
      msg.className = "msg erro";
      msg.textContent = "Sem conexão. Tente de novo ou fale pelo WhatsApp.";
    });
  });
})();


// Atualiza o ano do rodape automaticamente.
(function () {
  var ano = document.getElementById("ano-atual");
  if (ano) ano.textContent = new Date().getFullYear();
})();


// Menu do celular: abre e fecha a navegação principal.
(function () {
  var topo = document.querySelector(".topo");
  var botao = document.querySelector(".menu-botao");
  var nav = document.getElementById("nav-principal");
  if (!topo || !botao || !nav) return;

  topo.classList.add("tem-menu");

  function definir(aberto) {
    topo.classList.toggle("menu-aberto", aberto);
    botao.setAttribute("aria-expanded", aberto ? "true" : "false");
    botao.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
  }

  botao.addEventListener("click", function () {
    definir(botao.getAttribute("aria-expanded") !== "true");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) definir(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && topo.classList.contains("menu-aberto")) {
      definir(false);
      botao.focus();
    }
  });
})();
