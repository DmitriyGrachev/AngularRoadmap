export async function mapConcurrent(items, limit, worker) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('limit');
  const output = new Array(items.length);
  let next = 0, failed = false;
  async function consume() {
    while (!failed && next < items.length) {
      const index = next++;
      try { output[index] = await worker(items[index], index); }
      catch (error) { failed = true; throw error; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, consume));
  return output;
}

