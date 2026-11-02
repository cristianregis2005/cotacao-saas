// Validação dos dados de um plano, vindos do painel do administrador.

export interface PlanoValido {
  id: string;
  nome: string;
  preco_centavos: number;
  limite_cotacoes_mes: number | null; // null = ilimitado
}

export type ResultadoPlano = { erro: string } | { valor: PlanoValido };

export function validarPlano(corpo: Record<string, unknown>, idObrigatorio: boolean): ResultadoPlano {
  const id = typeof corpo.id === "string" ? corpo.id.trim() : "";
  const nome = typeof corpo.nome === "string" ? corpo.nome.trim() : "";
  const preco = corpo.preco_centavos;
  const limite = corpo.limite_cotacoes_mes;

  if (idObrigatorio && !/^[a-z0-9-]{2,30}$/.test(id)) {
    return { erro: "Código do plano: de 2 a 30 letras minúsculas, números ou hífen, sem espaços." };
  }
  if (!nome) return { erro: "Informe o nome do plano." };
  if (typeof preco !== "number" || !Number.isInteger(preco) || preco < 0) {
    return { erro: "Preço inválido." };
  }
  if (limite !== null && (typeof limite !== "number" || !Number.isInteger(limite) || limite < 0)) {
    return { erro: "Limite inválido. Use um número inteiro ou deixe vazio para ilimitado." };
  }
  return { valor: { id, nome, preco_centavos: preco, limite_cotacoes_mes: limite } };
}
