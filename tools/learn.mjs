import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, mkdtemp, cp, rm } from 'node:fs/promises';
import { resolve, dirname, join, relative, isAbsolute } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { validateCurriculum, validateReport } from '../shared/domain.ts';
import { targets, runTarget } from './targets.mjs';

const thisFile = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(thisFile), '..');

export function deriveOutcome(exercise, checks, execution = 'completed') {
  if (execution === 'interrupted') return 'interrupted';
  if (execution !== 'completed' || !checks.length || new Set(checks.map(c => c.id)).size !== checks.length || exercise.requiredCheckIds.some(id => !checks.some(check => check.id === id)) || checks.some(check => !exercise.requiredCheckIds.includes(check.id))) return 'error';
  return checks.every(check => check.status === 'passed') ? 'passed' : 'failed';
}

async function execute(solutionFile, targetKey, executable, timeoutMs) {
  return new Promise(resolveResult => {
    let payload, stderr = '', timedOut = false, finished = false;
    const child = fork(thisFile, ['--worker', solutionFile, targetKey], { execPath: executable, execArgv: ['--experimental-strip-types', '--disable-warning=ExperimentalWarning'], stdio: ['ignore', 'ignore', 'pipe', 'ipc'], windowsHide: true });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    const finish = value => { if (!finished) { finished = true; clearTimeout(timer); resolveResult(value); } };
    child.stderr.on('data', data => { stderr = (stderr + data.toString()).slice(-4000); });
    child.on('message', message => { payload = message; });
    child.on('error', error => finish({ execution: 'error', checks: [], detail: `Не удалось запустить Node: ${error.message}` }));
    child.on('close', (code, signal) => {
      if (timedOut || signal || !payload) finish({ execution: 'interrupted', checks: [], detail: timedOut ? 'Проверка остановлена по времени; проверьте бесконечный цикл.' : `Процесс завершился без полного результата (${signal ?? code}). ${stderr}` });
      else if (payload.error) finish({ execution: 'error', checks: [], detail: payload.error });
      else if (code !== 0 || !Array.isArray(payload.checks)) finish({ execution: 'error', checks: [], detail: 'Инструмент проверки вернул некорректный результат.' });
      else finish({ execution: 'completed', checks: payload.checks, detail: '' });
    });
  });
}

async function loadCurriculum(root, supplied) {
  const value = supplied ?? JSON.parse(await readFile(join(root, 'content/curriculum.json'), 'utf8'));
  const validation = validateCurriculum(value);
  if (!validation.ok) throw new Error(validation.errors.join('\n'));
  return validation.value;
}

export async function runExercise(id, options = {}) {
  const root = resolve(options.root ?? projectRoot), curriculum = await loadCurriculum(root, options.curriculum);
  const exercise = curriculum.exercises.find(item => item.id === id && item.mode === 'automated');
  if (!exercise) throw new Error(`Неизвестное автоматическое упражнение ${id}.`);
  const target = Object.hasOwn(targets, exercise.targetKey) ? targets[exercise.targetKey] : undefined;
  if (!target) throw new Error(`Неизвестный targetKey ${exercise.targetKey}.`);
  const source = options.solutionPath ?? join(root, exercise.workspacePath, target.solutionFile);
  const run = await execute(resolve(source), exercise.targetKey, options.executable ?? process.execPath, options.timeoutMs ?? 5000);
  let report = { schemaVersion: 1, runId: randomUUID(), exerciseId: id, assessmentRevision: exercise.assessmentRevision, finishedAt: new Date().toISOString(), outcome: deriveOutcome(exercise, run.checks, run.execution), checks: run.checks };
  const validation = validateReport(report, curriculum);
  if (!validation.ok) report = { ...report, outcome: 'error', checks: [] };
  let reportPath;
  if (options.writeReport !== false) {
    const reports = join(root, 'practice/reports'); await mkdir(reports, { recursive: true });
    reportPath = join(reports, `${id}-${report.runId}.json`);
    const temporary = `${reportPath}.tmp`; await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' }); await rename(temporary, reportPath);
  }
  return { report, reportPath, detail: run.detail || (!validation.ok ? validation.errors.join('\n') : '') };
}

export async function verifyAuthor(options = {}) {
  const root = resolve(options.root ?? projectRoot), curriculum = await loadCurriculum(root, options.curriculum);
  // Local ancestry preserves package resolution; whole exercise directories preserve relative imports.
  const temporary = await mkdtemp(join(projectRoot, '.author-verify-')), reports = [];
  try {
    for (const exercise of curriculum.exercises.filter(item => item.mode === 'automated')) {
      const target = targets[exercise.targetKey];
      if (!target) throw new Error(`Неизвестный targetKey ${exercise.targetKey}.`);
      const source = join(root, 'author/solutions', exercise.id), destination = join(temporary, exercise.id), copy = join(destination, target.solutionFile);
      await cp(source, destination, { recursive: true, errorOnExist: true, force: false });
      const result = await runExercise(exercise.id, { root, curriculum, solutionPath: copy, writeReport: false });
      reports.push(result.report);
      if (result.report.outcome !== 'passed') throw new Error(`Эталон ${exercise.id} не прошёл: ${JSON.stringify(result.report.checks)} ${result.detail}`);
    }
    return reports;
  } finally {
    const child = relative(projectRoot, resolve(temporary));
    if (isAbsolute(child) || child.startsWith('..') || !child.startsWith('.author-verify-') || dirname(resolve(temporary)) !== projectRoot) throw new Error('Отказ от очистки вне временного каталога проверки.');
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === thisFile) {
  if (process.argv[2] === '--worker') {
    try {
      await import('@angular/compiler');
      const checks = await runTarget(process.argv[4], await import(pathToFileURL(process.argv[3]).href), { solutionFile: process.argv[3] });
      process.send?.({ checks });
    } catch (error) { process.send?.({ error: `Ошибка загрузки решения: ${error.message}` }); }
    process.disconnect?.();
  } else {
    try {
      if (process.argv[2] === 'verify-author') { const reports = await verifyAuthor(); console.log(`Эталоны проверены: ${reports.length}. Файлы ученика сохранены.`); }
      else if (process.argv[2] === 'check' && process.argv.length === 4) {
        const { report, reportPath, detail } = await runExercise(process.argv[3]);
        console.log(`Результат: ${report.outcome}`); for (const check of report.checks) console.log(`${check.status}: ${check.id} — ${check.message}`);
        if (detail) console.log(detail); console.log(`Отчёт: ${reportPath}`); process.exitCode = report.outcome === 'passed' ? 0 : 1;
      } else throw new Error('Команды: npm.cmd run learn -- check <exerciseId> | npm.cmd run learn -- verify-author');
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
