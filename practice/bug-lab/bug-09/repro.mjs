import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const solution = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : './solution.mjs');
const form = solution.createEditForm({ id: 'R-17', title: 'Исправить поиск' });
const payload = solution.toUpdate(form);
console.log({ controlId: form.controls.id.value, disabled: form.controls.id.disabled, payload });
assert.deepEqual(payload, { id: 'R-17', title: 'Исправить поиск' });
console.log("Сценарий исправлен. Запустите полную проверку упражнения.");
