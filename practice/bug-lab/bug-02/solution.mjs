import { signal } from '@angular/core';

const readStatus = params => ['OPEN', 'IN_PROGRESS', 'DONE'].includes(params.get('status')) ? params.get('status') : 'ALL';

// route и router имеют интерфейс ActivatedRoute / Router; оболочка вызывает destroy при уничтожении.
export function createFilters(route, router) {
  const status = signal(readStatus(route.snapshot.queryParamMap));
  return {
    status,
    select: status => router.navigate([], { queryParams: { status, page: 1 }, queryParamsHandling: 'merge' }),
    destroy() {},
  };
}
