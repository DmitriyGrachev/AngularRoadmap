const statuses = ['OPEN', 'IN_PROGRESS', 'DONE'];
const pageNumber = value => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : 0;
function normalize(value) {
  return {
    q: typeof value.q === 'string' ? value.q.trim() : '',
    statuses: statuses.filter(status => Array.isArray(value.statuses) && value.statuses.includes(status)),
    page: Number.isSafeInteger(value.page) && value.page >= 0 ? value.page : 0,
    pageSize: [10, 25, 50].includes(value.pageSize) ? value.pageSize : 25,
    sort: value.sort === 'title' ? 'title' : 'updated',
  };
}
export function readRoute(url) {
  const p = new URL(url).searchParams;
  const size = p.get('pageSize');
  return normalize({ q: p.get('q') ?? '', statuses: p.getAll('status'), page: pageNumber(p.get('page') ?? ''), pageSize: ['10', '25', '50'].includes(size) ? Number(size) : 25, sort: p.get('sort') });
}
export function writeRoute(url, input) {
  const result = new URL(url), p = result.searchParams, value = normalize(input);
  for (const key of ['q', 'status', 'page', 'pageSize', 'sort']) p.delete(key);
  if (value.q) p.set('q', value.q);
  for (const status of value.statuses) p.append('status', status);
  if (value.page) p.set('page', String(value.page));
  if (value.pageSize !== 25) p.set('pageSize', String(value.pageSize));
  if (value.sort !== 'updated') p.set('sort', value.sort);
  return result.href;
}

