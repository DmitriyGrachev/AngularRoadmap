import '@angular/compiler';
import { FormControl, FormGroup } from '@angular/forms';

export function createEditForm(issue) {
  return new FormGroup({
    id: new FormControl({ value: issue.id, disabled: true }, { nonNullable: true }),
    title: new FormControl(issue.title, { nonNullable: true }),
  });
}

export function toUpdate(form) {
  return form.value;
}
