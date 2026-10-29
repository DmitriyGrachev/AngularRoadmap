import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterIssues } from './filter.mjs';
test('выбирает заданный статус',()=>{assert.deepEqual(filterIssues([{id:'1',status:'OPEN'},{id:'2',status:'DONE'}],'OPEN'),[{id:'1',status:'OPEN'}]);});
// TODO: добавьте случаи пустого входа и неизменности массива/объектов.
