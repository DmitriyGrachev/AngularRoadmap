import '@angular/compiler';
import { FormControl, FormGroup, Validators } from '@angular/forms';

type Book = { id: string; title: string; available: boolean };
type BookPatch = Partial<Pick<Book, 'title' | 'available'>>;
const book: Book = { id: 'b8', title: 'Сети', available: true };
const form = new FormGroup({
  title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  available: new FormControl(false, { nonNullable: true }),
});
form.reset({ title: book.title, available: book.available });
console.log(form.pristine, form.getRawValue());
form.controls.title.setValue('Компьютерные сети');
const value = form.getRawValue();
const patch: BookPatch = {};
if (value.title !== book.title) patch.title = value.title;
if (value.available !== book.available) patch.available = value.available;
console.log(patch); // { title: 'Компьютерные сети' }

