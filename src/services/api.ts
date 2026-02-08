import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { User, Partner, Material, UllageType, ReceivingTransaction, Inspection, Stock, SellingTransaction, MoneyTransaction } from '../types';

const api = axios.create({
    baseURL: '/api',
});

// Token management
const getAccessToken = (): string | null => {
    return localStorage.getItem('accessToken');
};

const getRefreshToken = (): string | null => {
    return localStorage.getItem('refreshToken');
};

const setTokens = (accessToken: string, refreshToken: string): void => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
};

const clearTokens = (): void => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
};

// Add JWT to all requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (error?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Skip token refresh for auth endpoints (login, refresh, logout)
        const isAuthEndpoint = originalRequest.url?.includes('/auth/');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = getRefreshToken();
            if (!refreshToken) {
                clearTokens();
                window.location.href = '/';
                return Promise.reject(error);
            }

            try {
                const response = await axios.post('/api/auth/refresh', { refreshToken });
                const { accessToken, refreshToken: newRefreshToken } = response.data;
                setTokens(accessToken, newRefreshToken);
                processQueue(null, accessToken);
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as Error, null);
                clearTokens();
                window.location.href = '/';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// Auth
export const login = async (username: string, password: string): Promise<User> => {
    const response = await api.post('/auth/login', { username, password });
    const { user, accessToken, refreshToken } = response.data;
    setTokens(accessToken, refreshToken);
    return user;
};

export const logout = async (): Promise<void> => {
    const refreshToken = getRefreshToken();
    try {
        await api.post('/auth/logout', { refreshToken });
    } finally {
        clearTokens();
    }
};

// Partners
export const getPartners = async (): Promise<Partner[]> => {
    const response = await api.get('/partners');
    return response.data;
};

export const getPartnersByType = async (type: string): Promise<Partner[]> => {
    const response = await api.get(`/partners/type/${type}`);
    return response.data;
};

export const createPartner = async (data: Partial<Partner>): Promise<Partner> => {
    const response = await api.post('/partners', data);
    return response.data;
};

export const updatePartner = async (id: number, data: Partial<Partner>): Promise<Partner> => {
    const response = await api.put(`/partners/${id}`, data);
    return response.data;
};

export const deletePartner = async (id: number): Promise<void> => {
    await api.delete(`/partners/${id}`);
};

// Materials
export const getMaterials = async (): Promise<Material[]> => {
    const response = await api.get('/materials');
    return response.data;
};

export const createMaterial = async (data: { item_name: string; item_code?: string; unit_of_measure?: string; description?: string }): Promise<Material> => {
    const response = await api.post('/materials', data);
    return response.data;
};

export const updateMaterial = async (id: number, data: { item_name: string; item_code?: string; unit_of_measure?: string; description?: string }): Promise<Material> => {
    const response = await api.put(`/materials/${id}`, data);
    return response.data;
};

export const deleteMaterial = async (id: number): Promise<void> => {
    await api.delete(`/materials/${id}`);
};

// Ullage Types
export const getUllageTypes = async (): Promise<UllageType[]> => {
    const response = await api.get('/ullage-types');
    return response.data;
};

export const createUllageType = async (data: Partial<UllageType>): Promise<UllageType> => {
    const response = await api.post('/ullage-types', data);
    return response.data;
};

export const updateUllageType = async (id: number, data: Partial<UllageType>): Promise<UllageType> => {
    const response = await api.put(`/ullage-types/${id}`, data);
    return response.data;
};

export const deleteUllageType = async (id: number): Promise<void> => {
    await api.delete(`/ullage-types/${id}`);
};

// Receiving Transactions
export const getReceivingTransactions = async (): Promise<ReceivingTransaction[]> => {
    const response = await api.get('/receiving');
    return response.data;
};

export const getPendingReceiving = async (): Promise<ReceivingTransaction[]> => {
    const response = await api.get('/receiving/pending');
    return response.data;
};

export const getAwaitingApproval = async (): Promise<ReceivingTransaction[]> => {
    const response = await api.get('/receiving/awaiting-approval');
    return response.data;
};

export const getReceivingTransaction = async (id: number): Promise<ReceivingTransaction> => {
    const response = await api.get(`/receiving/${id}`);
    return response.data;
};

export const createReceivingTransaction = async (data: {
    partner_id: number;
    doc_date?: string;
    plate_no_1?: string;
    plate_no_2?: string;
    is_reported?: boolean;
    logistics_cost: number;
    notes?: string;
    items: { material_id: number; gross_weight: number; unit_price: number }[];
}): Promise<ReceivingTransaction> => {
    const response = await api.post('/receiving', data);
    return response.data;
};

export const approveReceiving = async (id: number): Promise<void> => {
    await api.post(`/receiving/${id}/approve`);
};

export const rejectReceiving = async (id: number): Promise<void> => {
    await api.post(`/receiving/${id}/reject`);
};

// Inspections
export const createInspection = async (data: {
    receiving_item_id: number;
    sample_weight: number;
    items: { ullage_type_id: number; weight: number }[];
}): Promise<Inspection> => {
    const response = await api.post('/inspections', data);
    return response.data;
};

export interface InspectionHistory {
    id: number;
    sample_weight: number;
    total_ullage_weight: number;
    ullage_percentage: number;
    inspection_date: string;
    material_name: string;
    partner_name: string;
    gross_weight: number;
    net_weight: number;
    unit_price: number;
    effective_unit_price: number;
    ullage_items: { type_name: string; weight: number }[] | null;
}

export const getInspectionHistory = async (): Promise<InspectionHistory[]> => {
    const response = await api.get('/inspections/history');
    return response.data;
};

// Stock
export const getStock = async (): Promise<Stock[]> => {
    const response = await api.get('/stock');
    return response.data;
};

export const getStockByMaterial = async (materialId: number): Promise<Stock[]> => {
    const response = await api.get(`/stock/material/${materialId}`);
    return response.data;
};

// Selling
export const getSellingTransactions = async (): Promise<SellingTransaction[]> => {
    const response = await api.get('/selling');
    return response.data;
};

export const getSellingTransaction = async (id: number): Promise<SellingTransaction> => {
    const response = await api.get(`/selling/${id}`);
    return response.data;
};

export const createSellingTransaction = async (data: {
    partner_id: number;
    notes?: string;
    items: { material_id: number; quantity: number; unit_price: number }[];
}): Promise<SellingTransaction> => {
    const response = await api.post('/selling', data);
    return response.data;
};

// Money Transactions
export const getMoneyTransactions = async (): Promise<MoneyTransaction[]> => {
    const response = await api.get('/money');
    return response.data;
};

export const createMoneyTransaction = async (data: {
    partner_id: number;
    type: 'payment' | 'receipt';
    amount: number;
    payment_method?: string;
    notes?: string;
}): Promise<MoneyTransaction> => {
    const response = await api.post('/money', data);
    return response.data;
};

// ============================================
// ADMIN APIs (Superuser only)
// ============================================

export interface Tenant {
    id: number;
    name: string;
    created_at: string;
    user_count?: number;
}

export interface AdminUser {
    id: number;
    tenant_id: number | null;
    username: string;
    name: string;
    role: 'superuser' | 'admin' | 'user';
    created_at: string;
    tenant_name?: string;
}

export interface AdminStats {
    tenants: number;
    users: number;
    partners: number;
    materials: number;
    receiving_transactions: number;
    selling_transactions: number;
}

// Tenants
export const getTenants = async (): Promise<Tenant[]> => {
    const response = await api.get('/admin/tenants');
    return response.data;
};

export const createTenant = async (name: string): Promise<Tenant> => {
    const response = await api.post('/admin/tenants', { name });
    return response.data;
};

export const updateTenant = async (id: number, name: string): Promise<Tenant> => {
    const response = await api.put(`/admin/tenants/${id}`, { name });
    return response.data;
};

export const deleteTenant = async (id: number): Promise<void> => {
    await api.delete(`/admin/tenants/${id}`);
};

// Users
export const getAdminUsers = async (): Promise<AdminUser[]> => {
    const response = await api.get('/admin/users');
    return response.data;
};

export const getUsersByTenant = async (tenantId: number): Promise<AdminUser[]> => {
    const response = await api.get(`/admin/users/tenant/${tenantId}`);
    return response.data;
};

export const createAdminUser = async (data: {
    tenant_id?: number;
    username: string;
    password: string;
    name: string;
    role: 'superuser' | 'admin' | 'user';
}): Promise<AdminUser> => {
    const response = await api.post('/admin/users', data);
    return response.data;
};

export const updateAdminUser = async (id: number, data: {
    tenant_id?: number;
    username: string;
    password?: string;
    name: string;
    role: 'superuser' | 'admin' | 'user';
}): Promise<AdminUser> => {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data;
};

export const deleteAdminUser = async (id: number): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
};

// Stats
export const getAdminStats = async (): Promise<AdminStats> => {
    const response = await api.get('/admin/stats');
    return response.data;
};

export default api;
