import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { TrainingService } from '../training.service';
import { CourseService } from '../course.service';
import { validateTrainingProgress } from '../../../../../shared/training';

@Component({
  selector: 'app-journal',
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
    <header class="training-header"><span class="eyebrow">Ошибки → понимание → новый пример</span><h1>Журнал ошибок</h1><p>Запиши, почему решение не сработало. Через 2 и 7 дней объясни механизм без подсказки и реши связанное задание.</p></header>
    @if (training.warning()) { <div class="notice warning" role="status">{{ training.warning() }}</div> }
    @if (training.loading()) { <p role="status">Открываем журнал…</p> }
    @else if (training.error()) { <div class="notice warning" role="alert">{{ training.error() }} <button class="button secondary" (click)="training.load()">Повторить загрузку</button></div> }
    @else {
      <div class="journal-transfer panel training-block"><div><h2>Твои записи остаются у тебя</h2><p>Журнал хранится в этом браузере. Его экспорт включает ошибки, повторения и попытки тренажёра. <a routerLink="/progress" class="text-link">Прогресс уроков и отчёты проверок</a> переносятся отдельно.</p></div><div class="button-row"><button class="button secondary" (click)="training.download()">Экспорт журнала</button><label class="button secondary import-label">Импорт журнала<input type="file" accept=".json,application/json" (change)="importFile($event)"></label>@if (training.rawBackup()) { <button class="button secondary" (click)="training.download(true)">Скачать исходные данные</button> }</div></div>
      @if (message()) { <div class="notice" role="status">{{ message() }}</div> } @if (error()) { <div class="notice warning" role="alert">{{ error() }}</div> }
      @if (pendingImport()) { <div class="notice"><p>Файл прочитан. Объединить записи с текущим журналом? Совпадающие записи не дублируются, конфликт отменит импорт.</p><div class="button-row"><button class="button primary" (click)="confirmImport()">Объединить журнал</button><button class="button secondary" (click)="pendingImport.set(null)">Отмена</button></div></div> }
      <div class="training-detail-grid">
        <div class="training-main">
          <section class="panel training-block"><h2>Новая запись</h2>
            <form class="journal-form" (ngSubmit)="save()">
              <label>Задание<select name="item" [(ngModel)]="source" (ngModelChange)="selectSource($event)" required><option value="">Выбери задание</option>@for (item of training.items(); track item.id) { <option [value]="item.id">{{ item.id }} · {{ item.title }}</option> }</select></label>
              @if (failedChecks().length) { <div class="notice warning"><strong>Непройденные условия последнего запуска</strong><ul>@for (check of failedChecks(); track check.id) { <li>{{ check.message }}</li> }</ul><p>Используй наблюдение из проверки, а причину сформулируй сам.</p></div> }
              <label>Что пошло не так<textarea name="symptom" rows="3" [(ngModel)]="symptom" minlength="5" maxlength="4000" required placeholder="Ожидал …, после действия … увидел …"></textarea></label>
              <label>Как я ошибочно это представлял<textarea name="hypothesis" rows="3" [(ngModel)]="hypothesis" minlength="5" maxlength="4000" required placeholder="Я думал, что …"></textarea></label>
              <label>Как механизм работает на самом деле<textarea name="explanation" rows="3" [(ngModel)]="explanation" minlength="5" maxlength="4000" required placeholder="Причина …; проверю её так …"></textarea></label>
              <label>Другой пример для проверки<select name="next" [(ngModel)]="nextId" required><option value="">Выбери новое задание</option>@for (item of nextOptions(); track item.id) { <option [value]="item.id">{{ item.title }}</option> }</select></label>
              <p class="small muted">Предлагаем задания по той же теме. Можно выбрать любое другое задание из лаборатории.</p>
              <button class="button primary" type="submit" [disabled]="!source || !nextId || symptom.trim().length < 5 || hypothesis.trim().length < 5 || explanation.trim().length < 5">Сохранить ошибку</button>
            </form>
          </section>
          <section><div class="section-title"><h2>Записи · {{ training.progress().mistakes.length }}</h2><span class="tag">{{ training.due().length }} к повторению</span></div>
            @for (entry of entries(); track entry.id) {
              <article class="panel training-block journal-entry">
                <div class="training-card-meta"><a class="text-link" [routerLink]="['/training', entry.itemId]">{{ training.title(entry.itemId) }}</a><span>{{ entry.createdAt | date:'dd.MM.yyyy' }}</span></div>
                <h3>{{ entry.symptom }}</h3>
                <p class="journal-state"><strong>{{ training.schedule(entry).due ? 'Пора проверить себя' : training.schedule(entry).complete ? 'Два повторения отмечены' : 'Следующее повторение' }}</strong>@if (!training.schedule(entry).due && training.schedule(entry).nextAt) { · {{ training.schedule(entry).nextAt | date:'dd.MM.yyyy' }} }</p>
                <p>Сначала открой <a class="text-link" [routerLink]="['/training', entry.nextId]">{{ training.title(entry.nextId) }}</a>, попробуй решить и объясни, где повторяется механизм.</p>
                <label [for]="'recall-' + entry.id">Объяснение без подсказки<textarea [id]="'recall-' + entry.id" rows="3" maxlength="4000" [value]="responses()[entry.id] || ''" (input)="response(entry.id, $any($event.target).value)" placeholder="В новом примере …; причина …; проверка …"></textarea></label>
                <div class="button-row"><button class="button primary" [disabled]="(responses()[entry.id] || '').trim().length < 10" (click)="recall(entry.id, 'remembered')">Объяснил самостоятельно</button><button class="button secondary" [disabled]="(responses()[entry.id] || '').trim().length < 10" (click)="recall(entry.id, 'repeat')">Нужно повторить</button></div>
                @if (recalls(entry.id).length) { <details><summary>Посмотреть прошлое объяснение</summary><p><strong>Ошибочное предположение:</strong> {{ entry.hypothesis }}</p><p><strong>Разобрался так:</strong> {{ entry.explanation }}</p></details> }
                @for (recall of recalls(entry.id); track recall.id) { <div class="attempt-note"><strong>{{ recall.at | date:'dd.MM.yyyy, HH:mm' }} · {{ recall.result === 'remembered' ? 'Вспомнил самостоятельно' : 'Повторить' }}</strong><p>{{ recall.response }}</p></div> }
              </article>
            } @empty { <div class="panel training-block"><h3>Пока нет записей</h3><p>Вернись сюда после первого непонятного результата. Ошибка полезна, когда у неё есть проверяемое объяснение.</p><a routerLink="/training" class="text-link">Выбрать практику →</a></div> }
          </section>
        </div>
        <aside class="training-rail"><section class="panel training-block"><h2>Три вопроса к ошибке</h2><ol><li>Какой конкретный результат опроверг моё ожидание?</li><li>Какую связь я не учёл: время, ссылку, подписку или состояние?</li><li>Какой другой пример отличит понимание от запоминания ответа?</li></ol><p class="small">Первое повторение — через 2 дня, второе — через 5 дней после первого успешного повторения. Если начал вовремя, это 7-й день. Ранние попытки остаются в истории. Самооценка не меняет освоение уроков.</p></section></aside>
      </div>
    }
  `
})
export class Journal {
  training = inject(TrainingService); course = inject(CourseService);
  sourceParam = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map(p => p.get('source') ?? '')), { initialValue: '' });
  source = ''; nextId = ''; symptom = ''; hypothesis = ''; explanation = '';
  selected = signal('');
  message = signal(''); error = signal(''); responses = signal<Record<string, string>>({}); pendingImport = signal<unknown>(null);
  entries = computed(() => [...this.training.progress().mistakes].sort((a, b) => Number(this.training.schedule(b).due) - Number(this.training.schedule(a).due) || Date.parse(b.createdAt) - Date.parse(a.createdAt)));
  nextOptions = computed(() => {
    const selected = this.training.items().find(i => i.id === this.selected());
    return this.training.items().filter(i => i.id !== this.selected()).sort((a, b) => Number(selected?.relatedIds.includes(b.id)) - Number(selected?.relatedIds.includes(a.id)));
  });
  failedChecks = computed(() => {
    const exercise = this.training.items().find(i => i.id === this.selected())?.exercise;
    return exercise ? [...this.course.progress().attempts].filter(a => a.exerciseId === exercise.id && a.assessmentRevision === exercise.assessmentRevision).sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))[0]?.checks.filter(c => c.status !== 'passed') ?? [] : [];
  });
  constructor() { effect(() => { const source = this.sourceParam(); if (source && this.training.items().some(i => i.id === source)) { this.source = source; this.selectSource(source); } }); }
  selectSource(id: string) { this.selected.set(id); this.nextId = this.training.items().find(i => i.id === id)?.relatedIds[0] ?? ''; }
  save() {
    try { this.training.addMistake({ itemId: this.source, symptom: this.symptom.trim(), hypothesis: this.hypothesis.trim(), explanation: this.explanation.trim(), nextId: this.nextId }); this.message.set('Запись сохранена. Повторения запланированы через 2 и 7 дней.'); this.error.set(''); this.symptom = ''; this.hypothesis = ''; this.explanation = ''; }
    catch (e) { this.fail(e); }
  }
  response(id: string, value: string) { this.responses.update(old => ({ ...old, [id]: value })); }
  recall(id: string, result: 'remembered' | 'repeat') {
    try { this.training.recall(id, this.responses()[id] ?? '', result); this.response(id, ''); this.message.set('Самостоятельное объяснение сохранено.'); this.error.set(''); }
    catch (e) { this.fail(e); }
  }
  recalls(id: string) { return this.training.progress().recalls.filter(r => r.mistakeId === id).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)); }
  async importFile(event: Event) {
    const input = event.target as HTMLInputElement, file = input.files?.[0];
    if (!file) return;
    this.pendingImport.set(null); this.error.set(''); this.message.set('');
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Файл больше 5 МБ. Выбери экспорт журнала.');
      const valid = validateTrainingProgress(JSON.parse(await file.text()), this.training.items());
      if (!valid.ok) throw new Error(valid.errors.join(' '));
      this.pendingImport.set(valid.value);
    } catch (e) { this.fail(e instanceof SyntaxError ? new Error('Файл не удалось прочитать как JSON.') : e); }
    finally { input.value = ''; }
  }
  confirmImport() {
    try { this.training.import(this.pendingImport()); this.pendingImport.set(null); this.message.set('Журнал объединён. Повторные записи не добавлены.'); this.error.set(''); }
    catch (e) { this.fail(e); this.pendingImport.set(null); }
  }
  private fail(e: unknown) { this.error.set(e instanceof Error ? e.message : 'Не удалось сохранить данные.'); this.message.set(''); }
}
