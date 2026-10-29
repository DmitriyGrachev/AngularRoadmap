export function virtualWindow({ count, rowHeight, scrollTop, viewportHeight, overscan }) {
  const start = Math.floor(scrollTop / rowHeight), end = Math.ceil((scrollTop + viewportHeight) / rowHeight);
  return { start, end, offset: start * rowHeight, totalHeight: count * rowHeight };
}

