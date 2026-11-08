import type { DreamDocument, DreamDocumentVersion } from './dreamWorkspace';

export function documentKey(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/** Same name means next revision; previous versions are never overwritten. */
export function appendDocumentVersion(
  current: DreamDocument[],
  name: string,
  version: Pick<DreamDocumentVersion, 'uri' | 'source' | 'mimeType' | 'size'>,
): DreamDocument[] {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  if (!cleaned) return current;
  const revision: DreamDocumentVersion = {
    ...version,
    id: newId(),
    name: cleaned,
    addedAt: new Date().toISOString(),
  };
  const index = current.findIndex(doc => documentKey(doc.name) === documentKey(cleaned));
  if (index < 0) {
    return [...current, { id: newId(), name: cleaned, versions: [revision] }];
  }
  return current.map((doc, i) =>
    i === index ? { ...doc, versions: [...doc.versions, revision] } : doc,
  );
}

export function isSafeDocumentUrl(uri: string): boolean {
  return /^https:\/\//i.test(uri) || /^http:\/\//i.test(uri);
}

export const savedDocumentCount = (docs: DreamDocument[] = []): number => docs.length;
