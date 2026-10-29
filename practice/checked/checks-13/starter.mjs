export function watchValues(source$, destroyRef, onValue) {
  // TODO: привяжите отписку к времени жизни владельца.
  return source$.subscribe(onValue);
}
