export function mergePage(previous, incoming) {
  const byId = new Map();
  for (const item of [...previous, ...incoming]) byId.set(item.id, item);
  return [...byId.values()];
}
