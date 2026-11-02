import { describe, expect, it } from "vitest";
import { cnpjValido, cpfValido, validarDados } from "../src/contas/dados";

const base = {
  nome: "Ana Silva",
  documento: "529.982.247-25",
  telefone: "(47) 99999-0000",
  origem_cep: "89052-100",
  origem_logradouro: "Rua das Flores",
  origem_numero: "120",
  origem_bairro: "Centro",
  origem_cidade: "Blumenau",
  origem_uf: "sc",
};

describe("CPF e CNPJ", () => {
  it("aceita documentos com dígitos verificadores corretos", () => {
    expect(cpfValido("52998224725")).toBe(true);
    expect(cnpjValido("11222333000181")).toBe(true);
  });

  it("recusa sequências repetidas e dígitos errados", () => {
    expect(cpfValido("11111111111")).toBe(false);
    expect(cpfValido("52998224726")).toBe(false);
    expect(cnpjValido("11222333000182")).toBe(false);
  });
});

describe("validarDados", () => {
  it("aceita dados completos e normaliza", () => {
    const r = validarDados(base);
    expect("valor" in r && r.valor.documento).toBe("52998224725");
    expect("valor" in r && r.valor.origem_uf).toBe("SC");
    expect("valor" in r && r.valor.empresa).toBe(null);
  });

  it("recusa CPF inválido", () => {
    expect("erro" in validarDados({ ...base, documento: "52998224726" })).toBe(true);
  });

  it("recusa CEP com menos de 8 dígitos", () => {
    expect("erro" in validarDados({ ...base, origem_cep: "8905" })).toBe(true);
  });

  it("exige endereço de origem completo", () => {
    expect("erro" in validarDados({ ...base, origem_bairro: "" })).toBe(true);
  });
});
