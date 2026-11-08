import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Usa a função exatamente como ela está no código da página (src/web/pagina.ts).
function formatarAcessoDaPagina(): (acessoAte: string) => string {
  const fonte = readFileSync(new URL("../src/web/pagina.ts", import.meta.url), "utf-8");
  const m = fonte.match(/  function formatarAcesso\(acessoAte\) \{[\s\S]*?\n  \}\n/);
  if (!m) throw new Error("função formatarAcesso não encontrada em pagina.ts");
  return new Function(m[0] + "\nreturn formatarAcesso;")() as (acessoAte: string) => string;
}

describe("data do acesso no horário de Brasília", () => {
  const formatarAcesso = formatarAcessoDaPagina();

  it("23:30 de Brasília (02:30 UTC do dia seguinte) aparece no dia correto", () => {
    expect(formatarAcesso("2026-11-15 02:30:00")).toBe("14/11/2026 às 23:30");
  });

  it("meia-noite de Brasília (03:00 UTC) aparece como 00:00 do dia seguinte", () => {
    expect(formatarAcesso("2026-11-15 03:00:00")).toBe("15/11/2026 às 00:00");
  });

  it("horário de tarde não muda de dia", () => {
    expect(formatarAcesso("2026-11-15 18:45:00")).toBe("15/11/2026 às 15:45");
  });
});
