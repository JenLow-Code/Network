import type { DreamEntry, DreamNotebook, DreamNoteBlock, DreamNotebookColor } from './dreamWorkspace';

export const NOTEBOOK_COLORS: Record<DreamNotebookColor,{label:string;hex:string}> = {
  sand: {label:'Sable',hex:'#A5713D'},
  pink: {label:'Magenta',hex:'#BD3477'},
  blue: {label:'Bleu',hex:'#34769F'},
  green: {label:'Vert',hex:'#337D5F'},
  violet: {label:'Violet',hex:'#8366A6'},
  coral: {label:'Corail',hex:'#B85D50'},
};
export const NOTEBOOK_COLOR_ORDER: DreamNotebookColor[] =
  ['sand','pink','blue','green','violet','coral'];
export const defaultNotebookColor = (index:number):DreamNotebookColor =>
  NOTEBOOK_COLOR_ORDER[index % NOTEBOOK_COLOR_ORDER.length];


export const FIRST_NOTEBOOK_ID = 'notebook-main';
export const SHARED_NOTEBOOK_ID = 'notebook-shared';

/**
 * A dream is shared when an accepted co-owner or real accepted person
 * resource is present. Simple followers, prayers, "Moi aussi" and unverified
 * resource checks do not create a shared workspace.
 */
export function dreamIsShared(dream: DreamEntry): boolean {
  return dream.viewerRole === 'co_owner' || (dream.coOwners ?? []).some(person => person.accepted && !!person.userId)
    || (dream.resources ?? []).some(resource =>
      resource.category === 'person' && resource.confirmed &&
      (!!resource.personId || !!resource.serverNeedId),
    );
}

/** No private notebook data is copied to the shared notebook. */
export function sharedDreamNotebook(dream: DreamEntry): DreamNotebook {
  const stored=dream.sharedNotebook;
  return {
    id:SHARED_NOTEBOOK_ID,
    title:'Carnet partagé',
    color:'pink',
    blocks:Array.isArray(stored?.blocks)?stored.blocks:[],
  };
}

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
