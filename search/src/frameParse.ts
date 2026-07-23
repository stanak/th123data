/** Keep in sync with ../frame_parse.mjs */
export const FRAME_LIST_FIELD_PATHS = [
  '動作.発生',
  '動作.全体',
  '動作.持続',
  '動作.暗転',
  'キャンセル.上位',
  'キャンセル.移動',
] as const;

export function firstFrameListToken(raw: unknown): string {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  const idx = s.search(/[、,]/);
  return (idx >= 0 ? s.slice(0, idx) : s).trim();
}

export function parseFrameValue(raw: unknown): number | null {
  if (raw == null || raw === '' || raw === '-' || raw === '〃') return null;
  const s = firstFrameListToken(raw);
  if (!s || s === 'down' || s.includes('有利') || s.includes('…') || s === '...' || s.startsWith('...')) {
    return null;
  }
  const range = s.match(/^([+-]?[\d.]+)(?:\[([+-]?[\d.]+)\])?$/);
  if (range) return Number(range[1]);
  const pm = s.match(/^±(\d+)$/);
  if (pm) return 0;
  const num = s.match(/^([+-]?\d+(?:\.\d+)?)/);
  if (num) return Number(num[1]);
  return null;
}
