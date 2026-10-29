export interface Issue { id: string; title: string; status: 'OPEN' | 'IN_PROGRESS' | 'DONE' }
export type LoadState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; items: readonly Issue[] } | { kind: 'error'; message: string };
export function describeLoad(state: LoadState): string {
  // TODO: сузьте state по kind.
  return 'Не загружено';
}
