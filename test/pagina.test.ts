import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("página inicial", () => {
  it("responde com o HTML do comparador", async () => {
    const resp = await app.request("/", {}, {} as never);
    expect(resp.status).toBe(200);
    expect(resp.headers.get("content-type")).toContain("text/html");
    const html = await resp.text();
    expect(html).toContain("Comparador de fretes");
    expect(html).toContain("/api/cotacoes/todas");
  });
});
