export const loadAll = (ids, load) => Promise.all(ids.map(id => load(id)));
