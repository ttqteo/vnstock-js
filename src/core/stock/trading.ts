import { fetchWithRetry } from "../../pipeline/fetch";
import { applyTransform } from "../../pipeline/transform";
import { tickerChangeTransformConfig } from "../../pipeline/transform/configs/trading";
import { PriceBoardItem, TopStock } from "../../models/normalized";
import { BASE_URL, INTERVAL_MAP } from "../../shared/constants";
import { inputValidation } from "../../shared/utils";

export default class Trading {
  async priceBoard(symbols: string[]): Promise<PriceBoardItem[]> {
    if (!symbols || symbols.length === 0) {
      throw new Error("Symbols array must not be empty");
    }

    const rawData = await fetchWithRetry<any[]>({
      url: `${BASE_URL}/api/price/symbols/getList`,
      method: "POST",
      data: { symbols },
    });

    return rawData.map((raw: any) => {
      const listing = raw.listingInfo || {};
      const match = raw.matchPrice || {};
      const bidAsk = raw.bidAsk || {};

      return {
        symbol: listing.symbol || "",
        companyName: listing.organName || "",
        companyNameEn: listing.enOrganName || "",
        exchange: listing.board || "",
        ceilingPrice: (listing.ceiling || 0) / 1000,
        floorPrice: (listing.floor || 0) / 1000,
        referencePrice: (listing.refPrice || 0) / 1000,
        price: (match.matchPrice || 0) / 1000,
        matchVolume: match.matchVol || 0,
        totalVolume: match.accumulatedVolume || 0,
        totalValue: match.accumulatedValue || 0,
        averagePrice: (match.avgMatchPrice || 0) / 1000,
        highestPrice: (match.highest || 0) / 1000,
        lowestPrice: (match.lowest || 0) / 1000,
        foreignBuyVolume: match.foreignBuyVolume || 0,
        foreignSellVolume: match.foreignSellVolume || 0,
        bidPrices: (bidAsk.bidPrices || []).map((b: any) => ({
          price: (b.price || 0) / 1000,
          volume: b.volume || 0,
        })),
        askPrices: (bidAsk.askPrices || []).map((a: any) => ({
          price: (a.price || 0) / 1000,
          volume: a.volume || 0,
        })),
      } as PriceBoardItem;
    });
  }

  async topGainers(timeFrame: string = "1D"): Promise<TopStock[]> {
    return this._topStocks(timeFrame, 1);
  }

  async topLosers(timeFrame: string = "1D"): Promise<TopStock[]> {
    return this._topStocks(timeFrame, 0);
  }

  private async _topStocks(timeFrame: string, topStockType: number): Promise<TopStock[]> {
    inputValidation(timeFrame);
    const mappedTimeFrame = INTERVAL_MAP[timeFrame as keyof typeof INTERVAL_MAP];

    const rawData = await fetchWithRetry<any[]>({
      url: `${BASE_URL}/api/price-alert-service/api/v1/non-authen/top-stock-change`,
      method: "POST",
      data: {
        topStockType,
        timeFrame: mappedTimeFrame,
        exchangeCode: null,
        stockCodes: null,
      },
    });

    return rawData.map((raw: any) =>
      applyTransform(raw, tickerChangeTransformConfig) as unknown as TopStock
    );
  }
}
