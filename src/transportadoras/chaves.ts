// Chave estável de cada transportadora, usada no painel do administrador.
// Plataforma: "superfrete", "frenet", "melhorenvio", "envia".
// Transportadora dentro da plataforma: "<plataforma>:<código ou nome>", ex.: "envia:jadlog", "melhorenvio:correios".

// Nome exibido na cotação -> chave da plataforma.
export const CHAVE_DA_ORIGEM: Record<string, string> = {
  SuperFrete: "superfrete",
  Frenet: "frenet",
  "Melhor Envio": "melhorenvio",
  Envia: "envia",
};

// Texto -> minúsculo, sem acento, só letras e números separados por hífen.
export function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Chave da transportadora a partir da origem da cotação. Sem código, usa o nome.
export function chaveTransportadora(origem: string, codigo?: string | number | null, nome?: string | null): string | null {
  const plataforma = CHAVE_DA_ORIGEM[origem];
  if (!plataforma) return null;
  const parte = codigo !== undefined && codigo !== null && String(codigo) !== "" ? slug(String(codigo)) : slug(nome ?? "");
  return parte ? plataforma + ":" + parte : plataforma;
}
