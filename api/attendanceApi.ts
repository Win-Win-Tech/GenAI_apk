import httpClient from './httpClient';

export interface AttendanceSummary {
  [key: string]: any;
}

export const markAttendance = (formData: FormData): Promise<any> =>
  httpClient.post('/attendance/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getTodayAttendanceSummary = (): Promise<any> =>
  httpClient.get('/attendance-summary/');

export const exportTodayAttendanceSummary = (): Promise<any> =>
  httpClient.get('/attendance-summary/export/');

export const getMonthlyAttendanceStatus = (params?: any): Promise<any> =>
  httpClient.get('/monthly-attendance-status/', { params });

export const exportMonthlyAttendanceStatus = (params?: any): Promise<any> =>
  httpClient.get('/monthly-attendance/export/', { params });
