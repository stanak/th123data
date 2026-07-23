import type { AppState, AppMode, SearchIndex } from '../types';
import { DEFAULT_CATEGORIES } from '../types';
import type { HistoryMode } from '../url';
import {
  t,
  categoryLabel,
  fieldPathLabel,
  getLocale,
  type Locale,
  ADVANTAGE_CONDITION_FIELDS,
} from '../i18n';
import { characterLabel, sortCharacters } from '../characters';

export interface SidebarHandlers {
  onChange: (history?: HistoryMode) => void;
  onHome: () => void;
  onLocaleChange: (locale: Locale) => void;
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
  title.textContent = t('siteTitle');
  title.addEventListener('click', handlers.onHome);
  root.appendChild(title);

  root.appendChild(moveNameField(state, handlers));

  const modeGroup = document.createElement('div');
  modeGroup.className = 'field-group';
  modeGroup.appendChild(label(t('mode')));
  const modeBtns = document.createElement('div');
  modeBtns.className = 'mode-toggle';
  for (const [mode, key] of [
    ['character', 'modeCharacter'],
    ['compare', 'modeCompare'],
    ['filter', 'modeFilter'],
  ] as [AppMode, 'modeCharacter' | 'modeCompare' | 'modeFilter'][]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mode-btn' + (state.mode === mode ? ' active' : '');
    btn.textContent = t(key);
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

  if (state.mode === 'compare') {
    root.appendChild(checkboxField(t('showMissingChars'), state.showMissingCompare, (v) => {
      state.showMissingCompare = v;
      handlers.onChange();
    }));
  }

  if (state.mode === 'filter') {
    root.appendChild(customCondition(state, handlers));
  }

  const meta = document.createElement('p');
  meta.className = 'meta-info';
  meta.textContent = t('metaInfo', { chars: index.characterCount, rows: index.rowCount });
  root.appendChild(meta);

  root.appendChild(langToggle(handlers));
}

function langToggle(handlers: SidebarHandlers): HTMLElement {
  const g = document.createElement('div');
  g.className = 'field-group lang-toggle sidebar-footer';
  for (const loc of ['ja', 'en'] as Locale[]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn' + (getLocale() === loc ? ' active' : '');
    btn.textContent = loc === 'ja' ? t('langJa') : t('langEn');
    btn.addEventListener('click', () => {
      if (getLocale() !== loc) handlers.onLocaleChange(loc);
    });
    g.appendChild(btn);
  }
  return g;
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
  g.appendChild(label(t('character')));
  const sel = document.createElement('select');
  sel.className = 'char-select';
  for (const c of sortCharacters(index.characters)) {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = characterLabel(c, getLocale());
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
  hdr.appendChild(label(t('charFilter')));
  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'link-btn';
  allBtn.textContent = t('selectAll');
  allBtn.addEventListener('click', () => {
    state.characters = new Set(index.characters);
    handlers.onChange();
  });
  const noneBtn = document.createElement('button');
  noneBtn.type = 'button';
  noneBtn.className = 'link-btn';
  noneBtn.textContent = t('selectNone');
  noneBtn.addEventListener('click', () => {
    state.characters = new Set();
    handlers.onChange();
  });
  hdr.appendChild(allBtn);
  hdr.appendChild(noneBtn);
  g.appendChild(hdr);
  const grid = document.createElement('div');
  grid.className = 'char-grid';
  for (const c of sortCharacters(index.characters)) {
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
    lbl.appendChild(document.createTextNode(characterLabel(c, getLocale())));
    grid.appendChild(lbl);
  }
  g.appendChild(grid);
  return g;
}

function categoryCheckboxes(index: SearchIndex, state: AppState, handlers: SidebarHandlers): HTMLElement {
  const g = document.createElement('div');
  g.className = 'field-group';
  g.appendChild(label(state.mode === 'character' ? t('categoryCompareHint') : t('category')));
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
    lbl.appendChild(document.createTextNode(categoryLabel(cat)));
    grid.appendChild(lbl);
  }
  g.appendChild(grid);
  return g;
}

function moveNameField(state: AppState, handlers: SidebarHandlers): HTMLElement {
  const g = document.createElement('div');
  g.className = 'field-group search-group';
  g.appendChild(label(t('moveName')));

  const row = document.createElement('div');
  row.className = 'search-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'text-input';
  input.placeholder = t('moveNamePlaceholder');
  input.value = state.moveName;

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'clear-btn';
  clearBtn.textContent = t('clear');
  clearBtn.disabled = !state.moveName;

  input.addEventListener('input', () => {
    state.moveName = input.value;
    clearBtn.disabled = !input.value;
    handlers.onChange('replace');
  });
  input.addEventListener('blur', () => {
    handlers.onChange('push');
  });
  clearBtn.addEventListener('click', () => {
    state.moveName = '';
    input.value = '';
    clearBtn.disabled = true;
    input.focus();
    handlers.onChange('push');
  });

  row.appendChild(input);
  row.appendChild(clearBtn);
  g.appendChild(row);
  g.appendChild(checkboxField(t('partialMatch'), state.partialMove, (v) => {
    state.partialMove = v;
    handlers.onChange('push');
  }));
  return g;
}

function customCondition(state: AppState, handlers: SidebarHandlers): HTMLElement {
  const g = document.createElement('div');
  g.className = 'field-group';
  g.appendChild(label(t('customCondition')));
  const row = document.createElement('div');
  row.className = 'condition-row';
  const field = document.createElement('select');
  for (const f of [
    ...ADVANTAGE_CONDITION_FIELDS,
    '動作.発生', '動作.全体', '動作.持続', '動作.暗転',
    'キャンセル.上位', 'キャンセル.移動',
    '技名', '状態', 'コマンド', '攻撃Lv',
  ]) {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = fieldPathLabel(f);
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
  val.placeholder = t('valuePlaceholder');
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'preset-btn';
  add.textContent = t('add');
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
      li.textContent = `${fieldPathLabel(c.field)} ${c.op} ${c.value}`;
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
