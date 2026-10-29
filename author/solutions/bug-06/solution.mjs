import '@angular/compiler';
import { FormControl, FormGroup, Validators } from '@angular/forms';

export function createIssueForm(draft) {
  return new FormGroup({
    title: new FormControl(draft.title, { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl(draft.description, { nonNullable: true }),
  });
}

export async function submit(form, save) {
  const dto = form.getRawValue();
  form.disable();
  try {
    const saved = await save(dto);
    form.reset({ title: '', description: '' });
    return { ok: true, id: saved.id };
  } catch (error) {
    return { ok: false, message: error.message };
  } finally {
    form.enable();
  }
}
