import { FormArray, FormControl, FormGroup } from '@angular/forms';
export interface EditorInput {
  title: string; schedule: { start: number; end: number };
  rows: { id: string; code: string; quantity: number }[];
}
export function createEditor(input: EditorInput) {
  const control = <T>(value: T) => new FormControl(value, { nonNullable: true });
  return new FormGroup({ title: control(input.title),
    schedule: new FormGroup({ start: control(input.schedule.start), end: control(input.schedule.end) }),
    rows: new FormArray(input.rows.map(row => new FormGroup({ id: control(row.id), code: control(row.code), quantity: control(row.quantity) }))),
  });
}

