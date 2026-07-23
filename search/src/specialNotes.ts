import { t } from './i18n';

export interface SpecialNotesTable {
  title?: string;
  description?: string;
  rows: Record<string, unknown>[];
}

export function isSpecialNotesTable(value: unknown): value is SpecialNotesTable {
  return (
    value != null &&
    typeof value === 'object' &&
    Array.isArray((value as SpecialNotesTable).rows) &&
    (value as SpecialNotesTable).rows.length > 0
  );
}

function formatCellValue(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(String).join('、');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function advantageClass(raw: string): string {
  if (raw.startsWith('+')) return 'adv-plus';
  if (raw.startsWith('-')) return 'adv-minus';
  if (raw.startsWith('±')) return 'adv-neutral';
  return '';
}

function collectColumnKeys(rows: Record<string, unknown>[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }
  const charKey = '相手キャラ';
  if (keys.includes(charKey)) {
    return [charKey, ...keys.filter((k) => k !== charKey)];
  }
  return keys;
}

function isNestedField(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function buildSpecialNotesTable(rows: Record<string, unknown>[]): HTMLTableElement {
  const keys = collectColumnKeys(rows);
  const nestedKeys = keys.filter((k) => k !== '相手キャラ' && rows.some((r) => isNestedField(r[k])));
  const flatKeys = keys.filter((k) => !nestedKeys.includes(k));

  const table = document.createElement('table');
  table.className = 'special-notes-table';

  const thead = document.createElement('thead');
  if (nestedKeys.length) {
    const groupRow = document.createElement('tr');
    for (const key of flatKeys) {
      const th = document.createElement('th');
      th.textContent = key;
      th.rowSpan = 2;
      groupRow.appendChild(th);
    }
    for (const key of nestedKeys) {
      const sample = rows.find((r) => isNestedField(r[key]))?.[key] as Record<string, unknown>;
      const subKeys = Object.keys(sample ?? {});
      const th = document.createElement('th');
      th.colSpan = subKeys.length;
      th.textContent = key;
      groupRow.appendChild(th);
    }
    thead.appendChild(groupRow);

    const subRow = document.createElement('tr');
    for (const key of nestedKeys) {
      const sample = rows.find((r) => isNestedField(r[key]))?.[key] as Record<string, unknown>;
      for (const subKey of Object.keys(sample ?? {})) {
        const th = document.createElement('th');
        th.textContent = subKey;
        subRow.appendChild(th);
      }
    }
    thead.appendChild(subRow);
  } else {
    const headRow = document.createElement('tr');
    for (const key of keys) {
      const th = document.createElement('th');
      th.textContent = key;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
  }
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const key of flatKeys) {
      const td = document.createElement('td');
      td.textContent = formatCellValue(row[key]);
      tr.appendChild(td);
    }
    for (const key of nestedKeys) {
      const nested = isNestedField(row[key]) ? row[key] : {};
      const sample = rows.find((r) => isNestedField(r[key]))?.[key] as Record<string, unknown>;
      for (const subKey of Object.keys(sample ?? {})) {
        const td = document.createElement('td');
        const raw = formatCellValue(nested[subKey]);
        td.textContent = raw;
        if (key.includes('立ち') || key.includes('しゃがみ') || subKey === '有利差') {
          const cls = advantageClass(raw);
          if (cls) td.classList.add(cls);
        }
        tr.appendChild(td);
      }
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

export function specialNotesSummary(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim().slice(0, 24);
  if (isSpecialNotesTable(value)) {
    if (value.title) return value.title;
    return t('specialNotesTableSummary', { count: value.rows.length });
  }
  return t('colSpecialNotes');
}

export function renderSpecialNotesBody(container: HTMLElement, value: unknown): void {
  container.replaceChildren();
  if (value == null) return;

  if (typeof value === 'string') {
    const p = document.createElement('p');
    p.className = 'special-notes-text';
    p.textContent = value;
    container.appendChild(p);
    return;
  }

  if (!isSpecialNotesTable(value)) {
    const pre = document.createElement('pre');
    pre.className = 'special-notes-json';
    pre.textContent = JSON.stringify(value, null, 2);
    container.appendChild(pre);
    return;
  }

  if (value.description) {
    const desc = document.createElement('p');
    desc.className = 'special-notes-description';
    desc.textContent = value.description;
    container.appendChild(desc);
  }

  container.appendChild(buildSpecialNotesTable(value.rows));
}
