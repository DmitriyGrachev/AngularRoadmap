type Search = { q: string; page: number };
function changeQuery(current: Search, q: string): Search {
  return { ...current, q }; // намеренный дефект: номер старой страницы сохранён
}
const before = { q: '', page: 3 };
const after = changeQuery(before, 'редкая книга');
console.log(after); // { q: 'редкая книга', page: 3 }

