import { FormControl, FormGroup } from '@angular/forms';
export function createIssueForm(initial = { title: '', priority: 'NORMAL', assignee: null }) {
  // TODO: validators и правильная nullability каждого control.
  return new FormGroup({ title: new FormControl(initial.title), priority: new FormControl(initial.priority), assignee: new FormControl(initial.assignee) });
}
