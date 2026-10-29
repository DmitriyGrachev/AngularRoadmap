const messages = {
  0: 'Нет соединения', 400: 'Проверьте данные', 401: 'Войдите в систему',
  403: 'Недостаточно прав', 404: 'Объект не найден',
  409: 'Данные изменились; обновите экран', 429: 'Слишком много запросов',
};
export function presentProblem(problem, method) {
  const status = problem && !Array.isArray(problem) && Number.isInteger(problem.status) ? problem.status : undefined;
  const message = messages[status] ?? (status >= 500 && status <= 599 ? 'Сервис временно недоступен' : 'Не удалось выполнить запрос');
  return { message, canRetry: ['GET', 'HEAD', 'OPTIONS'].includes(method) && [0, 429, 502, 503, 504].includes(status) };
}

