import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap, tap } from 'rxjs';
import { DeskApi } from './desk-api';
import { ListQuery, PRIORITY_LABELS, RequestPage, STATUS_LABELS } from './models';
import { readQuery } from './query';

interface ListVm { query: ListQuery; loading: boolean; page?: RequestPage; error?: string; }

@Component({
  selector: 'desk-list', imports: [AsyncPipe, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './list-page.html', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListPage {
  private readonly api = inject(DeskApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly statusLabels = STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;
  readonly filters = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    status: new FormControl<ListQuery['status']>('all', { nonNullable: true }),
  });
  readonly vm$ = this.route.queryParamMap.pipe(
    map(readQuery),
    tap(query => this.filters.setValue({ q: query.q, status: query.status }, { emitEvent: false })),
    switchMap(query => this.api.list(query).pipe(
      map(page => ({ query, page, loading: false } as ListVm)),
      catchError((error: Error) => of<ListVm>({ query, loading: false, error: error.message })),
      startWith<ListVm>({ query, loading: true }),
    )),
  );

  applyFilters(): void {
    const { q, status } = this.filters.getRawValue();
    void this.router.navigate([], { relativeTo: this.route, queryParams: { q: q.trim() || null, status: status === 'all' ? null : status, page: null }, queryParamsHandling: 'merge' });
  }

  totalPages(page: RequestPage): number { return Math.max(1, Math.ceil(page.total / page.pageSize)); }
}
