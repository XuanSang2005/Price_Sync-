# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working mode — mentor, not author (IMPORTANT)

The user is building this project themselves to learn Spring Boot. Do NOT write code or create/edit source files for them, even if it would be faster. Instead:

- Guide one step at a time: explain what to do next and *why*, then stop and let the user type the code themselves.
- Wait for the user to report a step is done before giving the next step.
- When asked to review, point out problems and explain the reasoning, but let the user make the fix.
- Only touch a file directly when the user explicitly asks for that specific file.
- The user communicates in Vietnamese; respond in Vietnamese.

## Commands

Maven wrapper, requires Java 17:

- `./mvnw spring-boot:run` — run the application
- `./mvnw test` — run all tests
- `./mvnw test -Dtest=PriceSyncApplicationTests` — run one test class (`-Dtest=Class#method` for one method)
- `./mvnw clean package` — build the executable jar

## What this project is

An HQ→POS price-synchronization middleware for Oracle Retail Xstore, built to a Technical Design Document. Each night HQ POSTs a JSON price batch to `POST /api/v1/price-events`; the system authenticates it (API key + HMAC-SHA256 + IP allowlist), validates and maps the records, builds an Oracle DataLoader MNT file, and writes it to the Xcenter inbound folder. Everything downstream of that folder (Xstore distribution, POS apply) is out of scope.

**Design docs — consult before answering any design question:**

- `docs/tdd-digest.md` — condensed TDD: requirements (FR/NFR), all 12 ADRs, batch lifecycle, components, full API contract (headers, envelope/record fields, error catalog), persistence schema invariants, test plan. Read this first; it answers most questions.
- `docs/tdd_v2_8.pdf` — the full original TDD (58 pages) for exact tables, figures, and sequence diagrams when the digest is not enough.

Implementation must follow the TDD; if the user asks for something that contradicts it, point out the conflict instead of silently deviating.

## Target architecture (from the TDD)

The repo is currently a fresh Spring Initializr skeleton (only `spring-boot-starter-web`); the design below is what is being built incrementally. Source package root is `price_sync`.

- **Modular monolith** — one Spring Boot app hosting the intake API, a background processing worker, and an ops console; deployed as two active/active instances. PostgreSQL holds all durable state (instances are stateless).
- **Async pipeline over a DB-backed queue** — intake persists the batch as `RECEIVED` and returns `202`; a scheduled Work Dispatcher claims work with `SELECT ... FOR UPDATE SKIP LOCKED` in a short transaction (ownership lease + reaper sweep recovers crashed owners). No message broker.
- **Batch lifecycle** — `RECEIVED → PROCESSING → WRITING → WRITTEN | PARTIAL`; a failed write parks at `PENDING_WRITE` and is retried with exponential backoff (6 attempts, 30s doubling, cap 10min), then terminal `FAILED` + alert; operator re-drive via `POST /api/v1/events/{id}/retry`.
- **Two-level idempotency** — DB unique constraints on `(batch_id, version)` (re-sent batch → `409` no-op) and `(change_id, version)` (latest record version supersedes).
- **Partial handling** — invalid/unmappable records are set aside with a reason and the rest still produce a file (`PARTIAL`); abort if more than 20% are set aside.
- **Pluggable output seam** — destination-specific work sits behind two interfaces: `PayloadBuilder` (format) and `OutputWriter` (transport). The Xstore pair is `XstoreMntBuilder` (FHEAD/FDETL/FDELE/FTAIL, streamed to a temp file for bounded memory) + `XcenterWriter` (writes the complete file in place under its final name — no temp+rename).
- **Configuration in the DB** — mapping rules, value maps, defaults, and connection settings are database rows edited through the console (no redeploy); secrets never stored in plaintext, only `authRef` references resolved from an external secret store.

Planned stack additions as the build progresses: Spring Data JPA + PostgreSQL, Flyway migrations, Spring Security filter chain (API key/HMAC/IP allowlist), Spring Scheduling + Spring Retry, Actuator/Micrometer; later a React SPA console bundled into the same deployable.
