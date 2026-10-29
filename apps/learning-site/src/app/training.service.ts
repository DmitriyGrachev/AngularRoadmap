import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { CourseService } from './course.service';
import { emptyTrainingProgress, mergeTrainingProgress, mistakeSchedule, validateTraining, validateTrainingProgress, type TrainingItem, type TrainingProgress, type MistakeEntry, type TrainingAttempt } from '../../../../shared/training';

const storageKey = 'angular-practicum.training.v1';
@Injectable({ providedIn: 'root' })
export class TrainingService {
  course = inject(CourseService);
  items = signal<TrainingItem[]>([]);
  progress = signal<TrainingProgress>(emptyTrainingProgress());
  loading = signal(true);
  error = signal('');
  warning = signal('');
  rawBackup = signal('');
  private restored = false;
  private writable = true;
  due = computed(() => this.progress().mistakes.filter(m => mistakeSchedule(m, this.progress().recalls, new Date()).due));
  constructor() {
    effect(() => {
      const curriculum = this.course.curriculum();
      if (curriculum) untracked(() => void this.load(curriculum.lessons.map(l => l.id)));
    });
  }
  async load(lessonIds = this.course.lessons().map(l => l.id)) {
    this.loading.set(true); this.error.set('');
    try {
      const parts = await Promise.all(['checks', 'bugs', 'tickets', 'reviews', 'middle'].map(async part => {
        const response = await fetch(`content/training/${part}.json`);
        if (!response.ok) throw new Error('Не удалось загрузить тренажёр. Проверь, что сайт запущен, и повтори.');
        const value: unknown = await response.json();
        if (!Array.isArray(value)) throw new Error('Повреждён каталог тренажёра.');
        return value;
      }));
      const validation = validateTraining(parts.flat(), lessonIds);
      if (!validation.ok) throw new Error(validation.errors.join(' '));
      this.items.set(validation.value);
      if (!this.restored) { this.restored = true; this.restore(); }
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Ошибка загрузки практики.'); }
    finally { this.loading.set(false); }
  }
  count(kind: string) { return this.items().filter(item => item.kind === kind).length; }
  private restore() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      this.rawBackup.set(raw);
      const result = validateTrainingProgress(JSON.parse(raw), this.items());
      if (!result.ok) throw new Error(result.errors.join(' '));
      this.progress.set(result.value); this.rawBackup.set('');
    } catch {
      this.writable = false;
      this.warning.set('Журнал в браузере недоступен или повреждён. Исходные данные сохранены. Новые записи остаются в этой вкладке — скачай экспорт перед закрытием.');
    }
  }
  save(value: TrainingProgress) {
    const valid = validateTrainingProgress(value, this.items());
    if (!valid.ok) throw new Error(valid.errors.join(' '));
    this.progress.set(valid.value);
    if (!this.writable) return;
    try { localStorage.setItem(storageKey, JSON.stringify(value)); this.warning.set(''); }
    catch { this.warning.set('Не удалось сохранить журнал в браузере. Скачай экспорт перед закрытием вкладки.'); }
  }
  attempt(itemId: string, answer: string, decision?: 'accept' | 'changes') {
    const attempt = { id: crypto.randomUUID(), itemId, at: new Date().toISOString(), answer: answer.trim(), ...(decision ? { decision } : {}) };
    this.save({ ...this.progress(), attempts: [...this.progress().attempts, attempt] });
  }
  addMistake(value: Omit<MistakeEntry, 'id' | 'createdAt'>) {
    this.save({ ...this.progress(), mistakes: [...this.progress().mistakes, { ...value, id: crypto.randomUUID(), createdAt: new Date().toISOString() }] });
  }
  recall(mistakeId: string, response: string, result: 'remembered' | 'repeat') {
    this.save({ ...this.progress(), recalls: [...this.progress().recalls, { id: crypto.randomUUID(), mistakeId, response: response.trim(), result, at: new Date().toISOString() }] });
  }
  import(value: unknown) {
    const valid = validateTrainingProgress(value, this.items());
    if (!valid.ok) throw new Error(valid.errors.join(' '));
    this.save(mergeTrainingProgress(this.progress(), valid.value));
  }
  latest(id: string): TrainingAttempt | undefined { return this.progress().attempts.filter(a => a.itemId === id).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]; }
  title(id: string) { return this.items().find(item => item.id === id)?.title ?? id; }
  schedule(m: MistakeEntry) { return mistakeSchedule(m, this.progress().recalls, new Date()); }
  download(raw = false) {
    const url = URL.createObjectURL(new Blob([raw ? this.rawBackup() : JSON.stringify(this.progress(), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = raw ? 'angular-journal-recovery.json' : `angular-training-${new Date().toISOString().slice(0, 10)}.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
