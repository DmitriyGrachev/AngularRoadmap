import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, map, timer } from 'rxjs';

@Component({
  selector: 'reader-save-demo', standalone: true, imports: [ReactiveFormsModule],
  template: `
    <label for="reader">Читатель</label>
    <input id="reader" [formControl]="name">
    <button type="button" [disabled]="saving()" (click)="save()">
      {{ saving() ? 'Сохраняем…' : 'Зарегистрировать' }}
    </button>
    <p role="status">{{ message() }}</p>
  `,
})
export class ReaderSaveDemo {
  name = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  saving = signal(false);
  message = signal('');
  private destroyRef = inject(DestroyRef);
  save() {
    if (this.name.invalid || this.saving()) return;
    const submitted = this.name.value;
    this.saving.set(true);
    this.message.set('');
    timer(600).pipe(
      map(() => {
        if (submitted === 'ошибка') throw new Error('Имитация сбоя');
        return { id: 'reader-17', name: submitted };
      }),
      finalize(() => this.saving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: reader => this.message.set(`Создан ${reader.id}`),
      error: () => this.message.set('Не сохранено. Ввод оставлен для повторения.'),
    });
  }
}

