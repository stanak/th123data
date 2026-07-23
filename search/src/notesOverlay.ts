import { t } from './i18n';

let activeOverlay: HTMLElement | null = null;
let activeCleanup: (() => void) | null = null;

function closeNotesOverlay(): void {
  activeCleanup?.();
  activeCleanup = null;
  activeOverlay?.remove();
  activeOverlay = null;
  document.body.classList.remove('notes-overlay-open');
}

export function openNotesOverlay(options: {
  text: string;
  title?: string;
}): void {
  closeNotesOverlay();

  const backdrop = document.createElement('div');
  backdrop.className = 'notes-overlay';

  const panel = document.createElement('div');
  panel.className = 'notes-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.addEventListener('click', (e) => e.stopPropagation());

  const header = document.createElement('div');
  header.className = 'notes-panel-header';

  const titleEl = document.createElement('h3');
  titleEl.className = 'notes-panel-title';
  titleEl.textContent = options.title ?? t('colNotes');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'notes-panel-close';
  closeBtn.textContent = t('notesClose');
  closeBtn.setAttribute('aria-label', t('notesClose'));

  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'notes-panel-body';
  body.textContent = options.text;

  panel.appendChild(header);
  panel.appendChild(body);
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);
  document.body.classList.add('notes-overlay-open');
  activeOverlay = backdrop;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeNotesOverlay();
  };
  document.addEventListener('keydown', onKey);
  activeCleanup = () => document.removeEventListener('keydown', onKey);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeNotesOverlay();
  });
  closeBtn.addEventListener('click', closeNotesOverlay);

  closeBtn.focus();
}

export function createNotesTrigger(text: string, title?: string): HTMLButtonElement | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'notes-trigger';
  btn.textContent = trimmed;
  btn.title = t('notesOpen');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    openNotesOverlay({ text: trimmed, title });
  });
  return btn;
}
