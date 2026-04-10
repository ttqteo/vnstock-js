# vnstock-js — Backlog & Roadmap

**Last updated:** 2026-04-10
**Current focus:** v1.3.0 (xem [specs/2026-04-10-vnstock-js-v1.3.0-design.md](specs/2026-04-10-vnstock-js-v1.3.0-design.md))

Tài liệu này theo dõi các hướng phát triển chưa được lên spec chi tiết. Mỗi mục là một "candidate" để brainstorm thành design spec riêng khi đến lượt.

---

## Roadmap tổng quan

| Version | Theme | Status |
|---|---|---|
| v1.3.0 | Realtime hardening + CLI + Remote data | **In progress** (spec written) |
| v1.4.0 | Use-case modules / Easy mode | Backlog |
| v1.5.0 | CLI expansion + watchlist/config | Backlog |
| v1.6.0 | Fundamentals + screeners | Backlog |
| v2.0.0 | Multi-source platform | Backlog (long-term) |
| Continuous | Distribution & content | Always-on |

---

## v1.4.0 — Use-case Modules / Easy Mode

**Theme:** Mở rộng tệp người dùng từ "dev" sang "analyst / trader bán-kỹ thuật" bằng cách cung cấp các helper one-liner và module đóng gói theo job-to-be-done.

### Candidates

- **Easy-mode helpers** — one-liner functions phổ biến:
  - `vnstock.quickQuote("VCB")` → giá mới nhất + change %
  - `vnstock.recentHistory("VCB", 30)` → 30 ngày gần nhất
  - `vnstock.topGainers()`, `vnstock.topLosers()`
  - `vnstock.compareSymbols(["VCB", "TCB", "MBB"])` → bảng so sánh
- **Watchlist module** — quản lý danh sách mã yêu thích:
  - Persist ra config file (`~/.vnstock-js/watchlist.json`)
  - API: `addSymbol`, `removeSymbol`, `listSymbols`, `getQuotes(watchlistName)`
  - CLI: `vnstock watchlist add VCB`, `vnstock watchlist quotes`
- **Portfolio analytics (basic)** — không phải full backtesting:
  - Tính giá trị danh mục theo input positions
  - P/L per position, total return
  - Sector allocation breakdown
- **Simple alerts** — rule-based, không cần realtime:
  - "Cảnh báo nếu VCB giảm > 3% so với hôm qua"
  - Polling-based, hook vào cron/scheduler bên ngoài

### Open questions

- Watchlist persist ở đâu cho non-CLI users (browser, server-side)?
- Alerts có cần infra riêng không, hay chỉ cung cấp building block?
- Portfolio analytics scope tới đâu — cơ bản (P/L) hay nâng cao (Sharpe, drawdown)?

---

## v1.5.0 — CLI Expansion

**Theme:** Mở rộng CLI từ v1.3.0 base với các command còn thiếu và config-driven workflow.

### Candidates

- **More commands:**
  - `vnstock gold` — giá vàng VN
  - `vnstock market overview` — VN-Index, HNX-Index, breadth
  - `vnstock fundamentals <SYMBOL>` (dependency: v1.6 fundamentals module)
  - `vnstock compare <S1> <S2> ...`
- **Config file support** — `~/.vnstock-js/config.json`:
  - Default exchange, locale, output mode
  - API token nếu sau này có premium source
  - Mirror URL cho remote data (enterprise use)
- **Watchlist presets** — wire vào v1.4.0 watchlist:
  - `vnstock quote --watchlist tech-stocks`
- **Pipe-friendly improvements:**
  - `vnstock symbols --json | jq '.[] | select(.exchange=="HOSE")'`
  - Streaming output cho lệnh trả nhiều dòng
- **Shell completions** — bash/zsh/fish auto-complete

---

## v1.6.0 — Fundamentals + Screeners

**Theme:** Bổ sung domain "fundamental analysis" — báo cáo tài chính, ratios, screening.

### Candidates

- **Fundamentals module:**
  - Income statement, balance sheet, cash flow (yearly + quarterly)
  - Key ratios: P/E, P/B, ROE, ROA, EPS, dividend yield
  - Source: VCI hoặc thêm provider mới
- **Screeners:**
  - Filter symbols by criteria: market cap, P/E range, sector, volume…
  - Composable filters: `screener.where({pe: {lt: 15}, marketCap: {gt: 1e12}})`
  - CLI: `vnstock screener --pe '<15' --market-cap '>1T'`
- **Sector classification:** chuẩn hoá ngành/lĩnh vực cho lookup

### Open questions

- Source data fundamentals có public không? Reliability?
- Cache strategy — fundamentals ít thay đổi (quarterly), nên TTL dài hơn nhiều
- Schema chuẩn hoá: dùng GAAP-like hay đơn giản hoá?

---

## v2.0.0 — Multi-source Platform

**Theme:** Chuyển từ "wrapper VCI" thành "platform nhiều provider". Đây là breaking change lớn — chuẩn bị cho roadmap dài hạn.

### Candidates

- **Provider abstraction:**
  - Adapter interface chuẩn hoá: `IProvider` với methods `fetchPriceBoard`, `fetchHistory`, `fetchSymbols`, …
  - Provider registry: pluggable, user chọn provider qua config
  - Built-in providers: VCI (current), SSI, TCBS, Vietstock?
- **Schema standardization:**
  - Common domain model độc lập với raw response của từng source
  - Mapping layer trong mỗi adapter
  - Versioned schema (v2 schema, có thể coexist với v1 trong transition period)
- **Plugin system:**
  - User có thể tự viết adapter cho internal/private source
  - Publish riêng như `@vnstock-js/provider-foo`
- **Source selection per call:**
  - `vnstock.history("VCB", { provider: "ssi" })`
  - Fallback chain: try SSI → fallback VCI nếu fail
- **Cross-source consistency check** (advanced):
  - Compare data giữa providers để phát hiện data quality issue
- **Migration tooling:**
  - Codemod / migration guide từ v1.x → v2.0

### Open questions

- API surface v2 có giữ tương thích v1 không, hay clean break?
- Adapter pattern hiện tại trong v1.2.0 đã đủ mạnh chưa, hay cần redesign?
- Naming: `provider`, `source`, `adapter` — chọn từ nào cho consistent
- Test strategy cho multi-source: làm sao test mà không phụ thuộc nhiều API thật?

---

## Continuous — Distribution & Content

**Theme:** Hoạt động liên tục, không gắn version cụ thể. Mỗi release nên đi kèm content push.

### Candidates

- **Cookbook examples** — `examples/` directory với standalone scripts:
  - "Build a watchlist dashboard in 30 lines"
  - "Daily portfolio email with cron + vnstock"
  - "Backtest a simple moving average strategy"
  - "Stream realtime quotes to Slack"
- **Notebook examples** — Jupyter / Observable notebooks
- **Blog posts:**
  - Release announcements
  - "10 lệnh terminal cho nhà đầu tư VN" (push mạnh khi v1.3.0 CLI ra)
  - Use case stories
- **Video content** — YouTube tutorials, screencasts ngắn
- **Community building:**
  - GitHub Discussions
  - Discord/Telegram channel?
- **Comparison content** — vs vnstock (Python), vs vn-stock-sdk
- **Showcase gallery** — apps/projects user xây dựng từ vnstock-js

### Metrics to track

- Weekly downloads (baseline: ~19 hiện tại theo Socket)
- GitHub stars
- Issues/discussions activity
- Docs site traffic
- Time-to-first-quote cho user mới

---

## Cross-cutting concerns (any version)

### Quality bar improvements

- **TypeScript polish:**
  - Stricter discriminated unions cho error/result
  - Generics cho response shapes
  - Better type inference cho fluent APIs
- **Stability guarantees:**
  - Semver discipline + clear deprecation policy
  - "Stable" vs "experimental" API tags
- **Observability:**
  - Optional debug logging hook
  - Telemetry opt-in (tracking which APIs are most used, anonymous)
- **Performance:**
  - Bundle size monitoring (size-limit)
  - Benchmark suite cho hot paths
  - Tree-shaking verification

### Documentation infrastructure

- **API reference:** auto-generate từ TSDoc
- **Versioned docs:** mỗi major version có docs riêng
- **i18n:** docs song ngữ Việt/Anh để mở rộng audience

---

## Workflow notes

- **Branch model:** mỗi version lớn có branch `dev-vX.Y.Z` riêng. Feature branches off của dev branch.
- **Spec lifecycle:** brainstorm → spec (`docs/superpowers/specs/`) → plan (`docs/plans/`) → implement → verify → release.
- **Backlog grooming:** review file này mỗi khi bắt đầu version mới, promote candidates lên spec.
- **Spec & backlog visibility:** `docs/superpowers/` bị gitignore — chỉ tồn tại trên dev branches local, không xuất hiện trên `master`. Trước khi merge dev → master, exclude `docs/superpowers/` khỏi merge (xem README workflow).
