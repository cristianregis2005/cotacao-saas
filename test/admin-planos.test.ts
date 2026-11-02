import { describe, expect, it } from "vitest";
import { validarPlano } from "../src/admin/planos";

describe("validarPlano", () => {
  it("aceita um plano completo", () => {
    const r = validarPlano({ id: "pro", nome: "Pro", preco_centavos: 4990, limite_cotacoes_mes: 200 }, true);
    expect("valor" in r && r.valor.limite_cotacoes_mes).toBe(200);
  });

  it("limite vazio (null) significa ilimitado", () => {
    const r = validarPlano({ id: "empresa", nome: "Empresa", preco_centavos: 19990, limite_cotacoes_mes: null }, true);
    expect("valor" in r && r.valor.limite_cotacoes_mes).toBe(null);
  });

  it("recusa código com maiúsculas ou espaços", () => {
    expect("erro" in validarPlano({ id: "Pro Plus", nome: "x", preco_centavos: 1, limite_cotacoes_mes: 1 }, true)).toBe(true);
  });

  it("recusa preço negativo ou não inteiro", () => {
    expect("erro" in validarPlano({ id: "pro", nome: "x", preco_centavos: -1, limite_cotacoes_mes: 1 }, true)).toBe(true);
    expect("erro" in validarPlano({ id: "pro", nome: "x", preco_centavos: 9.5, limite_cotacoes_mes: 1 }, true)).toBe(true);
  });

  it("recusa nome vazio", () => {
    expect("erro" in validarPlano({ id: "pro", nome: "  ", preco_centavos: 1, limite_cotacoes_mes: 1 }, true)).toBe(true);
  });

  it("na edição, o código não é validado", () => {
    expect("valor" in validarPlano({ nome: "Pro", preco_centavos: 1, limite_cotacoes_mes: 1 }, false)).toBe(true);
  });
});
