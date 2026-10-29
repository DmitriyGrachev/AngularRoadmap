export function filterIssues(issues, status) {
  return issues.filter(issue => issue.status === status);
}

export function labelIssues(issues) {
  return issues.map(issue => `${issue.id}: ${issue.title}`);
}
