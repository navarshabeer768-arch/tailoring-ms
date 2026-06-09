-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- Migration: 002_rls_policies.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user has admin/manager role
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager') AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if authenticated and active
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- USER PROFILES POLICIES
-- ============================================================

CREATE POLICY "users_select_own" ON public.user_profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin_or_manager());

CREATE POLICY "users_update_own" ON public.user_profiles
  FOR UPDATE USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "users_insert_admin" ON public.user_profiles
  FOR INSERT WITH CHECK (public.is_admin());

-- ============================================================
-- CUSTOMERS POLICIES
-- ============================================================

CREATE POLICY "customers_select" ON public.customers
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('admin', 'manager', 'receptionist')
  );

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE USING (
    public.get_user_role() IN ('admin', 'manager', 'receptionist')
  );

CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE USING (public.is_admin());

-- ============================================================
-- MEASUREMENTS POLICIES
-- ============================================================

CREATE POLICY "measurement_profiles_select" ON public.measurement_profiles
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "measurement_profiles_insert" ON public.measurement_profiles
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('admin', 'manager', 'receptionist')
  );

CREATE POLICY "measurement_profiles_update" ON public.measurement_profiles
  FOR UPDATE USING (
    public.get_user_role() IN ('admin', 'manager', 'receptionist')
  );

CREATE POLICY "measurement_versions_select" ON public.measurement_versions
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "measurement_versions_insert" ON public.measurement_versions
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('admin', 'manager', 'receptionist')
  );

-- ============================================================
-- SERVICES POLICIES
-- ============================================================

CREATE POLICY "service_categories_select" ON public.service_categories
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "service_categories_manage" ON public.service_categories
  FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "services_select" ON public.services
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "services_manage" ON public.services
  FOR ALL USING (public.is_admin_or_manager());

-- ============================================================
-- EMPLOYEES POLICIES
-- ============================================================

CREATE POLICY "employees_select" ON public.employees
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "employees_manage" ON public.employees
  FOR ALL USING (public.is_admin_or_manager());

-- ============================================================
-- ORDERS POLICIES
-- ============================================================

CREATE POLICY "orders_select_all" ON public.orders
  FOR SELECT USING (
    public.get_user_role() IN ('admin', 'manager', 'receptionist', 'accountant')
    OR (
      public.get_user_role() = 'tailor'
      AND assigned_tailor_id IN (
        SELECT id FROM public.employees WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('admin', 'manager', 'receptionist')
  );

CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE USING (
    public.get_user_role() IN ('admin', 'manager', 'receptionist')
    OR (
      public.get_user_role() = 'tailor'
      AND assigned_tailor_id IN (
        SELECT id FROM public.employees WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "orders_delete" ON public.orders
  FOR DELETE USING (public.is_admin());

CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "order_items_manage" ON public.order_items
  FOR ALL USING (
    public.get_user_role() IN ('admin', 'manager', 'receptionist')
  );

CREATE POLICY "order_status_history_select" ON public.order_status_history
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "order_status_history_insert" ON public.order_status_history
  FOR INSERT WITH CHECK (public.is_authenticated());

-- ============================================================
-- TAILOR ASSIGNMENTS POLICIES
-- ============================================================

CREATE POLICY "tailor_assignments_select" ON public.tailor_assignments
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "tailor_assignments_manage" ON public.tailor_assignments
  FOR ALL USING (public.is_admin_or_manager());

-- ============================================================
-- INVOICES POLICIES
-- ============================================================

CREATE POLICY "invoices_select" ON public.invoices
  FOR SELECT USING (
    public.get_user_role() IN ('admin', 'manager', 'accountant', 'receptionist')
  );

CREATE POLICY "invoices_manage" ON public.invoices
  FOR ALL USING (
    public.get_user_role() IN ('admin', 'manager', 'accountant')
  );

CREATE POLICY "invoice_items_select" ON public.invoice_items
  FOR SELECT USING (
    public.get_user_role() IN ('admin', 'manager', 'accountant', 'receptionist')
  );

CREATE POLICY "invoice_items_manage" ON public.invoice_items
  FOR ALL USING (
    public.get_user_role() IN ('admin', 'manager', 'accountant')
  );

-- ============================================================
-- PAYMENTS POLICIES
-- ============================================================

CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (
    public.get_user_role() IN ('admin', 'manager', 'accountant', 'receptionist')
  );

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('admin', 'manager', 'accountant', 'receptionist')
  );

CREATE POLICY "payments_delete" ON public.payments
  FOR DELETE USING (public.is_admin());

-- ============================================================
-- DELIVERIES POLICIES
-- ============================================================

CREATE POLICY "deliveries_select" ON public.deliveries
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "deliveries_manage" ON public.deliveries
  FOR ALL USING (
    public.get_user_role() IN ('admin', 'manager', 'receptionist')
  );

-- ============================================================
-- INVENTORY POLICIES
-- ============================================================

CREATE POLICY "inventory_select" ON public.inventory_items
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "inventory_manage" ON public.inventory_items
  FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "stock_transactions_select" ON public.stock_transactions
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "stock_transactions_insert" ON public.stock_transactions
  FOR INSERT WITH CHECK (public.is_admin_or_manager());

-- ============================================================
-- NOTIFICATIONS POLICIES
-- ============================================================

CREATE POLICY "notification_templates_select" ON public.notification_templates
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "notification_templates_manage" ON public.notification_templates
  FOR ALL USING (public.is_admin_or_manager());

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (public.is_authenticated());

-- ============================================================
-- AUDIT LOGS POLICIES
-- ============================================================

CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (true);
