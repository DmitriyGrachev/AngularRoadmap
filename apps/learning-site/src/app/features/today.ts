import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CourseService } from '../course.service';
import { Icon } from '../icon';
import { TrainingService } from '../training.service';

@Component({
  selector: 'app-today',
  imports: [RouterLink, Icon],
  template: `
    <section class="hero">
      <div class="hero-copy">
        <h1>От Java — к Angular.</h1>
        <p class="hero-subtitle">От основ frontend<br class="desktop-break"> к задачам Middle Fullstack.</p>
        <p class="hero-description">Разбирайся в механизмах, пиши код и применяй знания<br class="wide-break"> на реальных задачах. Всё начинается с одного урока.</p>
        @if (course.next(); as next) {
          <a class="button primary" [routerLink]="['/lessons', next.id]">{{ course.readCount() ? 'Продолжить обучение' : 'Начать первый урок' }}<app-icon name="arrow" /></a>
        } @else { <a class="button primary" routerLink="/roadmap">Открыть роадмап <app-icon name="arrow" /></a> }
      </div>
      <div class="learning-art" aria-hidden="true">
        <svg class="art-connectors" viewBox="0 0 390 190"><path d="M48 124C126 124 71 81 151 81S212 107 259 60" /></svg>
        <div class="tech-block html-block"><span class="tech-symbol">‹/›</span><b>HTML</b><i></i><i></i><i></i></div>
        <div class="tech-block ts-block"><span class="tech-symbol">TS</span><b>TypeScript</b><i></i><i></i><i></i></div>
        <div class="tech-block angular-block"><span class="angular-mark">A</span><b>Angular</b><i></i><i></i><i></i></div>
        <span class="art-square one"></span><span class="art-square two"></span>
      </div>
    </section>
    <div class="today-grid">
      <section>
        <h2>Следующий шаг</h2>
        @if (course.next(); as next) {
          <article class="next-lesson panel">
            <span class="lesson-eyeline">Неделя {{ next.week }} <span>·</span> {{ next.id.endsWith('workshop') ? 'Практикум' : 'Урок ' + (+next.id.slice(-2)) }}</span>
            <h3>{{ next.title }}</h3>
            <p>{{ next.summary || 'Теория, разобранный пример и самостоятельное задание. Открой урок и начни с прогноза результата.' }}</p>
            <div class="next-bottom"><span class="duration"><app-icon name="clock" />{{ course.hours(next.minutes) }}</span><a class="button primary" [routerLink]="['/lessons', next.id]">Перейти к уроку <app-icon name="arrow" /></a></div>
          </article>
        } @else {
          <article class="panel next-lesson"><h3>Ты прошёл доступный маршрут</h3><p>Вернись к темам для повторения или проверь себя на новой задаче.</p><a routerLink="/roadmap" class="text-link">Вернуться к темам <app-icon name="arrow" /></a></article>
        }
      </section>
      <section><h2>Как проходит занятие</h2><div class="study-cycle panel">
        @for (step of steps; track step.title) {
          <div class="cycle-row"><span class="cycle-icon" [class]="step.tone"><app-icon [name]="step.icon" /></span><div><h3>{{ step.title }}</h3><p>{{ step.text }}</p></div></div>
        }
      </div></section>
    </div>
    @if (course.due().length) {
      <section class="review-section"><h2>Время вспомнить</h2><p class="muted">Один новый пример покажет, что осталось в памяти.</p>
      @for (lesson of course.due(); track lesson.id) { <a class="review-link" [routerLink]="['/lessons', lesson.id]"><app-icon name="repeat" />{{ lesson.title }}<app-icon name="arrow" /></a> }
      </section>
    }
    @if (training.due().length) {
      <section class="review-section"><h2>Вернуться к своей ошибке</h2><p class="muted">Проверь тот же механизм на другом примере и сохрани объяснение в журнале.</p>
        @for (mistake of training.due().slice(0, 3); track mistake.id) { <a class="review-link" [routerLink]="['/training', mistake.nextId]"><app-icon name="repeat" />{{ training.title(mistake.nextId) }}<app-icon name="arrow" /></a> }
        <a routerLink="/journal" class="text-link">Открыть журнал ошибок →</a>
      </section>
    }
    <section class="training-promo panel"><div><span class="eyebrow">После теории — попробуй сам</span><h2>Практика, похожая на работу</h2><p>Проверки кода — {{ training.count('check') }}, задачи отладки — {{ training.count('bug') }}, рабочие тикеты — {{ training.count('ticket') }}, ревью — {{ training.count('review') }}. Дополнительно — практикумы в уроках и пять механизмов по шагам.</p></div><a routerLink="/training" class="button primary">Открыть лабораторию <app-icon name="arrow" /></a></section>
    <section class="route-preview"><div class="section-title"><h2>Твой маршрут</h2><a routerLink="/roadmap" class="text-link">Весь роадмап <app-icon name="arrow" /></a></div>
      <div class="week-list">
        @for (week of course.weeks().slice(0, 3); track week.number) {
          <a class="week-row" routerLink="/roadmap" [fragment]="'week-' + week.number"><span class="week-number">{{ course.weekLabel(week.number) }}</span><div><h3>{{ week.title }}</h3><p>{{ week.description }}</p></div><span class="duration"><app-icon name="clock" />{{ course.hours(week.minutes) }}</span><app-icon name="chevron" /></a>
        }
      </div>
    </section>
  `
})
export class Today {
  course = inject(CourseService);
  training = inject(TrainingService);
  steps = [
    { title: 'Разобраться', text: 'Понять механизм на примере и связать его с Java.', icon: 'file', tone: 'blue' },
    { title: 'Предсказать', text: 'Предположить результат до запуска кода.', icon: 'flask', tone: 'violet' },
    { title: 'Попробовать', text: 'Написать, запустить и проверить своё решение.', icon: 'code', tone: 'green' },
    { title: 'Объяснить', text: 'Разобрать ошибки и повторить на новом примере.', icon: 'chat', tone: 'coral' }
  ];
}
