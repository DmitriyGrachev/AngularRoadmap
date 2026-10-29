export interface Issue { id: string; title: string; status: 'OPEN' | 'IN_PROGRESS' | 'DONE' }
export type LoadState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; items: readonly Issue[] } | { kind: 'error'; message: string };
export function describeLoad(state: LoadState): string {
  switch (state.kind) {
    case 'idle': return 'Не загружено';
    case 'loading': return 'Загрузка';
    case 'ready': return 'Заявок: ' + state.items.length;
    case 'error': return 'Ошибка: ' + state.message;
  }
}
