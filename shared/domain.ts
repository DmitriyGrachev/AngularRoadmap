export interface LessonMeta { id: string; week: number; order: number; title: string; minutes: number; contentPath: string; prerequisites: string[]; readiness: 'ready' | 'planned'; exerciseIds: string[]; summary?: string }
export interface ExerciseMeta { id: string; lessonId: string; assessmentRevision: number; mode: 'automated' | 'manual'; workspacePath: string; editablePaths: string[]; requiredCheckIds: string[]; targetKey?: string; rubricPath?: string }
export interface Curriculum { schemaVersion: 1; weeks?: { id?: number; week?: number; title: string; [key: string]: unknown }[]; lessons: LessonMeta[]; exercises: ExerciseMeta[] }
export interface AssessmentCheck { id: string; status: 'passed' | 'failed' | 'skipped'; message: string }
export interface AssessmentReport { schemaVersion: 1; runId: string; exerciseId: string; assessmentRevision: number; finishedAt: string; outcome: 'passed' | 'failed' | 'error' | 'interrupted'; checks: AssessmentCheck[] }
export interface LessonRecord { startedAt?: string; readAt?: string; practiceMode?: 'independent' | 'guided'; masteredAt?: string | null; reviews?: { at: string; result: 'remembered' | 'repeat' }[] }
export interface ProgressSnapshot { schemaVersion: 1; lessonRecords: Record<string, LessonRecord>; attempts: AssessmentReport[] }
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };
export interface MergePreview { snapshot: ProgressSnapshot; conflicts: { lessonId: string; local: LessonRecord; incoming: LessonRecord }[] }
export const targetKeys = [
  'foundations-w1-04',
  ...Array.from({ length: 16 }, (_, index) => `checks-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 12 }, (_, index) => `bug-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 12 }, (_, index) => `middle-${String(index + 1).padStart(2, '0')}`)
] as const;
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(text) && new Set(value).size === value.length;
const integer = (value: unknown): value is number => Number.isInteger(value) && Number(value) > 0;
const date = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
export const safeRelativePath = (value: unknown): value is string => text(value) && !value.includes('\\') && !/[:?#\u0000]/.test(value) && !value.startsWith('/') && value.split('/').every(part => part !== '..' && part !== '.' && part.length > 0);
const result = <T>(value: unknown, errors: string[]): ValidationResult<T> => errors.length ? { ok: false, errors } : { ok: true, value: value as T };
const equal = (a: unknown, b: unknown): boolean => stable(a) === stable(b);
function stable(value: unknown): string { return JSON.stringify(value, (_key, item: unknown) => object(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item); }

export function validateCurriculum(value: unknown): ValidationResult<Curriculum> {
  const errors: string[] = [];
  if (!object(value) || value['schemaVersion'] !== 1) return { ok: false, errors: ['Неподдерживаемая версия каталога: ожидается schemaVersion 1.'] };
  if (!Array.isArray(value['lessons']) || !Array.isArray(value['exercises'])) return { ok: false, errors: ['В каталоге нужны списки lessons и exercises.'] };
  const lessons = value['lessons'], exercises = value['exercises'];
  const ids = new Set<string>();
  for (const item of [...lessons, ...exercises]) {
    if (!object(item) || !text(item['id']) || !/^[a-z0-9-]+$/.test(item['id'])) { errors.push('У материала отсутствует допустимый id.'); continue; }
    if (ids.has(item['id'])) errors.push(`Повторяющийся id: ${item['id']}.`);
    ids.add(item['id']);
  }
  for (const lesson of lessons) {
    if (!object(lesson)) { errors.push('Повреждена запись урока.'); continue; }
    const id = String(lesson['id']);
    if (!integer(lesson['week']) || !integer(lesson['order']) || !integer(lesson['minutes']) || !text(lesson['title'])) errors.push(`${id}: нужны неделя, порядок, длительность и заголовок.`);
    if (!safeRelativePath(lesson['contentPath']) || !String(lesson['contentPath']).endsWith('.md')) errors.push(`${id}: небезопасный путь Markdown.`);
    if (!['ready', 'planned'].includes(String(lesson['readiness']))) errors.push(`${id}: неизвестная готовность.`);
    if (!strings(lesson['prerequisites']) || !strings(lesson['exerciseIds'])) { errors.push(`${id}: нужны уникальные prerequisites и exerciseIds.`); continue; }
    for (const prerequisite of lesson['prerequisites']) if (!lessons.some(l => object(l) && l['id'] === prerequisite)) errors.push(`${id}: неизвестный prerequisite ${prerequisite}.`);
    for (const exerciseId of lesson['exerciseIds']) if (!exercises.some(e => object(e) && e['id'] === exerciseId && e['lessonId'] === id)) errors.push(`${id}: неизвестное или чужое упражнение ${exerciseId}.`);
  }
  for (const exercise of exercises) {
    if (!object(exercise)) { errors.push('Повреждена запись упражнения.'); continue; }
    const id = String(exercise['id']);
    if (!integer(exercise['assessmentRevision'])) errors.push(`${id}: assessmentRevision должен быть положительным целым.`);
    const lesson = lessons.find(l => object(l) && l['id'] === exercise['lessonId']);
    if (!object(lesson) || !Array.isArray(lesson['exerciseIds']) || !lesson['exerciseIds'].includes(id)) errors.push(`${id}: отсутствует обратная связь с уроком.`);
    if (!safeRelativePath(exercise['workspacePath']) || !String(exercise['workspacePath']).startsWith('practice/')) errors.push(`${id}: неверный путь практики.`);
    if (!strings(exercise['editablePaths']) || !exercise['editablePaths'].length || !exercise['editablePaths'].every(safeRelativePath)) errors.push(`${id}: неверные редактируемые пути.`);
    if (!strings(exercise['requiredCheckIds'])) errors.push(`${id}: неверный список проверок.`);
    if (exercise['mode'] === 'automated') {
      if (!Array.isArray(exercise['requiredCheckIds']) || !exercise['requiredCheckIds'].length) errors.push(`${id}: автоматическому упражнению нужны обязательные проверки.`);
      if (!targetKeys.includes(exercise['targetKey'] as typeof targetKeys[number])) errors.push(`${id}: неизвестный targetKey.`);
    } else if (exercise['mode'] !== 'manual') errors.push(`${id}: неизвестный способ проверки.`);
  }
  const visited = new Set<string>(), visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) { errors.push(`Цикл prerequisites у ${id}.`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    const lesson = lessons.find(l => object(l) && l['id'] === id);
    if (object(lesson) && strings(lesson['prerequisites'])) lesson['prerequisites'].forEach(visit);
    visiting.delete(id); visited.add(id);
  };
  lessons.filter(object).forEach(lesson => visit(String(lesson['id'])));
  return result<Curriculum>(value, errors);
}

function checkReport(value: unknown, curriculum: Curriculum, historical: boolean): ValidationResult<AssessmentReport> {
  const errors: string[] = [];
  if (!object(value) || value['schemaVersion'] !== 1) return { ok: false, errors: ['Неподдерживаемая версия отчёта: ожидается schemaVersion 1.'] };
  const exercise = curriculum.exercises.find(item => item.id === value['exerciseId']);
  if (!exercise || exercise.mode !== 'automated') errors.push('Неизвестное автоматическое упражнение.');
  if (!integer(value['assessmentRevision']) || (exercise && (historical ? Number(value['assessmentRevision']) > exercise.assessmentRevision : value['assessmentRevision'] !== exercise.assessmentRevision))) errors.push('Редакция задания не совпадает: запустите текущую проверку.');
  if (!text(value['runId']) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value['runId'])) errors.push('Некорректный runId: нужен UUID.');
  if (!date(value['finishedAt'])) errors.push('finishedAt должен быть датой ISO с часовым поясом.');
  if (!['passed', 'failed', 'error', 'interrupted'].includes(String(value['outcome']))) errors.push('Неизвестный исход запуска.');
  if (!Array.isArray(value['checks'])) return { ok: false, errors: [...errors, 'В отчёте нужен список checks.'] };
  const seen = new Set<string>();
  for (const check of value['checks']) {
    if (!object(check) || !text(check['id']) || !text(check['message']) || !['passed', 'failed', 'skipped'].includes(String(check['status']))) { errors.push('Повреждена запись проверки.'); continue; }
    if (seen.has(check['id'])) errors.push(`Повторяющийся ID проверки ${check['id']}.`);
    seen.add(check['id']);
    if (exercise && !exercise.requiredCheckIds.includes(check['id']) && !(historical && Number(value['assessmentRevision']) < exercise.assessmentRevision)) errors.push(`Неизвестная проверка ${check['id']}.`);
  }
  if (value['outcome'] === 'passed') {
    if (!value['checks'].length || value['checks'].some(check => !object(check) || check['status'] !== 'passed')) errors.push('Успех требует непустого набора пройденных проверок.');
    if (exercise && !(historical && Number(value['assessmentRevision']) < exercise.assessmentRevision)) for (const id of exercise.requiredCheckIds) if (!value['checks'].some(check => object(check) && check['id'] === id && check['status'] === 'passed')) errors.push(`Не пройдена обязательная проверка ${id}.`);
  }
  return result<AssessmentReport>(value, errors);
}
export function validateReport(value: unknown, curriculum: Curriculum): ValidationResult<AssessmentReport> { return checkReport(value, curriculum, false); }
export function validateProgress(value: unknown, curriculum: Curriculum): ValidationResult<ProgressSnapshot> {
  if (!object(value) || value['schemaVersion'] !== 1) return { ok: false, errors: ['Неподдерживаемая версия прогресса: ожидается schemaVersion 1.'] };
  if (!object(value['lessonRecords']) || !Array.isArray(value['attempts'])) return { ok: false, errors: ['Повреждены lessonRecords или attempts.'] };
  const errors: string[] = [];
  for (const [id, record] of Object.entries(value['lessonRecords'])) {
    if (!curriculum.lessons.some(lesson => lesson.id === id) || !object(record)) { errors.push(`Неизвестный или повреждённый урок ${id}.`); continue; }
    for (const field of ['startedAt', 'readAt', 'masteredAt']) if (record[field] !== undefined && !(field === 'masteredAt' && record[field] === null) && !date(record[field])) errors.push(`${id}: неверная дата ${field}.`);
    if (record['practiceMode'] !== undefined && !['independent', 'guided'].includes(String(record['practiceMode']))) errors.push(`${id}: неизвестный уровень самостоятельности.`);
    if (record['reviews'] !== undefined && (!Array.isArray(record['reviews']) || !record['reviews'].every(review => object(review) && date(review['at']) && ['remembered', 'repeat'].includes(String(review['result']))))) errors.push(`${id}: повреждены результаты повторения.`);
    if (Object.keys(record).some(key => !['startedAt', 'readAt', 'practiceMode', 'masteredAt', 'reviews'].includes(key))) errors.push(`${id}: неизвестное поле ручной записи.`);
  }
  const seen = new Map<string, AssessmentReport>();
  for (const attempt of value['attempts']) {
    const validation = checkReport(attempt, curriculum, true);
    if (!validation.ok) errors.push(...validation.errors);
    else if (seen.has(validation.value.runId) && !equal(seen.get(validation.value.runId), validation.value)) errors.push(`Конфликт содержимого runId ${validation.value.runId}.`);
    else seen.set(validation.value.runId, validation.value);
  }
  return result<ProgressSnapshot>(value, errors);
}
export function emptyProgress(): ProgressSnapshot { return { schemaVersion: 1, lessonRecords: {}, attempts: [] }; }
export function mergeProgress(current: ProgressSnapshot, incoming: ProgressSnapshot): MergePreview {
  const snapshot = structuredClone(current), conflicts: MergePreview['conflicts'] = [];
  for (const [lessonId, record] of Object.entries(incoming.lessonRecords)) {
    const local = snapshot.lessonRecords[lessonId];
    if (!local) { snapshot.lessonRecords[lessonId] = structuredClone(record); continue; }
    if (Object.keys(record).some(key => local[key as keyof LessonRecord] !== undefined && !equal(local[key as keyof LessonRecord], record[key as keyof LessonRecord]))) conflicts.push({ lessonId, local: structuredClone(local), incoming: structuredClone(record) });
    else snapshot.lessonRecords[lessonId] = { ...local, ...structuredClone(record) };
  }
  const attempts = new Map(snapshot.attempts.map(attempt => [attempt.runId, attempt]));
  for (const attempt of incoming.attempts) {
    const local = attempts.get(attempt.runId);
    if (local && !equal(local, attempt)) throw new Error(`Конфликт содержимого runId ${attempt.runId}; импорт отменён.`);
    if (!local) { const copy = structuredClone(attempt); snapshot.attempts.push(copy); attempts.set(copy.runId, copy); }
  }
  snapshot.attempts.sort((a, b) => Date.parse(a.finishedAt) - Date.parse(b.finishedAt));
  return { snapshot, conflicts };
}
export function recommendNext(curriculum: Curriculum, progress: ProgressSnapshot): LessonMeta | null {
  const ready = curriculum.lessons.filter(lesson => lesson.readiness === 'ready').sort((a, b) => a.week - b.week || a.order - b.order);
  const unfinished = ready.filter(lesson => !progress.lessonRecords[lesson.id]?.masteredAt);
  const repeat = ready.find(lesson => [...(progress.lessonRecords[lesson.id]?.reviews ?? [])].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).at(-1)?.result === 'repeat');
  return repeat ?? unfinished.find(lesson => progress.lessonRecords[lesson.id]?.startedAt) ?? unfinished.find(lesson => lesson.prerequisites.every(id => progress.lessonRecords[id]?.masteredAt)) ?? null;
}
export function getReviewDue(curriculum: Curriculum, progress: ProgressSnapshot, now: Date): LessonMeta[] {
  return curriculum.lessons.filter(lesson => {
    const record = progress.lessonRecords[lesson.id];
    if (lesson.readiness !== 'ready' || !record?.masteredAt) return false;
    const reviews = [...(record.reviews ?? [])].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    if (reviews.at(-1)?.result === 'repeat') return true;
    const mastered = Date.parse(record.masteredAt);
    return [2, 7].some(days => { const due = mastered + days * 86400000; return now.getTime() >= due && !reviews.some(review => review.result === 'remembered' && Date.parse(review.at) >= due); });
  });
}
