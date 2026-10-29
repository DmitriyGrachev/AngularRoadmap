import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, Subject, combineLatest, of, timer } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { IssueService } from './issue.service';
import { Issue, Page, statusLabels, priorityLabels } from './models';

interface ListState { loading: boolean; error: string; data: Page<Issue> | null }
@Component({ selector: 'app-issues-list', imports: [RouterLink], template: `
  <section class="intro"><p class="eyebrow">РАБОТА С ЗАЯВКАМИ</p><h1>Всё под контролем</h1><p>Найдите нужную заявку, уточните приоритет и продолжайте работу.</p></section>
  <section class="panel" aria-label="Фильтры">
    <div class="filters"><label class="search">Поиск<input type="search" placeholder="Название или описание" [value]="searchText()" (input)="search($event)"></label>
    <label>Статус<select aria-label="Статус" [value]="query().get('status') || ''" (change)="select('status', $event)"><option value="">Все статусы</option><option value="OPEN">Открыта</option><option value="IN_PROGRESS">В работе</option><option value="DONE">Завершена</option></select></label>
    <label>Приоритет<select aria-label="Приоритет" [value]="query().get('priority') || ''" (change)="select('priority', $event)"><option value="">Любой</option><option value="LOW">Низкий</option><option value="MEDIUM">Средний</option><option value="HIGH">Высокий</option></select></label>
    <button type="button" class="secondary" (click)="reset()">Сбросить фильтры</button></div>
    <details class="scenarios"><summary>Учебные сценарии API</summary><label>Ответ сервера<select aria-label="Ответ сервера" [value]="query().get('scenario') || ''" (change)="select('scenario', $event)"><option value="">Обычный</option><option value="slow">Медленный · 1,5 с</option><option value="error">Ошибка 500</option><option value="empty">Пустой список</option></select></label></details>
  </section>
  @if (state().loading) { <div class="notice" role="status">Загружаем заявки…</div> }
  @else if (state().error) { <div class="notice error" role="alert"><h2>Не удалось загрузить заявки</h2><p>{{ state().error }}</p><button (click)="refresh.next(0)">Повторить</button></div> }
  @else if (state().data; as page) {
    <div class="list-heading"><h2>Заявки <span class="count">{{ page.total }}</span></h2><span>Страница {{ page.page + 1 }} из {{ pages() }}</span></div>
    @if (!page.items.length) { <div class="notice"><h2>Заявки не найдены</h2><p>Попробуйте изменить запрос или сбросить фильтры.</p></div> }
    <div class="issue-list">@for (issue of page.items; track issue.id) { <a class="issue-row" [routerLink]="['/issues', issue.id]"><span class="issue-id">{{ issue.id }}</span><span class="issue-title">{{ issue.title }}</span><span class="status" [class.done]="issue.status === 'DONE'">{{ statuses[issue.status] }}</span><span class="priority" [class.high]="issue.priority === 'HIGH'">{{ priorities[issue.priority] }}</span><span aria-hidden="true">↗</span></a> }</div>
    <div class="pagination"><button class="secondary" [disabled]="page.page === 0" (click)="change({page: page.page - 1})">← Назад</button><span>По 10 заявок на странице</span><button class="secondary" [disabled]="(page.page + 1) * page.size >= page.total" (click)="change({page: page.page + 1})">Далее →</button></div>
  }
` })
export class IssuesList {
  readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly api = inject(IssueService);
  readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly refresh = new BehaviorSubject(0); private readonly searches = new Subject<string | null>();
  readonly searchText = signal(this.route.snapshot.queryParamMap.get('q') || '');
  readonly statuses = statusLabels; readonly priorities = priorityLabels;
  readonly state = toSignal(combineLatest([this.route.queryParamMap, this.refresh]).pipe(switchMap(([query]) => {
    const params: Record<string, string> = { page: query.get('page') || '0', size: '10' };
    for (const key of ['q', 'status', 'priority', 'scenario']) if (query.get(key)) params[key] = query.get(key)!;
    return this.api.list(params).pipe(map(data => ({ loading: false, error: '', data } as ListState)), catchError(error => of({ loading: false, error: error.status ? 'Сервер вернул ошибку ' + error.status + '. Повторите запрос или измените учебный сценарий.' : 'Проверьте, запущен ли Java API на порту 8080.', data: null } as ListState)), startWith({ loading: true, error: '', data: null } as ListState));
  })), { initialValue: { loading: true, error: '', data: null } as ListState });
  readonly pages = computed(() => Math.max(1, Math.ceil((this.state().data?.total ?? 0) / 10)));
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(query => { this.searchText.set(query.get('q') || ''); this.searches.next(null); });
    this.searches.pipe(switchMap(q => q === null ? EMPTY : timer(250).pipe(map(() => q))), takeUntilDestroyed()).subscribe(q => {
      if (q !== (this.query().get('q') || '')) this.change({ q: q || null, page: 0 });
    });
  }
  search(event: Event) { const value = (event.target as HTMLInputElement).value; this.searchText.set(value); this.searches.next(value); }
  select(key: string, event: Event) { this.change({ [key]: (event.target as HTMLSelectElement).value || null, page: 0 }); }
  change(params: Record<string, string | number | null>) { void this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge' }); }
  reset() { this.searchText.set(''); this.searches.next(null); void this.router.navigate(['/issues']); }
}
