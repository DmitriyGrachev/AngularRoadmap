import assert from 'node:assert/strict';
export function verifyCanEdit(canEdit) {
  assert.equal(canEdit({ id: 'u', roles: ['EDITOR'], active: true }, { ownerId: 'u', status: 'OPEN' }), true);
}

