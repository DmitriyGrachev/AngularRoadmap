type Availability = 'ALL' | 'AVAILABLE' | 'BORROWED';
type CatalogState = { query: string; availability: Availability; page: number };
const state: CatalogState = { query: 'сети', availability: 'ALL', page: 4 };
const afterChoosingAvailable: CatalogState = {
  ...state, availability: 'AVAILABLE', page: 0,
};
console.log(afterChoosingAvailable.query, afterChoosingAvailable.page); // сети 0

