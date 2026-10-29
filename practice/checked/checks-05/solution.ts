export interface IssueDraft { title: string; priority: 'LOW' | 'NORMAL' | 'HIGH'; assignee: string | null }
export type IssuePatch = Partial<IssueDraft>;
export function buildPatch(before: IssueDraft, after: IssueDraft): IssuePatch {
  // TODO: нормализуйте title и включите только изменения.
  return {};
}
