// BuildMVP Database Types
// Auto-generated from Supabase schema

// ============================================
// ENUMS
// ============================================

export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'declined';
export type InvoiceStatus = 'unpaid' | 'paid';

// ============================================
// DATABASE TABLES
// ============================================

export interface Profile {
  id: string;
  business_name: string | null;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
  license_number: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Estimate {
  id: string;
  user_id: string;
  client_id: string | null;
  estimate_number: string;
  title: string;
  description: string | null;
  status: EstimateStatus;
  issue_date: string;
  valid_until: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstimateItem {
  id: string;
  estimate_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number; // Generated column
  sort_order: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string | null;
  source_estimate_id: string | null;
  invoice_number: string;
  title: string;
  description: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  paid_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number; // Generated column
  sort_order: number;
  created_at: string;
}

// ============================================
// JOINED TYPES (for queries with relations)
// ============================================

export interface EstimateWithClient extends Estimate {
  client: Client | null;
}

export interface EstimateWithItems extends Estimate {
  items: EstimateItem[];
}

export interface EstimateWithClientAndItems extends Estimate {
  client: Client | null;
  items: EstimateItem[];
}

export interface InvoiceWithClient extends Invoice {
  client: Client | null;
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
}

export interface InvoiceWithClientAndItems extends Invoice {
  client: Client | null;
  items: InvoiceItem[];
}

// ============================================
// FORM INPUT TYPES (for creating/updating)
// ============================================

export interface ProfileInput {
  business_name?: string | null;
  business_address?: string | null;
  business_phone?: string | null;
  business_email?: string | null;
  license_number?: string | null;
  logo_url?: string | null;
}

export interface ClientInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface EstimateInput {
  client_id?: string | null;
  estimate_number: string;
  title: string;
  description?: string | null;
  status?: EstimateStatus;
  issue_date?: string;
  valid_until?: string | null;
  tax_rate?: number;
  notes?: string | null;
}

export interface EstimateItemInput {
  estimate_id: string;
  description: string;
  quantity?: number;
  unit?: string;
  unit_price: number;
  sort_order?: number;
}

export interface InvoiceInput {
  client_id?: string | null;
  source_estimate_id?: string | null;
  invoice_number: string;
  title: string;
  description?: string | null;
  status?: InvoiceStatus;
  issue_date?: string;
  due_date?: string | null;
  tax_rate?: number;
  notes?: string | null;
}

export interface InvoiceItemInput {
  invoice_id: string;
  description: string;
  quantity?: number;
  unit?: string;
  unit_price: number;
  sort_order?: number;
}

// ============================================
// SUPABASE DATABASE TYPE DEFINITION
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<ProfileInput>;
      };
      clients: {
        Row: Client;
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<ClientInput>;
      };
      estimates: {
        Row: Estimate;
        Insert: Omit<Estimate, 'id' | 'subtotal' | 'tax_amount' | 'total' | 'created_at' | 'updated_at'>;
        Update: Partial<EstimateInput>;
      };
      estimate_items: {
        Row: EstimateItem;
        Insert: Omit<EstimateItem, 'id' | 'amount' | 'created_at'>;
        Update: Partial<Omit<EstimateItemInput, 'estimate_id'>>;
      };
      invoices: {
        Row: Invoice;
        Insert: Omit<Invoice, 'id' | 'subtotal' | 'tax_amount' | 'total' | 'created_at' | 'updated_at'>;
        Update: Partial<InvoiceInput>;
      };
      invoice_items: {
        Row: InvoiceItem;
        Insert: Omit<InvoiceItem, 'id' | 'amount' | 'created_at'>;
        Update: Partial<Omit<InvoiceItemInput, 'invoice_id'>>;
      };
    };
    Enums: {
      estimate_status: EstimateStatus;
      invoice_status: InvoiceStatus;
    };
  };
}
