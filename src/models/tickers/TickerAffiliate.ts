export interface TickerAffiliate {
  id: string;
  organCode: string;
  subOrganCode: string;
  percentage: number | null;
  subOrListingInfo: {
    enOrganName: string;
    organName: string;
    __typename: string;
  };
  __typename: string;
}
