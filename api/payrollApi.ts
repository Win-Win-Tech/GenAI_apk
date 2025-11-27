import httpClient from './httpClient';

export interface Payroll {
  [key: string]: any;
}

export const generatePayroll = (month: string): Promise<any> =>
  httpClient.post('/generate-payroll/', { month });

export const getPayroll = (month: string): Promise<any> =>
  httpClient.get('/payroll/', { params: { month } });

export const exportPayroll = (month: string): Promise<any> =>
  httpClient.get('/payroll/export/', { params: { month } });
