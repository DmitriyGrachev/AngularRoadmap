import assert from 'node:assert/strict';
export function verifyCanEdit(canEdit) {
  for (const active of [false, true]) {
    for (const roles of [[], ['VIEWER'], ['EDITOR'], ['ADMIN'], ['EDITOR', 'ADMIN']]) {
      for (const ownerId of ['u', 'other']) {
        for (const status of ['OPEN', 'IN_PROGRESS', 'DONE']) {
          const user = { id: 'u', roles, active }, issue = { ownerId, status };
          const expected = active && status !== 'DONE' && (roles.includes('ADMIN') || roles.includes('EDITOR') && ownerId === 'u');
          assert.equal(canEdit(user, issue), expected, JSON.stringify({ user, issue }));
        }
      }
    }
  }
  assert.equal(canEdit(null, { ownerId: 'u', status: 'OPEN' }), false);
}

