import { TransformConfig } from "../../types";

export const symbolTransformConfig: TransformConfig = {
  fieldMap: {
    id: "id",
    symbol: "symbol",
    type: "type",
    board: "exchange",
    enOrganName: "companyNameEn",
    enOrganShortName: "companyShortNameEn",
    organName: "companyName",
    organShortName: "companyShortName",
  },
  priceFields: [],
  dateFields: [],
  percentFields: [],
};

export const tickerInfoTransformConfig: TransformConfig = {
  fieldMap: {
    ticker: "symbol",
    organName: "companyName",
    enOrganName: "companyNameEn",
    icbName3: "industry",
    enIcbName3: "industryEn",
    icbName2: "sector",
    enIcbName2: "sectorEn",
    icbName4: "subIndustry",
    enIcbName4: "subIndustryEn",
    comTypeCode: "companyType",
    icbCode1: "icbCode1",
    icbCode2: "icbCode2",
    icbCode3: "icbCode3",
    icbCode4: "icbCode4",
  },
  priceFields: [],
  dateFields: [],
  percentFields: [],
};

export const icbTransformConfig: TransformConfig = {
  fieldMap: {
    icbCode: "code",
    level: "level",
    icbName: "name",
    enIcbName: "nameEn",
  },
  priceFields: [],
  dateFields: [],
  percentFields: [],
};
