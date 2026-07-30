import { GoldService, GoldPriceResult, GoldPriceSource } from "./gold";
import { ExchangeService } from "./exchange";

export default class Commodity {
  private goldService: GoldService;
  private exchangeService: ExchangeService;

  constructor() {
    this.goldService = new GoldService();
    this.exchangeService = new ExchangeService();
  }

  /**
   * Fetches the latest gold price with explicit source fallback:
   * tries BTMC first, falls back to giavang.net when BTMC is unreachable.
   * Result carries a `source` field so callers know where data came from.
   * Lấy giá vàng với fallback tường minh: thử BTMC trước, lỗi thì chuyển
   * sang giavang.net; kết quả có field `source` cho biết nguồn dữ liệu.
   */
  async goldPrice(options?: { source?: GoldPriceSource | "auto" }): Promise<GoldPriceResult> {
    return this.goldService.goldPrice(options);
  }

  /**
   * Fetches the latest gold price from BTMC API.
   * Lấy giá vàng mới nhất từ API BTMC.
   */
  async goldPriceBTMC() {
    return this.goldService.goldPriceBTMC();
  }

  /**
   * Fetches the latest gold price from giavang.net API.
   * Lấy giá vàng mới nhất từ API giavang.net.
   */
  async goldPriceGiaVangNet() {
    return this.goldService.goldPriceGiaVangNet();
  }

  /**
   * Fetches the latest gold price from SJC API.
   * Lấy giá vàng mới nhất từ API SJC.
   */
  async goldPriceSJC() {
    return this.goldService.goldPriceSJC();
  }

  /**
   * Fetches exchange rates from VCB.
   * Lấy tỷ giá từ VCB.
   */
  async exchangeRates(date?: string) {
    return this.exchangeService.exchangeRates(date);
  }
}
