// Dados comuns a todas as transportadoras. Medidas em cm, peso em kg, valor em R$.
export interface EntradaFrete {
  cepOrigem: string;
  cepDestino: string;
  peso: number;
  comprimento: number;
  largura: number;
  altura: number;
  valor: number;
}
