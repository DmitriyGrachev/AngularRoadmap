export function presentProblem(problem, method) {
  return { message: problem?.detail ?? 'Не удалось выполнить запрос', canRetry: problem?.status >= 500 };
}

