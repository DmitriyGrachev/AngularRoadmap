# middle-10 — Защитить optimistic state от устаревшего ответа

## Механизм

Оптимистическое значение и последнее подтверждённое значение имеют разные роли. Ответ старой операции не должен перетирать новое редактирование. Версия записи — контракт API, номер запроса — локальная идентичность клиентской операции.

### Контракт API

`createOptimistic(initial)` принимает `{id:string,title:string,version:number}` с корректной неотрицательной safe integer version. Возвращает настоящие Angular Signals value/pending и методы begin(title), resolve(token,server), reject(token). Изначально value — копия initial, pending=false. begin создаёт новый уникальный возрастающий requestId, возвращает `{requestId,expectedVersion,title}`, где expectedVersion — последняя подтверждённая version, устанавливает optimistic title на копии confirmed и pending=true. Последний begin заменяет активную операцию. resolve принимает только активный requestId, совпадающий id записи и safe integer server.version строго больше подтверждённой. Иначе ничего не меняется, даже pending. Корректный server имеет ту же форму DTO и копируется в confirmed/value, pending=false, активная операция снимается. reject только активного токена возвращает последнюю confirmed, снимает pending/активность. Любые старые и уже завершённые токены игнорируются. Изменение initial или server после вызова не меняет store. Строковый title серверного DTO считается уже валидированным.

### Пример и новая проверка

begin(A),begin(B),resolve(A) оставляет optimistic B. resolve(B) сохраняет серверную версию; поздний reject(A) её не меняет. Новый пример: после успешной version=4 begin(C) возвращает expectedVersion=4; reject(C) возвращает подтверждённое значение версии 4.

### Работа

Из корня проекта выполните `npm.cmd run learn -- check middle-10`. Редактируйте только `practice/middle/middle-10/solution.mjs`; starter остаётся исходной точкой. Сначала запишите прогноз или собственную попытку. JSON-отчёт появится в practice/reports; импорт отчёта не означает самостоятельное освоение урока.

## Критерии

- Оптимистический показ, подтверждение и rollback имеют явные состояния.
- Старый токен, чужой ID и непродвинувшаяся версия не перезаписывают value.
- Снимки входа и ответа не делят изменяемый объект с store.

## Подсказки по порядку

1. Храните confirmed отдельно от value signal.
2. В начале resolve/reject проверяйте активный requestId.
3. После успешного resolve/reject сбросьте активность, чтобы повторный callback не сработал.

## После своей попытки

Это клиентская модель конфликтов, а не транзакция. Старый ответ намеренно игнорируется даже с большой server.version; reconciliation с реальным backend выполняется отдельным reload/conflict workflow.

Авторский ответ расположен в `author/solutions/middle-10/solution.mjs`. Сравнивайте его после собственной попытки; перенос решения не превращает guided-практику в independent.

