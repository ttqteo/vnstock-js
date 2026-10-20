import { SymbolInfo } from "../../models/normalized";

/** Finds a symbol case-insensitively in the given list. */
export function getBySymbol(data: SymbolInfo[], symbol: string): SymbolInfo | null {
  var upper = symbol.toUpperCase();
  for (var i = 0; i < data.length; i++) {
    if (data[i].symbol.toUpperCase() === upper) {
      return data[i];
    }
  }
  return null;
}

/** Symbols listed on an exchange; HOSE and HSX are the same exchange. */
export function getByExchange(data: SymbolInfo[], exchange: string): SymbolInfo[] {
  var upper = exchange.toUpperCase();
  // Normalize: HOSE is the official name, HSX is what VCI returns
  if (upper === "HOSE") upper = "HSX";
  var results: SymbolInfo[] = [];
  for (var i = 0; i < data.length; i++) {
    if (data[i].exchange.toUpperCase() === upper) {
      results.push(data[i]);
    }
  }
  return results;
}

/** Symbols whose Vietnamese or English industry contains the query. */
export function getByIndustry(data: SymbolInfo[], query: string): SymbolInfo[] {
  var lower = query.toLowerCase();
  var results: SymbolInfo[] = [];
  for (var i = 0; i < data.length; i++) {
    if ((data[i].industry || "").toLowerCase().indexOf(lower) !== -1 || (data[i].industryEn || "").toLowerCase().indexOf(lower) !== -1) {
      results.push(data[i]);
    }
  }
  return results;
}

/**
 * Ranked search over symbol, company name and industry: exact symbol, then symbol prefix,
 * then name prefix, then any substring; VN30 members win ties.
 * @example
 * search(await datasets.symbols(), "fpt", { limit: 5 })
 */
export function search(data: SymbolInfo[], query: string, options?: { limit?: number }): SymbolInfo[] {
  var limit = (options && options.limit) || 10;
  var lower = query.toLowerCase();

  var scored: { item: SymbolInfo; score: number }[] = [];

  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    var score = 0;

    var sym = (item.symbol || "").toLowerCase();
    var name = (item.companyName || "").toLowerCase();
    var nameEn = (item.companyNameEn || "").toLowerCase();
    var ind = (item.industry || "").toLowerCase();
    var indEn = (item.industryEn || "").toLowerCase();

    if (sym === lower) {
      score = 100;
    } else if (sym.indexOf(lower) === 0) {
      score = 80;
    } else if (name.indexOf(lower) === 0 || nameEn.indexOf(lower) === 0) {
      score = 60;
    } else if (
      sym.indexOf(lower) !== -1 ||
      name.indexOf(lower) !== -1 ||
      nameEn.indexOf(lower) !== -1 ||
      ind.indexOf(lower) !== -1 ||
      indEn.indexOf(lower) !== -1
    ) {
      score = 20;
    }

    if (score > 0) {
      if (item.vn30) {
        score += 0.5;
      }
      scored.push({ item: item, score: score });
    }
  }

  scored.sort(function (a, b) {
    return b.score - a.score;
  });

  var results: SymbolInfo[] = [];
  var end = scored.length < limit ? scored.length : limit;
  for (var j = 0; j < end; j++) {
    results.push(scored[j].item);
  }
  return results;
}
