import type { ParamMap } from '@angular/router';
import type { ListQuery } from './models';
export function readQuery(params: ParamMap): ListQuery {
  const status = params.get('status');
  const page = Number(params.get('page') ?? 1);
  return {
    q: (params.get('q') ?? '').trim(),
    status: status === 'open' || status === 'in-progress' || status === 'closed' ? status : 'all',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}
