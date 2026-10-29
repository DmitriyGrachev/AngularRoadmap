export function mergePage(previous, incoming) {
  // TODO: последняя версия побеждает, первая позиция сохраняется.
  return [...previous, ...incoming];
}
