import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCurriculum } from '../shared/domain.ts';
import { validateTrainingContent } from './training-content.mjs';

export async function validateContent(value, root) {
  const validation = validateCurriculum(value);
  if (!validation.ok) return validation;
  const errors = [], rootPath = resolve(root);
  const exists = async path => { try { return await stat(path); } catch { return null; } };
  for (const lesson of value.lessons.filter(item => item.readiness === 'ready')) {
    const file = resolve(rootPath, lesson.contentPath);
    let body;
    try { body = await readFile(file, 'utf8'); } catch { errors.push(`${lesson.id}: отсутствует готовый материал ${lesson.contentPath}.`); continue; }
    if (body.trim().length < 10) errors.push(`${lesson.id}: пустое содержимое.`);
    for (const exerciseId of lesson.exerciseIds) {
      const exercise = value.exercises.find(item => item.id === exerciseId);
      const workspace = resolve(rootPath, exercise.workspacePath);
      if (!(await exists(workspace))?.isDirectory()) errors.push(`${exercise.id}: отсутствует рабочая папка.`);
      for (const editable of exercise.editablePaths) if (!(await exists(resolve(workspace, editable)))) errors.push(`${exercise.id}: отсутствует ${editable}.`);
      if (exercise.mode === 'manual' && !/^#{1,6}\s+.*(?:рубрик|самопроверк|критери)/im.test(body)) errors.push(`${exercise.id}: нужна ручная рубрика в уроке.`);
    }
    const withoutCode = body.replace(/```[\s\S]*?```/g, '');
    for (const match of withoutCode.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      let link;
      try { link = decodeURIComponent(match[1]); } catch { errors.push(`${lesson.id}: повреждена ссылка ${match[1]}.`); continue; }
      if (/^https?:\/\//i.test(link) || link.startsWith('#') || link.startsWith('mailto:')) continue;
      if (link.startsWith('/lessons/')) { if (!value.lessons.some(item => item.id === link.split('/')[2])) errors.push(`${lesson.id}: неизвестный урок в ${link}.`); continue; }
      if (/^[a-z]+:/i.test(link)) { errors.push(`${lesson.id}: недопустимая схема ссылки ${link}.`); continue; }
      const target = resolve(dirname(file), link.split('#')[0]);
      const relativePath = relative(rootPath, target);
      if (relativePath === '..' || relativePath.startsWith(`..${sep}`)) { errors.push(`${lesson.id}: ссылка вне проекта ${link}.`); continue; }
      const planned = value.lessons.some(item => item.readiness === 'planned' && resolve(rootPath, item.contentPath) === target);
      if (!planned && !await exists(target)) errors.push(`${lesson.id}: не найдена локальная ссылка ${link}.`);
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const value = JSON.parse(await readFile(resolve(root, 'content/curriculum.json'), 'utf8'));
    const result = await validateContent(value, root);
    if (!result.ok) { console.error(result.errors.join('\n')); process.exitCode = 1; }
    else {
      const training = await validateTrainingContent(root, value);
      if (!training.ok) { console.error(training.errors.join('\n')); process.exitCode = 1; }
      else console.log(`Материалы проверены: ${value.lessons.length} уроков, ${value.lessons.filter(l => l.readiness === 'ready').length} готовы; ${training.value.length} заданий лаборатории.`);
    }
  } catch (error) { console.error(`Проверка материалов: ${error.message}`); process.exitCode = 1; }
}
