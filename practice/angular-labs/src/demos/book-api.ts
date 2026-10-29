import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type Book = { id: string; title: string };
export type BookPage = { items: Book[]; total: number };

@Injectable({ providedIn: 'root' })
export class BookApi {
  private http = inject(HttpClient);
  list(q: string): Observable<BookPage> {
    const params = new HttpParams().set('q', q);
    return this.http.get<BookPage>('/api/books', { params });
  }
}
