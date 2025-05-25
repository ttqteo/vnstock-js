export interface OrganizationEvent {
  id: string;
  organCode: string;
  ticker: string;
  eventTitle: string;
  en_EventTitle: string;
  publicDate: number;
  issueDate: number;
  sourceUrl: string;
  eventListCode: string;
  ratio: number | null;
  value: number | null;
  recordDate: number;
  exrightDate: number;
  eventListName: string;
  en_EventListName: string;
}
