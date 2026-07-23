export function advantageDisplayClass(
  raw: string | null | undefined,
  numeric: number | null | undefined = null,
): string {
  const trimmed = raw?.trim();
  if (trimmed) {
    if (trimmed.startsWith('+')) return 'adv-plus';
    if (trimmed.startsWith('-')) return 'adv-minus';
    if (trimmed.startsWith('±')) return 'adv-neutral';
  }
  if (numeric != null) {
    if (numeric > 0) return 'adv-plus';
    if (numeric < 0) return 'adv-minus';
    return 'adv-neutral';
  }
  return '';
}

export function applyAdvantageClass(el: HTMLElement, raw: string | null | undefined, numeric?: number | null): void {
  const cls = advantageDisplayClass(raw, numeric);
  if (cls) el.classList.add(cls);
}
