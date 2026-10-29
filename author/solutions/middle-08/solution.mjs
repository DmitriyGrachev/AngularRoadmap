export function applyRowErrors(rows, response, snapshot, currentRevision) {
  if (response.revision !== snapshot.revision || response.revision !== currentRevision) return 0;
  let applied = 0;
  for (const error of response.errors) {
    if (error.field !== 'label' || typeof error.message !== 'string' || !error.message.trim()) continue;
    const row = rows.controls.find(row => row.controls.id.value === error.id);
    const submitted = snapshot.rows.find(row => row.id === error.id);
    if (!row || !submitted || row.controls.label.value !== submitted.label) continue;
    const field = row.controls.label;
    field.setErrors({ ...field.errors, server: error.message });
    applied++;
  }
  return applied;
}

