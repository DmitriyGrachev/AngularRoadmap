# middle-12 — Вычислить окно большой таблицы

## Механизм

Виртуализация оставляет DOM пропорциональным размеру окна, а не всего набора. Диапазон хранится как [start,end), offset задаёт смещение первого отрисованного элемента. Overscan уменьшает заметность пересоздания строк, но не заменяет профилирование.

### Контракт API

`virtualWindow({count,rowHeight,scrollTop,viewportHeight,overscan})` → `{start,end,offset,totalHeight}`. count и overscan — safe integers >=0; rowHeight — конечное число >0; scrollTop/viewportHeight — конечные числа >=0. При неправильном поле бросайте RangeError. totalHeight=count*rowHeight; в допустимых сценариях произведение конечно. Для count=0 или viewportHeight=0 результат start=end=offset=0, totalHeight сохраняется. Иначе сначала ограничьте scrollTop максимумом max(0,totalHeight-viewportHeight). Первый видимый индекс=floor(top/rowHeight), исключительная правая граница=ceil((top+viewportHeight)/rowHeight). Расширьте обе стороны на overscan, ограничьте start>=0 и end<=count. offset=start*rowHeight. Дробные rowHeight/scrollTop/viewportHeight допустимы; исходный объект не меняется. Предполагается одинаковая высота всех строк.

### Пример и новая проверка

count=100,rowHeight=20,top=45,viewport=50,overscan=1 → start=1,end=6,offset=20,totalHeight=2000. Новый пример: count=2 и viewport выше всего списка — показываются ровно две строки.

### Работа

Из корня проекта выполните `npm.cmd run learn -- check middle-12`. Редактируйте только `practice/middle/middle-12/solution.mjs`; starter остаётся исходной точкой. Сначала запишите прогноз или собственную попытку. JSON-отчёт появится в practice/reports; импорт отчёта не означает самостоятельное освоение урока.

## Критерии

- Частично видимые строки включаются, end остаётся исключительной границей.
- Overscan и scroll clamp не выводят диапазон за список.
- Пустое окно и неправильные размеры имеют определённый результат.

## Подсказки по порядку

1. Сначала проверьте поля и вычислите totalHeight.
2. Ограничьте scrollTop до расчёта индексов, особенно после уменьшения списка.
3. Используйте floor слева, ceil справа и clamp после overscan.

## После своей попытки

Тесты проверяют математику окна. Перенос в таблицу требует измерения времени кадра, focus/keyboard behavior и доступности; variable-height rows требуют другого алгоритма.

Авторский ответ расположен в `author/solutions/middle-12/solution.mjs`. Сравнивайте его после собственной попытки; перенос решения не превращает guided-практику в independent.

