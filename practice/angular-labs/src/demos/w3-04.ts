import {
  ChangeDetectionStrategy, Component, DestroyRef, Injectable, inject, signal,
} from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ReadingState {
  private readonly value = signal(0);
  readonly minutes = this.value.asReadonly();
  addMinute() { this.value.update(n => n + 1); }
}

@Component({
  selector: 'clock-demo', standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>Учебных минут: {{ state.minutes() }}</p>`,
})
export class ClockDemo {
  readonly state = inject(ReadingState);
  constructor() {
    const timer = setInterval(() => this.state.addMinute(), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}

