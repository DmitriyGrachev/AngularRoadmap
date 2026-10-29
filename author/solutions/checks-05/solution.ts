export interface IssueDraft { title: string; priority: 'LOW' | 'NORMAL' | 'HIGH'; assignee: string | null }
export type IssuePatch = Partial<IssueDraft>;
export function buildPatch(before: IssueDraft, after: IssueDraft): IssuePatch {
  const patch: IssuePatch = {};
  if (before.title.trim() !== after.title.trim()) patch.title = after.title.trim();
  if (before.priority !== after.priority) patch.priority = after.priority;
  if (before.assignee !== after.assignee) patch.assignee = after.assignee;
  return patch;
}
