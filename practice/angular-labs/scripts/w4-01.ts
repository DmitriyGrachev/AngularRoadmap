// Диагностическое чтение подготовленного API. Запись данных не выполняется.
const params = new URLSearchParams({ q: 'сервер', page: '0', size: '2' });
const response = await fetch('http://127.0.0.1:8080/api/issues?' + params);
console.log(response.status, response.headers.get('content-type'));
if (!response.ok) {
  console.log('HTTP-ошибка', await response.text());
} else {
  const page = await response.json();
  console.log(Array.isArray(page.items), page.page, page.size, page.total);
}
