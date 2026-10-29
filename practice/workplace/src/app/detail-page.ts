import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { DeskApi } from './desk-api';
import { RequestItem, STATUS_LABELS, PRIORITY_LABELS } from './models';

@Component({
  selector: 'desk-detail', imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './detail-page.html', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailPage {
  private readonly api = inject(DeskApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly item = signal<RequestItem | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly saved = signal(false);
  readonly saving = signal(false);
  readonly statusLabels = STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;
  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5), Validators.maxLength(100)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.saved.set(false));
    inject(ActivatedRoute).paramMap.pipe(
      switchMap(params => {
        this.loading.set(true); this.item.set(null); this.loadError.set(''); this.saveError.set(''); this.saved.set(false);
        return this.api.get(params.get('id') ?? '').pipe(catchError((error: Error) => { this.loadError.set(error.message); return of(null); }));
      }),
      takeUntilDestroyed(),
    ).subscribe(item => {
      this.item.set(item); this.loading.set(false);
      if (item) this.form.reset({ title: item.title, description: item.description });
    });
  }

  save(): void {
    this.form.markAllAsTouched();
    const item = this.item();
    if (!item || this.form.invalid || this.saving()) return;
    this.saving.set(true); this.saveError.set(''); this.saved.set(false);
    this.api.update(item.id, this.form.getRawValue()).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.saving.set(false)),
    ).subscribe({
      next: saved => {
        if (this.item()?.id !== saved.id) return;
        this.item.set(saved);
        this.form.reset({ title: saved.title, description: saved.description });
        this.saved.set(true);
      },
      error: (error: Error) => { if (this.item()?.id === item.id) this.saveError.set(error.message); },
    });
  }
}
