import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({ selector: 'app-issue-form', imports: [RouterLink], template: `
  <a class="back" routerLink="/issues">← Все заявки</a><section class="intro"><p class="eyebrow">ЗАГОТОВКА ФОРМЫ</p><h1>Новая заявка</h1><p>Пока форма только показывает введённый текст и ничего не сохраняет.</p></section>
  <form class="panel issue-form" (submit)="preview($event)"><label for="draft-title">Название</label><input id="draft-title" (input)="update($event)" [value]="title()"><div class="form-actions"><button type="submit">Проверить ввод</button></div>@if (message()) { <p role="status">{{ message() }}</p> }</form>
` })
export class IssueForm {
  readonly title = signal(''); readonly message = signal('');
  update(event: Event) { this.title.set((event.target as HTMLInputElement).value); }
  preview(event: Event) { event.preventDefault(); this.message.set('Введено: ' + this.title() + '. Сохранение ещё не подключено.'); }
  // TODO w5-01: замените обработчик input на typed Reactive Forms.
  // TODO w5-02: проверки длины, touched/dirty, доступное сообщение через aria-describedby.
  // TODO w5-03/04: POST, pending, повторная отправка, fieldErrors; сохраните ввод при сбое.
  // TODO w5-05: отдельный режим редактирования title/status через PATCH.
}
