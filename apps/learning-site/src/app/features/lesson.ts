import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { marked, Renderer } from 'marked';
import { CourseService } from '../course.service';
import { Icon } from '../icon';
import { DatePipe } from '@angular/common';
import type { LessonRecord } from '../../../../../shared/domain';

@Component({
  selector: 'app-lesson',
  imports: [RouterLink, Icon, DatePipe],
  template: `
    @if (lesson(); as item) {
      @if (item.readiness === 'planned') {
        <div class="empty-state"><h1>Этот урок готовится</h1><p>{{ item.title }}</p><a routerLink="/roadmap" class="button primary">Выбрать готовый урок</a></div>
      } @else {
        <a routerLink="/roadmap" class="back-link">← К роадмапу</a>
        <div class="lesson-layout">
          <article class="lesson-content">
            <div class="lesson-heading"><div class="lesson-eyeline">Неделя {{ item.week }} <span>·</span> {{ item.id.endsWith('workshop') ? 'Практикум' : 'Урок ' + (+item.id.slice(-2)) }}<span>·</span>{{ course.hours(item.minutes) }}</div><h1>{{ item.title }}</h1><p>{{ item.summary }}</p></div>
            @if (loading()) { <div class="loading-state"><span class="loader"></span>Открываем материал…</div> }
            @else if (error()) { <div class="notice warning" role="alert">{{ error() }}<button class="button secondary" (click)="reload()">Повторить</button></div> }
            @else {
              <div class="lesson-prose" [innerHTML]="html()" (click)="contentClick($event)"></div>
              <section class="lesson-completion panel">
                <h2>Остановись и проверь себя</h2>
                <p>Сможешь объяснить механизм и применить его на другом примере? Отметки ниже — твоя оценка понимания, отдельно от результатов тестов.</p>
                <button class="button secondary" [disabled]="!!record()?.readAt" (click)="markRead()"><app-icon name="check" />{{ record()?.readAt ? 'Прочитано' : 'Отметить прочитанным' }}</button>
                <label class="field-label" for="practice-mode">Как получилось выполнить практику?</label>
                <select id="practice-mode" [value]="record()?.practiceMode || ''" (change)="setMode($event)"><option value="" disabled>Пока не отмечено</option><option value="guided">С подсказками</option><option value="independent">Самостоятельно</option></select>
                <label class="checkbox-row"><input type="checkbox" [checked]="!!record()?.masteredAt" (change)="mastery($event)">Могу объяснить и повторить самостоятельно</label>
                @if (record()?.masteredAt) { <p class="small muted">Тема появится в повторении через 2 и 7 дней. Самооценку можно изменить.</p> }
                @if (course.due().some(isCurrent)) {
                  <div class="review-actions"><span>Повторение на новом примере:</span><button class="button secondary" (click)="course.review(item.id, 'remembered')">Вспомнил самостоятельно</button><button class="button quiet" (click)="course.review(item.id, 'repeat')">Нужно повторить</button></div>
                }
              </section>
              <div class="lesson-pagination">
                @if (previous(); as prev) { <a [routerLink]="['/lessons', prev.id]"><span>← Предыдущий урок</span><strong>{{ prev.title }}</strong></a> }
                @if (next(); as nextItem) { <a class="next-link" [routerLink]="['/lessons', nextItem.id]"><span>Следующий урок →</span><strong>{{ nextItem.title }}</strong></a> }
              </div>
            }
          </article>
          <aside class="lesson-rail">
            <div class="rail-block practice-box"><h2>Закрепить тему</h2><p>Найди ошибку, проверь код или разбери рабочую задачу после этого урока.</p><a routerLink="/training" [queryParams]="{ lesson: item.id }" class="text-link">Практика по теме →</a></div>
            @if (toc().length) {
              <div class="toc"><h2>В этом уроке</h2>@for (heading of toc(); track heading.index) { <button [class.subheading]="heading.depth > 2" (click)="scrollTo(heading.index)">{{ heading.text }}</button> }</div>
            }
            @if (item.prerequisites.length) { <div class="rail-block"><h2>Пригодится перед началом</h2>@for (id of item.prerequisites; track id) { <a [routerLink]="['/lessons', id]">{{ course.title(id) }}</a> }</div> }
            @for (exercise of exercises(); track exercise.id) {
              <div class="rail-block practice-box"><span class="small muted">Практика в IDE</span><h2>{{ exercise.mode === 'automated' ? 'Проверка решения' : 'Самостоятельная задача' }}</h2><code>{{ exercise.workspacePath }}</code>
                @if (exercise.mode === 'automated') {
                  <div class="command-box"><code>npm.cmd run learn -- check {{ exercise.id }}</code><button class="copy-button" (click)="copy('npm.cmd run learn -- check ' + exercise.id)">{{ copied() ? 'Скопировано' : 'Копировать' }}</button></div>
                  @if (copyError()) { <p role="alert">{{ copyError() }}</p> }
                  @if (lastAttempt(exercise.id); as attempt) {
                    <p class="latest-attempt"><strong>Последняя проверка: {{ outcome(attempt.outcome) }}</strong><br><span class="small muted">{{ attempt.finishedAt | date:'dd.MM.yyyy, HH:mm' }} · редакция {{ attempt.assessmentRevision }}</span></p>
                  }
                  <p>После запуска импортируй JSON из папки <code>practice/reports</code>.</p><a routerLink="/progress" class="text-link">Импортировать результат <app-icon name="arrow" /></a>
                } @else { <p>Условия и критерии находятся в тексте. Проверь поведение в браузере и объясни решение.</p> }
              </div>
            }
          </aside>
        </div>
      }
    } @else { <div class="empty-state"><h1>Урок не найден</h1><p>Проверь адрес или выбери тему в роадмапе.</p><a routerLink="/roadmap" class="button primary">Открыть роадмап</a></div> }
  `
})
export class Lesson {
  course = inject(CourseService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  id = toSignal(this.route.paramMap.pipe(map(params => params.get('id') ?? '')), { initialValue: '' });
  lesson = computed(() => this.course.lessons().find(lesson => lesson.id === this.id()));
  record = computed<LessonRecord | undefined>(() => this.course.progress().lessonRecords[this.id()]);
  exercises = computed(() => this.course.curriculum()?.exercises.filter(exercise => exercise.lessonId === this.id() && !/^(checks|bug)-/.test(exercise.id)) ?? []);
  previous = computed(() => { const index = this.course.lessons().findIndex(lesson => lesson.id === this.id()); return this.course.lessons().slice(0, index).filter(lesson => lesson.readiness === 'ready').at(-1); });
  next = computed(() => { const index = this.course.lessons().findIndex(lesson => lesson.id === this.id()); return this.course.lessons().slice(index + 1).find(lesson => lesson.readiness === 'ready'); });
  loading = signal(false);
  error = signal('');
  html = signal('');
  toc = signal<{ index: number; text: string; depth: number }[]>([]);
  copied = signal(false);
  copyError = signal('');
  retry = signal(0);
  isCurrent = (lesson: { id: string }) => lesson.id === this.id();
  constructor() {
    effect(cleanup => {
      this.retry();
      const lesson = this.lesson();
      if (!lesson || lesson.readiness !== 'ready') return;
      const controller = new AbortController();
      cleanup(() => controller.abort());
      untracked(() => this.course.start(lesson.id));
      this.loading.set(true); this.error.set(''); this.html.set(''); this.toc.set([]);
      void fetch(lesson.contentPath, { signal: controller.signal }).then(async response => {
        if (!response.ok) throw new Error('Не удалось прочитать урок. Проверь, что учебный сайт запущен.');
        const body = (await response.text()).replace(/^# [^\n]*\n/, '').replace(/^<a id="criteria"><\/a>\r?$/gm, '');
        const headings: { index: number; text: string; depth: number }[] = [];
        const renderer = new Renderer();
        const renderImage = renderer.image.bind(renderer);
        renderer.image = token => renderImage({ ...token, href: new URL(token.href, new URL(lesson.contentPath, document.baseURI)).href });
        renderer.heading = ({ tokens, depth }) => {
          const text = this.rendererText(tokens.map(token => 'text' in token ? token.text : '').join(''));
          headings.push({ index: headings.length, text, depth });
          return `<h${depth}>${marked.parseInline(tokens.map(token => token.raw).join(''))}</h${depth}>`;
        };
        const rendered = await marked.parse(body, { renderer, gfm: true });
        if (!controller.signal.aborted) { this.html.set(rendered); this.toc.set(headings.filter(heading => heading.depth <= 3)); }
      }).catch(error => { if (!controller.signal.aborted) this.error.set(error instanceof Error ? error.message : 'Ошибка загрузки урока.'); })
        .finally(() => { if (!controller.signal.aborted) this.loading.set(false); });
    });
  }
  private rendererText(value: string) { return value.replace(/[`*_]/g, '').replace(/<[^>]*>/g, ''); }
  reload() { this.retry.update(value => value + 1); }
  scrollTo(index: number) {
    const heading = document.querySelectorAll<HTMLElement>('.lesson-prose :is(h1,h2,h3,h4,h5,h6)')[index];
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }
  markRead() { this.course.updateLesson(this.id(), { readAt: new Date().toISOString() }); }
  setMode(event: Event) { this.course.updateLesson(this.id(), { practiceMode: (event.target as HTMLSelectElement).value as 'guided' | 'independent' }); }
  mastery(event: Event) { this.course.updateLesson(this.id(), { masteredAt: (event.target as HTMLInputElement).checked ? new Date().toISOString() : null }); }
  async copy(text: string) {
    this.copyError.set('');
    try { await navigator.clipboard.writeText(text); this.copied.set(true); setTimeout(() => this.copied.set(false), 2000); }
    catch { this.copyError.set('Не удалось скопировать команду. Выдели и скопируй текст вручную.'); }
  }
  lastAttempt(exerciseId: string) {
    const revision = this.exercises().find(exercise => exercise.id === exerciseId)?.assessmentRevision;
    return this.course.progress().attempts.filter(attempt => attempt.exerciseId === exerciseId && attempt.assessmentRevision === revision).sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))[0];
  }
  outcome(value: string) { return ({ passed: 'пройдена', failed: 'есть ошибки', error: 'ошибка запуска', interrupted: 'запуск прерван' } as Record<string, string>)[value] ?? value; }
  contentClick(event: MouseEvent) {
    const link = (event.target as HTMLElement).closest('a');
    const href = link?.getAttribute('href');
    if (href?.startsWith('/lessons/') && !event.ctrlKey && !event.metaKey) { event.preventDefault(); void this.router.navigateByUrl(href); }
  }
}
