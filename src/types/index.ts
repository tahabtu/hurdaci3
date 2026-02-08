// Type definitions for the application

export type UserRole = 'superuser' | 'admin' | 'user';

export interface User {
    id: number;
    tenant_id: number;
    username: string;
    name: string;
    role: UserRole;
}

export interface Partner {
    id: number;
    tenant_id: number;
    name: string;
    type: 'customer' | 'supplier' | 'bank';
    phone?: string;
    email?: string;
    address?: string;
    balance: number;
    created_at: string;
}

export interface Material {
    id: number;
    tenant_id: number;
    item_name: string;
    item_code?: string;
    item_type?: string;
    unit_of_measure: string;
    description?: string;
    created_at: string;
}

export interface UllageType {
    id: number;
    tenant_id: number;
    name: string;
    description?: string;
}

export interface ReceivingTransaction {
    id: number;
    tenant_id: number;
    partner_id: number;
    partner_name?: string;
    doc_date?: string;
    plate_no_1?: string;
    plate_no_2?: string;
    is_reported?: boolean;
    logistics_cost: number;
    total_amount: number;
    status: 'pending' | 'inspected' | 'approved' | 'rejected';
    transaction_date: string;
    notes?: string;
    items?: ReceivingItem[];
}

export interface ReceivingItem {
    id: number;
    receiving_transaction_id: number;
    material_id: number;
    material_name?: string;
    unit_of_measure?: string;
    gross_weight: number;
    net_weight?: number;
    unit_price: number;
    logistics_cost?: number;
    effective_unit_price?: number;
    total_amount: number;
}

export interface Inspection {
    id: number;
    tenant_id: number;
    receiving_item_id: number;
    sample_weight: number;
    total_ullage_weight: number;
    ullage_percentage: number;
    inspection_date: string;
    items?: InspectionItem[];
}

export interface InspectionItem {
    id: number;
    inspection_id: number;
    ullage_type_id: number;
    weight: number;
    type_name?: string;
}

export interface Stock {
    id?: number;
    material_id: number;
    material_name: string;
    item_code?: string;
    unit_of_measure: string;
    total_quantity: number;
    partner_id?: number;
    partner_name?: string;
    quantity?: number;
    effective_unit_price?: number;
    last_updated?: string;
}

export interface SellingTransaction {
    id: number;
    tenant_id: number;
    partner_id: number;
    partner_name?: string;
    total_amount: number;
    transaction_date: string;
    notes?: string;
    items?: SellingItem[];
}

export interface SellingItem {
    id: number;
    selling_transaction_id: number;
    material_id: number;
    material_name?: string;
    unit_of_measure?: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
}

export interface MoneyTransaction {
    id: number;
    tenant_id: number;
    partner_id: number;
    partner_name?: string;
    type: 'payment' | 'receipt';
    amount: number;
    payment_method?: string;
    transaction_date: string;
    notes?: string;
}
