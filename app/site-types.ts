export type QuoteRequest = {
  name: string;
  phone: string;
  email?: string;
  suburb: string;
  vehicle: string;
  condition?: string;
  expectedPrice?: string;
  consent: boolean;
  sourcePath: string;
};
