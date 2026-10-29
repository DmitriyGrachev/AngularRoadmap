export function decodeIssues(input) {
  const bad = { ok: false, error: 'invalid-data' };
  if (!Array.isArray(input)) return bad;
  const ids = new Set(), value = [];
  for (const row of input) {
    if (!row || typeof row !== 'object' || Array.isArray(row) ||
        typeof row.id !== 'string' || !row.id.trim() ||
        typeof row.title !== 'string' || !row.title.trim() ||
        typeof row.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.createdAt)) return bad;
    const date = new Date(row.createdAt + 'T00:00:00.000Z'), id = row.id.trim();
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== row.createdAt || ids.has(id)) return bad;
    ids.add(id);
    value.push({ id, title: row.title.trim(), createdAt: date });
  }
  return { ok: true, value };
}

