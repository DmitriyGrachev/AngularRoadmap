import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateTraining } from '../shared/training.ts';
import { targets } from './targets.mjs';

export async function validateTrainingContent(root, curriculum) {
  const items = (await Promise.all(['checks', 'bugs', 'tickets', 'reviews', 'middle'].map(async part => JSON.parse(await readFile(resolve(root, `content/training/${part}.json`), 'utf8'))))).flat();
  const validation = validateTraining(items, curriculum.lessons.map(l => l.id));
  if (!validation.ok) return validation;
  const errors = [];
  for (const [kind, expected] of Object.entries({ check: 28, bug: 12, ticket: 6, review: 8 })) {
    if (items.filter(i => i.kind === kind).length !== expected) errors.push(`${kind}: ожидается ${expected} материалов.`);
  }
  for (const item of items) {
    if (item.workspacePath) {
      try { if (!(await stat(resolve(root, item.workspacePath))).isDirectory()) throw new Error(); }
      catch { errors.push(`${item.id}: рабочая папка отсутствует.`); }
    }
    if (item.exercise) {
      const actual = curriculum.exercises.find(e => e.id === item.id);
      if (JSON.stringify(actual) !== JSON.stringify(item.exercise)) errors.push(`${item.id}: упражнение в curriculum отличается от тренажёра.`);
      const target = targets[item.exercise.targetKey];
      if (!target || target.solutionFile !== item.exercise.editablePaths[0] || Object.keys(target.checks).sort().join() !== [...item.exercise.requiredCheckIds].sort().join()) errors.push(`${item.id}: проверки не согласованы с каталогом.`);
      if (item.command !== `npm.cmd run learn -- check ${item.id}`) errors.push(`${item.id}: команда проверки отличается от зарегистрированной.`);
      try { await stat(resolve(root, 'author/solutions', item.id, target?.solutionFile ?? 'missing')); }
      catch { errors.push(`${item.id}: нет эталона.`); }
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: items };
}
