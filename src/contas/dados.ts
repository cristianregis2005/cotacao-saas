// Validação dos dados cadastrais do cliente. CPF e CNPJ são conferidos pelos dígitos verificadores.

export function somenteDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

export function cpfValido(d: string): boolean {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(d.slice(0, 9), 10) === Number(d[9]) && digito(d.slice(0, 10), 11) === Number(d[10]);
}

export function cnpjValido(d: string): boolean {
  if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
  const digito = (base: string, pesos: number[]) => {
    let soma = 0;
    for (let i = 0; i < pesos.length; i++) soma += Number(base[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return digito(d.slice(0, 12), p1) === Number(d[12]) && digito(d.slice(0, 13), p2) === Number(d[13]);
}

export interface DadosCliente {
  nome: string;
  empresa: string | null;
  documento: string;
  telefone: string;
  origem_cep: string;
  origem_logradouro: string;
  origem_numero: string;
  origem_complemento: string | null;
  origem_bairro: string;
  origem_cidade: string;
  origem_uf: string;
}

export type ResultadoDados = { erro: string } | { valor: DadosCliente };

function texto(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function validarDados(corpo: Record<string, unknown>): ResultadoDados {
  const nome = texto(corpo.nome, 120);
  const empresa = texto(corpo.empresa, 120);
  const documento = somenteDigitos(texto(corpo.documento, 30));
  const telefone = somenteDigitos(texto(corpo.telefone, 30));
  const cep = somenteDigitos(texto(corpo.origem_cep, 12));
  const logradouro = texto(corpo.origem_logradouro, 120);
  const numero = texto(corpo.origem_numero, 20);
  const complemento = texto(corpo.origem_complemento, 60);
  const bairro = texto(corpo.origem_bairro, 80);
  const cidade = texto(corpo.origem_cidade, 80);
  const uf = texto(corpo.origem_uf, 2).toUpperCase();

  if (!nome) return { erro: "Informe seu nome." };

  const documentoOk =
    (documento.length === 11 && cpfValido(documento)) || (documento.length === 14 && cnpjValido(documento));
  if (!documentoOk) return { erro: "CPF ou CNPJ inválido. Confira os números." };

  if (!/^\d{10,11}$/.test(telefone)) return { erro: "Telefone inválido. Informe o DDD e o número." };
  if (!/^\d{8}$/.test(cep)) return { erro: "CEP de origem inválido." };
  if (!logradouro || !numero || !bairro || !cidade) return { erro: "Preencha o endereço de origem completo." };
  if (!/^[A-Z]{2}$/.test(uf)) return { erro: "UF inválida (use a sigla, como SC)." };

  return {
    valor: {
      nome,
      empresa: empresa || null,
      documento,
      telefone,
      origem_cep: cep,
      origem_logradouro: logradouro,
      origem_numero: numero,
      origem_complemento: complemento || null,
      origem_bairro: bairro,
      origem_cidade: cidade,
      origem_uf: uf,
    },
  };
}
