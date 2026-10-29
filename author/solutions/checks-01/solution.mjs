export function updateStatus(items, id, status) {
  if (!items.some(item => item.id === id && item.status !== status)) return items;
  return items.map(item => item.id === id ? { ...item, status } : item);
}
