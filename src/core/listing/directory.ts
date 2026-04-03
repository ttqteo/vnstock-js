import { SymbolInfo } from "../../models/normalized";

var _cache: SymbolInfo[] | null = null;

function loadData(): SymbolInfo[] {
  if (!_cache) {
    _cache = require("../../../data/symbols.json") as SymbolInfo[];
  }
  return _cache;
}

export class Directory {
  static all(): SymbolInfo[] {
    return loadData();
  }

  static getBySymbol(symbol: string): SymbolInfo | null {
    var data = loadData();
    var upper = symbol.toUpperCase();
    for (var i = 0; i < data.length; i++) {
      if (data[i].symbol.toUpperCase() === upper) {
        return data[i];
      }
    }
    return null;
  }

  static getByExchange(exchange: string): SymbolInfo[] {
    var data = loadData();
    var upper = exchange.toUpperCase();
    var results: SymbolInfo[] = [];
    for (var i = 0; i < data.length; i++) {
      if (data[i].exchange.toUpperCase() === upper) {
        results.push(data[i]);
      }
    }
    return results;
  }

  static getByIndustry(query: string): SymbolInfo[] {
    var data = loadData();
    var lower = query.toLowerCase();
    var results: SymbolInfo[] = [];
    for (var i = 0; i < data.length; i++) {
      if (
        (data[i].industry || "").toLowerCase().indexOf(lower) !== -1 ||
        (data[i].industryEn || "").toLowerCase().indexOf(lower) !== -1
      ) {
        results.push(data[i]);
      }
    }
    return results;
  }

  static search(
    query: string,
    options?: { limit?: number }
  ): SymbolInfo[] {
    var data = loadData();
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

      // Exact symbol match
      if (sym === lower) {
        score = 100;
      } else if (sym.indexOf(lower) === 0) {
        // Symbol startsWith
        score = 80;
      } else if (
        name.indexOf(lower) === 0 ||
        nameEn.indexOf(lower) === 0
      ) {
        // Name startsWith
        score = 60;
      } else if (
        sym.indexOf(lower) !== -1 ||
        name.indexOf(lower) !== -1 ||
        nameEn.indexOf(lower) !== -1 ||
        ind.indexOf(lower) !== -1 ||
        indEn.indexOf(lower) !== -1
      ) {
        // Includes anywhere
        score = 20;
      }

      if (score > 0) {
        // VN30 boost: +0.5 within same tier
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
}
