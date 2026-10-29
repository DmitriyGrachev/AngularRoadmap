import test from 'node:test';
import assert from 'node:assert/strict';
import { courseWeeks, formatHours } from '../shared/course-outline.ts';

const lesson = (id, week, order, minutes) => ({ id, week, order, minutes, title: id, contentPath: `content/lessons/${id}.md`, prerequisites: [], readiness: 'ready', exerciseIds: [] });

test('outline includes later weeks in numerical order and derives their actual duration', () => {
  const curriculum = { schemaVersion: 1, exercises: [], weeks: [{ number: 12, title: 'Delivery', description: 'Ship and explain' }], lessons: [lesson('last', 12, 4, 360), lesson('ten', 10, 3, 180), lesson('two', 2, 1, 120), lesson('first', 12, 2, 180)] };
  const before = structuredClone(curriculum);
  const weeks = courseWeeks(curriculum);
  assert.deepEqual(weeks.map(w => w.number), [2, 10, 12]);
  assert.equal(weeks[2].title, 'Delivery');
  assert.equal(weeks[2].description, 'Ship and explain');
  assert.equal(weeks[2].minutes, 540);
  assert.deepEqual(weeks[2].lessons.map(l => l.id), ['first', 'last']);
  assert.equal(weeks[0].title, 'Неделя 2');
  assert.deepEqual(curriculum, before);
  assert.deepEqual(courseWeeks(null), []);
});

test('duration labels work for short lessons, advanced lessons and workshops', () => {
  for (const [minutes, expected] of [[45,'45 мин'],[60,'1 час'],[120,'2 часа'],[180,'3 часа'],[300,'5 часов'],[360,'6 часов'],[900,'15 часов'],[10800,'180 часов']]) assert.equal(formatHours(minutes), expected);
});
