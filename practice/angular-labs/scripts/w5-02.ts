import '@angular/compiler';
import { FormControl, Validators } from '@angular/forms';
import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const nonBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: unknown = control.value;
  return typeof value === 'string' && value.trim().length > 0
    ? null : { blank: true };
};

const nickname = new FormControl('', {
  nonNullable: true,
  validators: [nonBlank, Validators.maxLength(12)],
});
console.log(nickname.invalid, nickname.touched); // true, false
nickname.setValue('   ');
console.log(nickname.hasError('blank')); // true
nickname.setValue('Анна');
console.log(nickname.valid); // true

