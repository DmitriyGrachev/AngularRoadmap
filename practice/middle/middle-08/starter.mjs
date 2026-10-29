export function applyRowErrors(rows, response, snapshot, currentRevision) {
  let applied = 0;
  response.errors.forEach((error, index) => {
    const field = rows.at(index)?.controls.label;
    if (field) { field.setErrors({ server: error.message }); applied++; }
  });
  return applied;
}

