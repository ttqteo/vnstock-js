import { GoldService } from "./gold";
import { ExchangeService } from "./exchange";

export default class Commodity {
  private goldService: GoldService;
  private exchangeService: ExchangeService;

  constructor() {
    this.goldService = new GoldService();
    this.exchangeService = new ExchangeService();
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
