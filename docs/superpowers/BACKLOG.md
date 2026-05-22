# vnstock-js — SDK Backlog

**Last updated:** 2026-05-22
**Current focus:** v1.4.0 shipped (PR #13 merged, commit `d5f35ad`); v1.5.0 **Power Workflow** next up (per [v2.0 north-star vision](specs/2026-05-14-v2.0-ai-native-vision.md))
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
| v1.3.2 | 2026-04-14 | History buffer fix for accurate `Change %` at window edge, CLI update notifier |
| v1.3.3 | 2026-05-14 | **VCI REST migration** — Listing/Company/Financial từ GraphQL → Vietcap REST. **+ Module `news`** từ ttqteo/news-crawler. Plan: `plans/2026-05-14-v1.3.3-vci-rest-migration.md` |
| v1.4.0 | 2026-05-22 | **AI-Native Foundation** (PR #13) — MCP server (11 tools bilingual) + Indicators v2 (MACD/Bollinger/ATR) + AI context layer (`aiContext` / `toAIPrompt`) + Easy-mode helpers + Watchlist + CLI multi-symbol shortcut. Plan: `plans/2026-05-14-v1.4.0-ai-native-foundation.md` |

---

## SDK Release roadmap

Roadmap restructure theo [v2.0 north-star vision](specs/2026-05-14-v2.0-ai-native-vision.md) — "AI-Native VN Stock Research SDK". 4 phases, mỗi phase 1 release. Option B (3 minor + 1 major) đã chốt: bundle các features liên quan thành theme coherent thay vì 1 feature = 1 bump.

| Version | Phase | Theme | Status |
|---|---|---|---|
| v1.4.0 | 1 | **AI-Native Foundation** — MCP server + Indicators v2 + AI context + prompt helpers + Easy-mode + Watchlist | **Shipped 2026-05-22** |
| v1.5.0 | 2 | **Power Workflow** — Patterns + Event/alerts + Portfolio + CLI fill-in + Config + Fundamentals + Screeners | Next up |
| v1.6.0 | 3 | **Historical Reasoning** — Analog engine + similar setups + signal backtest light | After v1.5 |
| v2.0.0 | 4 | **RAG Research Memory** — Vector store + ingestion (news/earnings/theses) — breaking | Major |

**Rationale Option B (3 minor + 1 major):**
- Tránh release explosion (6+ bumps theo plan cũ) — gộp features cùng theme.
- Mỗi version 1.5-2 tuần dev cho solo maintainer, ship được.
- v1.4 = "AI Foundation" có coherent launch story (MCP + indicators v2 + AI context cùng nhau là USP, không tách rời).
- v1.5 = "Power Workflow" cluster các tool dev/trader dùng hằng ngày.
- v1.6 = "Historical Reasoning" wow-factor riêng, deserve own release.
- v2.0 = breaking infra (RAG dep, vector store).

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

## v1.4.0 — AI-Native Foundation (Phase 1)

**Theme:** Launch vnstock-js là "AI Research Toolkit cho VN stock". Bundle MCP + AI primitives để có coherent launch story — không phải "thin SDK wrapper" mà là VN-native market intelligence pre-computed.

**Spec reference:** [`specs/2026-04-14-v1.4.0-mcp-server-design.md`](specs/2026-04-14-v1.4.0-mcp-server-design.md) (revised 2026-05-14)
**Plan reference:** [`plans/2026-05-14-v1.4.0-ai-native-foundation.md`](plans/2026-05-14-v1.4.0-ai-native-foundation.md) — 12 tasks, ~12 days dev, calendar 2-3 weeks

### In scope

- **MCP server** — `vnstock mcp` stdio subcommand, 11 tools (8 basic + 3 AI primitives)
- **Indicators v2 expansion:** MACD, Bollinger Bands, ATR (bổ sung SMA/EMA/RSI v1)
- **AI context layer:**
  - `vnstock.stock.aiContext(symbol)` — structured JSON: trend, indicators snapshot, S/R pivot, volume signal, performance
  - `vnstock.stock.toAIPrompt(symbol)` — plain-text format cho non-MCP LLM (GPT/Gemini/local)
  - Trend classifier rules-based (EMA chain + slope)
  - S/R bằng pivot points (swing high/low, 5-day window)
- **Easy-mode helpers:** `quickQuote`, `recentHistory`, `compareSymbols`, `topMovers`
- **Watchlist module:** CRUD + persist Node `~/.vnstock-js/watchlist.json`, browser opt-in adapter
- **MCP AI tools:** `get_ai_context`, `to_ai_prompt`, `compare_symbols`

### Out of scope (defer)

- Pattern detection sâu (Cup&Handle, Triangle, Flag/Wedge algorithmic) → v1.5
- Event/alert system → v1.5
- Portfolio P/L → v1.5
- Fundamentals + Screeners → v1.5
- Historical analog → v1.6
- RAG/vector → v2.0

---

## v1.5.0 — Power Workflow (Phase 2)

**Theme:** Hoàn thiện daily trader/analyst workflow. Patterns + alerts + screening + fundamentals + CLI commands còn thiếu.

### In scope

- **Pattern detection (rules-based):**
  - Breakout (price > N-day high với volume spike)
  - Support/Resistance algorithmic (extend pivot từ v1.4)
  - Trend direction (slope ema20/ema50)
  - Double top/bottom (light heuristic)
  - Volume anomaly (z-score > 2)
- **Event/alert system:** `stock.on("breakout", cb)` EventEmitter, persist subscription cho daemon
- **Fundamentals module:**
  - `stock.financials(symbol).balanceSheet/incomeStatement/cashFlow/ratios()`
  - P/E, P/B, ROE, ROA, EPS, dividend yield
- **Screener** composable filter (KHÔNG full DSL — YAGNI):
  - `screener.where({ pe: { lt: 15 }, roe: { gt: 0.15 } })`
  - Presets: `valueStocks()`, `growthStocks()`, `dividendStocks()`
- **Portfolio basic:** positions → marketValue, totalCost, P/L %
- **CLI fill-in:** `gold`, `market`, `compare`, `watchlist`, `screener` subcommands
- **Config file** `~/.vnstock-js/config.json`
- **MCP extension:** `find_patterns`, `screen_stocks`, `get_fundamentals`, `watchlist_*`, `portfolio_summary`

### Out of scope

- Cup&Handle/Triangle/Flag/Wedge algorithmic → v1.6
- Analog engine → v1.6
- DSL screener — drop
- Custom indicator builder framework — drop

---

## v1.6.0 — Historical Reasoning (Phase 3)

**Theme:** "Wow-factor" release. Historical analog engine — competitive moat vs TradingView. Find historical setups tương tự current condition.

### In scope

- **Analog engine:**
  - `stock.similarSetups(symbol, opts?)` — return historical dates với condition khớp current
  - Fingerprint: vector các indicator snapshot (RSI, MACD signal, volume z-score, trend slope)
  - Similarity: cosine distance
  - Output: top-N dates + outcome window (return 5d/30d/90d sau setup)
- **Pattern detection advanced:** Cup&Handle, Triangle (ascending/descending/symmetric), Flag, Wedge
- **Signal backtest light:**
  - `stock.backtest(symbol, signalFn, opts?)` — apply signal, return entry/exit/PnL stats
  - Long-only, fixed position size, no slippage/fees
- **MCP extension:** `find_similar_setups`, `backtest_signal`

### Out of scope

- Multi-symbol portfolio backtest — out of scope
- Optimization framework (param sweep) — out of scope
- ML-based pattern detection — defer (rules-based đủ)

---

## v2.0.0 — RAG Research Memory (Phase 4, breaking)

**Theme:** Build research memory layer. Ingest news/earnings/theses, expose semantic search + retrieval-augmented generation pipeline.

### In scope

- **Ingestion pipeline:** news (extend v1.3.3 `vnstock.news` full-text indexing), earnings PDF parse, theses + macro markdown
- **Vector store integration:** adapter pattern — `pgvector`/`Qdrant`/`Weaviate`. Default in-memory toy use, opt-in remote.
- **Embedding:** OpenAI/Cohere/local sentence-transformers (user choice)
- **Semantic search API:**
  - `research.search("Vietcombank Q3 earnings")` → ranked passages
  - `research.context(symbol, query)` → blended structured + retrieved context cho LLM
- **MCP tools:** `search_research`, `get_company_research_context`

### Breaking changes

- New optional peer deps (vector store clients)
- `vnstock.news` API expand: persist + indexing (stateful)
- Config schema migration

### Out of scope

- Research notebook UI — separate project, không phải SDK
- Auto-summarize via LLM — user lo, SDK provide context

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
