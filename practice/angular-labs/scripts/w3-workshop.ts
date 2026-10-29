type Book = { id: string; returned: boolean };
const countWaiting = (books: Book[]) => books.filter(b => !b.returned).length;
const initial = [{ id: 'a', returned: false }, { id: 'b', returned: true }];
const next = initial.map(b => b.id === 'a' ? { ...b, returned: true } : b);
console.log(countWaiting(initial), countWaiting(next)); // 1, 0
console.log(initial[0].returned); // false

