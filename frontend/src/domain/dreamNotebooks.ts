import type { DreamEntry, DreamNotebook, DreamNoteBlock } from './dreamWorkspace';

export const FIRST_NOTEBOOK_ID = 'notebook-main';

/** Read older saved dreams without rewriting or dropping any existing content. */
export function dreamNotebooks(dream: DreamEntry): DreamNotebook[] {
  if (Array.isArray(dream.privateNotebooks) && dream.privateNotebooks.length > 0) {
    return dream.privateNotebooks;
  }
  const legacy: DreamNoteBlock[] = [
    ...(dream.privateDiary?.trim()
      ? [{ id: 'legacy-diary', type: 'text' as const, text: dream.privateDiary }]
      : []),
    ...(dream.blocks ?? []).filter(block => block.kind === 'todo').map(block => ({
      id: 'legacy-todo-' + block.id,
      type: 'checklist' as const,
      text: block.content,
      checked: !!block.checked,
    })),
  ];
  return [{
    id: FIRST_NOTEBOOK_ID,
    title: dream.privateNotesTitle?.trim() || 'Mon carnet',
    // Keep the rich note blocks as the authoritative legacy format, exactly as before.
    blocks: dream.privateNotesBlocks ?? legacy,
  }];
}

/** Always return a distinct array so a notebook edit never mutates another book. */
export function editDreamNotebook(
  notebooks: DreamNotebook[],
  id: string,
  changes: Partial<Omit<DreamNotebook, 'id'>>,
): DreamNotebook[] {
  return notebooks.map(book => book.id === id ? { ...book, ...changes } : book);
}
