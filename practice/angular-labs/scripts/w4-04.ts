import { Subject, map, switchMap, timer } from 'rxjs';

const query$ = new Subject<string>();
const subscription = query$.pipe(
  switchMap(query => timer(query === 'с' ? 300 : 30).pipe(
    map(() => `Результат для «${query}»`),
  )),
).subscribe(value => console.log(value));

query$.next('с');
setTimeout(() => query$.next('сеть'), 10);
setTimeout(() => subscription.unsubscribe(), 500);

