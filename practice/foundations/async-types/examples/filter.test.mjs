import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterIssues } from './filter.mjs';
test('оставляет OPEN',()=>{assert.deepEqual(filterIssues([{id:'1',status:'OPEN'},{id:'2',status:'DONE'}],'OPEN'),[{id:'1',status:'OPEN'}]);});
test('пустой вход',()=>{assert.deepEqual(filterIssues([],'OPEN'),[]);});
