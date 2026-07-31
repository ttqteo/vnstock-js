export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export const tools: ToolSchema[] = [
  {
    name: "get_quote",
    description:
      "Lấy giá cổ phiếu Việt Nam hiện tại (snapshot). Trả về giá khớp, % thay đổi, khối lượng, giá trần/sàn/tham chiếu. " +
      "Dùng khi user hỏi 'giá VCB hôm nay', 'FPT bao nhiêu', 'cổ phiếu X tăng hay giảm'. " +
      "EN: Get current Vietnam stock quote. Returns matched price, change%, volume, ceiling/floor/reference prices.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Mã cổ phiếu (3-4 chữ cái, VD: VCB, FPT, VNM)" },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_history",
    description:
      "Lấy lịch sử giá OHLCV của 1 mã. Hỗ trợ relative date (7d/1w/1m/1y) hoặc absolute (YYYY-MM-DD). " +
      "Dùng khi user hỏi 'giá VCB 7 ngày qua', 'lịch sử FPT tháng trước'. " +
      "EN: Get OHLCV price history for a Vietnam stock symbol.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Mã cổ phiếu" },
        from: { type: "string", description: "YYYY-MM-DD ngày bắt đầu (mặc định: 30 ngày trước)" },
        to: { type: "string", description: "YYYY-MM-DD ngày kết thúc (mặc định: hôm nay)" },
        limit: { type: "number", description: "Số phiên tối đa trả về (mặc định 30)" },
      },
      required: ["symbol"],
    },
  },
  {
    name: "search_symbols",
    description:
      "Tìm mã cổ phiếu theo tên hoặc ticker (fuzzy). Dùng khi user hỏi 'mã của Vinamilk', 'các ngân hàng niêm yết'. " +
      "EN: Search Vietnam stock symbols by name or ticker. Fuzzy, relevance-ranked.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Tên công ty hoặc ticker" },
        limit: { type: "number", description: "Kết quả tối đa (mặc định 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_symbols",
    description:
      "Liệt kê mã cổ phiếu theo sàn. Dùng khi user hỏi 'có bao nhiêu mã trên HOSE', 'liệt kê mã HNX'. " +
      "EN: List Vietnam stock symbols by exchange.",
    inputSchema: {
      type: "object",
      properties: {
        exchange: { type: "string", description: "HOSE/HSX, HNX, hoặc UPCOM (bỏ qua = toàn bộ)" },
        limit: { type: "number", description: "Số mã tối đa" },
      },
    },
  },
  {
    name: "top_movers",
    description:
      "Lấy mã tăng mạnh và giảm mạnh hôm nay. Trả về cả gainers và losers. " +
      "EN: Get today's top gainers and losers on Vietnam market.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Số mã mỗi bên (mặc định 10)" },
      },
    },
  },
  {
    name: "is_trade_day",
    description:
      "Kiểm tra 1 ngày có phải ngày giao dịch của TTCK VN không (loại trừ thứ 7/CN và ngày nghỉ lễ). " +
      "EN: Check if a date is a Vietnam stock market trading day.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD (mặc định hôm nay)" },
      },
    },
  },
  {
    name: "get_trading_calendar",
    description:
      "Lấy danh sách ngày nghỉ lễ TTCK VN trong năm. " +
      "EN: Get Vietnam stock market holiday schedule for a year.",
    inputSchema: {
      type: "object",
      properties: {
        year: { type: "number", description: "Năm 4 chữ số (VD: 2026)" },
      },
      required: ["year"],
    },
  },
  {
    name: "get_company_info",
    description:
      "Lấy thông tin công ty: tên đầy đủ, sàn niêm yết, ngành. " +
      "EN: Get Vietnam company profile: name, exchange, industry.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Mã cổ phiếu" },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_dividends",
    description:
      "Lấy lịch sử & lịch chia cổ tức của 1 mã (tiền mặt + cổ phiếu). " +
      "Trả về loại cổ tức, tỉ lệ/giá trị, ngày giao dịch không hưởng quyền (GDKHQ/exRightDate), ngày chốt danh sách (recordDate). " +
      "Dùng khi user hỏi 'ACB chia cổ tức khi nào', 'lịch cổ tức VNM', 'cổ tức năm nay của FPT'. " +
      "EN: Get dividend history & schedule (cash + stock) for a Vietnam stock: type, ratio, ex-rights date, record date.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Mã cổ phiếu" },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_corporate_events",
    description:
      "Lấy tất cả sự kiện doanh nghiệp của 1 mã: cổ tức, ĐHCĐ, phát hành thêm, niêm yết, giao dịch nội bộ... " +
      "Mỗi sự kiện gồm loại (eventType), tiêu đề, ngày GDKHQ, ngày chốt quyền, tỉ lệ/giá trị. " +
      "Dùng khi user hỏi 'sự kiện sắp tới của HPG', 'lịch ĐHCĐ VCB', 'VCB có sự kiện gì'. " +
      "EN: Get all corporate events for a Vietnam stock: dividends, AGM, issuance, insider deals, with ex-rights/record dates.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Mã cổ phiếu" },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_ai_context",
    description:
      "Lấy bối cảnh phân tích kỹ thuật cho 1 mã, dạng structured JSON. " +
      "Bao gồm trend (bullish/bearish/neutral), indicators (RSI, MACD, SMA20/50/200, EMA, ATR, Bollinger, SuperTrend, Ichimoku Cloud), " +
      "support/resistance pivot, volume signal, %change 1d/7d/30d/90d. " +
      "Dùng khi user hỏi 'phân tích kỹ thuật VCB', 'VCB đang xu hướng gì'. " +
      "EN: Get pre-computed technical analysis context for a Vietnam stock symbol.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Mã cổ phiếu" },
        lookback: { type: "number", description: "Số phiên lịch sử (mặc định 200)" },
        as_of: {
          type: "string",
          description:
            "YYYY-MM-DD. Tính chỉ báo như thể đang đứng ở cuối phiên đó, dùng khi viết báo cáo trễ ngày. Mặc định: phiên gần nhất",
        },
      },
      required: ["symbol"],
    },
  },
  {
    name: "to_ai_prompt",
    description:
      "Tương tự get_ai_context nhưng trả plain-text format optimize cho LLM context window. " +
      "Include: trend, RSI, MACD, SMA/EMA, ATR, Bollinger, SuperTrend, Ichimoku Cloud, support/resistance, volume, performance. " +
      "Dùng khi user export context để dán vào GPT/Gemini bên ngoài. " +
      "EN: Same as get_ai_context but returns plain-text formatted for LLM context window.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Mã cổ phiếu" },
        lang: { type: "string", description: "vi (mặc định) hoặc en" },
        as_of: {
          type: "string",
          description: "YYYY-MM-DD. Tính như thể đang đứng ở cuối phiên đó. Mặc định: phiên gần nhất",
        },
      },
      required: ["symbol"],
    },
  },
  {
    name: "compare_symbols",
    description:
      "So sánh nhiều mã cùng lúc: giá, % change, RSI, volume signal. " +
      "Dùng khi user hỏi 'so sánh VCB và TCB', '3 ngân hàng top'. " +
      "EN: Compare multiple Vietnam stocks side-by-side: price, change%, RSI, volume signal.",
    inputSchema: {
      type: "object",
      properties: {
        symbols: {
          type: "array",
          items: { type: "string" },
          description: "Mảng mã cổ phiếu (2-10)",
        },
      },
      required: ["symbols"],
    },
  },
  {
    name: "get_market_breadth",
    description:
      "Độ rộng thị trường một sàn: số mã tăng / giảm / đứng giá / trần / sàn, và tỷ lệ tăng-giảm. " +
      "Dùng khi user hỏi 'thị trường hôm nay thế nào', 'bao nhiêu mã tăng', 'độ rộng thị trường'. " +
      "EN: Market breadth for one exchange: advancing / declining / unchanged / ceiling / floor counts.",
    inputSchema: {
      type: "object",
      properties: {
        exchange: {
          type: "string",
          description: "HOSE (mặc định), HNX, UPCOM, hoặc ALL cho cả ba sàn",
        },
      },
    },
  },
  {
    name: "get_foreign_flow",
    description:
      "Giao dịch khối ngoại. Không truyền symbol thì trả mức thị trường: tổng mua/bán/ròng theo tỷ VND, " +
      "kèm top mã mua ròng và bán ròng. Truyền symbol thì trả riêng mã đó. " +
      "Dùng khi user hỏi 'khối ngoại mua bán gì', 'nước ngoài bán ròng bao nhiêu', 'khối ngoại với VCB'. " +
      "LƯU Ý: chỉ có phiên hiện tại, nguồn dữ liệu không cung cấp lịch sử khối ngoại theo ngày. " +
      "EN: Foreign investor flow, current session only. Market-wide with top net buy/sell, or a single symbol.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Mã cổ phiếu. Bỏ trống để lấy mức thị trường" },
        exchange: { type: "string", description: "HOSE (mặc định), HNX, UPCOM, ALL" },
        top: { type: "number", description: "Số mã trong top mua/bán ròng (mặc định 10)" },
      },
    },
  },
  {
    name: "get_market_context",
    description:
      "Bối cảnh thị trường dạng structured JSON cho AI reasoning, tương đương get_ai_context nhưng ở mức thị trường. " +
      "Gồm: chỉ số VN-Index (đơn vị điểm), regime (trending_up/trending_down/sideways), " +
      "thanh khoản phiên so với trung bình 20 phiên, độ rộng thị trường, khối ngoại. " +
      "Dùng khi user hỏi 'thị trường đang thế nào', 'nên vào tiền chưa', 'bối cảnh vĩ mô thị trường'. " +
      "EN: Market-level context for AI reasoning: index, regime, liquidity vs 20-session norm, breadth, foreign flow.",
    inputSchema: {
      type: "object",
      properties: {
        exchange: { type: "string", description: "HOSE (mặc định), HNX, UPCOM, ALL" },
        index: { type: "string", description: "VNINDEX (mặc định), VN30, HNXIndex..." },
        as_of: {
          type: "string",
          description:
            "YYYY-MM-DD. Lưu ý: với ngày quá khứ thì độ rộng và khối ngoại trả null, vì nguồn chỉ có phiên hiện tại",
        },
      },
    },
  },
  {
    name: "get_news",
    description:
      "Tin tức tài chính Việt Nam theo ngày, tổng hợp từ Vietstock, VnExpress, Tin Nhanh Chứng Khoán và các nguồn khác. " +
      "Lọc được theo nguồn hoặc từ khóa. Dùng khi user hỏi 'tin tức hôm nay', 'có tin gì về VCB', 'thị trường có gì mới'. " +
      "EN: Vietnamese financial news for a given date, filterable by source or keyword.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD. Mặc định: hôm nay" },
        source: { type: "string", description: "Lọc theo nguồn, ví dụ Vietstock" },
        keyword: { type: "string", description: "Lọc theo từ khóa trong tiêu đề và tóm tắt" },
        limit: { type: "number", description: "Số tin tối đa (mặc định 20)" },
      },
    },
  },
  {
    name: "get_financials",
    description:
      "Báo cáo tài chính của một mã: bảng cân đối kế toán, kết quả kinh doanh, hoặc lưu chuyển tiền tệ. " +
      "Dùng khi user hỏi 'doanh thu VCB', 'lợi nhuận FPT quý này', 'tài sản của HPG', 'dòng tiền MWG'. " +
      "EN: Financial statements for a Vietnam stock: balance sheet, income statement, or cash flow.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Mã cổ phiếu" },
        report: {
          type: "string",
          description:
            "balance_sheet (mặc định), income_statement, hoặc cash_flow",
        },
        period: { type: "string", description: "quarter (mặc định) hoặc year" },
      },
      required: ["symbol"],
    },
  },
  {
    name: "screen_stocks",
    description:
      "Sàng lọc cổ phiếu theo chỉ số tài chính: PE, PB, PS, ROE, ROA, ROIC, vốn hóa, tỷ suất cổ tức, biên lợi nhuận gộp, nợ trên vốn chủ. " +
      "Lọc được cả theo giá, khối lượng, giá trị giao dịch. " +
      "BẮT BUỘC chỉ định phạm vi bằng group (VN30, HNX30) hoặc exchange (HOSE, HNX, UPCOM), vì chỉ số phải lấy theo từng mã. " +
      "Dùng khi user hỏi 'cổ phiếu VN30 PE dưới 15 ROE trên 20%', 'ngân hàng nào định giá rẻ'. " +
      "EN: Screen Vietnam stocks by financial ratios within a required universe (group or exchange).",
    inputSchema: {
      type: "object",
      properties: {
        group: { type: "string", description: "VN30, HNX30, VN100... Ưu tiên hơn exchange" },
        exchange: { type: "string", description: "HOSE, HNX, UPCOM" },
        filters: {
          type: "array",
          description:
            'Mảng điều kiện { field, operator, value }. field rẻ (từ bảng giá): price, volume, value, changePercent. field đắt (phải gọi thêm): pe, pb, ps, roe, roa, roic, marketCap, dividendYield, debtToEquity, grossMargin, currentRatio. operator: <, >, <=, >=, =. Ví dụ: [{"field":"pe","operator":"<","value":15}]',
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              operator: { type: "string" },
              value: { type: "number" },
            },
            required: ["field", "operator", "value"],
          },
        },
        sort_by: { type: "string", description: "Trường để sắp xếp, ví dụ roe" },
        order: { type: "string", description: "desc (mặc định) hoặc asc" },
        limit: { type: "number", description: "Số kết quả (mặc định 20)" },
      },
    },
  },
  {
    name: "get_gold_price",
    description:
      "Giá vàng trong nước. Tự dự phòng nguồn: thử BTMC trước, lỗi thì chuyển GiaVang.net. " +
      "Dùng khi user hỏi 'giá vàng hôm nay', 'vàng SJC bao nhiêu'. " +
      "EN: Vietnam gold prices with automatic source fallback.",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "auto (mặc định), btmc, hoặc giavangnet" },
      },
    },
  },
  {
    name: "get_exchange_rate",
    description:
      "Tỷ giá ngoại tệ Vietcombank: mua tiền mặt, mua chuyển khoản, bán. " +
      "Dùng khi user hỏi 'tỷ giá USD hôm nay', '1 euro bao nhiêu tiền Việt'. " +
      "EN: Vietcombank foreign exchange rates.",
    inputSchema: {
      type: "object",
      properties: {
        currency: { type: "string", description: "Lọc theo mã tiền tệ, ví dụ USD. Bỏ trống là tất cả" },
        date: { type: "string", description: "YYYY-MM-DD. Mặc định: hôm nay" },
      },
    },
  },
  {
    name: "watchlist",
    description:
      "Quản lý danh sách mã theo dõi, lưu tại ~/.vnstock-js/watchlist.json. " +
      "Hành động: list_all (liệt kê các danh sách), list (xem mã trong một danh sách), create, delete, add, remove, quote (lấy giá tất cả mã trong danh sách). " +
      "Dùng khi user nói 'thêm VCB vào danh sách theo dõi', 'danh mục của tôi thế nào'. " +
      "EN: Manage watchlists persisted on disk, and quote every symbol in one.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "list_all, list, create, delete, add, remove, quote",
        },
        name: { type: "string", description: "Tên danh sách. Bắt buộc trừ action list_all" },
        symbols: {
          type: "array",
          items: { type: "string" },
          description: "Mã cần thêm hoặc bỏ, dùng với action add và remove",
        },
      },
      required: ["action"],
    },
  },
];
