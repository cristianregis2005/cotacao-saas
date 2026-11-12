import { describe, expect, it } from "vitest";
import { EVENTOS_PAGO, confirmarPagamento } from "../src/pagamentos/confirmar";

// Banco de mentira: registra os comandos e controla o resultado de cada passo.
function dbFalso(opcoes: { pagamento: { id: string; usuario_id: string } | null; mudancas?: number; falhaUsuarios?: boolean }) {
  const sqls: string[] = [];
  const db = {
    prepare: (sql: string) => ({
      bind: () => ({
        first: async () => (sql.includes("FROM pagamentos") ? opcoes.pagamento : null),
        run: async () => {
          sqls.push(sql);
          if (opcoes.falhaUsuarios && sql.includes("UPDATE usuarios")) throw new Error("banco fora");
          const marcando = sql.includes("SET status = 'pago'");
          return { meta: { changes: marcando ? (opcoes.mudancas ?? 1) : 1 } };
        },
      }),
    }),
  } as unknown as D1Database;
  return { db, sqls };
}

describe("confirmarPagamento", () => {
  it("eventos de pagamento recebido ou confirmado liberam o acesso", () => {
    expect(EVENTOS_PAGO).toEqual(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
  });

  it("cobrança que não existe no banco é ignorada", async () => {
    const { db } = dbFalso({ pagamento: null });
    expect(await confirmarPagamento(db, "pay_x")).toBe("desconhecido");
  });

  it("cobrança já paga não libera de novo", async () => {
    const { db, sqls } = dbFalso({ pagamento: { id: "p1", usuario_id: "u1" }, mudancas: 0 });
    expect(await confirmarPagamento(db, "pay_1")).toBe("ja_pago");
    expect(sqls.some((s) => s.includes("UPDATE usuarios"))).toBe(false);
  });

  it("primeira confirmação marca como paga e libera 30 dias", async () => {
    const { db, sqls } = dbFalso({ pagamento: { id: "p1", usuario_id: "u1" }, mudancas: 1 });
    expect(await confirmarPagamento(db, "pay_1")).toBe("liberado");
    expect(sqls.some((s) => s.includes("UPDATE usuarios"))).toBe(true);
  });

  it("falha ao liberar desfaz a marcação para o Asaas reenviar", async () => {
    const { db, sqls } = dbFalso({ pagamento: { id: "p1", usuario_id: "u1" }, mudancas: 1, falhaUsuarios: true });
    await expect(confirmarPagamento(db, "pay_1")).rejects.toThrow("banco fora");
    expect(sqls.some((s) => s.includes("status = 'pendente'"))).toBe(true);
  });
});
