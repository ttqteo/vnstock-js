import { SymbolInfo } from "../../models/normalized";
import { getSymbols } from "../../data";

export class Directory {
  static all(): SymbolInfo[] {
    return getSymbols();
  }

  static getBySymbol(symbol: string): SymbolInfo | null {
    var data = getSymbols();
    var upper = symbol.toUpperCase();
    for (var i = 0; i < data.length; i++) {
      if (data[i].symbol.toUpperCase() === upper) {
        return data[i];
      }
    }
    return null;
  }

  static getByExchange(exchange: string): SymbolInfo[] {
    var data = getSymbols();
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

  static getByIndustry(query: string): SymbolInfo[] {
    var data = getSymbols();
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
    var data = getSymbols();
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
      } else if (
        name.indexOf(lower) === 0 ||
        nameEn.indexOf(lower) === 0
      ) {
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
}
