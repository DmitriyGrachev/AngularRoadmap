const cases = [
  { availability: null, expected: 'ALL' },
  { availability: 'AVAILABLE', expected: 'AVAILABLE' },
  { availability: 'unknown', expected: 'ALL' },
];
function normalizeAvailability(value: string | null) {
  return value === 'AVAILABLE' || value === 'BORROWED' ? value : 'ALL';
}
for (const item of cases) {
  const actual = normalizeAvailability(item.availability);
  console.assert(actual === item.expected, 'Неверная нормализация', item);
}

