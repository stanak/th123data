import charactersData from '../../characters.json';

export const CHARACTER_ORDER = charactersData.order;
export const CHARACTER_EN: Record<string, string> = charactersData.en;

export function characterLabel(name: string, locale: 'ja' | 'en'): string {
  if (locale === 'ja') return name;
  return CHARACTER_EN[name] ?? name;
}
