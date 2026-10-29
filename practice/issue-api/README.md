# Java API для учебного трекера

Нужны JDK 21 и Node.js из корневой инструкции. Maven не требуется. Из корня курса:

```powershell
npm.cmd run practice:api
```

Сервис слушает `http://127.0.0.1:8080`; остановка — Ctrl+C. При первом запуске launcher загружает Gson **2.13.2** из Maven Central в `.cache/issue-api`, сверяя закреплённый SHA-256 `dd0ce1b55a3ed2080cb70f9c655850cda86c206862310009dcb5e5c95265a5e0`. Повторный запуск использует проверенный кэш. Исходник исполняет source launcher JDK 21.

В памяти 32 заявки; создание и изменение сохраняются до остановки процесса. Перезапуск восстанавливает исходные данные. Это подготовленный учебный API без базы данных и авторизации.

| Запрос | Результат |
|---|---|
| `GET /api/issues?q=&status=&priority=&page=0&size=10` | `{ items, total, page, size }`; пустые фильтры отключены, поиск без учёта регистра по названию/описанию |
| `GET /api/issues/ISS-001` | Одна заявка; неизвестный ID — 404 |
| `POST /api/issues` | `{ title, description, priority }`; возвращает 201 и новую заявку со статусом OPEN |
| `PATCH /api/issues/:id` | Частичные `{ title, status, priority }`; возвращает обновлённую заявку |

Статусы: `OPEN`, `IN_PROGRESS`, `DONE`. Приоритеты: `LOW`, `MEDIUM`, `HIGH`. Название обрезается по краям, затем проверяется длина 3–120; описание — до 2000 символов. Сервер создаёт строковый ID и ISO-дату. Ошибка 400: `{ message, fieldErrors: { title: ["сообщение"] } }`. Нумерация страниц с 0, `size` от 1 до 100. Angular dev server проксирует `/api` на 8080, поэтому CORS не требуется.

Воспроизводимые сценарии добавляются в query string запроса:

- `scenario=slow` — задержка 1500 мс; после смены query без этого значения новый ответ придёт раньше.
- `scenario=error` — HTTP 500.
- `scenario=empty` — пустой список.
- `scenario=validation` — HTTP 400 с ошибкой поля title на POST/PATCH.
- `scenario=unauthorized` / `scenario=forbidden` — учебные 401/403, без механизма авторизации.

Независимая проверка с запуском Java на порту 8081: `node --test tools/java-api.test.mjs`. Для другого порта задайте `$env:PORT = '8082'` перед запуском launcher.
