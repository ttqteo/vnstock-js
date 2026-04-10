# vnstock-js v1.3.0 — Design Spec

**Date:** 2026-04-10
**Branch:** `dev-v1.3.0`
**Status:** Draft, awaiting user review

## 1. Overview

v1.3.0 gộp ba mảng "production-hardening" cho `vnstock-js` thành một release:

1. **Realtime hardening** — fix các lỗi thực tế của `RealtimeClient` v2 và đồng bộ docs
2. **Remote data strategy** — chuyển `data/symbols.json`, `data/holidays.json` sang fetch từ raw GitHub master, loại khỏi npm bundle
3. **CLI tool** — thin layer trên core SDK, mở rộng tệp người dùng từ "JS/TS dev" sang "terminal user"

Mục tiêu chung: nâng `vnstock-js` từ "thư viện dùng được" lên "SDK + product có distribution surface rộng hơn", **không bump major** (v1.3.0, không phải v2.0.0).

## 2. Scope

### In scope
- Sửa lỗi `RealtimeClient` (browser heartbeat, unsubscribe thật, message routing, handshake verify)
- Test strategy realtime: fixture replay (CI) + manual smoke script (pre-release)
- Rewrite docs `RealtimeQuote` để match API v2 EventEmitter
- Module remote data với `vnstock.init()` async preload + in-memory cache + optional disk cache
- CI release workflow chạy `scripts/update-symbols.ts` và commit `data/*.json` lên `master`
- CLI tool với commands: `quote`, `history`, `search`, `symbols`, `export`, output modes `table | json | csv`
- Docs CLI mới trong `vnstock-js-docs`

### Out of scope (để dành cho v1.4.x trở đi)
- Multi-source adapters (SSI, TCBS…) — chỉ chuẩn bị nền, không thêm provider mới
- Use-case modules: screeners, watchlist/alerts, portfolio analytics
- Plugin system / breaking changes lớn cho v2.0
- Fundamentals data
- Realtime cho thị trường khác ngoài SSI iBoard

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     CLI (bin/vnstock)                    │
│   commands/ → renderers/ (table | json | csv)            │
└──────────────────────┬──────────────────────────────────┘
                       │ thin layer, không có business logic
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  Core SDK (src/)                         │
│                                                          │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ data (remote)  │  │   realtime    │  │   core/     │ │
│  │ - init()       │  │ RealtimeClient│  │  trading,   │ │
│  │ - cache        │  │ EventEmitter  │  │  listing,   │ │
│  │ - fetch URL    │  │ + reconnect   │  │  market…    │ │
│  └────────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
              raw.githubusercontent.com
              /ttqteo/vnstock-js/master/data/*.json
```

CLI là một thin layer **không** chứa business logic riêng — mọi thứ đi qua core SDK. Đây là nguyên tắc bất di bất dịch để tránh CLI và library lệch schema.

## 4. Remote Data Module

### 4.1 Vấn đề hiện tại

[src/core/listing/directory.ts:7](../../../src/core/listing/directory.ts#L7) và [src/core/market/calendar.ts:7](../../../src/core/market/calendar.ts#L7) dùng sync `require("../../../data/*.json")`. Hệ quả:

- `data/` phải được bundle vào npm package, làm package nặng hơn cần thiết
- Data chỉ fresh khi có release mới — listing thay đổi giữa release thì user phải đợi
- Maintainer phải nhớ chạy `update-symbols` trước mỗi release

### 4.2 Mô hình mới

**Build/release time (maintainer):**
- CI release workflow chạy `scripts/update-symbols.ts` → ghi `data/symbols.json`, `data/holidays.json` → commit lên `master`
- `data/*.json` vẫn nằm trong git (để raw GitHub serve được) nhưng **bị loại khỏi `files` trong package.json** (không bundle vào npm tarball)

**Runtime (user):**
- Package có constant URL hardcoded:
  ```
  SYMBOLS_URL = "https://raw.githubusercontent.com/ttqteo/vnstock-js/master/data/symbols.json"
  HOLIDAYS_URL = "https://raw.githubusercontent.com/ttqteo/vnstock-js/master/data/holidays.json"
  ```
- User gọi `await vnstock.init()` một lần (thường ở app startup)
- `init()` fetch song song cả hai URL → lưu in-memory + ghi disk cache `~/.vnstock-js/cache/`
- Sau `init()`, các API sync như `directory.findSymbol()`, `calendar.isHoliday()` đọc từ in-memory cache như cũ — **không đổi signature**
- Nếu user gọi API trước khi `init()` xong → throw `NotInitializedError` với message rõ ràng ("call `await vnstock.init()` first")

### 4.3 Caching strategy

- **In-memory:** Map giữ data sau `init()`. Lifetime = process lifetime.
- **Disk cache:** `~/.vnstock-js/cache/{symbols,holidays}.json` + metadata file `meta.json` (timestamp, etag nếu có).
- **TTL:** 24h mặc định, override qua `init({ ttl: ms })`.
- **Offline fallback:** nếu fetch fail và disk cache còn → dùng disk cache (kèm warning log). Nếu không có gì → throw `DataUnavailableError`.
- **Force refresh:** `init({ force: true })` bỏ qua cache.

### 4.4 Config override

```typescript
await vnstock.init({
  symbolsUrl?: string,    // override default raw GitHub URL
  holidaysUrl?: string,
  ttl?: number,           // ms, default 24h
  force?: boolean,        // bypass cache
  cacheDir?: string,      // default ~/.vnstock-js/cache
  noCache?: boolean,      // disable disk cache (in-memory only)
});
```

Cho phép enterprise/CI mirror data lên internal URL nếu cần.

### 4.5 Breaking change scope

- **Breaking:** user phải gọi `await vnstock.init()` trước khi dùng `directory` hoặc `calendar` API
- **Không breaking:** signature các hàm hiện có (`findSymbol`, `isHoliday`, …) giữ nguyên sync
- Migration note rõ ràng trong CHANGELOG + README

## 5. Realtime Hardening

### 5.1 Bugs phát hiện trong [src/realtime/index.ts](../../../src/realtime/index.ts)

| # | Bug | Impact | Fix |
|---|---|---|---|
| 1 | `socket.ping()` chỉ tồn tại trên `ws` (Node), browser `WebSocket` không có. Try/catch nuốt lỗi nhưng heartbeat timeout timer vẫn chạy → force-close conn dù khoẻ | Browser env: connection bị reset mỗi 40s vô lý | Detect runtime: Node dùng `ping()`, browser dùng app-level heartbeat (gửi JSON ping message hoặc rely vào incoming message rate) |
| 2 | `unsubscribe()` chỉ xoá symbol khỏi local Set, không gửi unsub message cho server | Server vẫn stream data, băng thông phí, vẫn emit `quote` cho symbol đã unsub | Gửi unsub message với cùng schema sub. Verify server có support không (xem captured fixture) |
| 3 | `onmessage` filter bằng `data.indexOf("|") !== -1` — bỏ qua ACK, server heartbeat, error payload | Không phát hiện được lỗi server, không xử lý handshake | Routing theo message type: pipe-delimited → quote parser; JSON → ack/error/control handler; pong → heartbeat reset |
| 4 | Không có handshake/auth verify với SSI server | Có thể subscribe trước khi server ready, mất message đầu | Verify thực tế bằng fixture: SSI có yêu cầu handshake không. Nếu có, implement state machine `connecting → handshaking → ready → subscribing` |
| 5 | Reconnect resubscribe gửi tất cả symbols cùng lúc, không có rate limit | Có thể bị server từ chối nếu quá nhiều symbol | Batch resubscribe, configurable batch size |

### 5.2 API surface (giữ nguyên, không breaking)

```typescript
const client = vnstock.realtime.create({ symbols: ["VCB", "FPT"] });
client.on("connected", () => {});
client.on("quote", (q: RealtimeQuote) => {});
client.on("disconnected", (reason) => {});
client.on("reconnecting", (attempt) => {});
client.on("error", (err) => {});
client.connect();
client.subscribe(["ACB"]);
client.unsubscribe(["VCB"]);
client.disconnect();
```

Không thêm method mới ở v1.3.0. Chỉ fix bug bên trong.

### 5.3 State machine

```
idle → connecting → handshaking → ready ⇄ subscribing
                                   ↓
                              disconnected → reconnecting → connecting (loop)
                                   ↓
                                 closed (intentional)
```

Internal state field, không expose ra ngoài. Dùng để guard các operation (`subscribe()` trước khi `ready` → enqueue).

## 6. CLI Tool

### 6.1 Goals

- Thin layer trên core SDK, **zero business logic riêng**
- Friendly cho người dùng terminal (default: bảng đẹp), tốt cho scripting (`--json`, `--csv`)
- Cài đặt: `npm i -g vnstock-js` → có command `vnstock`
- Cũng dùng được qua `npx vnstock-js quote VCB`

### 6.2 Command tree (v1.3.0 first batch)

| Command | Mô tả | Core SDK call |
|---|---|---|
| `vnstock quote <SYMBOL>` | Snapshot 1 mã | `trading.priceBoard([symbol])` |
| `vnstock history <SYMBOL> --from YYYY-MM-DD [--to ...] [--interval 1D]` | Lịch sử giá | `trading.history(...)` |
| `vnstock search <query>` | Tìm mã theo tên | `directory.search(query)` |
| `vnstock symbols [--exchange HOSE\|HNX\|UPCOM]` | Liệt kê mã | `directory.list({exchange})` |
| `vnstock calendar [--month YYYY-MM]` | Lịch giao dịch / ngày nghỉ | `market.calendar(...)` |
| `vnstock export history <SYMBOL> --from ... --format csv\|json` | Xuất dữ liệu | `trading.history(...)` + writer |

Các command như `gold`, `market overview` để dành v1.4+.

### 6.3 Global flags

- `--json` → output JSON, suppress decoration
- `--csv` → output CSV
- `--no-color` → disable ANSI color
- `--quiet` → suppress non-error logs (cho CI)
- `--config <path>` → custom config file (cho watchlist preset sau này)

Default output = pretty table với màu xanh/đỏ cho tăng/giảm. Nếu stdout không phải TTY → tự động fallback plain text (không cần `--no-color`).

### 6.4 Output renderer

- **Table renderer:** dùng [`cli-table3`](https://www.npmjs.com/package/cli-table3) (mature, unicode box drawing, fallback ASCII)
- **Color:** [`picocolors`](https://www.npmjs.com/package/picocolors) — nhẹ, không deps
- **Args parser:** [`commander`](https://www.npmjs.com/package/commander) — well-known, type-safe
- **Number format:** căn phải, nghìn phân tách bằng `.`, decimal `,` theo locale VN (override qua `--locale en`)
- **Truncate:** tên dài quá width thì truncate giữa, thêm `…`

Tất cả deps trên đều đủ nhỏ và stable. Tổng size CLI thêm < 200KB.

### 6.5 Project structure

```
src/
  cli/
    index.ts           # entry, commander setup
    commands/
      quote.ts
      history.ts
      search.ts
      symbols.ts
      calendar.ts
      export.ts
    renderers/
      table.ts
      json.ts
      csv.ts
    formatters/
      number.ts
      date.ts
      color.ts
bin/
  vnstock              # shebang #!/usr/bin/env node, require dist/cli/index
```

`package.json`:
```json
{
  "bin": { "vnstock": "bin/vnstock" }
}
```

CLI gọi `await vnstock.init()` ở entry trước khi chạy command, có spinner báo "Loading data…" lần đầu.

## 7. Documentation Updates

### 7.1 vnstock-js-docs (sibling repo)

Cần update các file trong [`vnstock-js-docs/contents/docs/`](../../../../vnstock-js-docs/contents/docs):

- **`data/RealtimeQuote/index.mdx`** — REWRITE hoàn toàn. Hiện đang dạy API v1 cũ (`vnstock.realtime.connect({onMessage})`) không tồn tại nữa. Phải đổi sang `RealtimeClient` EventEmitter pattern, có example đủ event handlers.
- **`getting-started/`** — thêm bước `await vnstock.init()` vào quickstart, giải thích vì sao
- **`key-features/`** — thêm section CLI mới với ví dụ command
- **New section: `cli/`** — full CLI reference: install, command list, output modes, examples, scripting recipes

### 7.2 Repo chính

- **CHANGELOG.md** — v1.3.0 entry với migration note (init() bắt buộc)
- **README.md** — thêm CLI section, update quickstart với init()
- **CONTRIBUTING.md** — thêm section về data update workflow (CI auto-runs update-symbols)

## 8. Testing Strategy

### 8.1 Realtime — Option D (fixture replay + manual smoke)

**Fixture replay (automated, runs in CI):**
- Capture raw WebSocket traffic từ SSI một lần (manual, trong giờ giao dịch) → save vào `__tests__/fixtures/realtime/*.txt`
- Mock WebSocket trong test, replay fixture line by line
- Test các kịch bản: handshake, subscribe, multi-symbol stream, server heartbeat, reconnect after drop, parse error recovery, unsub-then-resub
- Verify: parser đúng schema, EventEmitter emit đúng events, state machine chuyển đúng

**Manual smoke (pre-release, trong giờ giao dịch):**
- Script `scripts/smoke-realtime.ts` — connect thật vào SSI, subscribe vài symbol, log raw + parsed output trong 60s
- Maintainer chạy thủ công trước mỗi release tag, attach output vào release notes
- Có README hướng dẫn rõ về timing (9:00-11:30, 13:00-15:00 VN)

### 8.2 Remote data

- Mock `fetch` (nodejs `undici` hoặc inject custom fetch) → test init flow, cache hit/miss, TTL expiry, offline fallback, force refresh
- Test breaking-change guard: gọi `findSymbol()` trước `init()` → đúng error
- Integration test riêng (có thể skip trên CI): fetch thật từ raw GitHub URL, verify schema

### 8.3 CLI

- Snapshot test cho mỗi command với fixture data: stdout giống expected
- Test cả 3 output modes (table, json, csv)
- Test exit codes: 0 success, 1 user error (invalid symbol), 2 system error (network)
- Test piping: `vnstock quote VCB --json | jq` chạy được, không có ANSI leak

### 8.4 Coverage targets

- Realtime: > 80% (state machine + parser là critical)
- Remote data: > 90% (cache logic)
- CLI: > 70% (focus vào command logic, không cần test renderer chi tiết)

## 9. Release Workflow (CI changes)

### 9.1 Auto-update data trên master

GitHub Actions workflow mới `.github/workflows/update-data.yml`:
- Trigger: scheduled (daily) + manual `workflow_dispatch`
- Steps:
  1. Checkout master
  2. Run `pnpm install`
  3. Run `pnpm run update-symbols`
  4. If `data/*.json` changed → commit + push lên master với message `chore: refresh data [skip ci]`
- Permissions: write to repo

### 9.2 Release workflow

Workflow `.github/workflows/release.yml` (existing hoặc new):
- Trigger: push tag `v*`
- Steps:
  1. Run `update-symbols` (đảm bảo data fresh tại release moment)
  2. Build (`pnpm run build`)
  3. Test (`pnpm test`)
  4. Smoke test note: manual, không gate release
  5. `npm publish`

### 9.3 package.json changes

```json
{
  "files": [
    "dist/**/*",
    "bin/**/*",
    "README.md"
  ]
}
```

`data/**/*` **bị loại khỏi `files`** — không bundle vào npm. Vẫn có trong git để raw GitHub serve.

## 10. Migration Guide (cho user)

### Trước (v1.2.x):
```typescript
import vnstock from "vnstock-js";
const symbol = vnstock.directory.findSymbol("VCB");
```

### Sau (v1.3.0):
```typescript
import vnstock from "vnstock-js";
await vnstock.init();   // ← bắt buộc, gọi 1 lần ở app startup
const symbol = vnstock.directory.findSymbol("VCB");
```

CLI users không cần làm gì — CLI tự gọi `init()` bên trong.

Realtime users: API không đổi, nhưng chạy lại với v1.3.0 sẽ thấy ổn định hơn (browser heartbeat đúng, unsubscribe thật).

## 11. Risks & Open Questions

### Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Raw GitHub URL có rate limit / downtime → user app fail khi `init()` | Disk cache fallback; cho phép override URL; document cách self-host mirror |
| R2 | SSI WebSocket schema thay đổi giữa lúc capture fixture và lúc release | Script `scripts/smoke-realtime.ts` chạy thật trước release để catch sớm |
| R3 | `await init()` là breaking change → user nâng cấp bất ngờ | CHANGELOG rõ + bump minor (1.3.0); README quickstart update; có thể thêm runtime warning trong v1.2.x patch nói trước về v1.3 |
| R4 | CLI deps làm package nặng hơn | Tree-shake / lazy load CLI deps chỉ khi `bin/vnstock` chạy, không ảnh hưởng library users |
| R5 | Postinstall không cần thiết nhưng user dùng `npm ci` trong air-gapped CI vẫn fail vì init() runtime fetch | Document config override; allow `VNSTOCK_DATA_URL` env var; ship optional bundled snapshot fallback |

### Open questions (cần verify khi implement)

- **Q1:** SSI iBoard WebSocket có yêu cầu handshake/auth không? → Verify bằng captured fixture trong sprint đầu.
- **Q2:** Schema unsubscribe message của SSI là gì? → Test gửi và quan sát.
- **Q3:** `update-symbols.ts` hiện tại pull từ đâu? Có rate limit không? → Đọc script và quyết định scheduled frequency.
- **Q4:** Có cần ETag/If-Modified-Since cho raw GitHub fetch để giảm bandwidth không? → Optional, có thể thêm sau.

## 12. Success Criteria

v1.3.0 được coi là ready để release khi:

- [ ] Tất cả unit + fixture-replay tests xanh
- [ ] Manual smoke test realtime chạy 5 phút không crash, parse đúng quote cho ít nhất 5 symbol
- [ ] CLI: `vnstock quote VCB`, `history`, `search`, `symbols`, `calendar`, `export` chạy được trên macOS + Linux + Windows (qua CI matrix)
- [ ] CLI snapshot tests xanh cho cả 3 output modes
- [ ] `await vnstock.init()` cold start < 2s với network bình thường
- [ ] Disk cache hoạt động: lần thứ 2 init < 100ms (không network)
- [ ] Offline test: ngắt mạng sau khi đã init một lần → init lần 2 vẫn work từ cache
- [ ] Docs RealtimeQuote rewrite xong, examples chạy được
- [ ] CLI docs section mới publish trên vnstock-js-docs
- [ ] CHANGELOG migration note rõ ràng
- [ ] CI workflow update-data chạy thành công ít nhất 1 lần trên master

## 13. Implementation Order (rough sketch — sẽ refine ở plan)

1. **Remote data module** (foundation, các phần khác phụ thuộc)
2. **Realtime fixes + fixture infrastructure**
3. **CLI scaffolding + 2 commands đầu (quote, history)**
4. **CLI commands còn lại**
5. **Docs rewrite**
6. **CI workflows**
7. **Manual smoke + release**

Chi tiết step-by-step sẽ nằm trong implementation plan (skill writing-plans, sau khi user approve spec này).
