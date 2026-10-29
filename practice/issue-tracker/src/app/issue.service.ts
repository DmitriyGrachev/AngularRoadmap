import { Injectable, signal } from '@angular/core';
import { Issue } from './models';

@Injectable({ providedIn: 'root' })
export class IssueService {
  readonly issues = signal<Issue[]>([
    { id: 'ISS-001', title: 'Исправить поиск', description: 'Учебная заявка для списка и деталей.', status: 'OPEN', priority: 'HIGH', createdAt: '2026-10-01T09:00:00Z' },
    { id: 'ISS-002', title: 'Проверить форму', description: 'Проверьте label и доступность с клавиатуры.', status: 'IN_PROGRESS', priority: 'MEDIUM', createdAt: '2026-10-01T09:00:00Z' },
    { id: 'ISS-003', title: 'Обновить карточку', description: 'Сравните поведение до и после изменения.', status: 'DONE', priority: 'LOW', createdAt: '2026-10-01T09:00:00Z' },
  ]);
  find(id: string) { return this.issues().find(issue => issue.id === id); }
  // TODO w3: добавьте изменение статуса через новый массив, не мутируя исходный объект.
  // TODO w4: замените fixtures на HttpClient и обработайте loading/empty/error/success.
  // TODO w5: добавьте POST/PATCH по опубликованному контракту API.
}
