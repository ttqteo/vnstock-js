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
];
