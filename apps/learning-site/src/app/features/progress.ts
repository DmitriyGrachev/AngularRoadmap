import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CourseService } from '../course.service';
import { Icon } from '../icon';
import { emptyProgress, mergeProgress, validateProgress, validateReport, type LessonRecord, type MergePreview, type ProgressSnapshot } from '../../../../../shared/domain';

@Component({
  selector: 'app-progress', imports: [Icon, DatePipe, FormsModule, RouterLink],
  template: `
    <div class="page-heading"><h1>Твой прогресс</h1><p>Чтение, практика и понимание — три разных результата.</p></div>
    <div class="progress-summary">
      <div><span class="stat-value" data-testid="read-count">{{ course.readCount() }}</span><span>прочитано из {{ course.lessons().length }}</span></div>
      <div><span class="stat-value" data-testid="passed-count">{{ course.passedCount() }}</span><span>заданий с успешной проверкой</span></div>
      <div><span class="stat-value" data-testid="mastered-count">{{ course.masteredCount() }}</span><span>освоено по самооценке</span></div>
    </div>
    <section class="transfer-panel panel">
      <div><h2>Сохранить или перенести</h2><p>Прогресс хранится в этом браузере. Сохрани копию, чтобы продолжить на другом устройстве. Здесь же можно загрузить отчёт проверки из IDE.</p></div>
      <div class="transfer-actions"><button class="button secondary" (click)="exportProgress()"><app-icon name="download" />Экспорт прогресса</button><label class="button primary file-label"><app-icon name="upload" />Импорт JSON<input type="file" accept=".json,application/json" (change)="importFile($event)"></label></div>
      @if (course.rawBackup()) { <button class="text-link" (click)="download(course.rawBackup(), 'angular-original-data.json')">Скачать исходные данные хранилища</button> }
    </section>
    @if (error()) { <div role="alert" class="notice warning">{{ error() }}</div> }
    @if (message()) { <div role="status" class="notice success">{{ message() }}</div> }
    @if (preview(); as pending) {
      <section class="import-preview panel"><h2>Проверь импорт перед сохранением</h2><p>В результате будет {{ Object.keys(pending.snapshot.lessonRecords).length }} записей уроков и {{ pending.snapshot.attempts.length }} попыток. Остальные данные сохранятся.</p>
        @if (pending.conflicts.length) {
          <p>Есть различия в ручных отметках. Выбери, какие записи сохранить:</p>
          @for (conflict of pending.conflicts; track conflict.lessonId) {
            <div class="conflict"><strong>{{ course.title(conflict.lessonId) }}</strong><div class="conflict-values"><span>В браузере: {{ describe(conflict.local) }}</span><span>В файле: {{ describe(conflict.incoming) }}</span></div><select [attr.aria-label]="'Выбор записи ' + conflict.lessonId" [ngModel]="choices()[conflict.lessonId] || ''" (ngModelChange)="choose(conflict.lessonId, $event)"><option value="" disabled>Выбрать запись</option><option value="local">Сохранить текущую</option><option value="incoming">Использовать из файла</option></select></div>
          }
        }
        <div class="button-row"><button class="button primary" [disabled]="!resolved()" (click)="confirmImport()">Сохранить объединённый прогресс</button><button class="button secondary" (click)="preview.set(null)">Отмена</button></div>
      </section>
    }
    <section class="progress-weeks"><h2>По неделям</h2>
      @for (week of course.weeks(); track week.number) {
        <div class="progress-week"><div><span class="week-number">{{ course.weekLabel(week.number) }}</span><h3>{{ week.title }}</h3><span class="muted">{{ masteredInWeek(week.number) }} / {{ week.lessons.length }}</span></div><div class="progress-track" role="progressbar" [attr.aria-label]="'Самооценка: ' + week.title" [attr.aria-valuenow]="masteredInWeek(week.number)" aria-valuemin="0" [attr.aria-valuemax]="week.lessons.length"><span [style.width.%]="week.lessons.length ? masteredInWeek(week.number) / week.lessons.length * 100 : 0"></span></div></div>
      }
    </section>
    <section class="attempt-section"><h2>История проверок</h2><p class="muted">Отчёт относится к коду на момент запуска. После изменения решения запусти проверку снова.</p>
      @if (!attempts().length) { <div class="empty-inline"><app-icon name="code" /><div><h3>Первая попытка ещё впереди</h3><p>В уроках с автоматической проверкой есть команда запуска. Импортируй полученный JSON, и результат появится здесь.</p><a class="text-link" routerLink="/lessons/w1-04">Открыть первое упражнение <app-icon name="arrow" /></a></div></div> }
      @for (attempt of attempts(); track attempt.runId) {
        <details class="attempt panel"><summary><div><strong>{{ course.title(lessonFor(attempt.exerciseId)) }}</strong><span class="small muted">{{ attempt.finishedAt | date:'dd.MM.yyyy, HH:mm' }} · {{ attempt.exerciseId }} · редакция {{ attempt.assessmentRevision }}</span></div><span class="result-label" [class.passed]="attempt.outcome === 'passed'">{{ outcome(attempt.outcome) }}</span></summary>
          @if (historical(attempt.exerciseId, attempt.assessmentRevision)) { <p class="notice">Исторический результат: условия задания с тех пор изменились.</p> }
          @for (check of attempt.checks; track check.id) { <div class="check-result"><app-icon [name]="check.status === 'passed' ? 'check' : 'close'" /><span>{{ check.message }}</span><code>{{ check.id }}</code></div> }
          @if (!attempt.checks.length) { <p>Проверки не завершены. Успех не присвоен.</p> }
        </details>
      }
    </section>
  `
})
export class Progress {
  course = inject(CourseService);
  Object = Object;
  error = signal('');
  message = signal('');
  preview = signal<MergePreview | null>(null);
  choices = signal<Record<string, string>>({});
  attempts = computed(() => [...this.course.progress().attempts].sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt)));
  resolved = computed(() => this.preview()?.conflicts.every(conflict => !!this.choices()[conflict.lessonId]) ?? false);
  masteredInWeek(week: number) { return this.course.lessons().filter(lesson => lesson.week === week && this.course.progress().lessonRecords[lesson.id]?.masteredAt).length; }
  lessonFor(exerciseId: string) { return this.course.curriculum()?.exercises.find(exercise => exercise.id === exerciseId)?.lessonId ?? exerciseId; }
  historical(exerciseId: string, revision: number) { return this.course.curriculum()?.exercises.find(exercise => exercise.id === exerciseId)?.assessmentRevision !== revision; }
  outcome(value: string) { return ({ passed: 'Проверки пройдены', failed: 'Есть ошибки', error: 'Ошибка запуска', interrupted: 'Запуск прерван' } as Record<string, string>)[value] ?? value; }
  describe(record: LessonRecord) {
    const date = (value: string) => new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
    const reviews = record.reviews?.map(review => `${date(review.at)} — ${review.result === 'remembered' ? 'вспомнил самостоятельно' : 'нужно повторить'}`).join('; ');
    return [
      `Начало: ${record.startedAt ? date(record.startedAt) : 'не отмечено'}`,
      `Чтение: ${record.readAt ? date(record.readAt) : 'не отмечено'}`,
      `Самооценка: ${record.masteredAt ? 'подтверждена ' + date(record.masteredAt) : record.masteredAt === null ? 'снята' : 'не отмечена'}`,
      `Практика: ${record.practiceMode === 'independent' ? 'самостоятельно' : record.practiceMode === 'guided' ? 'с подсказками' : 'не отмечена'}`,
      `Повторения: ${reviews || 'нет'}`
    ].join(' · ');
  }
  choose(id: string, value: string) { this.choices.update(choices => ({ ...choices, [id]: value })); }
  async importFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error.set(''); this.message.set(''); this.preview.set(null); this.choices.set({});
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Файл больше 5 МБ. Выбери отчёт проверки или экспорт прогресса.');
      const value: unknown = JSON.parse(await file.text());
      let incoming: ProgressSnapshot;
      if (value && typeof value === 'object' && 'exerciseId' in value) {
        const validation = validateReport(value, this.course.curriculum()!);
        if (!validation.ok) throw new Error(validation.errors.join(' '));
        incoming = { ...emptyProgress(), attempts: [validation.value] };
      } else {
        const validation = validateProgress(value, this.course.curriculum()!);
        if (!validation.ok) throw new Error(validation.errors.join(' '));
        incoming = validation.value;
      }
      this.preview.set(mergeProgress(this.course.progress(), incoming));
    } catch (error) { this.error.set(error instanceof SyntaxError ? 'Не удалось прочитать JSON. Выбери целый файл отчёта или экспорта.' : error instanceof Error ? error.message : 'Не удалось импортировать файл.'); }
    finally { input.value = ''; }
  }
  confirmImport() {
    const preview = this.preview();
    if (!preview || !this.resolved()) return;
    const snapshot = structuredClone(preview.snapshot);
    for (const conflict of preview.conflicts) if (this.choices()[conflict.lessonId] === 'incoming') snapshot.lessonRecords[conflict.lessonId] = structuredClone(conflict.incoming);
    this.course.save(snapshot); this.preview.set(null);
    this.message.set(this.course.storageWarning() ? 'Данные объединены в этой вкладке. Экспортируй их: сохранение в браузере недоступно.' : 'Прогресс объединён и сохранён.');
  }
  exportProgress() { this.download(JSON.stringify(this.course.progress(), null, 2), `angular-progress-${new Date().toISOString().slice(0, 10)}.json`); }
  download(content: string, name: string) {
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
