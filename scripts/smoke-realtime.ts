/**
 * Manual smoke test: connect to real SSI, verify quote flow.
 *
 * Usage:
 *   pnpm ts-node scripts/smoke-realtime.ts [SYMBOLS] [DURATION_SEC]
 *   default: VCB,FPT,MBB,VNM,ACB for 60 seconds
 *
 * Must be run during VN trading hours (09:00-11:30, 13:00-14:45 VN).
 * Exit code 0 if >= 5 quotes/symbol received, 1 otherwise.
 */
import { RealtimeClient } from "../src/realtime";

const symbols = (process.argv[2] || "VCB,FPT,MBB,VNM,ACB")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const durationSec = parseInt(process.argv[3] || "60", 10);
const MIN_QUOTES_PER_SYMBOL = 5;

const counts: Record<string, number> = {};
symbols.forEach((s) => {
  counts[s] = 0;
});
let errors = 0;

const client = new RealtimeClient({ symbols });

client.on("connected", () => {
  console.log(`[connected] subscribed to ${symbols.join(", ")}`);
});

client.on("quote", (q) => {
  if (counts[q.symbol] !== undefined) {
    counts[q.symbol]++;
  }
});

client.on("error", (err) => {
  errors++;
  console.error(`[error] ${err.message}`);
});

client.on("disconnected", (reason) => {
  console.log(`[disconnected] ${reason}`);
});

client.on("reconnecting", (attempt) => {
  console.log(`[reconnecting] attempt ${attempt}`);
});

client.connect();

setTimeout(() => {
  client.disconnect();

  console.log("\n=== Summary ===");
  console.log(`Duration: ${durationSec}s, Errors: ${errors}`);
  let failed = errors > 0;
  for (const s of symbols) {
    const c = counts[s];
    const ok = c >= MIN_QUOTES_PER_SYMBOL;
    if (!ok) failed = true;
    console.log(`  ${s}: ${c} quotes ${ok ? "OK" : "FAIL (< " + MIN_QUOTES_PER_SYMBOL + ")"}`);
  }

  process.exit(failed ? 1 : 0);
}, durationSec * 1000);
