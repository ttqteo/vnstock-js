export interface TickerSubsidiary {
  id: string;
  organCode: string;
  subOrganCode: string;
  percentage: number;
  subOrListingInfo: {
    enOrganName: string;
    organName: string;
    __typename: string;
  };
  __typename: string;
}
