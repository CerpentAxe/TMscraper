function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function normalizeDateToIso(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();

  const ymd = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(trimmed);
  if (ymd) {
    return `${ymd[1]}-${pad(Number(ymd[2]))}-${pad(Number(ymd[3]))}`;
  }

  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(trimmed);
  if (dmy) {
    return `${dmy[3]}-${pad(Number(dmy[2]))}-${pad(Number(dmy[1]))}`;
  }

  return null;
}
