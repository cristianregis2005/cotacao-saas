// Monta o corpo de cada pedido de carrinho a partir da NF-e, das medidas da tela e do serviço escolhido.
// Porte de superfrete_pedido.py, melhor_envio_pedido.py e frenet_pedido.py. Não chama nenhuma API.
import type { DadosNfe, Pessoa } from "./nfe";

export class CarrinhoError extends Error {}

export interface Volume {
  peso: number;
  comprimento: number;
  largura: number;
  altura: number;
}

// Serviço escolhido na tabela de cotações (vem do próprio resultado da cotação).
export interface ServicoEscolhido {
  origem: string;
  transportadora?: string;
  servico?: string;
  codigo: string | number;
  codigoTransportadora?: string | number;
  precoBase?: number;
  preco: number;
  prazoDias?: number;
}

const digitos = (t: string | null | undefined): string => (t ?? "").replace(/\D/g, "");

// ---- SuperFrete (POST /api/v0/cart) ----

function pessoaSuperFrete(p: Pessoa, remetente: boolean) {
  let nome = p.name.trim().slice(0, 50);
  if (remetente && nome.split(/\s+/).filter(Boolean).length < 2) {
    // A SuperFrete exige nome e sobrenome do remetente.
    nome = ("Loja " + nome).slice(0, 50);
  }
  return {
    name: nome,
    address: p.street.slice(0, 50),
    complement: p.complement.slice(0, 20),
    number: p.number.slice(0, 10),
    district: (p.district || "NA").slice(0, 60),
    city: p.city.slice(0, 50),
    state_abbr: p.state.trim().toUpperCase().slice(0, 2),
    postal_code: digitos(p.postalCode),
  };
}

export function montarPedidoSuperFrete(d: DadosNfe, volume: Volume, servico: ServicoEscolhido) {
  const documento = digitos(d.destinatario.document);
  if (!documento) throw new CarrinhoError("A nota não traz CPF ou CNPJ do destinatário, obrigatório para a SuperFrete.");

  const para: Record<string, unknown> = { ...pessoaSuperFrete(d.destinatario, false), document: documento };
  const telefone = digitos(d.destinatario.phone);
  if (telefone.length === 11) para.phone = telefone; // a J&T exige exatamente 11 dígitos

  return {
    from: pessoaSuperFrete(d.remetente, true),
    to: para,
    service: Number(servico.codigo),
    volumes: { height: volume.altura, width: volume.largura, length: volume.comprimento, weight: volume.peso },
    options: { receipt: false, own_hand: false, ...(d.semNota ? {} : { invoice: { number: d.chave } }) },
    platform: "cotacao-fretes",
  };
}

// ---- Melhor Envio (POST /api/v2/me/cart) ----

function documentosME(numeroDoc: string) {
  const d = digitos(numeroDoc);
  return d.length === 14 ? { document: "", company_document: d } : { document: d, company_document: "" };
}

function enderecoME(p: Pessoa, remetente: boolean): Record<string, string> {
  const endereco: Record<string, string> = {
    name: p.name,
    phone: digitos(p.phone),
    ...documentosME(p.document),
    address: p.street,
    complement: p.complement,
    number: p.number || "S/N",
    district: p.district || "NA",
    city: p.city,
    country_id: "BR",
    postal_code: digitos(p.postalCode),
    state_abbr: p.state.toUpperCase(),
  };
  if (remetente) endereco.state_register = p.stateRegister; // Inscrição Estadual, quando a nota tiver
  return endereco;
}

export function montarCarrinhoME(d: DadosNfe, volume: Volume, servico: ServicoEscolhido) {
  if (!digitos(d.destinatario.document)) {
    throw new CarrinhoError("A nota não traz CPF ou CNPJ do destinatário, obrigatório no Melhor Envio.");
  }
  const valor = d.valorDeclarado ?? 0;
  const produtos = d.itens.length
    ? d.itens.map((i) => ({
        name: i.descricao,
        quantity: String(Math.max(1, Math.trunc(i.quantidade))),
        unitary_value: i.valorUnitario.toFixed(2),
      }))
    : [{ name: "Produtos", quantity: "1", unitary_value: valor.toFixed(2) }];

  return {
    service: Number(servico.codigo),
    from: enderecoME(d.remetente, true),
    to: enderecoME(d.destinatario, false),
    products: produtos,
    volumes: [{
      height: Math.ceil(volume.altura),
      width: Math.ceil(volume.largura),
      length: Math.ceil(volume.comprimento),
      weight: volume.peso,
    }],
    options: {
      insurance_value: valor,
      receipt: false,
      own_hand: false,
      reverse: false,
      non_commercial: false,
      ...(d.semNota ? {} : { invoice: { key: d.chave } }), // chave da NF-e (só quando há nota)
    },
  };
}

// ---- Frenet (POST /v1/orders, sem pagamento) ----

function enderecoFrenet(p: Pessoa) {
  return {
    AddressState: p.state,
    AddressQuarter: p.district,
    City: p.city,
    Street: p.street,
    ZipCode: digitos(p.postalCode),
    AddressNumber: p.number,
    AddressComplement: p.complement,
    Country: "BR",
  };
}

function pessoaFrenet(p: Pessoa) {
  return {
    Name: p.name,
    Document: digitos(p.document),
    Phone: digitos(p.phone),
    Cellphone: digitos(p.phone),
    Address: enderecoFrenet(p),
  };
}

export function montarPedidoFrenet(d: DadosNfe, volume: Volume, servico: ServicoEscolhido) {
  const valor = d.valorDeclarado ?? 0;
  const precoBase = servico.precoBase ?? servico.preco;
  const item = {
    OrderId: d.chave,
    ItemId: "1",
    ProductId: "PACOTE-1",
    ProductType: "simples",
    Weight: volume.peso,
    Length: volume.comprimento,
    Height: volume.altura,
    Width: volume.largura,
    Quantity: 1,
    Price: valor,
    IsFragile: false,
    ProductName: "Pacote",
    SKU: "PACOTE-1",
    Category: "Geral",
  };

  // A API recebe uma lista de pedidos.
  return [{
    Order: {
      Id: d.chave,
      Value: valor,
      UseFrenetRegistration: false,
      Items: [item],
      From: pessoaFrenet(d.remetente),
      To: pessoaFrenet(d.destinatario),
      ...(d.semNota
        ? {}
        : {
            Invoice: {
              Value: valor,
              Key: d.chave,
              Number: d.nota.numero,
              Series: d.nota.serie,
              Date: d.nota.data,
              CFOP: d.nota.cfop,
            },
          }),
    },
    Volumes: {
      VolumeId: "1",
      Weight: volume.peso,
      Length: volume.comprimento,
      Height: volume.altura,
      Width: volume.largura,
      Price: valor,
      DeclaredValue: valor,
      OrderItemsId: ["1"],
    },
    Quotation: {
      ShippingServiceCode: servico.codigo,
      ShippingServiceName: servico.servico,
      PlatformShippingPrice: precoBase,
      DeliveryTime: String(servico.prazoDias ?? ""),
      Carrier: servico.transportadora,
      CarrierCode: servico.codigoTransportadora,
      ShippingPrice: precoBase,
      Services: { DeclaredValue: true, ReceiptNotification: false, OwnHand: false },
    },
    StatusNotificationUrl: "",
    TrackingNotificationUrl: "",
  }];
}
