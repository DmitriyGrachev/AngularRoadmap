import { Component, EventEmitter, Input, Output, input, output } from '@angular/core';

@Component({
  selector: 'modern-book', standalone: true,
  template: `<button type="button" (click)="selected.emit(id())">{{ title() }}</button>`,
})
export class ModernBook {
  id = input.required<string>();
  title = input.required<string>();
  selected = output<string>();
}

@Component({
  selector: 'decorator-book', standalone: true,
  template: `<button type="button" (click)="selected.emit(id)">{{ title }}</button>`,
})
export class DecoratorBook {
  @Input({ required: true }) id = '';
  @Input({ required: true }) title = '';
  @Output() selected = new EventEmitter<string>();
}

