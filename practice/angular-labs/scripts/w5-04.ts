type ReaderError = { message: string; nickname?: string };

function readReaderError(value: unknown): ReaderError {
  if (typeof value !== 'object' || value === null) {
    return { message: 'Не удалось сохранить' };
  }
  const object = value as Record<string, unknown>;
  const message = typeof object['message'] === 'string'
    ? object['message'] : 'Не удалось сохранить';
  const fields = object['fieldErrors'];
  if (typeof fields !== 'object' || fields === null) return { message };
  const nickname = (fields as Record<string, unknown>)['nickname'];
  return Array.isArray(nickname) && typeof nickname[0] === 'string'
    ? { message, nickname: nickname[0] } : { message };
}

console.log(readReaderError({
  message: 'Проверьте поля', fieldErrors: { nickname: ['Псевдоним занят'] },
}));
console.log(readReaderError('<html>Proxy error</html>'));

