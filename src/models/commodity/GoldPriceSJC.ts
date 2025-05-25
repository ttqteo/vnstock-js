export interface GoldPriceSJC {
  Id: number;
  TypeName: string;
  BranchName: string;
  Buy: string; // Formatted string, e.g., "119,300"
  BuyValue: number; // Raw number value, e.g., 119300000
  Sell: string;
  SellValue: number;
  BuyDiffer: string | null; // Could be null or a string like "+100"
  BuyDifferValue: number;
  SellDiffer: string | null;
  SellDifferValue: number;
  GroupDate: string; // Format: "/Date(...)/"
}
