import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
export interface EditorInput {
  title: string;
  schedule: { start: number; end: number };
  rows: { id: string; code: string; quantity: number }[];
}
export function createEditor(input: EditorInput) {
  const control = <T>(value: T) => new FormControl(value, { nonNullable: true });
  const schedule = new FormGroup({ start: control(input.schedule.start), end: control(input.schedule.end) });
  schedule.addValidators(() => schedule.controls.end.value <= schedule.controls.start.value ? { order: true } : null);
  schedule.updateValueAndValidity();
  const rows = new FormArray(input.rows.map(row => new FormGroup({
    id: control(row.id),
    code: new FormControl(row.code, { nonNullable: true, validators: [Validators.required] }),
    quantity: new FormControl(row.quantity, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
  })));
  rows.addValidators(() => {
    const codes = rows.controls.map(row => row.controls.code.value.trim().toLowerCase()).filter(Boolean);
    return new Set(codes).size !== codes.length ? { duplicateCode: true } : null;
  });
  rows.updateValueAndValidity();
  return new FormGroup({
    title: new FormControl(input.title, { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
    schedule, rows,
  });
}

