export async function loadDashboard(ids, load) {
  // TODO: запустите все чтения до ожидания результатов.
  const results = [];
  for (const id of ids) results.push(await load(id));
  return results;
}
