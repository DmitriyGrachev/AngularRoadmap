import { Injectable, computed, signal } from '@angular/core';
import { courseWeeks, formatHours } from '../../../../shared/course-outline';
import {
  emptyProgress, getReviewDue, recommendNext, validateCurriculum, validateProgress,
  type Curriculum, type LessonRecord, type ProgressSnapshot
} from '../../../../shared/domain';

const storageKey = 'angular-practicum.progress.v1';

@Injectable({ providedIn: 'root' })
export class CourseService {
  curriculum = signal<Curriculum | null>(null);
  progress = signal<ProgressSnapshot>(emptyProgress());
  error = signal('');
  loading = signal(true);
  storageWarning = signal('');
  rawBackup = signal('');
  private storageWritable = true;
  lessons = computed(() => [...(this.curriculum()?.lessons ?? [])].sort((a, b) => a.order - b.order));
  weeks = computed(() => courseWeeks(this.curriculum()));
  totalMinutes = computed(() => this.lessons().reduce((total, lesson) => total + lesson.minutes, 0));
  next = computed(() => this.curriculum() ? recommendNext(this.curriculum()!, this.progress()) : null);
  due = computed(() => this.curriculum() ? getReviewDue(this.curriculum()!, this.progress(), new Date()) : []);
  readCount = computed(() => Object.values(this.progress().lessonRecords).filter(record => record.readAt).length);
  masteredCount = computed(() => Object.values(this.progress().lessonRecords).filter(record => record.masteredAt).length);
  passedCount = computed(() => {
    const exercises = this.curriculum()?.exercises ?? [];
    return exercises.filter(exercise => {
      const latest = this.progress().attempts.filter(attempt => attempt.exerciseId === exercise.id && attempt.assessmentRevision === exercise.assessmentRevision).sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))[0];
      return latest?.outcome === 'passed';
    }).length;
  });

  constructor() { void this.load(); }
  async load() {
    this.loading.set(true); this.error.set('');
    try {
      const response = await fetch('content/curriculum.json');
      if (!response.ok) throw new Error('Не удалось загрузить курс. Проверь, что учебный сайт запущен.');
      const validation = validateCurriculum(await response.json());
      if (!validation.ok) throw new Error(validation.errors.join(' '));
      this.curriculum.set(validation.value);
      this.restore();
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Ошибка загрузки курса.'); }
    finally { this.loading.set(false); }
  }
  private restore() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      this.rawBackup.set(raw);
      const validation = validateProgress(JSON.parse(raw), this.curriculum()!);
      if (!validation.ok) throw new Error(validation.errors.join(' '));
      this.progress.set(validation.value); this.rawBackup.set('');
    } catch {
      this.storageWritable = false;
      this.storageWarning.set('Сохранённые данные недоступны или повреждены. Новые отметки остаются в этой вкладке. Скачай их перед закрытием; исходные данные не перезаписаны.');
    }
  }
  save(snapshot: ProgressSnapshot) {
    this.progress.set(snapshot);
    if (!this.storageWritable) return;
    try { localStorage.setItem(storageKey, JSON.stringify(snapshot)); this.storageWarning.set(''); }
    catch { this.storageWarning.set('Не удалось сохранить в браузере. Отметки остаются в этой вкладке: экспортируй прогресс перед закрытием.'); }
  }
  updateLesson(id: string, changes: Partial<LessonRecord>) {
    if (!this.lessons().some(lesson => lesson.id === id && lesson.readiness === 'ready')) return;
    const state = structuredClone(this.progress());
    state.lessonRecords[id] = { ...state.lessonRecords[id], ...changes };
    this.save(state);
  }
  start(id: string) {
    if (!this.progress().lessonRecords[id]?.startedAt) this.updateLesson(id, { startedAt: new Date().toISOString() });
  }
  review(id: string, result: 'remembered' | 'repeat') {
    this.updateLesson(id, { reviews: [...(this.progress().lessonRecords[id]?.reviews ?? []), { at: new Date().toISOString(), result }] });
  }
  title(id: string) { return this.lessons().find(lesson => lesson.id === id)?.title ?? id; }
  hours = formatHours;
  weekLabel(number: number) { return String(number).padStart(2, '0'); }
}
