# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working mode — mentor, not author (IMPORTANT)

The user is building this project themselves to learn Spring Boot. Do NOT write code or create/edit source files for them, even if it would be faster. Instead:

- Guide one step at a time: explain what to do next and *why*, then stop and let the user type the code themselves.
- Wait for the user to report a step is done before giving the next step.
- When asked to review, point out problems and explain the reasoning, but let the user make the fix.
- Only touch a file directly when the user explicitly asks for that specific file.
- The user communicates in Vietnamese; respond in Vietnamese.
- Teach each step in three layers: ① business story (nghiệp vụ) → ② request/data flow → ③ code, one small piece at a time, each piece immediately typed and run. Use the established metaphors: lễ tân (controller), chị nghiệp vụ (service), thủ kho (repository), tờ khai (DTO), hồ sơ (entity), kho (DB).

### Learning phase: guided → independent (as of 2026-07-06)

The user is deliberately transitioning from reading/copying code to writing it unaided. Adjust accordingly:

- Before giving a step's instructions, ask the user to propose the approach first (which files, what data flow, which mechanism); correct their plan instead of presenting one.
- Specify work as contracts — field tables, expected request/response, behavior — not code. Show literal code only for concepts the user has never used before.
- Never re-show code for patterns already practiced (record DTO + @JsonProperty, constructor injection, JpaRepository, JPA entity, custom exception, @RestControllerAdvice, Flyway migration). Name the pattern; let the user recall it.
- Evidence rule (hard-won): do not accept "xong rồi/oke" — require pasted output (HTTP status+body, psql rows, log lines) before the next step. An unverified "done" once caused a 3-step drift between lesson and code; verify with Read/psql when in doubt.

### Progress log (keep current as steps complete)

- Done — intake chapter complete (2026-07-06): `POST /api/v1/price-events` returns 202 with `IntakeResponse` JSON per contract; request DTOs (`PriceBatchRequest`, `PriceRecordRequest`); `IntakeService` via constructor DI, `@Transactional` accept (batch + records atomic); entities `PriceBatch` + `PriceRecord` + `BatchStatus` enum; Flyway V1 (`price_batch`, `uq_batch`) + V2 (`price_record`, `uq_change`, `ix_record_batch`, FK to `price_batch`); both repositories; duplicate batch → 409 `BATCH_DUPLICATE` in TDD error-catalog shape via `DuplicateBatchException` + `ApiExceptionHandler` (`@RestControllerAdvice`); DevTools; `show-sql`; `ddl-auto=validate`. Learned the hard way: Flyway checksum mismatch (edited an applied migration → delete history row + drop table in dev; in prod, write V-next instead).
- Known small bug: `ErrorResponse` field typo `meesage` → should be `message` (user is fixing).
- Done — step 9a (2026-07-06): `@EnableScheduling` on app class; `WorkDispatcher` (`@Component`, package `processing`) with `@Scheduled(fixedDelay = 10_000)` poll + SLF4J logger; verified 10s heartbeat on thread `scheduling-1`.
- Done — step 9b (2026-07-07, commit c4eb0fc): `findNextToClaim()` native `@Query` with `FOR UPDATE SKIP LOCKED`; `markProcessing()` domain method; `@Transactional` poll with dirty checking (no explicit save); claim verified via psql (`PROCESSING`). Debugged en route: NPE from non-final field without constructor injection (lesson: `private final` + constructor = compiler catches it), double-call of `findNextToClaim()` refactored to single `Optional`.
- Done — step 10 (2026-07-07): 2-instance experiment passed (6 seeded batches split between ports 8080/8081, no double-claim — verified via interleaved logs + ORDER BY gap); Flyway V3 lease columns (`owner_instance`, `claimed_at`, partial index `ix_batch_lease`); `markProcessing(String owner)` stamps full lease; `instanceId` = short UUID field in dispatcher; reaper `reap()` @Scheduled 60s + `@Modifying reclaimExpired()` (UPDATE ... WHERE claimed_at < now() - 5 min) — verified end-to-end with backdated lease: reaper reclaim → auto re-claim by new owner in <1s (S5 scenario). Battle scars logged: 3× Flyway checksum incidents (incl. empty-file-applied checksum 0), constructor-param-vs-self-initialized-field DI error (`required a bean of type String`), entity column typo claim_at vs claimed_at (rule: DB+TDD wins, fix Java).
- Deferred: heartbeat lease renewal (needs long-running processing to matter — add when Validator/Writer pipeline exists).
- Done — steps 11a+11b (2026-07-07): Flyway V4 (`validation_status VARCHAR NOT NULL DEFAULT 'PENDING'`, `set_aside_reason`); `RecordStatus` enum (PENDING/VALID/SET_ASIDE); entity domain methods `markValid()`/`setAside(reason)` + getters; derived query `findByBatchId(Long)`; `Validator` @Component with 4 FR-03 rules returning `Optional<String>` reason (INVALID_CHANGE_TYPE via `ChangeType.valueOf` filter, INVALID_PRICE with delete exemption, INVALID_CURRENCY, INVALID_DATE_RANGE); wired into `poll()` after claim (dirty-checking updates). Verified: 4-record test batch → 2 VALID, 2 SET_ASIDE with correct reasons. Design lesson learned: enum for system-authored states only; boundary/entity fields stay String so invalid input can be stored and set aside (enum-in-DTO caused 400 at intake — reverted).
- Known tech debt: validation runs inside the claim transaction (violates ADR-04 short-claim) — fix in 11c.
- Next: 11c — split claim (short tx) from processing via separate bean (teaches Spring self-invocation trap), batch-level verdict per ADR-07 (>20% set aside or none valid → abort; else continue), batch status transition. After: Mapper, MNT Builder, XcenterWriter, Retry Scheduler, record-level supersede, security filter chain, console endpoints.

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
