import { fetchWithRetry } from "../../pipeline/fetch";
import { applyTransform } from "../../pipeline/transform";
import { goldBtmcTransformConfig, goldGiaVangTransformConfig, goldSjcTransformConfig } from "../../pipeline/transform/configs/commodity";
import { GoldPriceBtmc, GoldPriceGiaVang, GoldPriceSjc } from "../../models/normalized";

export type GoldPriceSource = "btmc" | "giavangnet";

export interface GoldPriceResult {
  source: GoldPriceSource;
  data: GoldPriceBtmc[] | GoldPriceGiaVang[];
}

export class GoldService {
  async goldPrice(options?: { source?: GoldPriceSource | "auto" }): Promise<GoldPriceResult> {
    var source = (options && options.source) || "auto";
    if (source === "btmc") {
      return { source: "btmc", data: await this.goldPriceBTMC() };
    }
    if (source === "giavangnet") {
      return { source: "giavangnet", data: await this.goldPriceGiaVangNet() };
    }
    try {
      return { source: "btmc", data: await this.goldPriceBTMC() };
    } catch (error) {
      return { source: "giavangnet", data: await this.goldPriceGiaVangNet() };
    }
  }

  async goldPriceBTMC(): Promise<GoldPriceBtmc[]> {
    const rawData = await fetchWithRetry<any>({
      url: "http://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=3kd8ub1llcg9t45hnoh8hmn7t5kc2v",
      method: "GET",
    });

    const dataList = rawData?.DataList?.Data || [];
    return dataList.map((item: any, index: number) => {
      const raw = {
        name: item[`@n_${index + 1}`],
        kara: item[`@k_${index + 1}`],
        vol: item[`@h_${index + 1}`],
        buy: item[`@pb_${index + 1}`],
        sell: item[`@ps_${index + 1}`],
        world: item[`@pt_${index + 1}`],
        updatedAt: item[`@d_${index + 1}`],
      };
      return applyTransform(raw, goldBtmcTransformConfig) as unknown as GoldPriceBtmc;
    });
  }

  async goldPriceGiaVangNet(): Promise<GoldPriceGiaVang[]> {
    const codes = ["XAUUSD","USDX","SJL1L10","DOHNL","DOHCML","BTSJC","PQHNVM","VNGSJC","VIETTINMSJC","VNGN","BT9999NTT","PQHN24NTT","DOJINHTV","SJ9999"];
    const codesParam = codes.map(c => `codes[]=${c}`).join("&");
    const rawData = await fetchWithRetry<any>({
      url: `https://api2.giavang.net/v1/gold/last-price?${codesParam}`,
      method: "GET",
    });
    const dataList = rawData?.data || [];
    return (Array.isArray(dataList) ? dataList : []).map(
      (item: any) => applyTransform(item, goldGiaVangTransformConfig) as unknown as GoldPriceGiaVang
    );
  }

  /**
   * @deprecated Since v1.4.1. SJC endpoint returns HTTP 403 from non-Vietnam IPs
   *             (Cloudflare/WAF block). Use `goldPriceBTMC()` or `goldPriceGiaVangNet()` instead.
   *             Method retained for backwards compat; may be removed in v2.0.
   */
  async goldPriceSJC(): Promise<GoldPriceSjc[]> {
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        "[vnstock-js] goldPriceSJC() is deprecated: SJC endpoint returns 403 from non-VN IPs. " +
        "Use goldPriceBTMC() or goldPriceGiaVangNet() instead."
      );
    }
    const rawData = await fetchWithRetry<any>({
      url: "https://sjc.com.vn/GoldPrice/Services/PriceService.ashx",
      method: "GET",
    });

    const dataList = rawData?.data || rawData || [];
    return (Array.isArray(dataList) ? dataList : []).map(
      (item: any) => applyTransform(item, goldSjcTransformConfig) as unknown as GoldPriceSjc
    );
  }
}
