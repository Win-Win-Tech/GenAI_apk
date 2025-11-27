import httpClient from './httpClient';

export interface Location {
  id?: number;
  name?: string;
  [key: string]: any;
}

export const getLocations = (params?: any): Promise<any> =>
  httpClient.get('/locations/', { params });

export const createLocation = (payload: any): Promise<any> =>
  httpClient.post('/locations/', payload);

export const updateLocation = (id: number | string, payload: any): Promise<any> =>
  httpClient.patch(`/locations/${id}/`, payload);

export const deleteLocation = (id: number | string): Promise<any> =>
  httpClient.delete(`/locations/${id}/`);
