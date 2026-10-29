import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IssueService } from './issue.service';

@Component({ selector: 'app-issues-list', imports: [RouterLink], template: `
  <section class="intro"><p class="eyebrow">ПРАКТИКА НЕДЕЛЬ 3–6</p><h1>Ваш трекер заявок</h1><p>Рабочая заготовка с локальными данными. Развивайте её по заданиям курса.</p></section>
  <section class="panel"><h2>Список · {{ api.issues().length }}</h2><p>Пока показаны все заявки. Фильтр, счётчик и API вы добавите самостоятельно.</p></section>
  <div class="issue-list">@for (issue of api.issues(); track issue.id) { <a class="issue-row" [routerLink]="['/issues', issue.id]"><span class="issue-id">{{ issue.id }}</span><span class="issue-title">{{ issue.title }}</span><span class="status">{{ issue.status }}</span><span class="priority">{{ issue.priority }}</span><span aria-hidden="true">↗</span></a> }</div>
` })
export class IssuesList {
  readonly api = inject(IssueService);
  // TODO w3-02: выделите карточку с input/output; не меняйте данные внутри карточки.
  // TODO w3-03: signal фильтра и computed видимого списка/счётчика.
  // TODO w3-05: сохраняйте фильтр в query parameters.
  // TODO w4: отменяйте старый поиск через switchMap; различайте четыре состояния.
  // TODO w6: priority в API/URL; сброс фильтров должен также возвращать страницу 0.
}
