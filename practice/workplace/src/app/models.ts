export type Status = 'open' | 'in-progress' | 'closed';
export type Priority = 'high' | 'normal' | 'low';
export interface RequestItem {
  id: string;
  title: string;
  description: string;
  customer: string;
  status: Status;
  priority: Priority;
  assignee: string;
  updatedAt: string;
}
export interface ListQuery { q: string; status: Status | 'all'; page: number; }
export interface RequestPage { items: RequestItem[]; total: number; page: number; pageSize: number; }
export type RequestPatch = Partial<Pick<RequestItem, 'title' | 'description' | 'status' | 'assignee'>>;
export const STATUS_LABELS: Record<Status, string> = { open: 'Открыта', 'in-progress': 'В работе', closed: 'Закрыта' };
export const PRIORITY_LABELS: Record<Priority, string> = { high: 'Высокий', normal: 'Обычный', low: 'Низкий' };
export const ASSIGNEES = ['Анна Левина', 'Михаил Попов', 'Ирина Соколова'];
export class ApiError extends Error {
  constructor(public status: number, message: string, public fields: Record<string, string> = {}) { super(message); }
}
