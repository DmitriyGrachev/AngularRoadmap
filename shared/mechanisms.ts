export interface Frame { title: string; note: string; lanes: { label: string; values: string[] }[]; output: string[] }
export interface MechanismRun { code: string; question: string; answers: string[]; correct: number; frames: Frame[]; conclusion: string }
export interface Mechanism { id: string; title: string; lessonId: string; summary: string; variants: { id: string; label: string }[]; sources: { label: string; url: string }[] }

export const mechanisms: Mechanism[] = [
  { id: 'event-loop', title: 'Event loop: кто следующий?', lessonId: 'w2-02', summary: 'Стек, очередь микрозадач и таймер. Предскажи порядок вывода, затем пройди выполнение по шагам.', variants: [{ id: 'simple', label: 'Promise и таймер' }, { id: 'nested', label: 'Микрозадача внутри микрозадачи' }], sources: [{ label: 'MDN: microtasks', url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide' }] },
  { id: 'rxjs', title: 'RxJS: гонка ответов', lessonId: 'w4-04', summary: 'Один медленный запрос и один быстрый. Сравни switchMap с mergeMap на одной временной шкале.', variants: [{ id: 'switch', label: 'switchMap' }, { id: 'merge', label: 'mergeMap' }], sources: [{ label: 'RxJS: switchMap', url: 'https://rxjs.dev/api/operators/switchMap' }, { label: 'RxJS: mergeMap', url: 'https://rxjs.dev/api/operators/mergeMap' }] },
  { id: 'signals', title: 'Signals: ссылка, зависимость, экран', lessonId: 'w3-03', summary: 'Изменение объекта и замена значения сигнала дают разный результат для вычисляемого значения.', variants: [{ id: 'replace', label: 'Новая ссылка через update' }, { id: 'mutate', label: 'Изменение объекта на месте' }], sources: [{ label: 'Angular: signals', url: 'https://angular.dev/guide/signals' }] },
  { id: 'di', title: 'DI: чей это экземпляр?', lessonId: 'w3-04', summary: 'Две карточки запрашивают один токен. Посмотри, где создаются и где разделяются экземпляры сервиса.', variants: [{ id: 'root', label: 'Один provider в root' }, { id: 'local', label: 'Provider у каждой карточки' }], sources: [{ label: 'Angular: hierarchical injectors', url: 'https://angular.dev/guide/di/hierarchical-dependency-injection' }] },
  { id: 'forms', title: 'Reactive Forms: что попадёт в модель?', lessonId: 'w5-01', summary: 'Значение на экране, value, errors и status не всегда меняются одновременно.', variants: [{ id: 'disabled', label: 'Отключённый control' }, { id: 'blur', label: 'Обновление по blur' }], sources: [{ label: 'Angular: FormGroup', url: 'https://angular.dev/api/forms/FormGroup' }, { label: 'Angular: FormControl', url: 'https://angular.dev/api/forms/FormControl' }] }
];

const frame = (title: string, note: string, lanes: Record<string, string[]>, output: string[]): Frame => ({ title, note, lanes: Object.entries(lanes).map(([label, values]) => ({ label, values })), output: [...output] });
export function buildMechanism(id: string, variant: string): MechanismRun {
  const model = mechanisms.find(m => m.id === id);
  if (!model || !model.variants.some(v => v.id === variant)) throw new Error('Неизвестный механизм или сценарий.');
  if (id === 'event-loop') {
    const nested = variant === 'nested', frames: Frame[] = [], output: string[] = [];
    const add = (title: string, note: string, stack: string[], micro: string[], task: string[]) => frames.push(frame(title, note, { 'Стек выполнения': stack, 'Микрозадачи →': micro, 'Таймер → задача': task }, output));
    add('Начало скрипта', 'JavaScript выполняет текущий стек до конца.', ['script'], [], []);
    output.push('start'); add('Синхронный вывод', 'Первый console.log выполняется немедленно.', ['script'], [], []);
    add('Запланирована микрозадача', 'Promise уже выполнен, но обработчик then ждёт освобождения стека.', ['script'], ['promise'], []);
    add('Зарегистрирован таймер', 'Нулевой таймер не прерывает скрипт. Его callback будет отдельной задачей.', ['script'], ['promise'], ['timer: ожидает']);
    output.push('end'); add('Скрипт завершён', 'Сначала end, затем начинается обработка микрозадач.', [], ['promise'], ['timer: готов']);
    output.push('promise'); add('Обработчик Promise', nested ? 'Во время микрозадачи добавлена ещё одна. Очередь нужно опустошить.' : 'После выполнения обработчика очередь микрозадач пуста.', ['promise callback'], nested ? ['nested'] : [], ['timer: готов']);
    if (nested) { output.push('nested'); add('Вложенная микрозадача', 'Новая микрозадача тоже выполняется до следующей задачи таймера.', ['nested callback'], [], ['timer: готов']); }
    output.push('timer'); add('Задача таймера', 'Стек и микрозадачи свободны: теперь callback таймера.', ['timer callback'], [], []);
    return {
      code: `console.log('start');\nPromise.resolve().then(() => {\n  console.log('promise');${nested ? "\n  queueMicrotask(() => console.log('nested'));" : ''}\n});\nsetTimeout(() => console.log('timer'), 0);\nconsole.log('end');`,
      question: 'Каков полный порядок console.log?',
      answers: [nested ? 'start → end → promise → nested → timer' : 'start → end → promise → timer', nested ? 'start → promise → nested → end → timer' : 'start → promise → end → timer', nested ? 'start → end → timer → promise → nested' : 'start → end → timer → promise'],
      correct: 0, frames, conclusion: 'Микрозадача не означает параллельное выполнение. Таймер задаёт минимальную задержку, а не точное время. Это модель одного браузерного скрипта без рендеринга, сетевых событий и Node-specific очередей.'
    };
  }
  if (id === 'rxjs') {
    const switched = variant === 'switch';
    return {
      code: `query$.pipe(\n  ${switched ? 'switchMap' : 'mergeMap'}(query => http.get('/api/search', {\n    params: { q: query }\n  }))\n).subscribe(result => shown.set(result));\n// A: запрос в 0 мс, ответ в 300 мс\n// B: запрос в 80 мс, ответ в 160 мс`,
      question: 'Какой результат будет на экране после 300 мс?',
      answers: ['B — последнее введённое значение', 'A — ответ медленного запроса', 'Ничего: оба запроса отменены'], correct: switched ? 0 : 1,
      frames: [
        frame('0 мс · ввод A', 'Подписка запускает холодный HTTP Observable A.', { 'Ввод': ['A'], 'Запрос A': ['активен ─────────────── 300'], 'Запрос B': ['ещё нет'], 'Подписки': ['A: 1'] }, []),
        frame('80 мс · ввод B', switched ? 'switchMap отписывается от A и подписывается на B.' : 'mergeMap сохраняет подписку на A и добавляет B.', { 'Ввод': ['A', 'B'], 'Запрос A': [switched ? 'отписка ✕ 80' : 'активен ─────────────── 300'], 'Запрос B': ['активен ─── 160'], 'Подписки': switched ? ['B: 1'] : ['A: 1', 'B: 1'] }, []),
        frame('160 мс · ответ B', 'В подписчик пришёл B, экран показывает B.', { 'Ввод': ['A', 'B'], 'Запрос A': [switched ? 'отменён для потребителя' : 'ещё активен'], 'Запрос B': ['ответ ✓ 160'], 'Экран': ['B'] }, ['Результат B']),
        frame('300 мс · завершение A', switched ? 'У A больше нет подписчика: устаревший результат не попадёт в shown.' : 'A всё ещё подписан. Его поздний ответ перезаписал B.', { 'Запрос A': [switched ? 'ответ не доставляется' : 'ответ ✓ 300'], 'Запрос B': ['завершён'], 'Экран': [switched ? 'B' : 'A'] }, switched ? ['Результат B'] : ['Результат B', 'Результат A'])
      ],
      conclusion: 'Подходящий оператор определяется требованием: для поиска нужен последний результат. Отписка от HTTP не гарантирует откат работы сервера; для записи данных нужна отдельная стратегия. Здесь фиксированные задержки, без debounce, retries и ошибок.'
    };
  }
  if (id === 'signals') {
    const replace = variant === 'replace';
    return {
      code: `const order = signal({ price: 10, qty: 2 });\nconst total = computed(() => order().price * order().qty);\nconsole.log(total()); // первое чтение: 20\n${replace ? 'order.update(old => ({ ...old, price: 15 }));' : 'order().price = 15;'}\nconsole.log(total()); // второе чтение?\n// шаблон: {{ total() }}`,
      question: 'Что вернёт второе чтение total()?',
      answers: ['30: вычисление будет обновлено', '20: останется кешированное значение', 'Ошибка: объект полностью заморожен'], correct: replace ? 0 : 1,
      frames: [
        frame('Создание', 'computed ленивый: формула ещё не вычислялась.', { 'order': ['ссылка #1 · price 10 · qty 2'], 'total': ['не вычислен'], 'Зависимости': ['установятся при чтении'] }, []),
        frame('Первое чтение', 'Формула читает order. total запоминает эту зависимость и кеширует 20.', { 'order': ['ссылка #1 · price 10 · qty 2'], 'Зависимости': ['order → total → шаблон'], 'total': ['кеш 20 · актуален'] }, ['Всего: 20']),
        frame('Изменение цены', replace ? 'Новая ссылка уведомила зависимость. total помечен устаревшим, но ещё не пересчитан.' : 'Изменилось поле обычного объекта. Сигнал не получил set/update; total не пересчитан и не помечен устаревшим.', { 'order': [`ссылка #${replace ? '2' : '1'} · price 15 · qty 2`], 'Зависимости': [replace ? 'order → total: уведомление' : 'order ⇢ total: уведомления нет'], 'total': [replace ? 'кеш 20 · устарел' : 'кеш 20 · считается актуальным'] }, ['Всего: 20']),
        frame('Второе чтение и шаблон', replace ? 'При чтении total формула выполняется снова. Шаблон при чтении получает 30.' : 'computed возвращает кеш 20. Глубокие поля объекта сигнал самостоятельно не отслеживает.', { 'order': [`ссылка #${replace ? '2' : '1'} · price 15 · qty 2`], 'total': [replace ? 'новый кеш 30' : 'старый кеш 20'], 'Шаблон total()': [replace ? '30' : '20'] }, [`Всего: ${replace ? 30 : 20}`])
      ],
      conclusion: 'Используется стандартное сравнение Object.is. Модель показывает чтение computed, а не точный планировщик change detection. Если шаблон напрямую читает поля объекта, отдельная проверка шаблона может увидеть их; это не означает, что computed был уведомлён.'
    };
  }
  if (id === 'di') {
    const local = variant === 'local';
    return {
      code: `@Injectable({ providedIn: 'root' })\nclass DraftStore { text = signal(''); }\n\n@Component({\n  selector: 'draft-card',${local ? '\n  providers: [DraftStore],' : '\n  // локального provider нет'}\n  template: '...'\n})\nclass DraftCard { store = inject(DraftStore); }\n// <draft-card /> A\n// <draft-card /> B`,
      question: 'Карточки A и B получат один и тот же DraftStore?',
      answers: ['Да, A и B разделяют экземпляр', 'Нет, у каждой карточки свой экземпляр', 'inject всегда создаёт новый экземпляр при вызове'], correct: local ? 1 : 0,
      frames: [
        frame('Дерево инжекторов', 'Root знает рецепт создания DraftStore. Экземпляр ещё не запрошен.', { 'Root': ['provider DraftStore'], 'Карточка A': [local ? 'локальный provider' : 'нет provider'], 'Карточка B': [local ? 'локальный provider' : 'нет provider'] }, []),
        frame('A вызывает inject', local ? 'Поиск находит ближайший provider в A.' : 'Поиск поднимается от A к root.', { 'Путь A': [local ? 'A → найдено' : 'A → root → найдено'], 'Владелец S1': [local ? 'A' : 'root'], 'Кеш': ['S1 создан'] }, ['A → S1']),
        frame('B вызывает inject', local ? 'В B другой локальный provider: он создаёт S2.' : 'В root уже есть S1. B получает тот же объект.', { 'Путь B': [local ? 'B → найдено' : 'B → root → найдено'], 'Владелец': local ? ['A: S1', 'B: S2'] : ['root: S1'], 'Состояние': [local ? 'изолировано' : 'общее'] }, ['A → S1', `B → ${local ? 'S2' : 'S1'}`]),
        frame('Повторный inject в A', 'В пределах того же provider повторный запрос возвращает сохранённый экземпляр.', { 'Root': [local ? 'root-экземпляр не нужен' : 'S1'], 'Карточка A': ['S1'], 'Карточка B': [local ? 'S2' : 'S1'] }, ['A → S1', `B → ${local ? 'S2' : 'S1'}`])
      ],
      conclusion: 'Область provider определяет совместное состояние. Здесь опущены модификаторы self/skipSelf/host и другие injector-границы. Жизненный цикл локального сервиса связан с его компонентом.'
    };
  }
  const blur = variant === 'blur';
  return blur ? {
    code: `const title = new FormControl('', {\n  nonNullable: true,\n  validators: [Validators.required],\n  updateOn: 'blur'\n});\n// input связан через [formControl]="title"\n// пользователь вводит "Bug", затем уходит из поля`,
    question: 'Что происходит до blur после ввода «Bug»?',
    answers: ['В input видно Bug, модель ещё содержит пустую строку', 'value уже Bug и status сразу VALID', 'updateOn блокирует ввод текста'], correct: 0,
    frames: [
      frame('Начальная модель', 'required видит пустую строку.', { 'input': ['""'], 'control.value': ['""'], 'errors': ['required: true'], 'status': ['INVALID'], 'touched': ['false'] }, ['value="" · INVALID']),
      frame('Ввод текста', 'ControlValueAccessor получил ввод, но updateOn: blur откладывает перенос в модель.', { 'input': ['Bug'], 'control.value': ['""'], 'errors': ['required: true'], 'status': ['INVALID'], 'touched': ['false'] }, ['value="" · INVALID']),
      frame('Поле теряет фокус', 'Событие blur передаёт ожидающее значение и запускает валидацию.', { 'input': ['Bug'], 'control.value': ['Bug'], 'errors': ['null'], 'status': ['VALID'], 'touched': ['true'] }, ['value="Bug" · VALID']),
      frame('Чтение результата', 'После blur модель содержит Bug. Программный setValue не ждёт blur; в сценарии показан пользовательский ввод.', { 'value': ['Bug'], 'errors': ['null'], 'status': ['VALID'], 'dirty / touched': ['true / true'] }, ['value="Bug" · VALID'])
    ], conclusion: 'Модель относится к полю, связанному с Angular Forms через control value accessor. Изменение updateOn влияет на пользовательский ввод. Асинхронные валидаторы и PENDING здесь не моделируются.'
  } : {
    code: `const form = new FormGroup({\n  title: new FormControl('', { nonNullable: true,\n    validators: [Validators.required] }),\n  priority: new FormControl('HIGH', { nonNullable: true })\n});\nform.controls.title.setValue('Bug');\nform.controls.priority.disable();\nconsole.log(form.value);\nconsole.log(form.getRawValue());`,
    question: 'Что попадёт в form.value после disable у priority?',
    answers: ['Только title; priority останется в getRawValue()', 'Оба поля: отключение влияет только на вид', 'Пустой объект: отключается вся форма'], correct: 0,
    frames: [
      frame('Пустое обязательное поле', 'В enabled-группе invalid control делает форму INVALID.', { 'title': ['value ""', 'errors required'], 'priority': ['HIGH · VALID'], 'form.value': ['{ title: "", priority: "HIGH" }'], 'form.status': ['INVALID'] }, ['INVALID']),
      frame('Ввод допустимого значения', 'setValue запускает синхронную валидацию. Ошибка title исчезает.', { 'title': ['Bug · errors null'], 'priority': ['HIGH · VALID'], 'form.value': ['{ title: "Bug", priority: "HIGH" }'], 'form.status': ['VALID'] }, ['VALID']),
      frame('Отключение priority', 'Отключённый control исключается из агрегированного value enabled-группы.', { 'title': ['Bug · VALID'], 'priority': ['HIGH · DISABLED'], 'form.value': ['{ title: "Bug" }'], 'form.status': ['VALID'] }, ['{ title: "Bug" }']),
      frame('Сравнение payload', 'getRawValue() включает отключённый priority. Выбирай payload по контракту API, а не по виду поля.', { 'form.value': ['{ title: "Bug" }'], 'form.getRawValue()': ['{ title: "Bug", priority: "HIGH" }'], 'form.status': ['VALID'] }, ['value: title', 'raw: title + priority'])
    ], conclusion: 'В этом сценарии отключён отдельный control, а группа включена. У полностью disabled FormGroup поведение value отличается. Отключённое поле не является ограничением доступа на сервере.'
  };
}
