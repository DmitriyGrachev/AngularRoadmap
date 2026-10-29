import { signal } from '@angular/core';

const readStatus = params => ['OPEN', 'IN_PROGRESS', 'DONE'].includes(params.get('status')) ? params.get('status') : 'ALL';

export function createFilters(route, router) {
  const status = signal(readStatus(route.snapshot.queryParamMap));
  const subscription = route.queryParamMap.subscribe(params => status.set(readStatus(params)));
  return {
    status,
    select: status => router.navigate([], { queryParams: { status, page: 1 }, queryParamsHandling: 'merge' }),
    destroy: () => subscription.unsubscribe(),
  };
}
