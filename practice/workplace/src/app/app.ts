import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet, Routes } from '@angular/router';
import { DeskApi } from './desk-api';
import { DetailPage } from './detail-page';
import { ListPage } from './list-page';

export const routes: Routes = [
  { path: 'requests', component: ListPage },
  { path: 'requests/:id', component: DetailPage },
  { path: '', pathMatch: 'full', redirectTo: 'requests' },
  { path: '**', redirectTo: 'requests' },
];

@Component({
  selector: 'workplace-root', imports: [RouterLink, RouterOutlet],
  template: `
    <a class="skip-link" href="#main-content">К содержимому</a>
    <header class="app-header"><a routerLink="/requests" class="brand"><span class="brand-icon" aria-hidden="true">S</span> Service Desk</a><span class="header-note">Внутренняя поддержка</span></header>
    <main id="main-content" tabindex="-1"><router-outlet /></main>
    <footer class="lab-tools"><details><summary>Среда для воспроизведения ошибок</summary><p>Кнопка влияет на следующий запрос соответствующего типа. Затем выполните поиск или сохранение. Перезагрузка восстанавливает исходные данные.</p><div class="tool-buttons"><button type="button" class="secondary" (click)="failList()">Следующее чтение списка: 503</button><button type="button" class="secondary" (click)="failSave()">Следующее сохранение: 503</button></div><p role="status">{{ faultNotice() }}</p></details></footer>
  `,
})
export class App {
  private readonly api = inject(DeskApi);
  readonly faultNotice = signal('');
  failList(): void { this.api.failNextList(); this.faultNotice.set('Следующий запрос списка завершится ошибкой 503. Измените поиск или страницу.'); }
  failSave(): void { this.api.failNextSave(); this.faultNotice.set('Следующее сохранение завершится ошибкой 503.'); }
}
