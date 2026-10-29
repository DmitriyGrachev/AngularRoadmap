export function readFilters(absoluteUrl) {
  // TODO: разберите и проверьте searchParams.
  return { q: '', status: 'ALL', page: 0 };
}
export function writeFilters(absoluteUrl, state) {
  // TODO: изменяйте только q/status/page.
  return absoluteUrl;
}
