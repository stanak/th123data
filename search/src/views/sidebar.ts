import type { AppState, AppMode, SearchIndex } from '../types';
import { DEFAULT_CATEGORIES } from '../types';

import type { HistoryMode } from '../url';

export interface SidebarHandlers {
  onChange: (history?: HistoryMode) => void;
  onHome: () => void;
}

export function renderSidebar(
  root: HTMLElement,
  index: SearchIndex,
  state: AppState,
  handlers: SidebarHandlers,
) {
  root.replaceChildren();

  const title = document.createElement('button');
  title.type = 'button';
  title.className = 'site-title';
  title.textContent = 'TH123 Frame Data';
  title.addEventListener('click', handlers.onHome);
  root.appendChild(title);

  const modeGroup = document.createElement('div');
  modeGroup.className = 'field-group';
  modeGroup.appendChild(label('モード'));
  const modeBtns = document.createElement('div');
  modeBtns.className = 'mode-toggle';
  for (const [mode, text] of [
    ['character', 'キャラ別'],
    ['compare', '技名比較'],
    ['filter', '条件検索'],
  ] as [AppMode, string][]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mode-btn' + (state.mode === mode ? ' active' : '');
    btn.textContent = text;
    btn.addEventListener('click', () => {
      state.mode = mode;
      handlers.onChange();
    });
    modeBtns.appendChild(btn);
  }
  modeGroup.appendChild(modeBtns);
  root.appendChild(modeGroup);

  if (state.mode === 'character') {
    root.appendChild(charSelect(index, state, handlers));
  } else {
    root.appendChild(charCheckboxes(index, state, handlers));
    root.appendChild(categoryCheckboxes(index, state, handlers));
  }

  root.appendChild(moveNameField(state, handlers));

  if (state.mode === 'compare') {
    root.appendChild(checkboxField('該当なしキャラも表示', state.showMissingCompare, (v) => {
      state.showMissingCompare = v;
      handlers.onChange();
    }));
  }

  if (state.mode === 'filter' || state.mode === 'character') {
    root.appendChild(advantagePreset(state, handlers));
  }

  if (state.mode === 'filter') {
    root.appendChild(customCondition(state, handlers));
  }

  const meta = document.createElement('p');
  meta.className = 'meta-info';
  meta.textContent = `${index.characterCount}キャラ / ${index.rowCount}行`;
  root.appendChild(meta);
}

function label(text: string): HTMLLabelElement {
  const el = document.createElement('label');
  el.className = 'field-label';
  el.textContent = text;
  return el;
}

function charSelect(index: SearchIndex, state: AppState, handlers: SidebarHandlers): HTMLElement {
  const g = document.createElement('div');
  g.className = 'field-group';
  g.appendChild(label('キャラクター'));
  const sel = document.createElement('select');
  sel.className = 'char-select';
  for (const c of index.characters) {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    opt.selected = c === state.selectedCharacter;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => {
    state.selectedCharacter = sel.value;
    handlers.onChange();
  });
  g.appendChild(sel);
  return g;
}

function charCheckboxes(index: SearchIndex, state: AppState, handlers: SidebarHandlers): HTMLElement {
  const g = document.createElement('div');
  g.className = 'field-group';
  const hdr = document.createElement('div');
  hdr.className = 'field-header';
  hdr.appendChild(label('キャラフィルタ'));
  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'link-btn';
  allBtn.textContent = '全選択';
  allBtn.addEventListener('click', () => {
    state.characters = new Set(index.characters);
    handlers.onChange();
  });
  const noneBtn = document.createElement('button');
  noneBtn.type = 'button';
  noneBtn.className = 'link-btn';
  noneBtn.textContent = '全解除';
  noneBtn.addEventListener('click', () => {
    state.characters = new Set();
    handlers.onChange();
  });
  hdr.appendChild(allBtn);
  hdr.appendChild(noneBtn);
  g.appendChild(hdr);
  const grid = document.createElement('div');
  grid.className = 'char-grid';
  for (const c of index.characters) {
    const lbl = document.createElement('label');
    lbl.className = 'check-label';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.characters.has(c);
    cb.addEventListener('change', () => {
      if (cb.checked) state.characters.add(c);
      else state.characters.delete(c);
      handlers.onChange();
    });
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(c));
    grid.appendChild(lbl);
  }
  g.appendChild(grid);
  return g;
}

function categoryCheckboxes(index: SearchIndex, state: AppState, handlers: SidebarHandlers): HTMLElement {
  const g = document.createElement('div');
  g.className = 'field-group';
  g.appendChild(label(state.mode === 'character' ? 'カテゴリ（比較/検索用）' : 'カテゴリ'));
  const grid = document.createElement('div');
  grid.className = 'cat-grid';
  const cats = state.mode === 'character' ? index.categories : DEFAULT_CATEGORIES;
  for (const cat of cats) {
    const lbl = document.createElement('label');
    lbl.className = 'check-label';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.categories.has(cat);
    cb.addEventListener('change', () => {
      if (cb.checked) state.categories.add(cat);
      else state.categories.delete(cat);
      handlers.onChange();
    });
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(cat));
    grid.appendChild(lbl);
  }
  g.appendChild(grid);
  return g;
}

function moveNameField(state: AppState, handlers: SidebarHandlers): HTMLElement {
  const g = document.createElement('div');
  g.className = 'field-group';
  g.appendChild(label('技名'));
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'text-input';
  input.placeholder = '例: 4A';
  input.value = state.moveName;
  input.addEventListener('input', () => {
    state.moveName = input.value;
    handlers.onChange('replace');
  });
  input.addEventListener('blur', () => {
    handlers.onChange('push');
  });
  g.appendChild(input);
  g.appendChild(checkboxField('部分一致', state.partialMove, (v) => {
    state.partialMove = v;
    handlers.onChange('push');
  }));
  return g;
}

function advantagePreset(state: AppState, handlers: SidebarHandlers): HTMLElement {
  const g = document.createElement('div');
  g.className = 'field-group';
  g.appendChild(label('有利差プリセット'));
  const row = document.createElement('div');
  row.className = 'preset-row';
  const presets = [-5, -10, -15];
  for (const n of presets) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn' + (state.advantagePreset === n ? ' active' : '');
    btn.textContent = `<= ${n}`;
    btn.addEventListener('click', () => {
      state.advantagePreset = state.advantagePreset === n ? null : n;
      handlers.onChange();
    });
    row.appendChild(btn);
  }
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'link-btn';
  clear.textContent = 'クリア';
  clear.addEventListener('click', () => {
    state.advantagePreset = null;
    handlers.onChange();
  });
  row.appendChild(clear);
  g.appendChild(row);
  return g;
}

function customCondition(state: AppState, handlers: SidebarHandlers): HTMLElement {
  const g = document.createElement('div');
  g.className = 'field-group';
  g.appendChild(label('カスタム条件'));
  const row = document.createElement('div');
  row.className = 'condition-row';
  const field = document.createElement('select');
  for (const f of ['有利差.*', '動作.発生', '動作.全体', '技名', 'コマンド', '攻撃Lv']) {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    field.appendChild(opt);
  }
  const op = document.createElement('select');
  for (const o of ['<=', '>=', '=', 'contains']) {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    op.appendChild(opt);
  }
  const val = document.createElement('input');
  val.type = 'text';
  val.className = 'text-input short';
  val.placeholder = '値';
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'preset-btn';
  add.textContent = '追加';
  add.addEventListener('click', () => {
    if (!val.value.trim()) return;
    state.conditions.push({ field: field.value, op: op.value as AppState['conditions'][0]['op'], value: val.value.trim() });
    val.value = '';
    handlers.onChange();
  });
  row.appendChild(field);
  row.appendChild(op);
  row.appendChild(val);
  row.appendChild(add);
  g.appendChild(row);
  if (state.conditions.length) {
    const list = document.createElement('ul');
    list.className = 'condition-list';
    state.conditions.forEach((c, i) => {
      const li = document.createElement('li');
      li.textContent = `${c.field} ${c.op} ${c.value}`;
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'link-btn';
      rm.textContent = '×';
      rm.addEventListener('click', () => {
        state.conditions.splice(i, 1);
        handlers.onChange();
      });
      li.appendChild(rm);
      list.appendChild(li);
    });
    g.appendChild(list);
  }
  return g;
}

function checkboxField(text: string, checked: boolean, onChange: (v: boolean) => void): HTMLElement {
  const lbl = document.createElement('label');
  lbl.className = 'check-label inline';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = checked;
  cb.addEventListener('change', () => onChange(cb.checked));
  lbl.appendChild(cb);
  lbl.appendChild(document.createTextNode(text));
  return lbl;
}
