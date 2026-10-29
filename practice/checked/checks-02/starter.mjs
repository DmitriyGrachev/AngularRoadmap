export function parseIssuePage(text) {
  // TODO: разделите ошибку JSON и неверную форму, проверьте все записи.
  return { ok: true, value: JSON.parse(text) };
}
