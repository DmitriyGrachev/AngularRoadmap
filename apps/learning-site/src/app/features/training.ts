import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { TrainingService } from '../training.service';
import { CourseService } from '../course.service';

export const kindLabels: Record<string, string> = { check: 'Проверка кода', bug: 'Отладка', ticket: 'Рабочая задача', review: 'Ревью' };
@Component({
  selector: 'app-training',
  imports: [RouterLink, FormsModule],
  template: `
    <header class="training-header"><span class="eyebrow">Теория становится навыком</span><h1>Практическая лаборатория</h1><p>Пиши, отлаживай и проверяй чужие решения. Выбирай задачу по текущему уроку, а после ошибки возвращайся к механизму.</p></header>
    @if (training.warning()) { <div class="notice warning" role="status">{{ training.warning() }} <a routerLink="/journal">Экспорт журнала</a></div> }
    <div class="training-summary">
      @for (kind of kinds; track kind.id) { <button class="panel" [class.selected]="category() === kind.id" [attr.aria-pressed]="category() === kind.id" (click)="filter(kind.id)"><strong>{{ count(kind.id) }}</strong><span>{{ kind.label }}</span></button> }
    </div>
    <div class="notice"><strong>Как уложиться в 15–20 часов в неделю.</strong> Задания «Вместо части практики» входят во время урока. «Дополнительно» — факультативны. Два этапа: {{ course.weeks().length }} недель, {{ course.hours(course.totalMinutes()) }}. У продвинутых уроков также есть обязательные ручные практикумы с критериями.</div>
    <div class="training-toolbar">
      <label>Найти тему<input type="search" placeholder="Например, формы или RxJS" [value]="query()" (input)="query.set($any($event.target).value)"></label>
      <label>Тип<select [ngModel]="category()" (ngModelChange)="filter($event)"><option value="">Все задания</option>@for (kind of kinds; track kind.id) { <option [value]="kind.id">{{ kind.label }}</option> }</select></label>
      <label>После урока<select [ngModel]="lesson()" (ngModelChange)="filter(category(), $event)"><option value="">Любой урок</option>@for (l of course.lessons(); track l.id) { <option [value]="l.id">{{ l.id }} · {{ l.title }}</option> }</select></label>
    </div>
    <div class="training-shortcuts"><a routerLink="/mechanisms">Пять механизмов в движении →</a><a routerLink="/journal">Журнал ошибок @if (training.due().length) { · {{ training.due().length }} к повторению } →</a></div>
    @if (training.loading()) { <p role="status">Загружаем задания…</p> }
    @else if (training.error()) { <div class="notice warning" role="alert">{{ training.error() }} <button class="button secondary" (click)="training.load()">Повторить загрузку</button></div> }
    @else {
      <p class="small muted result-count" aria-live="polite">Найдено заданий: {{ visible().length }}</p>
      <div class="training-grid">
        @for (item of visible(); track item.id) {
          <a class="training-card panel" [routerLink]="['/training', item.id]">
            <div class="training-card-meta"><span class="tag" [attr.data-kind]="item.kind">{{ labels[item.kind] }}</span><span>{{ item.minutes }} мин</span></div>
            <h2>{{ item.title }}</h2><p>{{ item.summary }}</p>
            <div class="training-card-footer"><span>{{ item.lessonId }} · {{ item.placement === 'replacement' ? 'Вместо части практики' : 'Дополнительно' }}</span><span>{{ training.latest(item.id) ? 'Есть попытка →' : 'Начать →' }}</span></div>
          </a>
        } @empty { <div class="empty-state"><h2>Ничего не найдено</h2><p>Попробуй другую тему или сбрось фильтры.</p><button class="button secondary" (click)="reset()">Сбросить фильтры</button></div> }
      </div>
    }
  `
})
export class Training {
  training = inject(TrainingService);
  course = inject(CourseService);
  router = inject(Router);
  params = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map(p => ({ kind: p.get('kind') ?? '', lesson: p.get('lesson') ?? '' }))), { initialValue: { kind: '', lesson: '' } });
  category = computed(() => this.params().kind);
  lesson = computed(() => this.params().lesson);
  query = signal('');
  labels = kindLabels;
  kinds = Object.entries(kindLabels).map(([id, label]) => ({ id, label }));
  visible = computed(() => this.training.items().filter(item => (!this.category() || item.kind === this.category()) && (!this.lesson() || item.lessonId === this.lesson()) && `${item.title} ${item.summary} ${item.concept}`.toLocaleLowerCase('ru').includes(this.query().toLocaleLowerCase('ru').trim())));
  count(kind: string) { return this.training.items().filter(i => i.kind === kind).length; }
  filter(kind: string, lesson = this.lesson()) { void this.router.navigate(['/training'], { queryParams: { kind: kind || null, lesson: lesson || null } }); }
  reset() { this.query.set(''); this.filter('', ''); }
}
