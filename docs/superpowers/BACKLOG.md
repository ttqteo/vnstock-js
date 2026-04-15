# vnstock-js — SDK Backlog

**Last updated:** 2026-04-14
**Current focus:** v1.3.2 patch release, then v1.4 planning
**Docs site roadmap:** xem [docs-site-roadmap.md](docs-site-roadmap.md) (track riêng, parallel với SDK)

Tài liệu này theo dõi **SDK/CLI feature roadmap** theo version. Content/distribution và infrastructure nằm ở cuối file như cross-cutting concerns.

---

## Shipped

| Version | Date | Highlights |
|---|---|---|
| v1.1.0 | 2026-04-03 | Error taxonomy, adapter pattern, Realtime v2 EventEmitter |
| v1.2.0 | 2026-04-03 | Symbol Directory, Market Calendar, rate-limit auto-wait |
| v1.3.0 | 2026-04-14 | `await init()` remote data, Realtime hardening, **CLI** (quote/history/search/symbols) |
| v1.3.1 | 2026-04-14 | CLI patches (range fix, HSX/HOSE alias, price rounding, `-v` version, symbols full default) |
| v1.3.2 | In progress | History buffer fix for accurate `Change %` at window edge |

---

## SDK Release roadmap

| Version | Theme | Status |
|---|---|---|
| v1.4.0 | Easy-mode helpers + Watchlist | Next up |
| v1.5.0 | CLI fill-in commands + config | After v1.4 |
| v1.6.0 | Fundamentals + Screeners | Backlog |

### ~~v2.0.0 Multi-source~~ — Deferred / Not planned

Multi-source (SSI, TCBS, plugin system) đã **drop khỏi active roadmap**. Lý do: VCI API đủ dùng, không có user request concrete cho nguồn khác, chi phí maintain nhiều adapter cao. Giữ lại ghi chú ở đây để contributors biết đã cân nhắc.

Nếu tương lai có nhu cầu rõ (vd. VCI rate-limit/blocking), revisit như v1.7+ (không cần major bump).

---

## v1.4.0 — Easy-mode + Watchlist

**Theme:** Mở rộng tệp user từ "JS/TS dev" sang "analyst / trader bán-kỹ thuật" — cung cấp helper one-liner và module đóng gói theo job-to-be-done.

### In scope

- **Easy-mode helpers** trên SDK default instance:
  - `vnstock.quickQuote("VCB")` — giá mới nhất + change % (wrap `stock.priceBoard`)
  - `vnstock.recentHistory("VCB", 30)` — N phiên gần nhất (wrap `stock.quote.history` + slice)
  - `vnstock.compareSymbols(["VCB", "TCB", "MBB"])` — table giá + % change cho nhiều mã
  - `vnstock.topMovers()` — wrap `topGainers` + `topLosers` trả về cả hai
- **Watchlist module** — quản lý danh sách mã yêu thích:
  - API: `watchlist.add`, `remove`, `list`, `quotes(name)`, `create`, `delete`
  - Persist: Node/CLI → JSON file `~/.vnstock-js/watchlist.json`. Browser → để user lo (optional hook cho localStorage/IndexedDB)
- **Portfolio basic** — tính giá trị danh mục:
  - Input: positions `[{ symbol, quantity, avgCost }]`
  - Output: marketValue, totalCost, P/L per position, total return %
  - KHÔNG: Sharpe, drawdown, benchmarking — để v1.7+ nếu có nhu cầu

### Out of scope

- Alerts (cần scheduler infra, defer sang v1.5+)
- Advanced portfolio analytics (Sharpe, drawdown)
- Custom indicator builder beyond SMA/EMA/RSI (đã có trong v1.0)

---

## v1.5.0 — CLI fill-in + Config

**Theme:** Hoàn thiện CLI bằng các command còn thiếu và config-driven workflow.

### In scope

- **Commands mới:**
  - `vnstock gold` — giá vàng BTMC/SJC/GiaVangNet
  - `vnstock market` — VN-Index, HNX-Index, UPCOM-Index snapshot
  - `vnstock compare <S1> <S2> [<S3>...]` — bảng so sánh multi-symbol
  - `vnstock watchlist <add|remove|list|quotes>` — wire vào v1.4 watchlist
- **Config file** `~/.vnstock-js/config.json`:
  - Default exchange, locale, output mode (table/json/csv)
  - Cache dir, mirror URL (enterprise)
  - Watchlist default
- **Shell completions** — bash/zsh/fish auto-complete cho command + symbols (lazy load từ directory)
- **Pipe-friendly improvements:** streaming output cho large result sets, exit code discipline

### Out of scope

- Fundamentals command (phụ thuộc v1.6 module)
- Alert command (defer)

---

## v1.6.0 — Fundamentals + Screeners

**Theme:** Bổ sung domain "fundamental analysis" — báo cáo tài chính, ratios, screening.

### In scope

- **Fundamentals module:**
  - `stock.financial(symbol).incomeStatement()` — quý + năm
  - `stock.financial(symbol).balanceSheet()`
  - `stock.financial(symbol).cashFlow()`
  - `stock.financial(symbol).ratios()` — P/E, P/B, ROE, ROA, EPS, dividend yield
- **Screeners:**
  - Composable filters: `screener.where({ pe: { lt: 15 }, marketCap: { gt: 1e12 } })`
  - Common presets: `screener.valueStocks()`, `screener.growthStocks()`, `screener.dividendStocks()`
  - CLI: `vnstock screener --pe '<15' --market-cap '>1T'`
- **Sector classification:** chuẩn hoá ngành/lĩnh vực cho lookup (dùng lại ICB từ v1.2)

### Open questions

- VCI có đủ data fundamentals yearly + quarterly không? Reliability cho quarterly latest?
- Cache strategy: fundamentals ít thay đổi (quý), TTL dài hơn remote data thường (7 ngày?)
- Schema: dùng GAAP-like (debit/credit strict) hay đơn giản hoá (revenue/expense grouping)?

---

## Cross-cutting concerns (any version)

### Quality bar

- **TypeScript polish:** discriminated unions cho error/result, generics cho response shapes
- **Stability tags:** `@stable` / `@experimental` trong JSDoc
- **Bundle size:** `size-limit` CI check
- **Benchmark suite** cho hot paths (parser, transform)
- **Tree-shaking** verification

### Observability (optional, v1.5+)

- Debug logging hook (`vnstock.setLogger(fn)`)
- Telemetry opt-in — anonymous API usage stats

---

## Metrics to track (project health)

- Weekly npm downloads (baseline ~19 trước v1.3)
- GitHub stars
- Issues/Discussions activity
- Docs site traffic
- Time-to-first-quote (từ `npm install` đến successful `priceBoard` call)

---

## Workflow

- **Branch model:** mỗi version lớn có branch `dev-vX.Y.Z`. Feature branches off dev.
- **Spec lifecycle:** brainstorm → spec (roadmap `specs/`) → plan (roadmap `plans/`) → implement → verify → release
- **Backlog grooming:** review file này mỗi khi bắt đầu version mới, promote candidate lên spec
- **Commit discipline:** 1 squashed commit per version release (see feedback_commits memory)
- **Visibility:** `docs/superpowers/` nằm trên orphan `roadmap` branch, không bao giờ merge vào master/dev
