import { t } from './i18n';
import { isSpecialNotesTable, renderSpecialNotesBody, specialNotesSummary } from './specialNotes';

let activeOverlay: HTMLElement | null = null;
let activeCleanup: (() => void) | null = null;

function closeSpecialNotesOverlay(): void {
  activeCleanup?.();
  activeCleanup = null;
  activeOverlay?.remove();
  activeOverlay = null;
  document.body.classList.remove('notes-overlay-open');
}

export function openSpecialNotesOverlay(options: {
  content: unknown;
  title?: string;
}): void {
  closeSpecialNotesOverlay();

  const backdrop = document.createElement('div');
  backdrop.className = 'notes-overlay';

  const panel = document.createElement('div');
  panel.className = 'notes-panel notes-panel-wide';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.addEventListener('click', (e) => e.stopPropagation());

  const header = document.createElement('div');
  header.className = 'notes-panel-header';

  const titleEl = document.createElement('h3');
  titleEl.className = 'notes-panel-title';
  const tableTitle =
    options.title ??
    (isSpecialNotesTable(options.content) ? options.content.title : undefined) ??
    t('colSpecialNotes');
  titleEl.textContent = tableTitle;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'notes-panel-close';
  closeBtn.textContent = t('notesClose');
  closeBtn.setAttribute('aria-label', t('notesClose'));

  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'notes-panel-body special-notes-panel-body';
  renderSpecialNotesBody(body, options.content);

  panel.appendChild(header);
  panel.appendChild(body);
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);
  document.body.classList.add('notes-overlay-open');
  activeOverlay = backdrop;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeSpecialNotesOverlay();
  };
  document.addEventListener('keydown', onKey);
  activeCleanup = () => document.removeEventListener('keydown', onKey);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeSpecialNotesOverlay();
  });
  closeBtn.addEventListener('click', closeSpecialNotesOverlay);

  closeBtn.focus();
}

export function createSpecialNotesTrigger(content: unknown, title?: string): HTMLButtonElement | null {
  const summary = specialNotesSummary(content);
  if (!summary) return null;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'notes-trigger special-notes-trigger';
  btn.textContent = summary;
  btn.title = t('specialNotesOpen');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    openSpecialNotesOverlay({ content, title });
  });
  return btn;
}
