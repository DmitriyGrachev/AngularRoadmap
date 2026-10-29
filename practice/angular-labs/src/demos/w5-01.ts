import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'reader-form-demo', standalone: true, imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <label for="reader-name">Имя читателя</label>
      <input id="reader-name" formControlName="name">
      <label for="reader-city">Город</label>
      <input id="reader-city" formControlName="city">
      <button type="submit">Показать</button>
      <button type="button" (click)="form.reset()">Начальные значения</button>
    </form>
    <p>Отправлено: {{ result() }}</p>
    <p>dirty: {{ form.dirty }}, touched: {{ form.touched }}</p>
  `,
})
export class ReaderFormDemo {
  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    city: new FormControl('Кишинёв', { nonNullable: true }),
  });
  result = signal('');
  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    this.result.set(`${value.name}, ${value.city}`);
  }
}

