import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: BASE_URL });

export const getDashboard = () => api.get('/dashboard/summary');
export const getCompanies = () => api.get('/companies');
export const createCompany = (data) => api.post('/companies', data);
export const getTasks = () => api.get('/tasks');
export const updateTaskStatus = (id, status) => api.patch(`/tasks/${id}/status`, { status });
export const getCommunications = () => api.get('/communications');
export const processEmail = (data) => api.post('/communications/process', data);
export const processBatch = () => api.post('/communications/process-batch');

export default api;
