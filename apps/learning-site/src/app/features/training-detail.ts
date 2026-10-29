import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { marked } from 'marked';
import { TrainingService } from '../training.service';
import { CourseService } from '../course.service';
import { kindLabels } from './training';

@Component({
  selector: 'app-training-detail',
  imports: [RouterLink, DatePipe],
  template: `
    <a routerLink="/training" class="text-link training-back">← Вся практика</a>
    @if (training.warning()) { <div class="notice warning" role="status">{{ training.warning() }} <a routerLink="/journal">Экспорт журнала</a></div> }
    @if (training.loading()) { <p role="status">Открываем задание…</p> }
    @else if (training.error()) { <div class="notice warning" role="alert">{{ training.error() }} <button (click)="training.load()" class="button secondary">Повторить загрузку</button></div> }
    @else if (item(); as task) {
      <header class="training-header"><span class="eyebrow">{{ labels[task.kind] }} · {{ task.minutes }} мин</span><h1>{{ task.title }}</h1><p>{{ task.summary }}</p></header>
      <div class="training-detail-grid">
        <div class="training-main">
          <article class="panel training-block lesson-prose" [innerHTML]="brief()"></article>
          @if (task.diff) { <section class="panel training-block"><h2>Изменение на ревью</h2><pre class="review-diff"><code>{{ task.diff }}</code></pre></section> }
          <section class="panel training-block"><h2>Критерии результата</h2><ul>@for (criterion of task.acceptance; track $index) { <li>{{ criterion }}</li> }</ul></section>
          <section class="panel training-block attempt-form"><h2>{{ task.kind === 'review' ? 'Твоё ревью' : 'Зафиксируй свою попытку' }}</h2>
            <p>{{ task.kind === 'review' ? 'Прими изменение или запроси исправление. Назови конкретный сценарий и объясни последствие.' : 'Сначала попробуй в IDE. Запиши наблюдение, свою гипотезу и результат проверки. После этого откроется разбор.' }}</p>
            @if (task.kind === 'review') { <label>Решение<select [value]="decision()" (change)="decision.set($any($event.target).value)"><option value="">Выбери решение</option><option value="accept">Принять изменение</option><option value="changes">Запросить исправление</option></select></label> }
            <label for="attempt-answer">Наблюдение и доказательство<textarea id="attempt-answer" rows="5" maxlength="4000" [value]="answer()" (input)="answer.set($any($event.target).value)" placeholder="На примере … ожидал …, получил …, потому что …"></textarea></label>
            <button class="button primary" [disabled]="answer().trim().length < 10 || (task.kind === 'review' && !decision())" (click)="saveAttempt()">Сохранить попытку</button>
            @if (message()) { <p role="status">{{ message() }}</p> } @if (error()) { <p role="alert">{{ error() }}</p> }
            @if (attempt(); as last) { <div class="attempt-note"><strong>Последняя попытка · {{ last.at | date:'dd.MM.yyyy, HH:mm' }}</strong><p class="preserve-lines">{{ last.answer }}</p>@if (last.decision) { <p>Решение: {{ last.decision === 'accept' ? 'принять' : 'запросить исправление' }}.</p> }</div> }
          </section>
          <section class="panel training-block"><h2>Подсказки по одной</h2><p>Открой следующую, если своего наблюдения недостаточно.</p>
            @for (hint of task.hints.slice(0, hintCount()); track $index) { <div class="hint"><strong>Шаг {{ $index + 1 }}</strong><p>{{ hint }}</p></div> }
            <button class="button secondary" [disabled]="hintCount() >= task.hints.length" (click)="hintCount.update(increment)">{{ hintCount() >= task.hints.length ? 'Все подсказки открыты' : 'Открыть следующую подсказку' }}</button>
          </section>
          @if (attempt()) {
            <section class="panel training-block"><h2>Сверь ход рассуждения</h2><button class="button secondary" (click)="revealed.set(!revealed())" [attr.aria-expanded]="revealed()">{{ revealed() ? 'Скрыть разбор' : 'Открыть разбор' }}</button>
              @if (revealed()) {
                @if (task.kind === 'review') { <div class="notice" role="status"><strong>{{ task.verdict === 'accept' ? 'Изменение можно принять' : 'Нужны исправления' }}</strong><p>{{ attempt()?.decision === task.verdict ? 'Решение совпало. Сравни аргументы.' : 'Решение отличается. Проверь сценарий из разбора.' }}</p></div><ul>@for (finding of task.findings; track $index) { <li>{{ finding }}</li> }</ul> }
                <div class="lesson-prose" [innerHTML]="explanation()"></div>
                <a routerLink="/journal" [queryParams]="{ source: task.id }" class="text-link">Записать ошибку и выбрать новый пример →</a>
              }
            </section>
            @if (task.followUp) { <section class="panel training-block"><h2>Следующее требование от команды</h2><button class="button secondary" (click)="followUp.set(!followUp())" [attr.aria-expanded]="followUp()">Показать / скрыть продолжение</button>@if (followUp()) { <div class="lesson-prose" [innerHTML]="followUpHtml()"></div> }</section> }
          }
        </div>
        <aside class="training-rail">
          <section class="panel training-block"><span class="small muted">Связь с курсом</span><h2>Сначала механизм</h2><a [routerLink]="['/lessons', task.lessonId]" class="text-link">{{ course.title(task.lessonId) }} →</a><p>{{ task.placement === 'replacement' ? 'Можно заменить этим заданием часть ручной практики урока.' : 'Дополнительная практика. Не увеличивает обязательную нагрузку курса.' }}</p></section>
          @if (task.workspacePath) { <section class="panel training-block"><h2>Открой в IDE</h2><code class="path-block">{{ task.workspacePath }}</code>@if (task.command) { <p class="small">Команда из корня проекта:</p><code class="path-block">{{ task.command }}</code><button class="button secondary" (click)="copy(task.command)">Копировать команду</button>@if (copyMessage()) { <p role="status">{{ copyMessage() }}</p> } }
            @if (task.exercise) { <p class="small">Проверка создаст JSON в practice/reports. Импортируй его, чтобы сохранить результат на сайте.</p><a routerLink="/progress" class="text-link">Импортировать результат →</a>@if (report(); as r) { <p><strong>{{ r.outcome === 'passed' ? 'Последняя проверка пройдена' : 'Последняя проверка не пройдена' }}</strong></p><ul>@for (check of r.checks; track check.id) { <li>{{ check.status === 'passed' ? '✓' : '○' }} {{ check.message }}</li> }</ul> } }
          </section> }
          <section class="panel training-block"><h2>Проверить на другом примере</h2>@for (id of task.relatedIds; track id) { <a class="related-link" [routerLink]="['/training', id]">{{ training.title(id) }} →</a> }<p class="small">Пройденные тесты и прочитанный разбор сами по себе не отмечают урок освоенным.</p></section>
        </aside>
      </div>
    } @else { <div class="empty-state"><h1>Задание не найдено</h1><a routerLink="/training" class="button primary">Открыть практику</a></div> }
  `
})
export class TrainingDetail {
  training = inject(TrainingService); course = inject(CourseService);
  id = toSignal(inject(ActivatedRoute).paramMap.pipe(map(p => p.get('id') ?? '')), { initialValue: '' });
  item = computed(() => this.training.items().find(i => i.id === this.id()));
  attempt = computed(() => this.training.latest(this.id()));
  brief = computed(() => marked.parse(this.item()?.brief ?? '', { async: false }));
  explanation = computed(() => marked.parse(this.item()?.explanation ?? '', { async: false }));
  followUpHtml = computed(() => marked.parse(this.item()?.followUp ?? '', { async: false }));
  report = computed(() => {
    const exercise = this.item()?.exercise;
    return exercise ? this.course.progress().attempts.filter(a => a.exerciseId === exercise.id && a.assessmentRevision === exercise.assessmentRevision).sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))[0] : undefined;
  });
  labels = kindLabels; answer = signal(''); decision = signal<'' | 'accept' | 'changes'>(''); hintCount = signal(0); revealed = signal(false); followUp = signal(false); message = signal(''); error = signal(''); copyMessage = signal('');
  increment = (n: number) => n + 1;
  constructor() { effect(() => { this.id(); this.answer.set(''); this.decision.set(''); this.hintCount.set(0); this.revealed.set(false); this.followUp.set(false); this.message.set(''); this.error.set(''); this.copyMessage.set(''); }); }
  saveAttempt() {
    try { this.training.attempt(this.id(), this.answer(), this.decision() || undefined); this.message.set('Попытка сохранена. Теперь можно открыть разбор.'); this.error.set(''); }
    catch (e) { this.error.set(e instanceof Error ? e.message : 'Не удалось сохранить попытку.'); }
  }
  async copy(command: string) {
    try { await navigator.clipboard.writeText(command); this.copyMessage.set('Команда скопирована.'); }
    catch { this.copyMessage.set('Выдели и скопируй команду вручную.'); }
  }
}
