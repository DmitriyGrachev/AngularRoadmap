import { FormControl, FormGroup } from '@angular/forms';
export function createIssueForm(initial = { title: '', priority: 'NORMAL', assignee: null }) {
  const titleLength = control => { const length = control.value.trim().length; return length >= 3 && length <= 80 ? null : { titleLength: true }; };
  const priority = control => ['LOW','NORMAL','HIGH'].includes(control.value) ? null : { priority: true };
  return new FormGroup({
    title: new FormControl(initial.title, { nonNullable: true, validators: [titleLength] }),
    priority: new FormControl(initial.priority, { nonNullable: true, validators: [priority] }),
    assignee: new FormControl(initial.assignee),
  });
}
