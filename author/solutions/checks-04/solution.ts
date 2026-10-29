export interface Page<T> { items: readonly T[]; page: number; total: number }
export function mapPage<T, U>(page: Page<T>, transform: (item: T) => U): Page<U> {
  return { ...page, items: page.items.map(transform) };
}
