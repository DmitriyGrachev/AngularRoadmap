export function filterIssues(issues,status){
  // Намеренный дефект: ожидается выбор статуса, а не исключение.
  return issues.filter(issue=>issue.status!==status);
}
