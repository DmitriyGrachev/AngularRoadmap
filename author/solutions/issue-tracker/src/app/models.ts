export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH';
export interface Issue { id: string; title: string; description: string; status: IssueStatus; priority: IssuePriority; createdAt: string }
export interface Page<T> { items: T[]; total: number; page: number; size: number }
export interface IssueDraft { title: string; description: string; priority: IssuePriority }
export interface IssuePatch { title: string; status: IssueStatus; priority: IssuePriority }
export interface ApiError { message: string; fieldErrors: Record<string, string[]> }
export const statusLabels: Record<IssueStatus, string> = { OPEN: 'Открыта', IN_PROGRESS: 'В работе', DONE: 'Завершена' };
export const priorityLabels: Record<IssuePriority, string> = { LOW: 'Низкий', MEDIUM: 'Средний', HIGH: 'Высокий' };
