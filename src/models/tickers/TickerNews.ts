export interface TickerNews {
  id: string;
  organCode: string;
  ticker: string;
  newsTitle: string;
  newsSubTitle: string;
  friendlySubTitle: string;
  newsImageUrl: string;
  newsSourceLink: string;
  createdAt: number | null;
  publicDate: number;
  updatedAt: number | null;
  langCode: string;
  newsId: string;
  newsShortContent: string;
  newsFullContent: string;
  closePrice: number;
  referencePrice: number;
  floorPrice: number;
  ceilingPrice: number;
  percentPriceChange: number;
}
