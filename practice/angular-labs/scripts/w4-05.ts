export function readPage(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) return 0;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 0;
}
console.log(readPage('2'), readPage('-1'), readPage('2oops'), readPage(null));
// 2 0 0 0

