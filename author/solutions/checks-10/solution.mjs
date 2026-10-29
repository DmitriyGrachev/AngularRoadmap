export function applyServerErrors(form, errors) {
  for (const [name, messages] of Object.entries(errors)) {
    const control = Object.hasOwn(form.controls, name) ? form.controls[name] : undefined;
    if (control && messages.length) control.setErrors({ ...control.errors, server: [...messages] });
  }
}
