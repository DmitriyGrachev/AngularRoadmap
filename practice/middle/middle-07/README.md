# middle-07 — Собрать вложенную typed form с общими ограничениями

## Механизм

Типы структуры не заменяют runtime validators. Ограничение интервала относится к группе, уникальность кодов — к массиву, а required — к полю. Такой уровень ошибки позволяет шаблону показать её у правильного элемента.

### Контракт API

В solution.ts экспортируйте `EditorInput={title:string,schedule:{start:number,end:number},rows:Array<{id:string,code:string,quantity:number}>}` и `createEditor(input)`. Возвращается настоящий Angular FormGroup: title — nonNullable `FormControl<string>`, schedule — FormGroup с nonNullable числовыми start/end, rows — FormArray групп с nonNullable id:string, code:string, quantity:number. title имеет Validators.required и minLength(3), code — required, quantity — required и min(1); стандартная семантика Angular, дополнительная trim-валидация этих полей не требуется. schedule имеет ошибку `{order:true}` тогда и только тогда, когда end<=start. rows имеет `{duplicateCode:true}` при повторе непустых кодов после trim и приведения к нижнему регистру. Ошибки пересчитываются при изменении контролов и добавлении/удалении строк, исходный input не мутирует. Входная структура типизирована, проверка unknown здесь не требуется. Strict TypeScript должен отвергать null для каждого из шести контролов и значения другого типа (числа для строковых полей, строки для числовых); any не должен стирать типы. После редактирования form.reset() без аргумента восстанавливает исходные nonNullable значения всех существующих контролов, а не null.

### Пример и новая проверка

start=2,end=2 → schedule.order. API и " api " → rows.duplicateCode. Новый пример: удалить строку, создающую дубликат; ошибка массива исчезает.

### Работа

Из корня проекта выполните `npm.cmd run learn -- check middle-07`. Редактируйте только `practice/middle/middle-07/solution.ts`; starter остаётся исходной точкой. Сначала запишите прогноз или собственную попытку. JSON-отчёт появится в practice/reports; импорт отчёта не означает самостоятельное освоение урока.

## Критерии

- Настоящие вложенные Angular controls сохраняют строгие типы и исходные значения.
- Полевая валидация отделена от ошибок группы и массива.
- Cross-field ошибки появляются и исчезают при редактировании и удалении строк.

## Подсказки по порядку

1. Создайте typed controls с nonNullable:true, не общий FormGroup<any>.
2. Validator может читать уже созданную schedule и возвращать null или объект ошибки.
3. Коды нормализуйте только для сравнения; не меняйте пользовательский ввод.

## После своей попытки

Тесты проверяют runtime и компиляцию strict fixture. Набор числовых start/end выбран для изоляции cross-field механизма; timezone и Date DTO относятся к отдельной границе.

Авторский ответ расположен в `author/solutions/middle-07/solution.ts`. Сравнивайте его после собственной попытки; перенос решения не превращает guided-практику в independent.

