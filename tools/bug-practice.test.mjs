import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bugTargets } from './bug-targets.mjs';

for (const [id, target] of Object.entries(bugTargets)) {
  test(`${id}: original defect is detected without reading learner work`, async () => {
    const starter = await import(`../practice/bug-lab/${id}/starter.mjs`);
    const failures = [];
    for (const [checkId, check] of Object.entries(target.checks)) {
      try { await check(starter); } catch (error) { failures.push({ checkId, error }); }
    }
    assert.ok(failures.some(failure => failure.error instanceof assert.AssertionError), `${id}: expected a behavioral assertion to reject the starter`);
  });
  test(`${id}: reference satisfies every independent check`, async () => {
    const solution = await import(`../author/solutions/${id}/${target.solutionFile}`);
    for (const check of Object.values(target.checks)) await check(solution);
  });
}

test('bug catalogue registers exact behavioral checks and existing lessons', async () => {
  const items = JSON.parse(await readFile(new URL('../content/training/bugs.json', import.meta.url), 'utf8'));
  const curriculum = JSON.parse(await readFile(new URL('../content/curriculum.json', import.meta.url), 'utf8'));
  assert.equal(items.length, 12);
  for (const item of items) {
    assert.ok(curriculum.lessons.some(lesson => lesson.id === item.lessonId), `${item.id}: existing lesson`);
    assert.equal(item.kind, 'bug'); assert.equal(item.hints.length, 3);
    assert.equal(item.exercise.targetKey, item.id);
    assert.deepEqual(item.exercise.requiredCheckIds, Object.keys(bugTargets[item.id].checks));
    assert.deepEqual(item.exercise.editablePaths, [bugTargets[item.id].solutionFile]);
    assert.equal(item.exercise.workspacePath, item.workspacePath);
    assert.ok(item.relatedIds.every(id => items.some(other => other.id === id)));
    await readFile(new URL(`../${item.workspacePath}/repro.mjs`, import.meta.url));
    await readFile(new URL(`../${item.workspacePath}/README.md`, import.meta.url));
  }
});
