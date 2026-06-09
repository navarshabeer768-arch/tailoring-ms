-- ============================================================
-- DATABASE FUNCTIONS, TRIGGERS & SEED DATA
-- Migration: 003_functions_triggers.sql
-- ============================================================

-- ============================================================
-- AUTO-INCREMENT CODE GENERATORS
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_customer_code()
RETURNS TEXT AS $$
DECLARE
  last_num INTEGER;
  new_code TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 4) AS INTEGER)), 0)
  INTO last_num
  FROM public.customers
  WHERE customer_code ~ '^CUS[0-9]+$';
  new_code := 'CUS' || LPAD((last_num + 1)::TEXT, 5, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  last_num INTEGER;
  new_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0)
  INTO last_num
  FROM public.orders
  WHERE order_number ~ '^ORD[0-9]+$';
  new_number := 'ORD' || LPAD((last_num + 1)::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  last_num INTEGER;
  new_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 4) AS INTEGER)), 0)
  INTO last_num
  FROM public.invoices
  WHERE invoice_number ~ '^INV[0-9]+$';
  new_number := 'INV' || LPAD((last_num + 1)::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.generate_payment_number()
RETURNS TEXT AS $$
DECLARE
  last_num INTEGER;
  new_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM 4) AS INTEGER)), 0)
  INTO last_num
  FROM public.payments
  WHERE payment_number ~ '^PAY[0-9]+$';
  new_number := 'PAY' || LPAD((last_num + 1)::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.generate_employee_code()
RETURNS TEXT AS $$
DECLARE
  last_num INTEGER;
  new_code TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM 4) AS INTEGER)), 0)
  INTO last_num
  FROM public.employees
  WHERE employee_code ~ '^EMP[0-9]+$';
  new_code := 'EMP' || LPAD((last_num + 1)::TEXT, 4, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.generate_item_code()
RETURNS TEXT AS $$
DECLARE
  last_num INTEGER;
  new_code TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(item_code FROM 5) AS INTEGER)), 0)
  INTO last_num
  FROM public.inventory_items
  WHERE item_code ~ '^ITEM[0-9]+$';
  new_code := 'ITEM' || LPAD((last_num + 1)::TEXT, 4, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_inventory_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- NEW USER PROFILE TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'receptionist')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ORDER STATUS HISTORY TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_order_status_history
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_status_change();

-- ============================================================
-- INVOICE BALANCE TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.invoices
  SET paid_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.payments
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
  ),
  balance_due = total_amount - (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.payments
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
  ),
  status = CASE
    WHEN total_amount <= (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.payments
      WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    ) THEN 'paid'::invoice_status
    WHEN (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.payments
      WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    ) > 0 THEN 'partial'::invoice_status
    ELSE status
  END
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_invoice_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_balance();

-- ============================================================
-- INVENTORY STOCK TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.inventory_items
    SET current_stock = current_stock + CASE
      WHEN NEW.transaction_type IN ('in', 'return') THEN NEW.quantity
      WHEN NEW.transaction_type = 'out' THEN -NEW.quantity
      WHEN NEW.transaction_type = 'adjustment' THEN NEW.quantity
      ELSE 0
    END
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_inventory_stock
  AFTER INSERT ON public.stock_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_stock();

-- ============================================================
-- CUSTOMER STATS TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.customers
  SET
    total_orders = (SELECT COUNT(*) FROM public.orders WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)),
    total_spent = (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id))
  WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_customer_stats_orders
  AFTER INSERT OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_customer_stats();

CREATE TRIGGER trigger_update_customer_stats_payments
  AFTER INSERT OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_customer_stats();

-- ============================================================
-- REALTIME CONFIGURATION
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;

-- ============================================================
-- SEED DATA - SERVICE CATEGORIES
-- ============================================================

INSERT INTO public.service_categories (name, description, sort_order) VALUES
  ('Stitching', 'Custom stitching services', 1),
  ('Alteration', 'Alteration and repairs', 2),
  ('Embroidery', 'Embroidery and decorative work', 3),
  ('Urgent', 'Express and rush orders', 4);

-- ============================================================
-- SEED DATA - SERVICES
-- ============================================================

INSERT INTO public.services (category_id, name, base_price, urgent_price, duration_days) VALUES
  ((SELECT id FROM public.service_categories WHERE name = 'Stitching'), 'Men''s Shirt', 800, 1200, 7),
  ((SELECT id FROM public.service_categories WHERE name = 'Stitching'), 'Men''s Pant', 600, 900, 7),
  ((SELECT id FROM public.service_categories WHERE name = 'Stitching'), 'Men''s Suit (2-piece)', 2500, 3500, 14),
  ((SELECT id FROM public.service_categories WHERE name = 'Stitching'), 'Sherwani', 5000, 7000, 21),
  ((SELECT id FROM public.service_categories WHERE name = 'Stitching'), 'Kurta Pyjama', 1200, 1800, 7),
  ((SELECT id FROM public.service_categories WHERE name = 'Stitching'), 'Ladies Salwar Kameez', 1500, 2200, 10),
  ((SELECT id FROM public.service_categories WHERE name = 'Stitching'), 'Lehenga', 8000, 11000, 21),
  ((SELECT id FROM public.service_categories WHERE name = 'Stitching'), 'Saree Blouse', 800, 1200, 5),
  ((SELECT id FROM public.service_categories WHERE name = 'Stitching'), 'Ladies Dress', 2000, 3000, 10),
  ((SELECT id FROM public.service_categories WHERE name = 'Alteration'), 'Shirt Alteration', 200, 350, 2),
  ((SELECT id FROM public.service_categories WHERE name = 'Alteration'), 'Pant Alteration', 200, 350, 2),
  ((SELECT id FROM public.service_categories WHERE name = 'Alteration'), 'Suit Alteration', 500, 750, 3),
  ((SELECT id FROM public.service_categories WHERE name = 'Embroidery'), 'Basic Embroidery', 500, 750, 5),
  ((SELECT id FROM public.service_categories WHERE name = 'Embroidery'), 'Heavy Embroidery', 2000, 3000, 14);

-- ============================================================
-- SEED DATA - NOTIFICATION TEMPLATES
-- ============================================================

INSERT INTO public.notification_templates (name, type, trigger_event, subject, body, variables) VALUES
  ('Order Received', 'sms', 'order_received',
   NULL,
   'Dear {{customer_name}}, your order #{{order_number}} has been received. Estimated delivery: {{delivery_date}}. Thank you for choosing us!',
   ARRAY['customer_name', 'order_number', 'delivery_date']),

  ('Order Ready', 'sms', 'order_ready',
   NULL,
   'Dear {{customer_name}}, your order #{{order_number}} is ready for pickup/delivery. Please contact us to schedule delivery.',
   ARRAY['customer_name', 'order_number']),

  ('Trial Reminder', 'sms', 'trial_reminder',
   NULL,
   'Dear {{customer_name}}, your trial fitting for order #{{order_number}} is scheduled for {{trial_date}}. Please visit our store.',
   ARRAY['customer_name', 'order_number', 'trial_date']),

  ('Delivery Reminder', 'whatsapp', 'delivery_reminder',
   NULL,
   'Dear {{customer_name}}, your order #{{order_number}} is scheduled for delivery on {{delivery_date}}. Our team will contact you shortly.',
   ARRAY['customer_name', 'order_number', 'delivery_date']),

  ('Payment Reminder', 'sms', 'payment_reminder',
   NULL,
   'Dear {{customer_name}}, you have a pending balance of {{balance_due}} for order #{{order_number}}. Please clear the dues to collect your order.',
   ARRAY['customer_name', 'balance_due', 'order_number']),

  ('Order Received Email', 'email', 'order_received',
   'Order Confirmation - #{{order_number}}',
   'Dear {{customer_name}},\n\nThank you for your order. We have received your order #{{order_number}} and our team will start working on it shortly.\n\nEstimated Delivery Date: {{delivery_date}}\n\nBest regards,\nThe Tailoring Team',
   ARRAY['customer_name', 'order_number', 'delivery_date']);
