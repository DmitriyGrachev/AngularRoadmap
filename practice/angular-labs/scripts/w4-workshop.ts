function explain(status: number) {
  if (status === 401) return 'Нет подходящей аутентификации';
  if (status === 403) return 'Доступ запрещён';
  if (status === 404) return 'Ресурс не найден';
  if (status === 0) return 'Нет доступного HTTP-ответа: нужна диагностика';
  return 'Смотрите контракт и тело ответа';
}
[401, 403, 404, 0, 500].forEach(status => console.log(status, explain(status)));
