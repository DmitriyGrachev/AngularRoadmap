export function virtualWindow({ count, rowHeight, scrollTop, viewportHeight, overscan }) {
  if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(overscan) || overscan < 0 ||
      !Number.isFinite(rowHeight) || rowHeight <= 0 || !Number.isFinite(scrollTop) || scrollTop < 0 ||
      !Number.isFinite(viewportHeight) || viewportHeight < 0) throw new RangeError('Invalid window');
  const totalHeight = count * rowHeight;
  if (count === 0 || viewportHeight === 0) return { start: 0, end: 0, offset: 0, totalHeight };
  const top = Math.min(scrollTop, Math.max(0, totalHeight - viewportHeight));
  const start = Math.max(0, Math.floor(top / rowHeight) - overscan);
  const end = Math.min(count, Math.ceil((top + viewportHeight) / rowHeight) + overscan);
  return { start, end, offset: start * rowHeight, totalHeight };
}

