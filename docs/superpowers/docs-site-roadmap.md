# vnstock-js-docs — Site Roadmap

**Last updated:** 2026-04-14
**Related:** [BACKLOG.md](BACKLOG.md) — SDK roadmap, cross-referenced từ đây

Repo: `../vnstock-js-docs` (Next.js 16 + MDX, deploy Vercel)

Docs site không chỉ là reference API — nó đóng **3 vai trò**:

1. **Docs** — reference API, installation, quickstart, changelog (hiện đã có)
2. **Cookbook live** — mỗi SDK feature có 1 widget chạy thật + code snippet copy-paste ready. Target audience: non-coder xem output, dev copy code, AI đọc examples
3. **Trust hub** — changelog discipline, `/status` page (health, freshness, uptime), stability tags, data source alerts

---

## Track 1 — Cookbook widgets (live code + output)

Mở rộng `/finance` hiện có. Mỗi widget = 1 use case với code snippet hiển thị trực tiếp bên cạnh output.

### Current state (2026-04-14)

Đã có trên `/finance`:
- Stock lookup (search + chart + price info)
- Favorites (localStorage)
- VN-Index / HNX / UPCOM cards
- Top gainers/losers
- Gold prices
- News feed

### Roadmap theo SDK release

| SDK version | Widgets thêm vào docs |
|---|---|
| **v1.3.x** (now) | Quote/history/search — expand hiện có với code snippets inline ready-to-copy |
| **v1.4 ships** | Watchlist editor UI (add/remove, persist), `compareSymbols` comparison table, Portfolio tracker (nhập positions, show P/L) |
| **v1.5 ships** | CLI terminal demo (Xterm.js embedded — user chạy `vnstock quote VCB` ngay trên site), config file editor UI |
| **v1.6 ships** | Screener UI (filter by PE/PB/ROE), fundamentals dashboard (income/balance/cashflow tabs), sector breakdown pie |

### Pattern cho mỗi widget

```
┌─────────────────────────────────────────────────┐
│  Live output (table, chart, or card)            │
├─────────────────────────────────────────────────┤
│  ```ts                                          │
│  // Code snippet — copy to run locally          │
│  import vnstock from "vnstock-js";              │
│  await vnstock.init();                          │
│  const data = await vnstock.quickQuote("VCB");  │
│  ```                                            │
│  [Copy] [Open in StackBlitz]                    │
└─────────────────────────────────────────────────┘
```

- Code snippet phải **chạy được 1-1 với output** — không abstract, không hide detail
- "Copy" → clipboard
- "Open in StackBlitz" (optional, Phase 2) → spawn StackBlitz project pre-configured

---

## Track 2 — Content & Education

### Cookbook MD (trong repo chính `vnstock-js/examples/`)

Standalone scripts, clone là chạy:

- [ ] `examples/watchlist-dashboard.ts` — 30-line dashboard terminal
- [ ] `examples/daily-portfolio-email.ts` — cron-compatible, send email với giá EOD
- [ ] `examples/sma-backtest.ts` — backtest SMA strategy đơn giản
- [ ] `examples/slack-realtime-stream.ts` — stream quote qua Slack webhook
- [ ] `examples/nextjs-quickstart/` — folder với Next.js app template
- [ ] `examples/cli-scripts/` — 10 bash one-liners dùng `vnstock` CLI

### Blog posts (trên `vnstock-js-docs/blog`)

Release-triggered:
- [ ] v1.4 release — "Watchlist + Portfolio trong vnstock-js"
- [ ] v1.5 release — "Hoàn thiện CLI vnstock-js"
- [ ] v1.6 release — "Phân tích cơ bản với vnstock-js"

Evergreen / SEO:
- [ ] "10 lệnh terminal cho nhà đầu tư VN" (push khi v1.3 CLI ra)
- [ ] "Xây app theo dõi cổ phiếu với 50 dòng JS"
- [ ] "vnstock-js vs Python vnstock: khi nào chọn cái nào"
- [ ] "CLI đầu tiên cho thị trường chứng khoán VN"

### Video (YouTube)

- [ ] Quickstart 3 phút — từ `npm install` đến first quote
- [ ] CLI screencast — demo 4 commands
- [ ] Use case story — "Trader A dùng vnstock-js để tracking watchlist hàng ngày"

### Template repos (GitHub, standalone)

- [ ] `vnstock-js-starter-nextjs` — fork-clone-deploy Next.js app với dashboard cơ bản
- [ ] `vnstock-js-starter-cli-scripts` — collection of useful shell scripts

### Community

- GitHub Discussions: enable, seed 3-5 questions khởi đầu
- Telegram/Discord: chưa làm ngay, đợi có traffic

---

## Track 3 — Trust hub

Làm `vnstock-js` trông như **hạ tầng** thay vì utility.

### Changelog discipline

- [ ] Enforce Keep-a-Changelog format: `Breaking / Added / Changed / Fixed`
- [ ] Auto-generate draft changelog từ commits (Conventional Commits đã dùng)
- [ ] Every patch release có entry — không skip version

### Stability tags

- [ ] JSDoc `@stable` / `@experimental` cho từng public API
- [ ] Render trong docs site — badge cạnh API name
- [ ] Rule: `@experimental` có thể break trong minor; `@stable` follow semver

### Versioned schemas

- [ ] Document schema versioning policy — hiện tại schema = `vnstock-js` version
- [ ] Future (v2+): `QuoteHistory.v1` vs `v2` coexist với clear migration

### `/status` page trên docs site

Trang mới `/status`:
- [ ] **Data freshness** — khi nào `master/data/symbols.json` update lần cuối (từ GitHub commit timestamp)
- [ ] **API uptime** — fetch VCI priceBoard test mỗi 5 phút, plot last 24h (cần backend nhẹ hoặc GitHub Actions cron)
- [ ] **Latency baseline** — p50/p95 của fetch VCI
- [ ] **Test coverage badge** — link tới CI coverage report
- [ ] **Known issues** — list bug active từ GitHub Issues

### Data source change alerts

- [ ] GitHub Actions workflow watch `master/data/*.json`
- [ ] Nếu schema (keys) thay đổi giữa runs → auto-open issue, notify maintainer
- [ ] Publish alerts vào `/status` page

### Deprecation policy

- [ ] Tối thiểu 1 minor release warning trước khi xóa public API
- [ ] Deprecation warnings log qua `console.warn` với migration link
- [ ] Document trong CONTRIBUTING.md

### Semver breaking-change detection

- [ ] CI check: PR nào thay đổi public API shape → require major bump
- [ ] Tool: `api-extractor` (Microsoft), hoặc custom TypeScript compiler diff

---

## Infrastructure docs (on-site pages)

Thêm vào routes-config:

- `/status` — trust hub (Track 3)
- `/changelog` — existing, enforce format
- `/deprecation` — active deprecations với migration guide
- `/roadmap` — public version của SDK roadmap (subset từ BACKLOG.md, không expose specs/plans)

---

## Success metrics

Đo cho toàn bộ 3 tracks:

- **Docs traffic:** pageviews weekly
- **Blog engagement:** time on page, share count
- **Cookbook adoption:** stars trên starter templates, fork count
- **Trust signals:** /status page views, changelog page views
- **Funnel:** visitor → docs → install (`npm install` weekly)

---

## Priority khuyến nghị

Nếu làm tuần tự (không song song nhiều tracks):

1. **Ngay sau v1.3.2 ship** → Track 1 (expand `/finance` với code snippets inline), Track 3 changelog discipline
2. **Trong khi dev v1.4** → Track 2 cookbook MD (watchlist example, portfolio example)
3. **Khi v1.4 ship** → Track 1 widget (watchlist UI), Track 2 blog post v1.4
4. **Khi v1.5 ship** → Track 1 CLI demo (Xterm.js), Track 2 "10 lệnh terminal" blog
5. **Continuous** → Track 3 `/status` page (CI cron + data freshness)

---

## Out of scope (chưa planned, không làm)

- Authenticated user accounts / saved watchlists server-side (dùng localStorage thôi)
- Paid tier / premium features
- Mobile native app — responsive web đủ
- i18n English — sau khi traffic VN đủ lớn
- Chatbot / AI assistant trên site
