import { Component } from '@angular/core';
import { RouterLink, RouterOutlet, Routes } from '@angular/router';
import { IssuesList } from './issues-list';
import { IssueDetail } from './issue-detail';
import { IssueForm } from './issue-form';

@Component({ selector: 'app-root', imports: [RouterLink, RouterOutlet], templateUrl: './app.html' })
export class App {}
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'issues' },
  { path: 'issues', component: IssuesList },
  { path: 'issues/new', component: IssueForm },
  { path: 'issues/:id', component: IssueDetail },
  { path: '**', redirectTo: 'issues' },
];
