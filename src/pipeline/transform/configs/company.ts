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
  dateFields: ["updatedAt"],
  // VCI already sends ownership as a fraction (0.068 is 6.8%).
  percentFields: [],
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
  dateFields: ["updatedAt"],
  percentFields: [],
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
  dateFields: [],
  percentFields: ["ownership"],
  keepExtra: true,
};
