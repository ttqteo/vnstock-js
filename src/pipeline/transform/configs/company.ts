import { TransformConfig } from "../../types";

export const companyProfileTransformConfig: TransformConfig = {
  fieldMap: {
    id: "id",
    issueShare: "issuedShares",
    history: "history",
    companyProfile: "profile",
    en_History: "historyEn",
    en_CompanyProfile: "profileEn",
    icbName3: "industry",
    enIcbName3: "industryEn",
    icbName2: "sector",
    enIcbName2: "sectorEn",
    icbName4: "subIndustry",
    enIcbName4: "subIndustryEn",
  },
  priceFields: [],
  dateFields: [],
  percentFields: [],
};

export const shareholderTransformConfig: TransformConfig = {
  fieldMap: {
    id: "id",
    ticker: "symbol",
    ownerFullName: "name",
    en_OwnerFullName: "nameEn",
    quantity: "quantity",
    percentage: "percentage",
    updateDate: "updatedAt",
  },
  priceFields: [],
  dateFields: ["updatedAt"],
  percentFields: ["percentage"],
};

export const officerTransformConfig: TransformConfig = {
  fieldMap: {
    id: "id",
    ticker: "symbol",
    fullName: "name",
    positionName: "position",
    en_PositionName: "positionEn",
    positionShortName: "positionShort",
    en_PositionShortName: "positionShortEn",
    updateDate: "updatedAt",
    percentage: "ownership",
    quantity: "quantity",
  },
  priceFields: [],
  dateFields: ["updatedAt"],
  percentFields: ["ownership"],
};

export const eventTransformConfig: TransformConfig = {
  fieldMap: {
    id: "id",
    organCode: "companyCode",
    ticker: "symbol",
    eventTitle: "title",
    en_EventTitle: "titleEn",
    publicDate: "publishedAt",
    issueDate: "issuedAt",
    sourceUrl: "sourceUrl",
    eventListCode: "eventType",
    eventListName: "eventTypeName",
    en_EventListName: "eventTypeNameEn",
    ratio: "ratio",
    value: "value",
    recordDate: "recordDate",
    exrightDate: "exRightDate",
  },
  priceFields: [],
  dateFields: ["publishedAt", "issuedAt", "recordDate", "exRightDate"],
  percentFields: [],
};

export const newsTransformConfig: TransformConfig = {
  fieldMap: {
    id: "id",
    ticker: "symbol",
    newsTitle: "title",
    newsSubTitle: "subtitle",
    newsImageUrl: "imageUrl",
    newsSourceLink: "sourceUrl",
    publicDate: "publishedAt",
    newsShortContent: "summary",
    newsFullContent: "content",
    closePrice: "closePrice",
    referencePrice: "referencePrice",
    percentPriceChange: "priceChangePercent",
  },
  priceFields: ["closePrice", "referencePrice"],
  dateFields: ["publishedAt"],
  percentFields: ["priceChangePercent"],
};

export const subsidiaryTransformConfig: TransformConfig = {
  fieldMap: {
    id: "id",
    organCode: "companyCode",
    subOrganCode: "subsidiaryCode",
    percentage: "ownership",
  },
  priceFields: [],
  dateFields: [],
  percentFields: ["ownership"],
  keepExtra: true,
};
