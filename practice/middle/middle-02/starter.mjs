export function decodeIssues(input) {
  return { ok: true, value: input.map(row => ({ id: row.id, title: row.title, createdAt: new Date(row.createdAt) })) };
}

