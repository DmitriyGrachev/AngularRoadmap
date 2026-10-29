import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CourseService } from './course.service';
import { Icon } from './icon';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon],
  templateUrl: './app.html'
})
export class App {
  course = inject(CourseService);
  router = inject(Router);
  menuOpen = signal(false);
  nav = [
    { path: '/today', label: 'Сегодня', icon: 'home' },
    { path: '/roadmap', label: 'Роадмап', icon: 'book' },
    { path: '/training', label: 'Практика', icon: 'code' },
    { path: '/mechanisms', label: 'Механизмы', icon: 'flask' },
    { path: '/journal', label: 'Журнал ошибок', icon: 'repeat' },
    { path: '/progress', label: 'Прогресс', icon: 'chart' }
  ];
  constructor() { this.router.events.subscribe(event => { if (event instanceof NavigationEnd) this.menuOpen.set(false); }); }
  skipToContent(event: Event) {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
  }
  pageLabel() {
    const url = this.router.url;
    return url.startsWith('/lessons') ? 'Урок' : this.nav.find(item => url.startsWith(item.path))?.label ?? 'Сегодня';
  }
}
