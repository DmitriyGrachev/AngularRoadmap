import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { IssueService } from './issue.service';
import { Issue, statusLabels, priorityLabels } from './models';

@Component({ selector: 'app-issue-detail', imports: [RouterLink, DatePipe], template: `
  <a class="back" routerLink="/issues">← Все заявки</a>
  @if (state().loading) { <p role="status">Загружаем заявку…</p> }
  @else if (state().error) { <section class="notice error" role="alert"><h1>{{ state().error }}</h1><a routerLink="/issues">Вернуться к списку</a></section> }
  @else if (state().issue; as issue) {
    <section class="intro"><p class="eyebrow">{{ issue.id }}</p><h1>{{ issue.title }}</h1><div class="meta"><span class="status">{{ statuses[issue.status] }}</span><span>Приоритет: {{ priorities[issue.priority] }}</span><span>{{ issue.createdAt | date:'dd.MM.yyyy HH:mm' }}</span></div></section>
    <section class="panel"><h2>Описание</h2><p class="description">{{ issue.description || 'Описание не добавлено.' }}</p><a class="button" [routerLink]="['/issues', issue.id, 'edit']">Изменить заявку</a></section>
  }
` })
export class IssueDetail {
  private readonly route = inject(ActivatedRoute); private readonly api = inject(IssueService);
  readonly statuses = statusLabels; readonly priorities = priorityLabels;
  readonly state = toSignal(this.route.paramMap.pipe(switchMap(params => this.api.get(params.get('id')!).pipe(map(issue => ({ loading: false, error: '', issue: issue as Issue | null })), catchError(error => of({ loading: false, error: error.status === 404 ? 'Заявка не найдена' : 'Не удалось загрузить заявку. Проверьте API.', issue: null })), startWith({ loading: true, error: '', issue: null })))), { initialValue: { loading: true, error: '', issue: null } });
}
