# Исполняемые примеры недель 3–6

Это нейтральные разобранные демонстрации из теории. Они не заменяют вашу работу в `practice/issue-tracker` и не засчитывают упражнения.

Все команды выполняются из `C:\ProjectsDirectory\Angular` после общей установки зависимостей. Компоненты Angular нельзя запускать командой `node component.ts`: им нужен Angular compiler и браузер.

## Компонентные примеры

```powershell
npm.cmd run practice:labs
```

Откройте `http://127.0.0.1:4304`. Слева доступны самостоятельные страницы. Java API им не нужен: библиотека и формы используют локальные данные/имитацию задержки.

| Урок | Полный исходник от practice/angular-labs/ | Страница и наблюдение |
|---|---|---|
| w3-01 | src/demos/w3-01.ts | /w3-01 — выберите «Сети», появится b2 |
| w3-02 | src/demos/w3-02.ts | /w3-02 — дата 20.10.2026, выбор b7 через output |
| w3-03 | src/demos/w3-03.ts | /w3-03 — фильтр непрочитанных, после чтения пустой список и нулевой счётчик |
| w3-04 | src/demos/w3-04.ts и src/app.ts, ClockHost | /w3-04 — счётчик; скрытие уничтожает таймер |
| w3-05 | src/demos/library-routes.ts, src/demos/book-page.ts | /books — ссылка на /books/b9; прямое открытие /books/b10 показывает b10 |
| w4-03 | src/demos/w4-03.ts | /w4-03 — кнопки показывают loading → empty/error |
| w5-01 | src/demos/w5-01.ts | /w5-01 — имя и город, submit и reset |
| w5-03 | src/demos/w5-03.ts | /w5-03 — «ошибка» вызывает отказ без потери ввода; другое имя даёт reader-17 |
| w6-01 | src/demos/w6-01.ts и src/app.ts, InputStylesDemo | /w6-01 — оба варианта input/output дают b7 |

Меню, подключение компонентов и wrappers находятся в `src/app.ts`, bootstrap — в `src/main.ts`. Для вариации меняйте указанный demo-файл и смотрите обновление браузера. Удалять и вновь подключать код вручную не нужно.

## Чистые TypeScript/RxJS-примеры

Node.js версии из корневой инструкции умеет удалять типы TypeScript при запуске. Эти файлы не содержат Angular decorators. Файлы с FormControl явно импортируют Angular compiler для библиотечной инициализации; они не создают браузерный компонент.

```powershell
node practice/angular-labs/scripts/w4-04.ts
```

| Урок | Команда после node | Ожидание |
|---|---|---|
| w3-workshop | practice/angular-labs/scripts/w3-workshop.ts | 1 0, затем false |
| w4-01 | practice/angular-labs/scripts/w4-01.ts | 200 и JSON, затем true 0 2 total; нужен запущенный Java API |
| w4-02 | practice/angular-labs/scripts/w4-02.ts | два «Запуск источника», между ними A 1 и B 1 |
| w4-04 | practice/angular-labs/scripts/w4-04.ts | только результат для «сеть»; завершение примерно за 500 мс |
| w4-05 | practice/angular-labs/scripts/w4-05.ts | 2 0 0 0 |
| w4-workshop | practice/angular-labs/scripts/w4-workshop.ts | объяснения 401/403/404/0/500 |
| w5-02 | practice/angular-labs/scripts/w5-02.ts | true false, true, true |
| w5-04 | practice/angular-labs/scripts/w5-04.ts | ошибка nickname и безопасная общая ошибка |
| w5-05 | practice/angular-labs/scripts/w5-05.ts | pristine true, заполненная форма, patch только с title |
| w5-workshop | practice/angular-labs/scripts/w5-workshop.ts | JSON только с category |
| w6-02 | practice/angular-labs/scripts/w6-02.ts | намеренно сохранённый page: 3; файл содержит диагностический дефект |
| w6-04 | practice/angular-labs/scripts/w6-04.ts | сети 0 |
| w6-05 | practice/angular-labs/scripts/w6-05.ts | нет assertion errors; проверены три входа |
| w6-workshop | practice/angular-labs/scripts/w6-workshop.ts | очищенные q/category, page 0, size 10 |

Для w4-01 отдельно запустите `npm.cmd run practice:api`. Скрипт читает `http://127.0.0.1:8080` напрямую; браузерный fetch из урока использует относительный `/api` страницы трекера на 4302 и dev proxy. Поэтому Node-скрипт показывает контракт ответа, но не проверяет CORS браузера.

## Примеры тестов

```powershell
npm.cmd run practice:labs:test
```

В `src/demos/http.spec.ts` сохранён тест из w4-05, в `filter.spec.ts` — два теста w6-03. `book-api.ts` и `book-api.spec.ts` показывают HttpClient-сервис w4-02 с подменённым транспортом: endpoint `/api/books` в Java не нужен. Ожидаются 4 прошедшие проверки. Это проверки разобранных примеров; они не проверяют ваш трекер.

Inline-фрагмент HTML из w5-02 и миниатюра NgModule из w6-01 предназначены для чтения и объяснения. HTML нужно помещать в Angular-компонент с соответствующими imports; NgModule-миниатюра не объявляет вымышленные классы. Их не запускают как отдельные файлы.
