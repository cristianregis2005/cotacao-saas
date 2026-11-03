// Site público da Clique Frete. Serve as páginas estáticas e recebe o formulário de contato.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(corpo, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function limpo(valor, max) {
  return typeof valor === "string" ? valor.trim().slice(0, max) : "";
}

async function receberContato(request, env) {
  if (request.method !== "POST") return json({ erro: "Método não permitido." }, 405);

  const corpo = await request.json().catch(() => null);
  if (!corpo || typeof corpo !== "object") return json({ erro: "Envie o formulário de novo." }, 400);

  // Campo escondido no formulário: pessoas não o preenchem, robôs costumam preencher.
  if (limpo(corpo.site, 200)) return json({ ok: true });

  const nome = limpo(corpo.nome, 120);
  const email = limpo(corpo.email, 160);
  const telefone = limpo(corpo.telefone, 30);
  const mensagem = limpo(corpo.mensagem, 3000);

  if (!nome) return json({ erro: "Informe seu nome." }, 400);
  if (!EMAIL_RE.test(email)) return json({ erro: "Informe um e-mail válido." }, 400);
  if (mensagem.length < 10) return json({ erro: "Escreva uma mensagem com pelo menos 10 caracteres." }, 400);

  const texto = [
    "Nova mensagem pelo formulário do site.",
    "",
    "Nome: " + nome,
    "E-mail: " + email,
    "Telefone: " + (telefone || "não informado"),
    "",
    mensagem,
  ].join("\n");

  try {
    await env.EMAIL.send({
      to: env.EMAIL_DESTINO,
      from: { email: env.EMAIL_REMETENTE, name: "Clique Frete" },
      subject: "Contato pelo site: " + nome,
      text: texto,
    });
  } catch (exc) {
    return json({ erro: "Não consegui enviar agora. Tente de novo ou fale pelo WhatsApp." }, 502);
  }
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contato") return receberContato(request, env);
    return env.ASSETS.fetch(request);
  },
};
