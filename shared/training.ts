import type { ExerciseMeta, ValidationResult } from './domain';

export type TrainingKind = 'check' | 'bug' | 'ticket' | 'review';
export interface TrainingItem {
  id: string;
  kind: TrainingKind;
  title: string;
  lessonId: string;
  minutes: number;
  concept: string;
  summary: string;
  placement: 'replacement' | 'optional';
  brief: string;
  acceptance: string[];
  hints: string[];
  explanation: string;
  relatedIds: string[];
  workspacePath?: string;
  command?: string;
  exercise?: ExerciseMeta;
  diff?: string;
  verdict?: 'accept' | 'changes';
  findings?: string[];
  followUp?: string;
}

export interface TrainingAttempt { id: string; itemId: string; at: string; answer: string; decision?: 'accept' | 'changes' }
export interface MistakeEntry { id: string; itemId: string; createdAt: string; symptom: string; hypothesis: string; explanation: string; nextId: string }
export interface MistakeRecall { id: string; mistakeId: string; at: string; result: 'remembered' | 'repeat'; response: string }
export interface TrainingProgress { schemaVersion: 1; attempts: TrainingAttempt[]; mistakes: MistakeEntry[]; recalls: MistakeRecall[] }
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 40000;
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(text);
const date = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v));
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const oneOf = (v: unknown, choices: string[]): v is string => typeof v === 'string' && choices.includes(v);
const stable = (v: unknown): string => JSON.stringify(v, (_key, item: unknown) => object(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);

export function validateTraining(value: unknown, lessonIds: string[]): ValidationResult<TrainingItem[]> {
  if (!Array.isArray(value)) return { ok: false, errors: ['Каталог тренажёра должен быть списком.'] };
  const errors: string[] = [], ids = new Set<string>();
  for (const item of value) {
    if (!object(item) || !text(item['id'])) { errors.push('Повреждена запись тренажёра.'); continue; }
    const id = item['id'];
    if (!/^(checks|bug|ticket|review|middle)-\d\d$/.test(id) || ids.has(id)) errors.push(`Неверный или повторный ID: ${id}.`);
    ids.add(id);
    for (const key of ['title', 'concept', 'summary', 'brief', 'explanation']) if (!text(item[key])) errors.push(`${id}: отсутствует ${key}.`);
    if (!oneOf(item['kind'], ['check', 'bug', 'ticket', 'review']) || !oneOf(item['placement'], ['replacement', 'optional'])) errors.push(`${id}: неверный тип практики.`);
    if (!text(item['lessonId']) || !lessonIds.includes(item['lessonId']) || !Number.isInteger(item['minutes']) || Number(item['minutes']) < 1) errors.push(`${id}: неверный урок или длительность.`);
    for (const key of ['acceptance', 'hints', 'relatedIds']) if (!strings(item[key]) || !(item[key] as string[]).length) errors.push(`${id}: нужен непустой ${key}.`);
    if (Array.isArray(item['hints']) && item['hints'].length !== 3) errors.push(`${id}: нужны три последовательные подсказки.`);
    if (item['workspacePath'] !== undefined && (!text(item['workspacePath']) || !/^practice\/[a-zA-Z0-9/_-]+$/.test(item['workspacePath']))) errors.push(`${id}: неверный путь практики.`);
    if (item['kind'] === 'review' && (!text(item['diff']) || !oneOf(item['verdict'], ['accept', 'changes']) || !strings(item['findings']) || (item['verdict'] === 'changes' && !item['findings'].length))) errors.push(`${id}: неполный разбор ревью.`);
    if (item['kind'] === 'ticket' && !text(item['followUp'])) errors.push(`${id}: нет следующего требования.`);
    if (['check', 'bug'].includes(String(item['kind'])) && (!object(item['exercise']) || item['exercise']['id'] !== id || item['exercise']['lessonId'] !== item['lessonId'])) errors.push(`${id}: нет согласованного упражнения.`);
  }
  for (const item of value) if (object(item) && strings(item['relatedIds'])) {
    if (item['relatedIds'].some(id => !ids.has(id) || id === item['id'])) errors.push(`${item['id']}: неизвестная или собственная ссылка повторения.`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: value as TrainingItem[] };
}

export function emptyTrainingProgress(): TrainingProgress { return { schemaVersion: 1, attempts: [], mistakes: [], recalls: [] }; }
export function validateTrainingProgress(value: unknown, items: TrainingItem[]): ValidationResult<TrainingProgress> {
  if (!object(value) || value['schemaVersion'] !== 1 || !Array.isArray(value['attempts']) || !Array.isArray(value['mistakes']) || !Array.isArray(value['recalls'])) return { ok: false, errors: ['Нужен экспорт тренажёра версии 1: attempts, mistakes и recalls.'] };
  const errors: string[] = [], ids = new Map<string, string>(), known = new Set(items.map(item => item.id));
  const register = (record: Record<string, unknown>) => {
    if (!uuid(record['id'])) { errors.push('Неверный ID записи.'); return; }
    if (ids.has(record['id'])) errors.push('Повторный ID записи в файле.');
    ids.set(record['id'], stable(record));
  };
  for (const attempt of value['attempts']) {
    if (!object(attempt)) { errors.push('Повреждена попытка.'); continue; }
    register(attempt);
    if (!text(attempt['itemId']) || !known.has(attempt['itemId']) || !date(attempt['at']) || !text(attempt['answer']) || String(attempt['answer']).trim().length < 10) errors.push('У попытки нужны материал, дата и содержательный ответ.');
    const item = items.find(item => item.id === attempt['itemId']);
    if ((item?.kind === 'review' && !oneOf(attempt['decision'], ['accept', 'changes'])) || (attempt['decision'] !== undefined && !oneOf(attempt['decision'], ['accept', 'changes']))) errors.push('Неверное решение ревью.');
  }
  for (const mistake of value['mistakes']) {
    if (!object(mistake)) { errors.push('Повреждена запись ошибки.'); continue; }
    register(mistake);
    if (!text(mistake['itemId']) || !known.has(mistake['itemId']) || !text(mistake['nextId']) || !known.has(mistake['nextId']) || mistake['itemId'] === mistake['nextId'] || !date(mistake['createdAt'])) errors.push('У ошибки нужны исходный и новый примеры и дата.');
    for (const field of ['symptom', 'hypothesis', 'explanation']) if (!text(mistake[field]) || String(mistake[field]).trim().length < 5 || String(mistake[field]).length > 4000) errors.push(`Заполни ${field} (5–4000 символов).`);
  }
  for (const recall of value['recalls']) {
    if (!object(recall)) { errors.push('Повреждено повторение.'); continue; }
    register(recall);
    const mistake = value['mistakes'].find(m => object(m) && m['id'] === recall['mistakeId']);
    if (!object(mistake) || !date(recall['at']) || (date(mistake['createdAt']) && Date.parse(String(recall['at'])) < Date.parse(mistake['createdAt'])) || !oneOf(recall['result'], ['remembered', 'repeat']) || !text(recall['response']) || String(recall['response']).trim().length < 10) errors.push('У повторения нужны существующая ошибка, дата, результат и самостоятельное объяснение.');
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: value as unknown as TrainingProgress };
}

export function mergeTrainingProgress(local: TrainingProgress, incoming: TrainingProgress): TrainingProgress {
  const merge = <T extends { id: string }>(a: T[], b: T[]): T[] => {
    const records = new Map(a.map(record => [record.id, structuredClone(record)]));
    for (const record of b) {
      const old = records.get(record.id);
      if (old && stable(old) !== stable(record)) throw new Error(`Конфликт записи ${record.id}. Импорт отменён; текущие данные сохранены.`);
      if (!old) records.set(record.id, structuredClone(record));
    }
    return [...records.values()];
  };
  return { schemaVersion: 1, attempts: merge(local.attempts, incoming.attempts), mistakes: merge(local.mistakes, incoming.mistakes), recalls: merge(local.recalls, incoming.recalls) };
}

export function mistakeSchedule(mistake: MistakeEntry, recalls: MistakeRecall[], now: Date): { due: boolean; complete: boolean; nextAt: string | null } {
  const relevant = recalls.filter(r => r.mistakeId === mistake.id && Date.parse(r.at) <= now.getTime()).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const last = relevant.at(-1), created = Date.parse(mistake.createdAt);
  if (last?.result === 'repeat') return { due: true, complete: false, nextAt: last.at };
  const firstAt = created + 2 * 86400000;
  const first = relevant.find(r => r.result === 'remembered' && Date.parse(r.at) >= firstAt);
  const secondAt = first ? Math.max(created + 7 * 86400000, Date.parse(first.at) + 5 * 86400000) : null;
  const missing = !first ? firstAt : relevant.some(r => r.result === 'remembered' && Date.parse(r.at) >= secondAt!) ? undefined : secondAt!;
  return { due: missing !== undefined && now.getTime() >= missing, complete: missing === undefined, nextAt: missing === undefined ? null : new Date(missing).toISOString() };
}
