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
| v1.6.0 | **MCP server** (`vnstock mcp` subcommand, tools cho Claude Desktop / Cursor / VS Code) | Backlog |
| v1.7.0 | Fundamentals + Screeners | Backlog |

### ~~CLI chat interactive~~ — Dropped

Đã cân nhắc build `vnstock chat` menu-driven với `@inquirer/prompts`, nhưng **drop hoàn toàn** vì:
- MCP server (v1.6) distribution lever lớn hơn — audience Claude Desktop/Cursor triệu users
- Build UX/parser tự làm rủi ro cao, Claude/Cursor đã lo UI tốt hơn
- Non-Claude user vẫn có CLI commands (`vnstock quote VCB` etc.) đã đủ
- YAGNI — làm MCP trước, đánh giá demand chat CLI sau

### ~~v2.0.0 Multi-source~~ — Deferred / Not planned

Multi-source (SSI, TCBS, plugin system) đã **drop khỏi active roadmap**. Lý do: VCI API đủ dùng, không có user request concrete cho nguồn khác, chi phí maintain nhiều adapter cao. Giữ lại ghi chú ở đây để contributors biết đã cân nhắc.

Nếu tương lai có nhu cầu rõ (vd. VCI rate-limit/blocking), revisit như v1.8+ (không cần major bump).

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

## v1.6.0 — MCP Server

**Theme:** Expose `vnstock-js` làm MCP (Model Context Protocol) server để Claude Desktop / Cursor / VS Code có thể query stock VN qua tool-calling. Distribution lever lớn — audience Claude users rộng hơn terminal users nhiều lần.

### In scope

- **MCP server** — binary `vnstock mcp` (subcommand CLI hiện có) hoặc standalone `vnstock-mcp`. Chạy trên stdio theo spec MCP.
- **Tools expose (~8 core):**
  - `get_quote(symbol)` — priceBoard snapshot (giá, change, volume, trần/sàn)
  - `get_history(symbol, from?, to?, range?, limit?)` — lịch sử OHLCV
  - `search_symbols(query, limit?)` — directory fuzzy search
  - `list_symbols(exchange?, limit?)` — liệt kê mã theo sàn
  - `top_movers()` — gainers + losers combined
  - `is_trade_day(date)` — calendar check
  - `get_trading_calendar(year)` — danh sách ngày nghỉ
  - `get_company_info(symbol)` — profile cơ bản (tên, sàn, ngành)
- **Install flow:**
  ```json
  // claude_desktop_config.json
  {
    "mcpServers": {
      "vnstock": {
        "command": "npx",
        "args": ["-y", "vnstock-js", "mcp"]
      }
    }
  }
  ```
  Hoặc `npm i -g vnstock-js` rồi `command: "vnstock", args: ["mcp"]`.
- **VN context trong tool descriptions:** mỗi tool có description tiếng Việt + tiếng Anh giải thích thuật ngữ (trần, sàn, ATO, bluechip...). Claude tự format câu trả lời tiếng Việt từ data return.
- **Test strategy:** mock MCP transport, test mỗi tool với synthetic SDK response. Integration test riêng spawn server + client.

### Tech dependencies

- `@modelcontextprotocol/sdk` official TypeScript SDK
- Reuse 100% SDK hiện có (Directory, stock.trading, stock.quote, market.calendar). Không logic riêng.

### Out of scope

- Advanced tools (screener, fundamentals) — đẩy sang v1.7 sau khi ship Fundamentals module
- Watchlist tools — depend vào v1.4 watchlist, nếu ship sau thì thêm
- Streaming/realtime qua MCP — MCP không support WebSocket natively

### Open questions

- Package layout: subcommand `vnstock mcp` trong same package, hay tách `@vnstock-js/mcp`? → Recommend: **subcommand** (user 1 lần install, dùng cả CLI + MCP)
- Authentication: MCP có auth không? → Không cần cho public VCI API
- Rate limit: Claude có thể spam tools fast. Dùng `rateLimitWait` từ v1.2 đủ.

---

## v1.7.0 — Fundamentals + Screeners

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
  - MCP tool: `screen_stocks(filters)` — extend v1.6 MCP
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
