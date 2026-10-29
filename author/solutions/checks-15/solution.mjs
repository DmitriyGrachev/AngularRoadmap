import { loadAll } from './parallel.mjs';
export async function loadDashboard(ids, load) {
  return loadAll(ids, load);
}
