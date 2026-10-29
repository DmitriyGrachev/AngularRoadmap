export async function mapConcurrent(items, limit, worker) {
  return Promise.all(items.map(worker));
}

