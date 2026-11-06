// Lê remetente, destinatário, valor, chave e itens de um XML de NF-e (layout 4.00).
// Porte de nfe_leitura.py. Usa expressões regulares: o XML da NF-e é bem formado e isso evita dependências.

export interface Pessoa {
  name: string;
  document: string;
  stateRegister: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  email?: string; // e-mail do destinatário (a Envia exige para entrega em ponto de coleta)
}

export interface ItemNota {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

export interface DadosNfe {
  chave: string;
  remetente: Pessoa;
  destinatario: Pessoa;
  valorDeclarado: number | null;
  pesoNota: number; // soma do peso bruto dos volumes, para sugerir o peso na tela
  valorFrete: number; // frete cobrado, conforme informado na nota (vFrete)
  nota: { numero: string; serie: string; data: string; cfop: string };
  itens: ItemNota[];
  semNota?: boolean; // envio sem NF-e (DC-e): a chave é gerada aqui e não vai para a transportadora
}

export class NfeError extends Error {}

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodificar(texto: string): string {
  return texto.replace(/&(amp|lt|gt|quot|apos);/g, (_, nome: string) => ENTIDADES[nome] ?? "");
}

// Conteúdo do primeiro elemento com esse nome (ignora prefixo de namespace).
function conteudo(xml: string, nome: string): string | null {
  const m = new RegExp(`<(?:\\w+:)?${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${nome}>`).exec(xml);
  return m ? m[1] : null;
}

// Conteúdo de todos os elementos com esse nome.
function todos(xml: string, nome: string): string[] {
  const re = new RegExp(`<(?:\\w+:)?${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${nome}>`, "g");
  return [...xml.matchAll(re)].map((m) => m[1]);
}

// Texto de um campo dentro de um bloco ("" se não existir).
function texto(bloco: string | null, nome: string): string {
  if (!bloco) return "";
  const valor = conteudo(bloco, nome);
  return valor === null ? "" : decodificar(valor.trim());
}

function numero(valor: string): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function endereco(bloco: string | null): Omit<Pessoa, "name" | "document" | "stateRegister"> {
  return {
    street: texto(bloco, "xLgr"),
    number: texto(bloco, "nro"),
    complement: texto(bloco, "xCpl"),
    district: texto(bloco, "xBairro"),
    city: texto(bloco, "xMun"),
    state: texto(bloco, "UF"),
    postalCode: texto(bloco, "CEP"),
    phone: texto(bloco, "fone"),
  };
}

export function lerNfe(xml: string): DadosNfe {
  const chaveM = /<infNFe[^>]*\sId="(?:NFe)?(\d{44})"/.exec(xml);
  if (!chaveM) {
    throw new NfeError("Arquivo não parece ser uma NF-e (chave de 44 números não encontrada).");
  }
  const inf = conteudo(xml, "infNFe") ?? "";
  const emit = conteudo(inf, "emit");
  const dest = conteudo(inf, "dest");
  const icms = conteudo(conteudo(inf, "total") ?? "", "ICMSTot");
  const ide = conteudo(inf, "ide");
  const itensXml = todos(inf, "det");
  const pesoNota = todos(conteudo(inf, "transp") ?? "", "vol").reduce((soma, vol) => soma + numero(texto(vol, "pesoB")), 0);

  const remetente: Pessoa = {
    name: texto(emit, "xNome"),
    document: texto(emit, "CNPJ") || texto(emit, "CPF"),
    stateRegister: texto(emit, "IE"),
    ...endereco(conteudo(emit ?? "", "enderEmit")),
  };
  const destinatario: Pessoa = {
    name: texto(dest, "xNome"),
    document: texto(dest, "CNPJ") || texto(dest, "CPF"),
    stateRegister: "",
    ...endereco(conteudo(dest ?? "", "enderDest")),
    email: texto(dest, "email"),
  };

  const valor = texto(icms, "vNF");
  const dataEmissao = texto(ide, "dhEmi");
  const primeiroProduto = itensXml.length ? conteudo(itensXml[0], "prod") : null;

  const itens: ItemNota[] = itensXml.map((det) => {
    const prod = conteudo(det, "prod");
    return {
      descricao: texto(prod, "xProd") || "Item",
      quantidade: numero(texto(prod, "qCom")) || 1,
      valorUnitario: numero(texto(prod, "vUnCom")),
    };
  });

  return {
    chave: chaveM[1],
    remetente,
    destinatario,
    valorDeclarado: valor ? numero(valor) : null,
    pesoNota,
    valorFrete: numero(texto(icms, "vFrete")),
    nota: {
      numero: texto(ide, "nNF"),
      serie: texto(ide, "serie"),
      data: dataEmissao.slice(0, 10),
      cfop: texto(primeiroProduto, "CFOP"),
    },
    itens,
  };
}
