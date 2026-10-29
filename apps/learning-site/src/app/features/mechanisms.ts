import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { buildMechanism, mechanisms } from '../../../../../shared/mechanisms';

@Component({
  selector: 'app-mechanisms',
  imports: [RouterLink],
  template: `
    <header class="training-header"><span class="eyebrow">Предсказать → пройти по шагам → объяснить</span><h1>Механизмы в движении</h1><p>Меняй сценарий и наблюдай состояние в каждый момент. Сначала выбери прогноз — затем открой выполнение.</p></header>
    <nav class="mechanism-tabs" aria-label="Выбрать механизм">@for (m of models; track m.id) { <a [routerLink]="['/mechanisms', m.id]" [class.active]="model().id === m.id" [attr.aria-current]="model().id === m.id ? 'page' : null">{{ m.title.split(':')[0] }}</a> }</nav>
    <section class="panel training-block">
      <div class="section-title"><h2>{{ model().title }}</h2><a [routerLink]="['/lessons', model().lessonId]" class="text-link">К теории →</a></div><p>{{ model().summary }}</p>
      <label class="variant-label">Сценарий<select [value]="variant()" (change)="chooseVariant($any($event.target).value)">@for (v of model().variants; track v.id) { <option [value]="v.id">{{ v.label }}</option> }</select></label>
      <pre class="model-code"><code>{{ run().code }}</code></pre>
      <fieldset class="prediction"><legend>{{ run().question }}</legend>@for (answer of run().answers; track $index) { <label><input type="radio" name="prediction" [value]="$index" [checked]="prediction() === $index" [disabled]="started()" (change)="prediction.set($index)">{{ answer }}</label> }</fieldset>
      @if (!started()) { <button class="button primary" [disabled]="prediction() === null" (click)="started.set(true)">Проверить по шагам</button> }
      @else {
        <div class="simulation" aria-label="Пошаговое выполнение">
          <div class="simulation-progress"><span [style.width.%]="(step() + 1) / run().frames.length * 100"></span></div>
          <div class="step-header"><span class="tag">Шаг {{ step() + 1 }} / {{ run().frames.length }}</span><h3>{{ current().title }}</h3></div>
          <div class="state-lanes">@for (lane of current().lanes; track lane.label) { <section class="state-lane"><h4>{{ lane.label }}</h4><div>@for (value of lane.values; track $index) { <span class="state-token">{{ value }}</span> } @empty { <span class="empty-token">пусто</span> }</div></section> }</div>
          <div class="model-output"><span>Наблюдаемый результат</span><code>{{ current().output.length ? current().output.join(' → ') : 'Пока нет' }}</code></div>
          <p class="step-note" aria-live="polite">{{ current().note }}</p>
          <div class="button-row"><button class="button secondary" [disabled]="step() === 0" (click)="previous()">← Предыдущий шаг</button><button class="button primary" [disabled]="last()" (click)="next()">Следующий шаг →</button><button class="button quiet" (click)="reset()">Сначала</button></div>
          @if (last()) { <div class="notice" role="status"><strong>{{ prediction() === run().correct ? 'Прогноз совпал' : 'Прогноз не совпал — сравни последовательность' }}</strong><p>Ответ: {{ run().answers[run().correct] }}</p></div><p class="model-conclusion">{{ run().conclusion }}</p> }
        </div>
      }
    </section>
    <div class="training-shortcuts"><a routerLink="/training" [queryParams]="{ lesson: model().lessonId }">Применить в IDE →</a><a routerLink="/journal">Записать своё заблуждение →</a></div>
    <p class="small muted">Это пошаговые учебные модели с заданными событиями, а не запуск произвольного кода. Варианты показывают разные причины и последствия.</p>
    <div class="model-sources"><span class="small muted">Первоисточники:</span>@for (source of model().sources; track source.url) { <a [href]="source.url" target="_blank" rel="noopener noreferrer" class="text-link">{{ source.label }} ↗</a> }</div>
  `
})
export class Mechanisms {
  models = mechanisms;
  id = toSignal(inject(ActivatedRoute).paramMap.pipe(map(p => p.get('id') ?? 'event-loop')), { initialValue: 'event-loop' });
  model = computed(() => mechanisms.find(m => m.id === this.id()) ?? mechanisms[0]);
  variant = signal('simple');
  run = computed(() => buildMechanism(this.model().id, this.model().variants.some(v => v.id === this.variant()) ? this.variant() : this.model().variants[0].id));
  prediction = signal<number | null>(null); started = signal(false); step = signal(0);
  current = computed(() => this.run().frames[this.step()] ?? this.run().frames[0]);
  last = computed(() => this.step() === this.run().frames.length - 1);
  constructor() { effect(() => { this.model(); this.variant.set(this.model().variants[0].id); this.reset(); }); }
  chooseVariant(id: string) { this.variant.set(id); this.reset(); }
  reset() { this.prediction.set(null); this.started.set(false); this.step.set(0); }
  previous() { this.step.update(n => Math.max(0, n - 1)); }
  next() { this.step.update(n => Math.min(this.run().frames.length - 1, n + 1)); }
}
