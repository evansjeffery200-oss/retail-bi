export function toMinor(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === "") return 0;
  const n = typeof input === "number" ? input : Number.parseFloat(String(input).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function toMajor(minor: number): number {
  return Math.round(minor) / 100;
}

export function formatMoney(minor: number, currencyCode = "NGN", locale = "en-NG"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(toMajor(minor));
  } catch {
    return `${currencyCode} ${toMajor(minor).toFixed(2)}`;
  }
}

export function formatCompact(minor: number, currencyCode = "NGN", locale = "en-NG"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(toMajor(minor));
  } catch {
    return formatMoney(minor, currencyCode, locale);
  }
}

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}
