# Practice Expansion Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans for the assigned subsystem. Existing user approval covers implementation.

**Goal:** Deliver the accepted practice package without altering existing learner work.
**Architecture:** Reuse the Angular learning site, report runner and curriculum. New catalogue files drive a training hub; separate validated local learning journal avoids changing v1 course backup semantics.
**Tech Stack:** Angular 22, TypeScript 6, RxJS 7, Node 22, Playwright; no added dependencies.
**Spec:** `docs/superpowers/specs/2026-10-20-practice-expansion.md`

## Constraints

- 16 checked exercises, 12 debugging cases, 6 tickets, 8 reviews, 5 visual explanations.
- Existing 36 lessons and all learner files remain intact.
- Every material has a lesson, duration, concrete acceptance criteria, and follow-up practice.
- Root integrates catalogue/exercise registration after workers finish.
- Worker ownership is disjoint; shared types are the contract.

## Review focus

- Old backups still load; malformed journal imports do not overwrite data.
- A passing run does not mark mastery; later failures remain visible.
- Student starter cannot pass through empty checks or hardcoded examples.
- A new route resets prediction/reveal state and preserves recorded attempts.
- Browser navigation, mobile width, missing content and storage failure remain usable.

## Tasks

- [x] 1. Checked practice: create `tools/check-targets.mjs`, 16 separate starters and author solutions, `content/training/checks.json`, behavioral regression tests. Extend runner for real TypeScript/Angular modules and isolated author verification. Preserve pilot behavior.
- [x] 2. Debugging: create `tools/bug-targets.mjs`, 12 isolated broken modules and author fixes, bug manifest, negative/positive tests. Include reproduction, three hints, root-cause explanation and regression task.
- [x] 3. Workplace practice: create a runnable existing Angular application in `practice/workplace`, six detailed tickets and eight balanced code reviews. Verify initial app and preserve API/student projects.
- [x] 4. Website: implement catalogue validation, hub/detail routes, staged attempts/hints/review answer, lesson links, optional/replacement labels and accessible responsive layout.
- [x] 5. Journal: implement append-only validated attempts and mistake entries, 2/7-day recalls, deduplicated export/import, conflict rejection, storage failure recovery; test boundary cases.
- [x] 6. Visual explanations: implement five parameterized step models with prediction, changing state, reset and official references; test model invariants and browser interactions.
- [x] 7. Integrate manifests with curriculum/runner; validate all paths, semantic checks and author solutions. Run existing tests and builds, then browser coverage for new flows.
- [x] 8. Independent review, repair actionable findings, publish updated README/status and open the local site.
