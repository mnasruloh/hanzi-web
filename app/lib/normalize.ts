export function normalizePinyin(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ü/g, "v")
    .replace(/u:/g, "v")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();
}
