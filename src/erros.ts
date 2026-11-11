// Mensagens curtas para o cliente. O detalhe técnico (HTTP, corpo da resposta) vai para o log do servidor.

const ajustarToken = (nome: string) => "Token inválido. Atualize o token da " + nome + " em Minha conta.";

// Motivo de uma falha na cotação. Mensagens que já são para o cliente passam sem mudança.
export function motivoAmigavel(nome: string, detalhe: string): string {
  const d = detalhe.toLowerCase();
  if (d.includes("configure seu token") || d.includes("complete seu endereço") || d.includes("envie a nota fiscal")) {
    return detalhe;
  }
  if (/token/.test(d) && /inv[aá]lid/.test(d)) return ajustarToken(nome);
  if (/http (401|403)\b/.test(d)) return ajustarToken(nome);
  if (/falha de conex|fetch failed|enotfound|timeout/.test(d)) return "Não consegui falar com a " + nome + " agora. Tente de novo.";
  if (/http 5\d\d\b/.test(d)) return "A " + nome + " está indisponível agora. Tente de novo.";
  if (d.includes("sem cotação") || d.includes("sem cotacao")) return "A " + nome + " não tem opção de frete para esta rota.";
  return "A " + nome + " não respondeu como esperado. Tente de novo.";
}

// Falha ao criar o pedido no carrinho. Devolve a mensagem para o cliente e registra o detalhe no log.
export function recusaCarrinho(nome: string, status: number, corpo: string): string {
  console.log("[carrinho] " + nome + " HTTP " + status + ": " + corpo.slice(0, 500));
  if (status === 401 || status === 403) return ajustarToken(nome);
  if (status === 400 || status === 422) {
    return "A " + nome + " recusou os dados do pedido. Confira destinatário e produtos e tente de novo.";
  }
  if (status >= 500) return "A " + nome + " está indisponível agora. Tente de novo.";
  return "A " + nome + " não aceitou o pedido. Tente de novo.";
}

// Mensagens de recusa que a Envia devolve em inglês. O texto original vai para o log; o cliente vê a tradução.
export function traduzirRecusaEnvia(mensagem: string): string {
  console.log("[envia] recusa original: " + mensagem.slice(0, 500));
  const m = mensagem.toLowerCase();
  if (/not enough money|insufficient (balance|funds|money)|no balance|saldo/.test(m)) {
    return "Saldo insuficiente na Envia para comprar esta etiqueta. Adicione saldo na sua conta Envia e tente de novo.";
  }
  if (/invalid token|unauthori[sz]ed|unauthenticated|token/.test(m)) return ajustarToken("Envia");
  if (/zip ?code|postal code|cep|address|endere/.test(m)) {
    return "A Envia não encontrou um dos endereços. Confira o CEP e o endereço do destinatário e da origem.";
  }
  if (/agency|agência|agencia/.test(m)) {
    return "A agência de coleta escolhida não vale para esta rota. Escolha outra em Meus dados.";
  }
  if (/weight|peso|dimension|dimens|volume/.test(m)) {
    return "A Envia não aceita o peso ou as medidas informados para este serviço. Confira os valores e tente de novo.";
  }
  if (/value|valor|declared/.test(m)) return "A Envia não aceita o valor declarado informado. Confira o valor e tente de novo.";
  return "A Envia não aceitou o pedido. Confira os dados e tente de novo.";
}
