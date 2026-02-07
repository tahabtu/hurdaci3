import axios from 'axios';
import type { User, Partner, Material, UllageType, ReceivingTransaction, Inspection, Stock, SellingTransaction, MoneyTransaction } from '../types';

const api = axios.create({
    baseURL: '/api',
});

// Add user ID to all requests
api.interceptors.request.use((config) => {
    const user = localStorage.getItem('user');
    if (user) {
        const userData = JSON.parse(user);
        config.headers['x-user-id'] = userData.id;
    }
    return config;
});

// Auth
export const login = async (username: string, password: string): Promise<User> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data.user;
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

export default api;
