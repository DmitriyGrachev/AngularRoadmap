import assert from 'node:assert/strict';
import { checkTargets } from './check-targets.mjs';
import { bugTargets } from './bug-targets.mjs';
import { middleTargets } from './middle-targets.mjs';

const issues = () => [
  { id: 'A-1', title: 'Исправить поиск', status: 'OPEN' },
  { id: 'A-2', title: 'Сверстать форму', status: 'DONE' },
  { id: 'A-3', title: 'Проверить список', status: 'OPEN' },
  { id: 'A-4', title: 'Подключить API', status: 'IN_PROGRESS' },
];

const pilotChecks = {
  'filter-open': solution => {
    const data = issues();
    assert.deepEqual(solution.filterIssues(data, 'OPEN'), [data[0], data[2]], 'Верните только OPEN, сохранив порядок.');
    assert.deepEqual(solution.filterIssues(data, 'DONE'), [data[1]], 'Фильтр должен использовать переданный статус.');
    assert.deepEqual(solution.filterIssues(data, 'IN_PROGRESS'), [data[3]], 'Фильтр должен поддерживать IN_PROGRESS.');
    assert.deepEqual(solution.filterIssues(data, 'UNKNOWN'), [], 'При отсутствии совпадений нужен пустой массив.');
  },
  'immutable-input': solution => {
    const data = Object.freeze(issues().map(Object.freeze)), before = structuredClone(data);
    solution.filterIssues(data, 'OPEN'); solution.labelIssues(data);
    assert.deepEqual(data, before, 'Исходный массив и объекты должны оставаться прежними.');
  },
  'empty-list': solution => {
    assert.deepEqual(solution.filterIssues([], 'OPEN'), [], 'Пустой список фильтруется в [].');
    assert.deepEqual(solution.labelIssues([]), [], 'У пустого списка нет подписей.');
  },
  labels: solution => assert.deepEqual(solution.labelIssues(issues()), ['A-1: Исправить поиск', 'A-2: Сверстать форму', 'A-3: Проверить список', 'A-4: Подключить API'], 'Верните строку «id: title» для каждой заявки.'),
};

// Commands are code-owned; catalogue data can only select one registered key.
export const targets = Object.freeze({ 'foundations-w1-04': Object.freeze({ solutionFile: 'solution.mjs', checks: pilotChecks }), ...checkTargets, ...bugTargets, ...middleTargets });

export async function runTarget(key, solution, context = {}) {
  const target = Object.hasOwn(targets, key) ? targets[key] : undefined;
  if (!target) throw new Error(`Неизвестный targetKey ${key}.`);
  const checks = [];
  for (const [id, check] of Object.entries(target.checks)) {
    try { await check(solution, context); checks.push({ id, status: 'passed', message: 'Условие выполнено.' }); }
    catch (error) { checks.push({ id, status: 'failed', message: String(error?.message ?? error).slice(0, 2000) }); }
  }
  return checks;
}
