import httpClient from './httpClient';

export interface User {
  id?: number;
  email?: string;
  name?: string;
  [key: string]: any;
}

export const getUsers = (params?: any): Promise<any> =>
  httpClient.get('/users/', { params });

export const createUser = (payload: any): Promise<any> =>
  httpClient.post('/users/', payload);

export const updateUser = (id: number | string, payload: any): Promise<any> =>
  httpClient.patch(`/users/${id}/`, payload);

export const deleteUser = (id: number | string): Promise<any> =>
  httpClient.delete(`/users/${id}/`);
