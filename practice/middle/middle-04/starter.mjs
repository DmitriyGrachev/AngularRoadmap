export function readRoute(url) {
  const p = new URL(url).searchParams;
  return { q: p.get('q') ?? '', statuses: p.getAll('status'), page: Number(p.get('page') ?? 0), pageSize: Number(p.get('pageSize') ?? 25), sort: p.get('sort') ?? 'updated' };
}
export function writeRoute(url, value) {
  const result = new URL(url); result.search = new URLSearchParams({ q: value.q, page: String(value.page), pageSize: String(value.pageSize), sort: value.sort }).toString();
  value.statuses.forEach(status => result.searchParams.append('status', status)); return result.href;
}

