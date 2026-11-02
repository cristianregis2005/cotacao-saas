import { describe, expect, it } from "vitest";
import { lerNfe, NfeError } from "../src/carrinho/nfe";
import { CarrinhoError, montarCarrinhoME, montarPedidoFrenet, montarPedidoSuperFrete } from "../src/carrinho/montar";
import { criarNoCarrinho } from "../src/carrinho/enviar";

const CHAVE = "35261012345678000195550010000000011000000011";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe${CHAVE}" versao="4.00">
<ide><nNF>1</nNF><serie>1</serie><dhEmi>2026-10-30T10:00:00-03:00</dhEmi></ide>
<emit><CNPJ>12345678000195</CNPJ><xNome>Loja Exemplo Ltda</xNome><IE>123456789</IE>
  <enderEmit><xLgr>Rua A</xLgr><nro>100</nro><xBairro>Centro</xBairro><xMun>Blumenau</xMun><UF>SC</UF><CEP>89010000</CEP></enderEmit></emit>
<dest><CPF>52998224725</CPF><xNome>Maria &amp; Cliente</xNome>
  <enderDest><xLgr>Rua B</xLgr><nro>200</nro><xBairro>Bairro</xBairro><xMun>Joinville</xMun><UF>SC</UF><CEP>89200000</CEP><fone>47999990000</fone></enderDest></dest>
<det nItem="1"><prod><xProd>Linha 100g</xProd><CFOP>5102</CFOP><qCom>2.0000</qCom><vUnCom>75.0000</vUnCom></prod></det>
<total><ICMSTot><vNF>150.00</vNF></ICMSTot></total>
</infNFe></NFe></nfeProc>`;

const VOLUME = { peso: 2.1, comprimento: 20, largura: 15, altura: 14.2 };
const dados = () => lerNfe(XML);

describe("lerNfe", () => {
  it("lê chave, valor, remetente, destinatário e itens", () => {
    const d = dados();
    expect(d.chave).toBe(CHAVE);
    expect(d.valorDeclarado).toBe(150);
    expect(d.remetente.name).toBe("Loja Exemplo Ltda");
    expect(d.remetente.document).toBe("12345678000195");
    expect(d.remetente.stateRegister).toBe("123456789");
    expect(d.destinatario.name).toBe("Maria & Cliente"); // entidade XML decodificada
    expect(d.destinatario.document).toBe("52998224725");
    expect(d.destinatario.phone).toBe("47999990000");
    expect(d.nota).toEqual({ numero: "1", serie: "1", data: "2026-10-30", cfop: "5102" });
    expect(d.itens).toEqual([{ descricao: "Linha 100g", quantidade: 2, valorUnitario: 75 }]);
  });

  it("recusa um XML que não é NF-e", () => {
    expect(() => lerNfe("<nota><x>1</x></nota>")).toThrow(NfeError);
  });
});

describe("montarPedidoSuperFrete", () => {
  it("usa a chave da nota como nota fiscal e o código do serviço como número", () => {
    const p = montarPedidoSuperFrete(dados(), VOLUME, { origem: "SuperFrete", codigo: "17", preco: 20 });
    expect(p.service).toBe(17);
    expect(p.options.invoice.number).toBe(CHAVE);
    expect(p.to.document).toBe("52998224725");
    expect(p.from.name).toBe("Loja Exemplo Ltda");
  });

  it("acrescenta 'Loja' ao remetente com nome de uma palavra", () => {
    const d = dados();
    d.remetente.name = "Exemplo";
    const p = montarPedidoSuperFrete(d, VOLUME, { origem: "SuperFrete", codigo: 1, preco: 20 });
    expect(p.from.name).toBe("Loja Exemplo");
  });

  it("recusa destinatário sem CPF ou CNPJ", () => {
    const d = dados();
    d.destinatario.document = "";
    expect(() => montarPedidoSuperFrete(d, VOLUME, { origem: "SuperFrete", codigo: 1, preco: 20 })).toThrow(CarrinhoError);
  });
});

describe("montarCarrinhoME", () => {
  it("põe o CNPJ do remetente em company_document e a chave em options.invoice", () => {
    const p = montarCarrinhoME(dados(), VOLUME, { origem: "Melhor Envio", codigo: 3, preco: 20 });
    expect(p.from.company_document).toBe("12345678000195");
    expect(p.from.document).toBe("");
    expect(p.to.document).toBe("52998224725");
    expect(p.options.invoice.key).toBe(CHAVE);
    expect(p.products[0]).toEqual({ name: "Linha 100g", quantity: "2", unitary_value: "75.00" });
    expect(p.volumes[0].height).toBe(15); // arredondado para cima
  });
});

describe("montarPedidoFrenet", () => {
  it("monta o pedido com o código de serviço e o preço sem taxa", () => {
    const [pedido] = montarPedidoFrenet(dados(), VOLUME, {
      origem: "Frenet", codigo: "1", codigoTransportadora: "2", preco: 10.3, precoBase: 10, servico: "PAC",
    } as never);
    expect(pedido.Order.Id).toBe(CHAVE);
    expect(pedido.Quotation.ShippingServiceCode).toBe("1");
    expect(pedido.Quotation.CarrierCode).toBe("2");
    expect(pedido.Quotation.ShippingPrice).toBe(10);
    expect(pedido.Invoice ?? pedido.Order.Invoice.Key).toBe(CHAVE);
  });
});

describe("criarNoCarrinho", () => {
  const payloadFrenet = () =>
    montarPedidoFrenet(dados(), VOLUME, { origem: "Frenet", codigo: "1", preco: 10, precoBase: 10 });

  it("Frenet envia os dois tokens nos cabeçalhos", async () => {
    let cabecalhos: Record<string, string> = {};
    const fetchFn = (async (_url: string, init: RequestInit) => {
      cabecalhos = init.headers as Record<string, string>;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    const r = await criarNoCarrinho("frenet", payloadFrenet(), {
      token: "cliente", contato: "a@b.com", partnerToken: "parceiro", fetchFn,
    });
    expect(cabecalhos["x-partner-token"]).toBe("parceiro");
    expect(cabecalhos.token).toBe("cliente");
    expect(r.codigo).toBe(CHAVE);
  });

  it("Frenet sem token de parceiro não chama a API", async () => {
    let chamou = false;
    const fetchFn = (async () => { chamou = true; return new Response("{}"); }) as typeof fetch;
    await expect(
      criarNoCarrinho("frenet", payloadFrenet(), { token: "x", contato: "x", fetchFn }),
    ).rejects.toThrow(/parceiro/);
    expect(chamou).toBe(false);
  });

  it("falha de conexão avisa que o pedido pode ter sido criado e não repete a chamada", async () => {
    let tentativas = 0;
    const fetchFn = (async () => { tentativas++; throw new Error("rede caiu"); }) as typeof fetch;
    await expect(
      criarNoCarrinho("superfrete", { any: 1 }, { token: "t", contato: "c", fetchFn }),
    ).rejects.toThrow(/pode ter sido criado/);
    expect(tentativas).toBe(1);
  });

  it("SuperFrete devolve o id e o preço do pedido", async () => {
    const fetchFn = (async () =>
      new Response(JSON.stringify({ id: "abc-123", price: 22.5, status: "pending" }), { status: 200 })) as typeof fetch;
    const r = await criarNoCarrinho("superfrete", { any: 1 }, { token: "t", contato: "c", fetchFn });
    expect(r).toEqual({ codigo: "abc-123", preco: 22.5, status: "pending" });
  });
});
