type Reader = { id: string; name: string; category: 'ADULT' | 'CHILD'; joinedAt: string };
type ReaderPatch = Partial<Pick<Reader, 'name' | 'category'>>;
const formValue = { name: 'Анна', category: 'ADULT' as const };
const request: ReaderPatch = { category: formValue.category };
console.log(JSON.stringify(request)); // {"category":"ADULT"}

