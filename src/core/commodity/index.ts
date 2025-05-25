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
   *
   * @returns A Promise resolving to an array of GoldPriceV1 objects.
   * @throws Error if the request fails or the response is invalid.
   */
  async goldPrice() {
    return this.goldService.goldPrice();
  }

  /**
   * Fetches the latest gold price from giavang.net API.
   *
   * @returns A Promise resolving to an array of GoldPriceV2 objects.
   * @throws Error if the request fails or the response is invalid.
   */
  async goldPriceV2() {
    return this.goldService.goldPriceV2();
  }

  /**
   * Fetches the latest gold price from SJC API.
   *
   * @returns A Promise resolving to an array of IGoldPriceSJC objects.
   * @throws Error if the request fails or the response is invalid.
   */
  async goldPriceSJC() {
    return this.goldService.goldPriceSJC();
  }

  /**
   * Fetches exchange rates from VCB.
   *
   * @param date Optional date string in YYYY-MM-DD format
   * @returns A Promise resolving to an array of ExchangeRateVCB objects.
   * @throws Error if the request fails or the response is invalid.
   */
  async exchangeRates(date?: string) {
    return this.exchangeService.exchangeRates(date);
  }
}
