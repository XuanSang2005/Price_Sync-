# TDD Digest — HQ→POS Price Synchronization

Condensed from the Technical Design Document v5.0 (BTM Global, 02/07/2026).
Full original: [docs/tdd_v2_8.pdf](tdd_v2_8.pdf). The URD remains the requirements baseline.
This digest is the working reference for implementation; when in doubt about an exact table/figure, open the PDF.

## 1. Scope and boundary

Middleware integration engine + monitoring console. Each night HQ delivers the day's price
changes as one **batch event** over a REST API. The system authenticates it, validates and maps
the records, builds an Oracle DataLoader maintenance (**MNT**) file, and writes it into the
**Xcenter inbound folder**. Everything downstream of that folder (Xstore distribution to stores,
POS apply, auto-revert) is out of scope. The system never authors prices.

Stack constraint: Java 17, Spring Boot 3.x, PostgreSQL 14+, on-premises co-located with Xcenter.

## 2. Functional requirements (digest)

| Group | Requirements |
|---|---|
| Intake | FR-01 receive JSON delta via API; FR-04 process by delta, not full load |
| Security | FR-02 API key + HMAC-SHA256 + IP allowlist |
| Validation | FR-03 validate before producing a file |
| Mapping | FR-05 map to scope and Xstore codes; flag unmappable records |
| File generation | FR-06 MNT with correct trailer; FR-07 carry effective dates; FR-08 default D+1 when absent; FR-09 write to Xcenter inbound folder; FR-10 daily flow, prices sent ~1 week ahead |
| Reliability | FR-11 track pipeline state; FR-12 retry-on-write-failure, no loss; FR-13 idempotency, latest version wins |
| Operations | FR-14 end-to-end audit log; FR-15 dashboard; FR-16 event history; FR-17/18 alert Ops via dashboard + push (email) |

## 3. Non-functional targets

- **NFR-01 Scale**: one nightly batch, up to 250 stores / 75 000+ items, within the cut-off window.
- **NFR-02 Security**: TLS 1.2+; API key + HMAC-SHA256 + IP allowlist; no plaintext secrets anywhere.
- **NFR-03 Integrity**: every produced file complete, trailer count correct; Xstore ingests only complete files.
- **NFR-04 Reliability**: bounded retries with backoff on write failure, then alert; 0 events lost across restarts.
- **NFR-05 Consistency**: file reflects exactly the validated records of the batch.
- **NFR-06 Availability**: two active/active instances; single-instance failure doesn't stop the nightly run.
- **NFR-07 Observability**: per-event pipeline status, structured JSON logs, dashboard, alerts.
- **NFR-08 Auditability**: events + logs queryable, retained ≥ 2 months.
- **NFR-09 Extensibility**: new stores/regions/mapping via configuration only, no core-code change.

### Default operational parameters (all configuration)

| Parameter | Default |
|---|---|
| Nightly cut-off | 05:00 local (batch generated ~22:00 ⇒ ~7h window) |
| Dispatcher / retry poll interval | 10 s |
| Lease timeout / heartbeat | 5 min, renewed every 1 min |
| Write retry | 6 attempts, exponential backoff 30 s doubling, cap 10 min (~30 min total) |
| Replay clock-skew window | ±5 min on `X-Timestamp` |
| Retention | ≥ 2 months (must exceed any plausible HQ re-send delay — purge also removes idempotency keys) |

## 4. Architecture

**Style**: modular monolith with an asynchronous, database-backed work queue. One Spring Boot
deployable (intake API + processing worker + console) run as **two active/active instances** on
separate hosts, behind one TLS reverse proxy, over one PostgreSQL. Instances are stateless — all
durable state in PostgreSQL. Xcenter inbound folder is a file share (SMB/CIFS or NFS) mounted at
the same path on both hosts. Secret store and SMTP relay are external. All hosts NTP-synchronised.

Console UI: React SPA (Vite) compiled to static assets, bundled into the same jar, served behind
the proxy. Console API: Spring MVC REST controllers in the same app.

### Architecture Decision Records (summary)

- **ADR-01** Modular monolith over microservices — one deployable, module boundaries by discipline.
- **ADR-02** Asynchronous processing — intake persists `RECEIVED`, returns `202`; worker does validate/map/build/write.
- **ADR-03** PostgreSQL table as work queue (poll + claim) — no broker; work and state share one transactional store.
- **ADR-04** Work-claiming with `SELECT ... FOR UPDATE SKIP LOCKED`. Claiming is a **short transaction**: flip to `PROCESSING`, stamp ownership lease (owner instance + `claimed_at` heartbeat), commit — lock never held across the network write. Pipeline steps commit their own status changes. A periodic **reaper** resets rows with expired leases back to `RECEIVED`.
- **ADR-05** Write the complete MNT **in place under its final name** (no temp+rename, no sentinel). Safe because Xstore's pickup contract doesn't ingest incomplete files (OI-2, confirmed). File assembled locally first (streamed to local temp file, bounded memory). If a deployment can't guarantee the pickup contract, temp-then-rename/sentinel can be reintroduced behind `OutputWriter`.
- **ADR-06** Two-level idempotency: unique `(batch_id, version)` — re-sent batch is a `409` no-op; unique `(change_id, version)` — the latest record version supersedes. DB unique constraints make concurrent duplicates fail safely.
- **ADR-07** Partial handling: set aside invalid/unmappable records with a reason, write the rest (`PARTIAL`). Configurable escalation: **abort if >20% set aside or no valid record remains**.
- **ADR-08** Configuration in the database, edited via console, audited; TTL cache, reloaded at the start of each batch (no mid-batch config change).
- **ADR-09** Pluggable output targets behind `PayloadBuilder` (format) + `OutputWriter` (transport), resolved from configuration. Current pair: `XstoreMntBuilder` + `XcenterWriter`. Adding a destination is additive — pipeline untouched.
- **ADR-10** PostgreSQL (not Oracle DB); relies only on portable SQL + `SKIP LOCKED` + `jsonb`.
- **ADR-11** No plaintext secrets: `ConnectionConfig.authRef` is a reference resolved from an external secret store at runtime; never in DB, logs, audit, or console.
- **ADR-12** TLS terminates at the reverse proxy; plain HTTP on the private segment; app-level auth (API key/HMAC/IP) still enforced at the app. Edge rate limit lives at the proxy.

## 5. Batch lifecycle

```
RECEIVED → PROCESSING → WRITING → WRITTEN   (terminal, all valid)
                              ↘ PARTIAL     (terminal, some set aside)
        WRITING --write fail--> PENDING_WRITE --retry--> WRITING
        PENDING_WRITE --retries exhausted--> FAILED (terminal; operator re-drive → PENDING_WRITE)
        PROCESSING/WRITING --lease expired (reaper)--> RECEIVED
```

## 6. Components (inside the one Spring Boot app)

**Intake**
- `IntakeController` — `POST /api/v1/price-events`; security filter chain (API key/HMAC/IP); light body validation; returns `202` + batch id. No mapping/writing.
- `IntakeService` — checks Idempotency Manager, persists raw payload (`jsonb`) + parsed `PriceBatch`/`PriceRecord` rows at `RECEIVED`, writes first audit entry.
- `IdempotencyManager` — enforces ADR-06 at both levels, backed by unique constraints.

**Processing**
- `WorkDispatcher` — scheduled poller (~10 s); claims `RECEIVED` via `SKIP LOCKED` (short txn + lease), then runs validate → map → build → write outside that txn, committing each status change.
- `Validator` — per-record rules (FR-03): required fields, `price > 0`, valid currency, `effective_start < effective_end`. "Known item/location" is checked against reference data held in configuration (refreshed daily from Xstore before the nightly batch); unknown code ⇒ **unmappable** (set aside), not a hard error.
- `Mapper/Transformer` — `PriceRecord` → `MntRow` via config rules: field map, value maps (`new`/`update`→FDETL, `delete`→FDELE), defaults (currency e.g. VND; `EFF_START_DATE` = D+1 when absent, D = batch business date from `generated_at` in the configured timezone). `LOC_TYPE` derived per record (S store / Z zone).
- `XstoreMntBuilder` (implements `PayloadBuilder`) — FHEAD + one FDETL/FDELE per record (fixed column order per Host Interface Guide; comma delimiter, RFC-4180 quoting, UTF-8 — configurable) + FTAIL whose count = total detail rows (FDETL + FDELE). Rows **streamed** to temp file (bounded memory).
- `XcenterWriter` (implements `OutputWriter`) — writes the complete file in place under `pricesync_<batch_id>_v<version>_<timestamp>.mnt` (unique per produced file, so a superseding v2 never collides). On failure ⇒ `PENDING_WRITE` + alert path.

**Supporting**
- `RetryScheduler` — polls `PENDING_WRITE` (~10 s, also `SKIP LOCKED`); backoff 30 s doubling cap 10 min, 6 attempts; exhaustion ⇒ `FAILED` + alert. No automatic retry after `FAILED` — operator re-drives via console.
- `ConfigService` — mapping rules, value maps, defaults, scope, output format, connections from DB; TTL cache + versioned entries, reloaded at batch start.
- Console API + React UI — dashboard, event list/detail (incl. set-aside reasons), logs, config CRUD. Operator auth; writes need administrator role. Monitoring only.
- `Alerting` — two channels: dashboard + email to Ops group (address in config). Three critical conditions: **missing batch before cut-off (watchdog)**, repeated write failures, batch `FAILED`. Alerts deduplicated (one email per incident).
- Retention/Purge — scheduled job deletes terminal batches + records + file metadata + audit older than the window.

## 7. Domain model

- `PriceBatch` — batchId, version, generatedAt, status, itemCount, writtenCount, setAsideCount. Parent of records.
- `PriceRecord` — changeId, version, itemId, location, locType, price, currency, effStart, effEnd, changeType, validationStatus, setAsideReason.
- `MntRow` (value object, not persisted) — recordType, columns[]; derived from a valid record.
- `MntFile` — filename, path, recordCount, checksum, status, writtenAt.
- `MappingRule` — jsonField, mntColumn, ruleType, ruleValue. `ConnectionConfig` — name, kind, endpoint, authRef, inboundPath.
- `AuditEvent` — step, outcome, message, ts; one per pipeline step.

## 8. Runtime scenarios

- **S1 Intake rejection**: bad key/HMAC → `401`; non-allowlisted IP → `403`; malformed JSON → `400`; empty `records` → `422`. Rejected at the filter chain, **nothing persisted**.
- **S2 Duplicate batch**: same `batch_id+version` re-sent → `409 BATCH_DUPLICATE`, no-op. Higher `version` of same `batch_id` = superseding batch → fresh file under a distinct name (no rollback of already-written files; corrections are later higher-version batches).
- **S3 Partial batch**: invalid/unmappable records set aside with reasons, rest written ⇒ `PARTIAL`; >20% set aside or nothing valid ⇒ abort, no file.
- **S4 Write failure**: park at `PENDING_WRITE`, bounded backoff retries rewrite the file; exhaustion ⇒ `FAILED` + one deduplicated alert; batch preserved. Resume after fix is manual (`POST /events/{id}/retry`, admin).
- **S5 Instance failover**: owner crashes mid-run ⇒ lease expires ⇒ reaper resets to `RECEIVED` ⇒ surviving instance re-claims (`SKIP LOCKED`). Exactly one file, no double write, no manual step.

## 9. API design

All endpoints under `/api/v1`, TLS, JSON UTF-8, ISO-8601 timestamps. Paged lists:
`{ "items": [...], "page": 0, "size": 50, "total": N }`.

### Intake — `POST /api/v1/price-events`

Headers: `Content-Type: application/json`, `X-Api-Key`, `X-Signature` (HMAC-SHA256 hex of the
raw body, shared secret), `X-Timestamp` (epoch seconds; ±5 min skew window; bounds replay).

Envelope: `batch_id` (string, req), `version` (int, req), `generated_at` (timestamp, req),
`records` (array, req, non-empty else 422).

Record fields:

| Field | Req | Notes |
|---|---|---|
| `change_id` | yes | with `version` = record idempotency key |
| `version` | yes | latest wins |
| `item_id` | yes | HQ SKU → Xstore item code |
| `store_id_or_zone` | yes | store or zone/region → Xstore `LOCATION` + `LOC_TYPE` |
| `price` | yes* | *omitted when `change_type=delete`; decimal point, no thousands sep, scale per currency (VND→0) |
| `currency` | no | ISO-4217; default from config |
| `effective_start` | no | default D+1 (timezone-safe, from batch business date) |
| `effective_end` | no | absent = open-ended, no auto-revert |
| `change_type` | yes | `new`/`update` → FDETL; `delete` → FDELE |

Responses: `202` accepted (`RECEIVED`, async) · `400` malformed · `401` bad key/HMAC ·
`403` IP not allowlisted · `409` duplicate (no-op) · `422` empty records · `429` rate-limited.
The `202` confirms receipt only, not per-record validity.

### Console endpoints (operator session; writes need administrator role)

- `GET /api/v1/events` — filters `status`, `from`/`to`; paged.
- `GET /api/v1/events/{id}` — full batch; `records` sub-array paged + filterable by `outcome` (`WRITTEN`/`SET_ASIDE`/`SUPERSEDED`).
- `POST /api/v1/events/{id}/retry` — admin; `FAILED` → `PENDING_WRITE` (`202`); idempotent no-op otherwise (`200`).
- `GET /api/v1/logs` — audit trail; filters `batch_id`, `step` (received/validated/transformed/written/retry), `from`/`to`.
- `GET /api/v1/dashboard/metrics` — daily counters + attention list.
- `GET, PUT /api/v1/config/connections` and `GET, PUT /api/v1/config/mappings` — whole-document PUT with **optimistic lock** (`version` field; stale ⇒ `409 CONFIG_CONFLICT`); applied from next batch; audited; secrets only as `authRef` (raw secret value in PUT ⇒ `422`).
- `GET /actuator/health` — unauthenticated liveness probe; all other actuator endpoints disabled or authenticated.

### Error catalog (single shape)

`{ "error": CODE, "message": ..., "batch_id": ..., "version": ..., "ts": ... }`

`MALFORMED_REQUEST` 400 · `UNAUTHENTICATED` 401 · `IP_NOT_ALLOWED` 403 · `ROLE_REQUIRED` 403 ·
`NOT_FOUND` 404 · `BATCH_DUPLICATE` 409 · `CONFIG_CONFLICT` 409 · `EMPTY_BATCH` 422 ·
`VALIDATION_FAILED` 422 · `RATE_LIMITED` 429.

Rate limiting is enforced at the reverse proxy (global, a few requests/min per client).

## 10. Persistence schema invariants (Appendix B)

```sql
-- Idempotency
ALTER TABLE price_batch  ADD CONSTRAINT uq_batch  UNIQUE (batch_id, version);
ALTER TABLE price_record ADD CONSTRAINT uq_change UNIQUE (change_id, version);

-- Lease columns on price_batch: status, owner_instance, claimed_at

-- Partial indexes keep claim queries cheap
CREATE INDEX ix_batch_claimable ON price_batch (status)
  WHERE status IN ('RECEIVED','PENDING_WRITE');
CREATE INDEX ix_batch_lease ON price_batch (claimed_at)
  WHERE status IN ('PROCESSING','WRITING');

CREATE INDEX ix_record_batch  ON price_record (batch_id);
CREATE INDEX ix_audit_batch_ts ON audit_event (batch_id, ts);
```

Raw HQ payload stored as `jsonb` for audit/replay. Migrations via Flyway.

## 11. Test plan (how the design is verified)

- **Unit** (JUnit 5, AssertJ): Validator rules, Mapper transforms, MNT formatting, idempotency keys — no I/O.
- **Integration** (Spring Boot Test + Testcontainers PostgreSQL 14): repositories, `SKIP LOCKED` claiming, lease/reaper, Flyway schema.
- **API/contract** (MockMvc/WebTestClient): auth matrix, error-catalog shape, console roles.
- **End-to-end**: full pipeline with `@TempDir` stand-in share + GreenMail for alert email; covers S1–S5 incl. failover drill (kill owner mid-run ⇒ exactly one file).
- **Non-functional**: 250-store/75k-item volume run within window, bounded heap (streaming), no plaintext secret in DB dump/logs, retention purge.

Key cases to remember: golden-file MNT check (trailer count = detail rows); near-midnight batch
⇒ D+1 doesn't drift a day; >20% invalid ⇒ abort; concurrent duplicate insert fails on UNIQUE;
both instances poll same batch ⇒ exactly one claims. Exit: TC-01..25 + TC-N1..N6 green,
coverage ≥ 80% on Validator/Mapper/MNT Builder/WorkDispatcher.
