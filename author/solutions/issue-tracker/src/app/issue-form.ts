import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { BehaviorSubject, combineLatest, EMPTY, of } from 'rxjs';
import { IssueService } from './issue.service';
import { ApiError, IssuePriority, IssueStatus } from './models';

@Component({ selector: 'app-issue-form', imports: [ReactiveFormsModule, RouterLink], template: `
  <a class="back" routerLink="/issues">← Все заявки</a><section class="intro"><p class="eyebrow">{{ id ? 'РЕДАКТИРОВАНИЕ' : 'НОВАЯ ЗАЯВКА' }}</p><h1>{{ id ? 'Уточните детали' : 'С чего начнём?' }}</h1><p>Опишите задачу так, чтобы следующий шаг был понятен.</p></section>
  @if (loadState() === 'loading') { <p role="status">Загружаем заявку…</p> }
  @else if (loadState() === 'not-found') { <section class="notice error" role="alert"><h2>Заявка не найдена</h2><p>Проверьте ID в адресной строке.</p><a routerLink="/issues">Вернуться к списку</a></section> }
  @else if (loadState() === 'error') { <section class="notice error" role="alert"><h2>Не удалось загрузить заявку</h2><p>Проверьте подключение к API и повторите загрузку.</p><button type="button" (click)="retryLoad()">Повторить загрузку</button></section> }
  @else { <form class="panel issue-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
    @if (message()) { <div class="error form-error" role="alert">{{ message() }}</div> }
    <label for="issue-title">Название <span class="muted">3–120 символов</span></label>
    <input id="issue-title" formControlName="title" maxlength="120" [attr.aria-invalid]="titleError() ? 'true' : null" [attr.aria-describedby]="titleError() ? 'title-error' : null">
    @if (titleError()) { <p id="title-error" class="field-error">{{ titleError() }}</p> }
    @if (!id) { <label for="description">Описание <span class="muted">до 2000 символов</span></label><textarea id="description" formControlName="description" rows="5" maxlength="2000"></textarea> }
    <div class="form-row"><label>Приоритет<select aria-label="Приоритет" formControlName="priority"><option value="LOW">Низкий</option><option value="MEDIUM">Средний</option><option value="HIGH">Высокий</option></select></label>
    @if (id) { <label>Статус<select aria-label="Статус" formControlName="status"><option value="OPEN">Открыта</option><option value="IN_PROGRESS">В работе</option><option value="DONE">Завершена</option></select></label> }</div>
    <details class="scenarios"><summary>Учебный сценарий отправки</summary><label>Результат отправки<select aria-label="Результат отправки" [value]="scenario()" (change)="setScenario($event)"><option value="">Обычный</option><option value="slow">Медленный · 1,5 с</option><option value="validation">Серверная ошибка поля</option><option value="error">Ошибка 500</option></select></label></details>
    <div class="form-actions"><button type="submit" [disabled]="pending()">{{ pending() ? 'Сохраняем…' : 'Сохранить заявку' }}</button><a routerLink="/issues">Отмена</a></div>
  </form> }
` })
export class IssueForm {
  private readonly api = inject(IssueService); private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly fb = inject(FormBuilder); private readonly destroyRef = inject(DestroyRef);
  id: string | null = null;
  readonly pending = signal(false); readonly loadState = signal<'loading' | 'ready' | 'not-found' | 'error'>('ready'); readonly message = signal(''); readonly fieldErrors = signal<Record<string, string[]>>({}); readonly scenario = signal('');
  private readonly reload = new BehaviorSubject(0);
  readonly form = this.fb.nonNullable.group({ title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]], description: ['', Validators.maxLength(2000)], priority: this.fb.nonNullable.control<IssuePriority>('MEDIUM'), status: this.fb.nonNullable.control<IssueStatus>('OPEN') });
  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.fieldErrors.set({}));
    combineLatest([this.route.paramMap, this.reload]).pipe(switchMap(([params]) => {
      this.id = params.get('id'); this.loadState.set(this.id ? 'loading' : 'ready'); this.message.set(''); this.fieldErrors.set({});
      return this.id ? this.api.get(this.id).pipe(catchError(error => { this.loadState.set(error.status === 404 ? 'not-found' : 'error'); return EMPTY; })) : of(null);
    }), takeUntilDestroyed()).subscribe(issue => {
      if (issue) this.form.reset({ title: issue.title, description: issue.description, priority: issue.priority, status: issue.status });
      this.loadState.set('ready');
    });
  }
  titleError() {
    const server = this.fieldErrors()['title']; if (server?.length) return server.join(' ');
    return this.form.controls.title.touched && (this.form.controls.title.invalid || this.form.controls.title.value.trim().length < 3) ? 'Введите название от 3 до 120 символов.' : '';
  }
  setScenario(event: Event) { this.scenario.set((event.target as HTMLSelectElement).value); }
  retryLoad() { this.reload.next(0); }
  submit() {
    if (this.pending() || this.loadState() !== 'ready') return;
    this.form.markAllAsTouched(); const value = this.form.getRawValue();
    if (this.form.invalid || value.title.trim().length < 3) return;
    this.pending.set(true); this.message.set(''); this.fieldErrors.set({});
    const request = this.id ? this.api.update(this.id, { title: value.title, status: value.status, priority: value.priority }, this.scenario()) : this.api.create({ title: value.title, description: value.description, priority: value.priority }, this.scenario());
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.pending.set(false))).subscribe({ next: issue => void this.router.navigate(['/issues', issue.id]), error: error => { const body = error.error as Partial<ApiError> | null; this.message.set(body?.message || 'Не удалось сохранить. Ввод сохранён: проверьте API и повторите.'); this.fieldErrors.set(body?.fieldErrors || {}); } });
  }
}
