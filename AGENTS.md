# vnstock-js for agents

Vietnam stock market data for JavaScript and TypeScript. This file is for coding agents: the rules
that keep answers correct, then copyable recipes. Every `ts` block here is type-checked in CI.

## Rules

- **Money is dong.** Stock prices, turnover, market cap, foreign flows and financial statements are
  in dong: `127000` is 127,000 VND. Never multiply or divide by 1000 to "fix" units.
- **Indices are points.** `vn.index('VNINDEX')` returns levels such as `1705.91`.
- **Price change percent is a percent number**: `changePct: 0.95` means 0.95%.
- **Financial ratios are fractions**: `roe: 0.15` means 15%, so filter with `{ roe: { gt: 0.15 } }`.
- **The parameter is always `symbol`**, case-insensitive. `HSX` means `HOSE`.
- **Time is ICT (UTC+7).** Daily bars carry `time: "2026-10-16"`, intraday bars
  `time: "2026-10-16T09:15:00+07:00"`. Bars have `time`, never `date`.
- **Ranges**: `1d 5d 1mo 3mo 6mo ytd 1y 2y 5y max`, or `{ from, to }` with `YYYY-MM-DD`.
  `6m` is not a range; it is `6mo`.
- **Intervals**: `1m 5m 15m 30m 1h 1d 1w 1mo`.
- **No init.** Import `vn` and call it; symbols and holidays load on first use.
- **Browsers need a proxy.** Mount `nextHandler()` (or `workerHandler()`, `expressHandler()`) from
  `vnstock-js/proxy` and use `createClient({ proxy: '/api/vnstock' })`.
- **Errors carry `code` and usually `hint`.** Show the hint to the user: an unknown symbol says
  `Did you mean "FPT"?`, a v1-style range says which range to use.
- **Foreign flow**: `foreign()` is the current session; `foreign('3mo')` is recorded history, which
  starts in 2026 (earlier sessions are absent, not zero).
- **Backtest `tp`, `sl` and `ret` are percent** (`tp: 7` is +7%); `winRate` is a fraction.
- **Upgrading v1 code**: `MIGRATION.md` in the package maps every v1 call and unit to v2.
- **Screening needs a universe**: `group` (VN30, HNX30...) or `exchange` (HOSE, HNX, UPCOM).
- Indicators live in `vnstock-js/indicators`, take `Bar[]` and make no network calls.

## Recipes

### Price and history

```ts
import { vn } from 'vnstock-js'
import { sma, rsi } from 'vnstock-js/indicators'

const fpt = vn.stock('FPT')
const quote = await fpt.price()
const bars = await fpt.history('6mo')
const lastSma20 = sma(bars, { period: 20 }).at(-1)?.sma
const lastRsi = rsi(bars).at(-1)?.rsi

console.log(`${quote.symbol} ${quote.price} dong (${quote.changePct}%), SMA20 ${lastSma20}, RSI ${lastRsi}`)
```

### Market overview

```ts
import { vn } from 'vnstock-js'

const m = await vn.market({ exchange: 'HOSE' })
const health = await vn.index('VNINDEX').health()

console.log(`${m.index.symbol} ${m.index.close} points, turnover ${m.liquidity.value} dong`)
console.log(`advancing ${m.breadth.advancing}, declining ${m.breadth.declining}, foreign net ${m.foreign.netValue} dong`)
console.log(`market status ${health.status}, ${health.distributionCount} distribution days`)
```

For an LLM, `vn.market({ asOf })` and `vn.stock(s).context()` return structured context, and
`vn.stock(s).prompt()` returns it as text with prices printed as `125.8k`.

### Screening

```ts
import { vn } from 'vnstock-js'

const rows = await vn.screen({
  group: 'VN30',
  where: { pe: { lt: 15 }, roe: { gt: 0.15 } },
  sort: '-roe',
  limit: 10,
})
for (const r of rows) console.log(r.symbol, r.pe, r.roe, r.marketCap)
```

### Portfolio

`cost` is the average price per share in dong (`120000`, not `120`). `pnlPct` is percent,
`weight` a fraction of NAV. Positions without `broker` and cash given as one number go under `"default"`.

```ts
import { vn } from 'vnstock-js'

const p = await vn.portfolio({
  positions: [
    { symbol: 'FPT', quantity: 100, cost: 120000, broker: 'DNSE' },
    { symbol: 'HPG', quantity: 500, cost: 28000 },
  ],
  cash: 5000000,
})
for (const pos of p.positions) console.log(pos.symbol, pos.value, pos.pnlPct, pos.weight)
console.log(p.totals.nav, p.byIndustry)

await vn.portfolio.save({ positions: p.positions.map(({ symbol, quantity, cost }) => ({ symbol, quantity, cost })) })
```

### Foreign flow history

`foreign()` without arguments is the current session. With a range it returns one row per recorded
session, oldest first, in dong. Recording began in 2026; earlier sessions are absent, not zero.

```ts
import { vn } from 'vnstock-js'

const days = await vn.stock('FPT').foreign('3mo')
const net = days.reduce((sum, d) => sum + d.netValue, 0)
const market = await vn.market.foreign({ range: '1mo', exchange: 'ALL' })
console.log(net, market.map((d) => [d.date, d.netValue]))
```

### Live prices

`watch()` returns a stop function; call it, or the process keeps running. Use `mode: 'poll'` on
serverless hosts and in browsers.

```ts
import { vn } from 'vnstock-js'

const stop = vn.watch(['FPT', 'VCB'], (t) => console.log(t.symbol, t.price, t.changePct), {
  onError: (e) => console.error(e.message),
})
setTimeout(stop, 30000)
```

### Alerts

`alert()` runs on `watch()` and returns a stop function. `'breakout'` fires once per session when the
price trades above the highest high of the previous `lookback` sessions (default 20); a function
fires each time it turns from false to true. Nothing is persisted.

```ts
import { vn } from 'vnstock-js'

const stop = vn.stock('FPT').alert({ when: 'breakout', lookback: 20 }, (e) => console.log(e.price, e.level))
setTimeout(stop, 30000)
```

### Intraday dashboard

`vn.market.intraday()` gives session turnover by minute against the previous session at the same
clock time, plus breadth now. Intraday `Bar.value` from `history({ from, interval: '1m' })` is the
session total so far, not the minute's own turnover.

```ts
import { vn } from 'vnstock-js'

const d = await vn.market.intraday()
for (const p of d.points) console.log(p.time, p.close, p.value, p.valuePrevious)
```

### Backtest

`tp`, `sl` and `ret` are percent (`tp: 7` is +7%). Entry is the next session's open; a session that
touches both levels counts as the stop. One open trade per symbol unless `overlap: true`. A signal
gets only the bars up to the session it judges; return `true`, a tag string, or a falsy value.
Presets: `'breakout'`, `'oversold_bounce'`, `'ema_cross'`.

```ts
import { vn } from 'vnstock-js'

const r = await vn.backtest(['FPT', 'VCB'], 'oversold_bounce', { tp: 5, sl: 3, hold: 10, range: '2y' })
console.log(r.stats.all.winRate, r.stats.all.avgRet, r.trades.slice(0, 3))

const s = await vn.stock('FPT').similar({ top: 10 })
console.log(s.summary.ret20.avg, s.matches[0]?.time)
```
