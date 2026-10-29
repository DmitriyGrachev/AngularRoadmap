type Catalog = { q: string; category: string | null; page: number; size: number };
const current: Catalog = { q: 'сети', category: 'technical', page: 3, size: 10 };
const reset: Catalog = { q: '', category: null, page: 0, size: current.size };
console.log(reset); // q пустой, category null, page 0, size 10

