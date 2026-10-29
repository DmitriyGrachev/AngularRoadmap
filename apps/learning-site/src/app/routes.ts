import { Routes } from '@angular/router';
import { Today } from './features/today';
import { Roadmap } from './features/roadmap';
import { Lesson } from './features/lesson';
import { Progress } from './features/progress';

export const routes: Routes = [
  { path: 'today', component: Today, title: 'Сегодня — Angular Практикум' },
  { path: 'roadmap', component: Roadmap, title: 'Роадмап — Angular Практикум' },
  { path: 'lessons/:id', component: Lesson, title: 'Урок — Angular Практикум' },
  { path: 'progress', component: Progress, title: 'Прогресс — Angular Практикум' },
  { path: 'training', loadComponent: () => import('./features/training').then(m => m.Training), title: 'Практика — Angular Практикум' },
  { path: 'training/:id', loadComponent: () => import('./features/training-detail').then(m => m.TrainingDetail), title: 'Задание — Angular Практикум' },
  { path: 'journal', loadComponent: () => import('./features/journal').then(m => m.Journal), title: 'Журнал ошибок — Angular Практикум' },
  { path: 'mechanisms', loadComponent: () => import('./features/mechanisms').then(m => m.Mechanisms), title: 'Механизмы — Angular Практикум' },
  { path: 'mechanisms/:id', loadComponent: () => import('./features/mechanisms').then(m => m.Mechanisms), title: 'Механизмы — Angular Практикум' },
  { path: '', pathMatch: 'full', redirectTo: 'today' },
  { path: '**', redirectTo: 'roadmap' }
];
