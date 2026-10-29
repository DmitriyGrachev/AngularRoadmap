export interface Page<T> { items: readonly T[]; page: number; total: number }
export function mapPage<T, U>(page: Page<T>, transform: (item: T) => U): Page<U> {
  // TODO: преобразуйте элементы, сохранив метаданные.
  return { items: [], page: page.page, total: page.total };
}
