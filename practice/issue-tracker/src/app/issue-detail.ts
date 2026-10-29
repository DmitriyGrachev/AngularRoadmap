import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { IssueService } from './issue.service';

@Component({ selector: 'app-issue-detail', imports: [RouterLink], template: `
  <a class="back" routerLink="/issues">← Все заявки</a>
  @if (issue(); as issue) { <section class="intro"><p class="eyebrow">{{ issue.id }}</p><h1>{{ issue.title }}</h1></section><section class="panel"><h2>Описание</h2><p>{{ issue.description }}</p><p>Статус: {{ issue.status }} · Приоритет: {{ issue.priority }}</p><p class="muted">Здесь появится действие смены статуса.</p></section> }
  @else { <section class="notice"><h1>Заявка не найдена</h1><p>Проверьте ID в адресной строке.</p></section> }
` })
export class IssueDetail {
  private readonly route = inject(ActivatedRoute); private readonly api = inject(IssueService);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly issue = computed(() => this.api.find(this.params().get('id') || ''));
  // TODO w4: вместо find загрузите запись по ID; обработайте 404 отдельно от сети.
}
