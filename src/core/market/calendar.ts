import { TradingSession } from "../../models/normalized";
import { getHolidays } from "../../data";

function parseDate(s: string): Date {
  var p = s.split("-");
  return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
}

function formatDate(d: Date): string {
  var y = d.getFullYear();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return y + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
}

export class Calendar {
  isTradeDay(dateStr: string): boolean {
    var d = parseDate(dateStr);
    var dow = d.getDay();
    if (dow === 0 || dow === 6) return false;
    var data = getHolidays();
    var year = String(d.getFullYear());
    var list = data[year] || [];
    return list.indexOf(dateStr) === -1;
  }

  nextTradeDay(dateStr: string): string {
    var d = parseDate(dateStr);
    for (var i = 0; i < 30; i++) {
      d.setDate(d.getDate() + 1);
      var s = formatDate(d);
      if (this.isTradeDay(s)) return s;
    }
    throw new Error("No trade day found within 30 days after " + dateStr);
  }

  prevTradeDay(dateStr: string): string {
    var d = parseDate(dateStr);
    for (var i = 0; i < 30; i++) {
      d.setDate(d.getDate() - 1);
      var s = formatDate(d);
      if (this.isTradeDay(s)) return s;
    }
    throw new Error("No trade day found within 30 days before " + dateStr);
  }

  holidays(year: number): string[] {
    var data = getHolidays();
    return data[String(year)] || [];
  }

  session(): TradingSession {
    return {
      exchange: "HOSE",
      morning: { open: "09:00", close: "11:30" },
      afternoon: { open: "13:00", close: "14:45" },
      ato: "09:00",
      atc: "14:30",
    };
  }
}
