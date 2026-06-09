-- ============================================================
-- TAILORING MANAGEMENT SYSTEM - Complete Database Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'receptionist', 'tailor', 'accountant');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'child');
CREATE TYPE order_status AS ENUM (
  'received', 'assigned', 'cutting', 'stitching',
  'trial', 'alteration', 'ready', 'delivered', 'cancelled'
);
CREATE TYPE payment_method AS ENUM ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'online');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue', 'cancelled');
CREATE TYPE delivery_status AS ENUM ('pending', 'scheduled', 'out_for_delivery', 'delivered', 'failed');
CREATE TYPE notification_type AS ENUM ('whatsapp', 'sms', 'email');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'delivered');
CREATE TYPE stock_transaction_type AS ENUM ('in', 'out', 'adjustment', 'return');
CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'on_leave');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled');
CREATE TYPE garment_type AS ENUM (
  'shirt', 'pant', 'suit', 'sherwani', 'kurta', 'salwar_kameez',
  'lehenga', 'saree_blouse', 'dress', 'coat', 'jacket', 'other'
);

-- ============================================================
-- USER PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'receptionist',
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  gender gender_type NOT NULL DEFAULT 'male',
  date_of_birth DATE,
  address TEXT,
  city TEXT,
  notes TEXT,
  preferences TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_code ON public.customers(customer_code);
CREATE INDEX idx_customers_name ON public.customers USING gin(to_tsvector('english', full_name));

-- ============================================================
-- MEASUREMENT PROFILES
-- ============================================================

CREATE TABLE public.measurement_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL DEFAULT 'Default',
  gender gender_type NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.measurement_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.measurement_profiles(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  -- Men's measurements (in inches)
  chest DECIMAL(5,2),
  waist DECIMAL(5,2),
  hips DECIMAL(5,2),
  shoulder DECIMAL(5,2),
  sleeve_length DECIMAL(5,2),
  shirt_length DECIMAL(5,2),
  neck DECIMAL(5,2),
  inseam DECIMAL(5,2),
  thigh DECIMAL(5,2),
  knee DECIMAL(5,2),
  ankle DECIMAL(5,2),
  pant_length DECIMAL(5,2),
  -- Women's additional measurements
  bust DECIMAL(5,2),
  under_bust DECIMAL(5,2),
  front_length DECIMAL(5,2),
  back_length DECIMAL(5,2),
  shoulder_to_waist DECIMAL(5,2),
  blouse_length DECIMAL(5,2),
  -- Children's measurements
  height DECIMAL(5,2),
  weight DECIMAL(5,2),
  -- Notes
  notes TEXT,
  measured_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_measurement_profile_customer ON public.measurement_profiles(customer_id);
CREATE INDEX idx_measurement_version_profile ON public.measurement_versions(profile_id);

-- ============================================================
-- SERVICE CATEGORIES & SERVICES
-- ============================================================

CREATE TABLE public.service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES public.service_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  urgent_price DECIMAL(10,2),
  duration_days INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- EMPLOYEES & TAILORS
-- ============================================================

CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id),
  employee_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'tailor',
  specialization TEXT[],
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  salary DECIMAL(10,2),
  status employee_status NOT NULL DEFAULT 'active',
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_code ON public.employees(employee_code);

-- ============================================================
-- ORDERS
-- ============================================================

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  status order_status NOT NULL DEFAULT 'received',
  priority TEXT NOT NULL DEFAULT 'normal',
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  delivery_date DATE,
  trial_date DATE,
  special_instructions TEXT,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  final_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  advance_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(12,2) NOT NULL DEFAULT 0,
  assigned_tailor_id UUID REFERENCES public.employees(id),
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_number ON public.orders(order_number);
CREATE INDEX idx_orders_delivery_date ON public.orders(delivery_date);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  garment_type garment_type NOT NULL DEFAULT 'other',
  description TEXT,
  service_id UUID REFERENCES public.services(id),
  measurement_version_id UUID REFERENCES public.measurement_versions(id),
  fabric_type TEXT,
  fabric_color TEXT,
  fabric_quantity DECIMAL(6,2),
  design_notes TEXT,
  reference_images TEXT[],
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tailor_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id),
  tailor_id UUID NOT NULL REFERENCES public.employees(id),
  assigned_by UUID REFERENCES public.user_profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  status invoice_status NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_type TEXT DEFAULT 'amount',
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(12,2) NOT NULL DEFAULT 0,
  due_date DATE,
  notes TEXT,
  terms TEXT,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_order ON public.invoices(order_id);
CREATE INDEX idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_number TEXT UNIQUE NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id),
  order_id UUID REFERENCES public.orders(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  amount DECIMAL(12,2) NOT NULL,
  method payment_method NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  notes TEXT,
  received_by UUID REFERENCES public.user_profiles(id),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_customer ON public.payments(customer_id);
CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_payments_date ON public.payments(payment_date);

-- ============================================================
-- DELIVERIES
-- ============================================================

CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  status delivery_status NOT NULL DEFAULT 'pending',
  scheduled_date DATE,
  delivery_address TEXT,
  delivery_notes TEXT,
  signature_url TEXT,
  delivered_at TIMESTAMPTZ,
  delivered_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_order ON public.deliveries(order_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(status);
CREATE INDEX idx_deliveries_scheduled ON public.deliveries(scheduled_date);

-- ============================================================
-- INVENTORY
-- ============================================================

CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT,
  unit TEXT NOT NULL DEFAULT 'meters',
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  minimum_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  maximum_stock DECIMAL(10,2),
  unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit_selling_price DECIMAL(10,2),
  supplier TEXT,
  location TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_code ON public.inventory_items(item_code);
CREATE INDEX idx_inventory_category ON public.inventory_items(category);

CREATE TABLE public.stock_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  transaction_type stock_transaction_type NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2),
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  performed_by UUID REFERENCES public.user_profiles(id),
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_transactions_item ON public.stock_transactions(item_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type notification_type NOT NULL,
  trigger_event TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES public.notification_templates(id),
  customer_id UUID REFERENCES public.customers(id),
  order_id UUID REFERENCES public.orders(id),
  type notification_type NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status notification_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_customer ON public.notifications(customer_id);
CREATE INDEX idx_notifications_status ON public.notifications(status);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  performed_by UUID REFERENCES public.user_profiles(id),
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(performed_by);
