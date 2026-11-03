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
  .dce-item { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 10px; align-items: end; margin-bottom: 10px; }
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
      <span><a href="/conta">Minha conta</a> &nbsp; <button class="secundario" id="btn-sair" type="button">Sair</button></span>
    </div>

    <section class="cartao" id="secao-carrinho">
      <div class="cabecalho-recolhivel">
        <h2>Enviar o XML da nota</h2>
        <span class="suave" id="resumo-nfe"></span>
        <button type="button" class="alternar" id="btn-nfe" aria-label="Recolher" title="Recolher"></button>
      </div>
      <div id="corpo-nfe">
        <p class="suave">Envie a nota fiscal ou preencha os dados do pacote.</p>
        <input type="file" id="arquivoNfe" accept=".xml,text/xml,application/xml">
        <p class="suave" id="nfe-resumo"></p>
        <div class="grade" id="campos-nfe" hidden></div>
        <p class="msg" id="msg-carrinho"></p>
      </div>
    </section>

    <section class="cartao" id="secao-dce">
      <h2>Sem nota fiscal (DC-e)</h2>
      <p class="suave">Só para pessoa física (CPF no cadastro). Preencha o destinatário e os produtos com os valores reais. A declaração segue junto com o pedido.</p>
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
      </div>
      <div class="dce-cabecalho">
        <h3>Produtos</h3>
        <button type="button" class="secundario icone-acao" id="btn-add-item" aria-label="Adicionar produto" title="Adicionar produto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
      </div>
      <div id="dce-itens"></div>
      <p class="suave" id="dce-total"></p>
    </section>

    <form id="form-cotacao" class="cartao">
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
      <p class="msg erro" id="msg-cotar"></p>
      </div>
    </form>

    <section class="cartao" id="resultado" hidden>
      <h2>Opções de frete</h2>
      <p class="suave" id="frete-nota"></p>
      <div class="tabela-wrap">
        <table>
          <thead id="cabecalho"><tr><th>Origem</th><th>Transportadora</th><th>Serviço</th><th><button type="button" class="ordenar" data-campo="prazoDias" data-rotulo="Prazo">Prazo</button></th><th class="preco"><button type="button" class="ordenar" data-campo="preco" data-rotulo="Preço">Preço</button></th><th></th></tr></thead>
          <tbody id="linhas"></tbody>
        </table>
      </div>
      <ul class="avisos" id="avisos"></ul>
    </section>

    <section class="cartao" id="retorno" hidden>
      <p class="msg" id="msg-pedido"></p>
      <button type="button" class="secundario" id="btn-liberar" hidden>Liberar esta nota para novo envio</button>
    </section>

  </section>
  <footer class="suave" style="text-align:center;margin:24px 0 8px;font-size:0.8rem;color:var(--suave)"><a href="/termos">Termos de uso</a> · <a href="/privacidade">Privacidade</a></footer>
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
      [c.origem, c.transportadora || "-", c.servico || "-", (c.prazoDias != null ? c.prazoDias + " dia(s)" : (c.prazoTexto || "-"))].forEach(function (t) {
        var td = document.createElement("td");
        td.textContent = t;
        tr.appendChild(td);
      });
      var preco = document.createElement("td");
      preco.className = "preco";
      preco.textContent = reais(c.preco);
      tr.appendChild(preco);
      var acao = document.createElement("td");
      if (c.origem === "Envia") {
        var emBreve = document.createElement("button");
        emBreve.type = "button";
        emBreve.className = "secundario";
        emBreve.textContent = "Em breve";
        emBreve.disabled = true;
        acao.appendChild(emBreve);
      } else {
        var botaoCarrinho = document.createElement("button");
        botaoCarrinho.type = "button";
        botaoCarrinho.className = "secundario";
        botaoCarrinho.textContent = "Enviar ao carrinho";
        botaoCarrinho.disabled = false; // sem nota, o envio usa os dados da DC-e
        botaoCarrinho.addEventListener("click", function () { enviarCarrinho(c, botaoCarrinho); });
        acao.appendChild(botaoCarrinho);
      }
      tr.appendChild(acao);
      corpo.appendChild(tr);
    });
    if (!lista.length) {
      var vazio = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "Nenhuma opção encontrada para esses dados.";
      vazio.appendChild(td);
      corpo.appendChild(vazio);
    }
    atualizarSetas();
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
    ["city", "Cidade"], ["state", "UF"]
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

  $("arquivoNfe").addEventListener("change", function (e) {
    var arquivo = e.target.files && e.target.files[0];
    if (!arquivo) return; // cancelar a escolha do arquivo não apaga nada
    zerarDados(); // nova nota: apaga a cotação anterior e os campos preenchidos antes
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
        return;
      }
      dadosNfe = r.dados.dados;
      atualizarDce();
      $("nfe-resumo").textContent = "Nota " + (dadosNfe.nota.numero || "-") + " · remetente: " + dadosNfe.remetente.name +
        " · valor: " + (dadosNfe.valorDeclarado != null ? reais(dadosNfe.valorDeclarado) : "-") +
        " · frete na nota: " + (dadosNfe.valorFrete > 0 ? reais(dadosNfe.valorFrete) : "não informado");
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
    });
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
        return;
      }
    }
    var pergunta = "Criar o pedido no carrinho da " + c.origem + " (" + (c.servico || "-") + ", " + reais(c.preco) + ")?\\n\\n" +
      "O pedido fica aguardando pagamento no painel da transportadora. Nada é pago aqui.";
    if (!confirm(pergunta)) return;
    botao.disabled = true;
    $("retorno").hidden = false;
    $("btn-liberar").hidden = true;
    pendenteLiberar = null;
    $("msg-pedido").className = "msg";
    texto($("msg-pedido"), "Criando o pedido...");
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
        if (r.status === 409 && dadosNfe) {
          pendenteLiberar = { origem: c.origem, chave: dadosNfe.chave };
          $("btn-liberar").hidden = false;
        }
        return;
      }
      $("msg-pedido").className = "msg ok";
      texto($("msg-pedido"), "Pedido criado no carrinho da " + r.dados.transportadora + " (código " + r.dados.codigo +
        "). Pague no painel da transportadora.");
      zerarDados();
      limparDce();
      $("arquivoNfe").value = "";
    }).catch(function () {
      botao.disabled = false;
      $("msg-pedido").className = "msg erro";
      texto($("msg-pedido"), "Sem conexão. Confira no painel da transportadora antes de tentar de novo.");
    });
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
  }

  // Mostra o frete cobrado na nota acima da tabela, para comparar com as opções.
  function atualizarFreteNota() {
    $("frete-nota").textContent = dadosNfe && dadosNfe.valorFrete > 0
      ? "Frete cobrado na nota: " + reais(dadosNfe.valorFrete)
      : (dadosNfe ? "A nota não informa valor de frete." : "");
  }

  // ---- Envio sem nota (DC-e) ----
  var CAMPOS_DCE = ["dce-nome", "dce-documento", "dce-cep", "dce-logradouro", "dce-numero", "dce-complemento", "dce-bairro", "dce-cidade", "dce-uf", "dce-telefone"];

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
        phone: $("dce-telefone").value.trim()
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
    var cep = $("dce-cep").value.replace(/\D/g, "");
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
    if ($("dce-cep").value.replace(/\D/g, "") === "") {
      ultimoCepDce = "";
      ["dce-logradouro", "dce-bairro", "dce-cidade", "dce-uf"].forEach(function (id) { $(id).value = ""; });
      texto($("dicaDce"), "");
      return;
    }
    buscarCepDce();
  });

  criarItem();
  iniciar();
})();
</script>
</body>
</html>`;
