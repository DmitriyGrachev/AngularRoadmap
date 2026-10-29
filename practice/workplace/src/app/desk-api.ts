import { Injectable } from '@angular/core';
import { defer, map, Observable, timer } from 'rxjs';
import { ApiError, ASSIGNEES, ListQuery, RequestItem, RequestPage, RequestPatch } from './models';
import { createSeed } from './seed';

@Injectable({ providedIn: 'root' })
export class DeskApi {
  private items = createSeed();
  private listFailure = false;
  private saveFailure = false;

  failNextList(): void { this.listFailure = true; }
  failNextSave(): void { this.saveFailure = true; }

  list(query: ListQuery): Observable<RequestPage> {
    return defer(() => {
      const fail = this.listFailure;
      this.listFailure = false;
      return timer(350).pipe(map(() => {
        if (fail) throw new ApiError(503, 'Сервис временно недоступен. Параметры поиска сохранены в адресе.');
        const needle = query.q.trim().toLocaleLowerCase('ru');
        const matching = this.items.filter(item =>
          (query.status === 'all' || item.status === query.status) &&
          `${item.id} ${item.title} ${item.customer}`.toLocaleLowerCase('ru').includes(needle));
        const pageSize = 6;
        const page = Math.min(Math.max(1, query.page), Math.max(1, Math.ceil(matching.length / pageSize)));
        return { items: matching.slice((page - 1) * pageSize, page * pageSize).map(item => ({ ...item })), total: matching.length, page, pageSize };
      }));
    });
  }

  get(id: string): Observable<RequestItem> {
    return timer(250).pipe(map(() => ({ ...this.find(id) })));
  }

  update(id: string, patch: RequestPatch): Observable<RequestItem> {
    return defer(() => {
      const fail = this.saveFailure;
      this.saveFailure = false;
      return timer(500).pipe(map(() => {
        if (fail) throw new ApiError(503, 'Сохранение не выполнено. Попробуйте ещё раз.');
        const current = this.find(id);
        const candidate = { ...current, ...patch, title: (patch.title ?? current.title).trim() };
        const fields: Record<string, string> = {};
        if (candidate.title.length < 5 || candidate.title.length > 100) fields['title'] = 'Введите от 5 до 100 символов без крайних пробелов.';
        if (candidate.description.length > 1000) fields['description'] = 'Не больше 1000 символов.';
        if (!['open', 'in-progress', 'closed'].includes(candidate.status)) fields['status'] = 'Неизвестный статус.';
        if (candidate.assignee && !ASSIGNEES.includes(candidate.assignee)) fields['assignee'] = 'Сотрудник не входит в команду поддержки.';
        if (candidate.status === 'in-progress' && !candidate.assignee) fields['assignee'] = 'Для работы над заявкой назначьте исполнителя.';
        if (Object.keys(fields).length) throw new ApiError(422, 'Проверьте введённые данные.', fields);
        const saved = { ...candidate, updatedAt: new Date().toISOString() };
        this.items = this.items.map(item => item.id === id ? saved : item);
        return { ...saved };
      }));
    });
  }

  private find(id: string): RequestItem {
    const item = this.items.find(candidate => candidate.id === id);
    if (!item) throw new ApiError(404, 'Заявка не найдена. Проверьте номер в адресе.');
    return item;
  }
}
