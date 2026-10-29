# Middle Fullstack Track Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans. Preserve shared-file ownership and check outcomes before marking steps complete.

**Goal:** Добавить 24 содержательных занятия, 12 проверяемых упражнений и 12 ручных практикумов для Java-разработчика с пробелами во frontend.

**Architecture:** Продолжение текущего schemaVersion=1 каталога и существующего runner. Markdown-уроки, изолированные workspace упражнений, отдельные author-решения; интерфейс получает размеры из контента.

**Tech Stack:** Существующие Angular 22.2.3, TypeScript 6.0.3, RxJS 7.8.2, Node 22, JDK 21, Playwright.

**Spec:** ../specs/2026-10-28-middle-track-design.md

## Global Constraints

- Сохранять исходные ID, localStorage и решения ученика.
- 60 уроков / 180 часов, недели 7–12: 180+180+180+360 минут.
- Новые пакеты не устанавливать; PL использовать как предметный контекст без копирования исходников.
- Разделять автоматическую проверку механизма и ручную оценку полной функции.

## Review Focus

- Старый экспорт прогресса должен приниматься и сохранять отметки.
- Учебная симуляция не доказывает backend-авторизацию или реальную отмену записи.
- Задачи должны запускаться независимо от незавершённых решений других занятий.
- Неожиданные ответы, устаревшие операции и повторные команды проверяются явно.
- Новые недели не должны оставлять на экране старые фиксированные 6/36/90 и некорректные номера 010.

## Tasks

- [x] 1. Создать content/lessons/w7-*…w9-* и шесть manual workspace; конкретные контракты согласовать с grader manifest.
- [x] 2. Создать content/lessons/w10-*…w12-* и шесть manual workspace; итоговая рубрика с независимой задачей, инцидентом, интеграцией и защитой.
- [x] 3. Создать tools/middle-targets.mjs, practice/middle/middle-01…12, author/solutions/middle-01…12, content/training/middle.json и tools/middle-practice.test.mjs. Проверить starter-fail, author-pass, mutants, lifecycle.
- [x] 4. Интегрировать 24 LessonMeta и 24 ExerciseMeta в curriculum; добавить targetKeys и training manifest; изменить фиксированные размеры интерфейса и сделать видимым второй этап.
- [x] 5. Проверить новый контент и прежний прогресс. Добавить целевые E2E для нового этапа, ручных задач и реального отчёта. Выполнить сборку и необходимые тесты.
- [x] 6. Независимое ревью содержания и graders, исправления, README/setup/status и точный отчёт об объёме и ограничениях.
