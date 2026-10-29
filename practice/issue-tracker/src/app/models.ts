export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH';
export interface Issue { id: string; title: string; description: string; status: IssueStatus; priority: IssuePriority; createdAt: string }
export interface Page<T> { items: T[]; total: number; page: number; size: number }
// TODO w2/w4: объясните, почему этот интерфейс сам не проверяет JSON во время выполнения.
