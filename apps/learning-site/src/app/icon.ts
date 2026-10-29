import { Component, input } from '@angular/core';

const paths: Record<string, string> = {
  home: 'm3 10 9-7 9 7v10H3Z M9 20v-7h6v7',
  book: 'M12 5v15 M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z',
  chart: 'M4 20V10 M10 20V6 M16 20V12 M22 20V3',
  arrow: 'M4 12h16 m-6-6 6 6-6 6',
  clock: 'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  code: 'm8 5-7 7 7 7 m8-14 7 7-7 7 M14 3l-4 18',
  check: 'm4 12 5 5L20 6',
  file: 'M14 2H5v20h14V7Z M14 2v6h6 M8 12h8 M8 16h6',
  flask: 'M9 3h6 M10 3v7L4 20h16l-6-10V3 M7 15h10',
  chat: 'M3 4h18v13H8l-5 4Z',
  chevron: 'm9 5 7 7-7 7',
  download: 'M12 3v12 m-5-5 5 5 5-5 M4 17v4h16v-4',
  upload: 'M12 16V4 m-5 5 5-5 5 5 M4 17v4h16v-4',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'm5 5 14 14 M19 5 5 19',
  search: 'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  repeat: 'M4 9a8 8 0 0 1 14-4l3 3 M21 3v5h-5 M20 15a8 8 0 0 1-14 4l-3-3 M3 21v-5h5'
};

@Component({
  selector: 'app-icon',
  template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="path()"/></svg>',
  styles: ':host{display:inline-flex;width:20px;height:20px;flex-shrink:0;vertical-align:middle}svg{width:100%;height:100%}'
})
export class Icon {
  name = input('arrow');
  path() { return paths[this.name()] ?? paths['arrow']; }
}
