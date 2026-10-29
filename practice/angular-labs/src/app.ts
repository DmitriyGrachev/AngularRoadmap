import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Routes } from '@angular/router';
import { LibraryDemo as BindingDemo } from './demos/w3-01';
import { LibraryDemo as InputsDemo } from './demos/w3-02';
import { LibraryStateDemo } from './demos/w3-03';
import { ClockDemo } from './demos/w3-04';
import { libraryRoutes } from './demos/library-routes';
import { CatalogStateDemo } from './demos/w4-03';
import { ReaderFormDemo } from './demos/w5-01';
import { ReaderSaveDemo } from './demos/w5-03';
import { DecoratorBook, ModernBook } from './demos/w6-01';

@Component({
  selector: 'clock-host', imports: [ClockDemo],
  template: `
    <h2>Время жизни компонента</h2>
    <p>Секунда моделирует учебную минуту. Скрытие удаляет компонент и очищает таймер.</p>
    <button type="button" (click)="toggle()">{{ visible() ? 'Скрыть часы' : 'Показать часы' }}</button>
    @if (visible()) { <clock-demo /> }
  `,
})
export class ClockHost {
  visible = signal(true);
  toggle() { this.visible.update(value => !value); }
}

@Component({
  selector: 'input-styles-demo', imports: [ModernBook, DecoratorBook],
  template: `
    <h2>Два способа объявления одного контракта</h2>
    <h3>Signal input/output</h3>
    <modern-book id="b7" title="HTTP" (selected)="selected.set($event)" />
    <h3>Decorator Input/Output</h3>
    <decorator-book id="b7" title="HTTP" (selected)="selected.set($event)" />
    <p>Выбрано: {{ selected() }}</p>
  `,
})
export class InputStylesDemo { selected = signal('ничего'); }

@Component({
  selector: 'app-labs', imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header><p class="eyebrow">ПРИМЕРЫ КУРСА</p><h1>Лаборатория Angular</h1>
      <p>Нейтральные демонстрации из теории. Ваш трекер заявок работает отдельно на порту 4302.</p>
    </header>
    <div class="layout">
      <nav aria-label="Демонстрации">
        @for (demo of demos; track demo.path) {
          <a [routerLink]="demo.path" routerLinkActive="active">{{ demo.label }}</a>
        }
      </nav>
      <main><router-outlet /></main>
    </div>
    <footer>Чистые TypeScript-примеры запускаются отдельно. Точные команды — в уроках и practice/angular-labs/README.md.</footer>
  `,
})
export class App {
  demos = [
    { path: '/w3-01', label: 'w3-01 · Шаблон и событие' },
    { path: '/w3-02', label: 'w3-02 · Вход и событие' },
    { path: '/w3-03', label: 'w3-03 · Signals и фильтр' },
    { path: '/w3-04', label: 'w3-04 · DI и cleanup' },
    { path: '/books', label: 'w3-05 · Router и ID' },
    { path: '/w4-03', label: 'w4-03 · Состояния загрузки' },
    { path: '/w5-01', label: 'w5-01 · Модель формы' },
    { path: '/w5-03', label: 'w5-03 · Отправка и ошибка' },
    { path: '/w6-01', label: 'w6-01 · Варианты inputs' },
  ];
}

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'w3-01' },
  { path: 'w3-01', component: BindingDemo },
  { path: 'w3-02', component: InputsDemo },
  { path: 'w3-03', component: LibraryStateDemo },
  { path: 'w3-04', component: ClockHost },
  { path: 'w4-03', component: CatalogStateDemo },
  { path: 'w5-01', component: ReaderFormDemo },
  { path: 'w5-03', component: ReaderSaveDemo },
  { path: 'w6-01', component: InputStylesDemo },
  ...libraryRoutes,
];
