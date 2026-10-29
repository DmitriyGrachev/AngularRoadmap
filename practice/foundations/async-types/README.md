# Неделя 2: асинхронность и TypeScript

Все команды выполняются в корне репозитория. Нужна среда из корневого README; подготовленная Node 22.23 поддерживает используемые в примерах аннотации TypeScript. Запуск `.ts` в Node не выполняет проверку типов.

```powershell
node practice/foundations/async-types/examples/modules/main.mjs
node practice/foundations/async-types/examples/async.mjs
node practice/foundations/async-types/examples/types.ts
node practice/foundations/async-types/examples/validation.ts
node --test practice/foundations/async-types/examples/filter.test.mjs
npx.cmd tsc --noEmit -p practice/foundations/async-types/tsconfig.json
```

`examples` содержит завершённые демонстрации, а `w2-...-ex1` — самостоятельные задания. В них есть TODO и намеренные дефекты; общий сайт должен работать независимо от их решения. Проверка типов может проходить у незавершённой функции, которая бросает Error: это ещё не выполнение требований задания.

Все упражнения этой недели имеют ручную рубрику в уроках. Тесты Node проверяют написанное вами поведение, но не создают автоматический отчёт курса. `checks.mjs` практикума специально завершается сообщением о ненаписанных проверках, пока вы не добавите их. Не выдавайте запуск без проверок за успех.

Для браузерной демонстрации fetch запустите `npm.cmd run practice:web` и откройте страницу на `http://127.0.0.1:4301`. Данные лежат по адресу `/foundations/async-types/examples/issues.json`.
