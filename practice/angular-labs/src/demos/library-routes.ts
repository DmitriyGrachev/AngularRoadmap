import { Component } from '@angular/core';
import { RouterLink, Routes } from '@angular/router';
import { BookPage } from './book-page';

@Component({
  selector: 'library-page', standalone: true, imports: [RouterLink],
  template: `<a [routerLink]="['/books', 'b9']">Книга b9</a>`,
})
export class LibraryPage {}

export const libraryRoutes: Routes = [
  { path: 'books', component: LibraryPage },
  { path: 'books/:id', component: BookPage },
  { path: '', redirectTo: 'books', pathMatch: 'full' },
  { path: '**', redirectTo: 'books' },
];

