export function readFilters(absoluteUrl) {
  const params = new URL(absoluteUrl).searchParams;
  const rawPage = params.get('page') ?? '', number = Number(rawPage), status = params.get('status');
  return { q: (params.get('q') ?? '').trim(), status: ['OPEN','IN_PROGRESS','DONE'].includes(status) ? status : 'ALL', page: /^\d+$/.test(rawPage) && Number.isSafeInteger(number) ? number : 0 };
}
export function writeFilters(absoluteUrl, state) {
  const url = new URL(absoluteUrl);
  for (const [key,value,fallback] of [['q',state.q.trim(),''],['status',state.status,'ALL'],['page',String(state.page),'0']]) {
    if (value === fallback) url.searchParams.delete(key); else url.searchParams.set(key,value);
  }
  return url.toString();
}
