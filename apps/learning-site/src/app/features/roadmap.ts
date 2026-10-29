import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CourseService } from '../course.service';
import { Icon } from '../icon';

@Component({
  selector: 'app-roadmap', imports: [FormsModule, RouterLink, Icon],
  template: `
    <div class="page-heading"><h1>Твой маршрут</h1><p>От основ браузера к самостоятельным задачам Angular + Java.</p></div>
    <div class="roadmap-toolbar"><div class="course-facts"><span><strong>{{ course.weeks().length }}</strong> недель</span><span><strong>{{ course.lessons().length }}</strong> занятий и практикумов</span><span><strong>{{ course.totalMinutes() / 60 }}</strong> часов</span></div><label class="search-box"><app-icon name="search" /><input type="search" placeholder="Найти тему в курсе" aria-label="Найти тему в курсе" [ngModel]="search()" (ngModelChange)="search.set($event)"></label></div>
    <section class="course-stages" aria-label="Два этапа обучения">
      <article class="panel"><span class="lesson-eyeline">Этап 1 · недели 1–6</span><h2>Основа для первой задачи</h2><p>Браузер, JavaScript, TypeScript, компоненты, HTTP и формы. {{ stageHours(false) }} с практикой.</p><a routerLink="/lessons/w1-01" class="text-link">Начать с основ →</a></article>
      <article class="panel"><span class="lesson-eyeline">Этап 2 · недели 7–12</span><h2>Подготовка к задачам Middle</h2><p>Архитектура, RxJS, сложный UI, контракты с Java, безопасность, тесты и производительность. {{ stageHours(true) }} с практикой.</p><a routerLink="/lessons/w7-01" class="text-link">Перейти ко второму этапу →</a><a routerLink="/lessons/w12-workshop" class="text-link">Критерии итоговой защиты →</a></article>
    </section>
    <div class="notice">Твой backend-опыт уже является опорой курса. Результат второго этапа — новая функция, исправленный дефект, изменение через весь стек и объяснение компромиссов. Отметки прохождения не присваивают профессиональный уровень.</div>
    <aside class="work-stack panel" aria-labelledby="work-stack-title">
      <span class="lesson-eyeline">Твой рабочий стек · по твоей проверке от 21 октября 2026</span>
      <h2 id="work-stack-title">Фокус на PL2.2 / PL2.1</h2>
      <p><strong>Angular 21.2.18 · standalone · Signals + RxJS.</strong> Учимся читать компоненты, хранить состояние в сервисах и работать с Java API.</p>
      <details>
        <summary>Как маршрут связан с работой</summary>
        <ol>
          <li><a routerLink="/lessons/w1-01">Недели 1–2: основы браузера, JavaScript и TypeScript</a> — понять данные и события, затем узнавать их в рабочем шаблоне.</li>
          <li><a routerLink="/lessons/w3-03">Неделя 3: Signals и сервис состояния</a> — проследить выбор вкладки; затем разобраться в <a routerLink="/lessons/w3-04">областях DI</a>.</li>
          <li><a routerLink="/lessons/w4-04">Неделя 4: связка RxJS и Signals</a> — отмена старого запроса, обработка ошибок и время жизни подписки.</li>
          <li><a routerLink="/lessons/w5-01">Неделя 5: формы и сохранение</a> — Reactive Forms как учебная основа; подход к формам PL ещё нужно уточнить.</li>
          <li><a routerLink="/lessons/w6-01">Неделя 6: чтение UI и существующего кода PL</a> — Material/CDK, Bootstrap-обёртки и собственные компоненты по примеру нужной страницы.</li>
        </ol>
        <p>В PL2.2: Material/CDK 21.2.14, Bootstrap 5.3.8, ng-bootstrap 20.0.0 и ngx-bootstrap 21.2.1. ECharts — при задаче на графики. NgRx и PrimeNG не входят в обязательный маршрут. PL1.26 использует Angular 19.2.14.</p>
        <p>Осталось уточнить у команды: Node и запуск, формы, эталонную страницу, первую задачу и проверки перед review. Разбор PL входит в текущие занятия; полный маршрут — {{ course.hours(course.totalMinutes()) }} плюс резерв.</p>
      </details>
      <p class="work-stack-note">Рабочий PL2: Angular 21 / TypeScript 5.9.3. Учебная среда: Angular 22.2.3 / TypeScript 6.0.3. Версии окружений различаются; в рабочем проекте следуй его lock-файлу и инструкции команды.</p>
    </aside>
    <div class="stage-filter" role="group" aria-label="Этап обучения">
      <button class="button secondary" [attr.aria-pressed]="stage() === 'all'" (click)="stage.set('all')">Весь маршрут</button>
      <button class="button secondary" [attr.aria-pressed]="stage() === 'foundation'" (click)="stage.set('foundation')">Основы · 1–6</button>
      <button class="button secondary" [attr.aria-pressed]="stage() === 'middle'" (click)="stage.set('middle')">Продвинутый · 7–12</button>
    </div>
    @if (visible().length === 0) { <div class="empty-state"><h2>По этому запросу ничего не найдено</h2><p>Попробуй название технологии или другую тему.</p><button class="button secondary" (click)="search.set(''); stage.set('all')">Показать весь курс</button></div> }
    @for (week of visible(); track week.number) {
      <section class="week-section" [id]="'week-' + week.number">
        <div class="week-heading"><span class="week-number">{{ course.weekLabel(week.number) }}</span><div><h2>{{ week.title }}</h2><p>{{ week.description }}</p></div><span class="duration">{{ course.hours(week.minutes) }} + резерв</span></div>
        <div class="lesson-list panel">
          @for (lesson of week.lessons; track lesson.id) {
            @if (lesson.readiness === 'ready') {
              <a class="lesson-row" [routerLink]="['/lessons', lesson.id]">
                <span class="lesson-status" [class.done]="!!course.progress().lessonRecords[lesson.id]?.masteredAt">@if (course.progress().lessonRecords[lesson.id]?.masteredAt) { <app-icon name="check" /> } @else { {{ lesson.id.endsWith('workshop') ? '↗' : +lesson.id.slice(-2) }} }</span>
                <div><h3>{{ lesson.title }}</h3><p>{{ lesson.summary }}</p></div><span class="duration">{{ course.hours(lesson.minutes) }}</span><app-icon name="chevron" />
              </a>
            } @else { <div class="lesson-row planned"><span class="lesson-status">·</span><div><h3>{{ lesson.title }}</h3><p>Материал готовится</p></div><span class="duration">{{ course.hours(lesson.minutes) }}</span></div> }
          }
        </div>
      </section>
    }
    <div class="notice">Можно открыть любую готовую тему. Если что-то непонятно, вернись к указанным в уроке основам. Отметки на карте отражают твою самооценку.</div>
  `
})
export class Roadmap {
  course = inject(CourseService);
  search = signal('');
  stage = signal<'all' | 'foundation' | 'middle'>('all');
  stageHours(advanced: boolean) { return this.course.hours(this.course.lessons().filter(lesson => (lesson.week > 6) === advanced).reduce((sum, lesson) => sum + lesson.minutes, 0)); }
  visible = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('ru');
    return this.course.weeks().filter(week => this.stage() === 'all' || (this.stage() === 'middle' ? week.number > 6 : week.number <= 6)).map(week => ({ ...week, lessons: week.lessons.filter(lesson => !query || `${lesson.title} ${lesson.summary} ${week.title}`.toLocaleLowerCase('ru').includes(query)) })).filter(week => week.lessons.length);
  });
}
