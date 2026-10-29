const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
export function parseIssuePage(source) {
  let value;
  try { value = JSON.parse(source); } catch { return { ok: false, error: 'invalid-json' }; }
  const valid = object(value) && Array.isArray(value.items) && Number.isSafeInteger(value.total) && value.total >= value.items.length && value.items.every(item => object(item) && text(item.id) && text(item.title) && ['OPEN','IN_PROGRESS','DONE'].includes(item.status));
  return valid ? { ok: true, value } : { ok: false, error: 'invalid-shape' };
}
