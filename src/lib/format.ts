export function formatBRL(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (!isFinite(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function categoryLabel(cat: string): string {
  switch (cat) {
    case "iphone": return "iPhone";
    case "macbook": return "MacBook";
    case "ipad": return "iPad";
    case "watch": return "Apple Watch";
    case "acessorios": return "Acessórios";
    default: return cat;
  }
}

export function safeOpenUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    window.open(u.toString(), "_blank", "noopener,noreferrer");
    return true;
  } catch {
    return false;
  }
}

export function isValidUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}
