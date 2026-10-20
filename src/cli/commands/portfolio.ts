import type { Client } from "../../client";
import type { Handler } from "../mcp/handlers";
import type { PortfolioInput, Position } from "../../compute/portfolio";
import { runTool } from "./tool";

export interface PortfolioCmd {
  json: boolean;
  /** add, remove, cash; none shows the holdings. */
  action?: string;
  args?: string[];
  broker?: string;
}

const USAGE = "Dùng: vnstock portfolio add <symbol> <quantity> <cost> [--broker X], remove <symbol>, cash <amount> [--broker X].";

function number(raw: string | undefined, name: string): number {
  const n = Number(raw);
  if (raw === undefined || raw === "" || !isFinite(n)) throw new Error(`Thiếu hoặc sai ${name}. ` + USAGE);
  return n;
}

/** Same symbol and broker: quantities add up and the cost becomes the weighted average. */
function addPosition(positions: Position[], p: Position): Position[] {
  const i = positions.findIndex((x) => x.symbol === p.symbol && (x.broker || "") === (p.broker || ""));
  if (i === -1) return positions.concat([p]);
  const cur = positions[i];
  const quantity = cur.quantity + p.quantity;
  const cost = Math.round((cur.quantity * cur.cost + p.quantity * p.cost) / quantity);
  return positions.map((x, k) => (k === i ? { ...cur, quantity, cost } : x));
}

/**
 * The saved portfolio (~/.vnstock-js/portfolio.json): shows it valued at live prices, or edits
 * it with add, remove and cash, then shows it.
 */
export async function handlePortfolio(client: Client, handlers: Record<string, Handler>, opts: PortfolioCmd): Promise<string> {
  const action = opts.action;
  const args = opts.args || [];
  if (action) {
    if (["add", "remove", "cash"].indexOf(action) === -1) throw new Error(`Hành động không hợp lệ: "${action}". Chọn: add, remove, cash.`);
    const saved: PortfolioInput = await client.portfolio.load();
    let next: PortfolioInput = saved;
    if (action === "add") {
      if (!args[0]) throw new Error("Thiếu symbol. " + USAGE);
      const quantity = number(args[1], "quantity");
      const cost = number(args[2], "cost");
      // No listed stock trades under 500 dong, so this is a price in thousand dong.
      if (cost > 0 && cost < 500) throw new Error(`cost tính bằng đồng: ${cost * 1000}, không phải ${cost}.`);
      const p: Position = { symbol: args[0].toUpperCase(), quantity, cost };
      if (opts.broker) p.broker = opts.broker;
      next = { ...saved, positions: addPosition(saved.positions, p) };
    } else if (action === "remove") {
      if (!args[0]) throw new Error("Thiếu symbol. " + USAGE);
      const sym = args[0].toUpperCase();
      next = { ...saved, positions: saved.positions.filter((x) => !(x.symbol === sym && (!opts.broker || x.broker === opts.broker))) };
    } else {
      const amount = number(args[0], "amount");
      if (!opts.broker) next = { ...saved, cash: amount };
      else {
        const prev = saved.cash;
        const byBroker: Record<string, number> = typeof prev === "number" ? { default: prev } : { ...(prev || {}) };
        byBroker[opts.broker] = amount;
        next = { ...saved, cash: byBroker };
      }
    }
    await client.portfolio.save(next);
  }
  return runTool(handlers, "portfolio_summary", {}, { json: opts.json });
}
