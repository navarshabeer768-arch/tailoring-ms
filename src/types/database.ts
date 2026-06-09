export type UserRole = 'admin' | 'manager' | 'receptionist' | 'tailor' | 'accountant'
export type GenderType = 'male' | 'female' | 'child'
export type OrderStatus = 'received' | 'assigned' | 'cutting' | 'stitching' | 'trial' | 'alteration' | 'ready' | 'delivered' | 'cancelled'
export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'online'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
export type DeliveryStatus = 'pending' | 'scheduled' | 'out_for_delivery' | 'delivered' | 'failed'
export type NotificationType = 'whatsapp' | 'sms' | 'email'
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered'
export type StockTransactionType = 'in' | 'out' | 'adjustment' | 'return'
export type EmployeeStatus = 'active' | 'inactive' | 'on_leave'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled'
export type GarmentType = 'shirt' | 'pant' | 'suit' | 'sherwani' | 'kurta' | 'salwar_kameez' | 'lehenga' | 'saree_blouse' | 'dress' | 'coat' | 'jacket' | 'other'

export interface UserProfile {
  id: string
  full_name: string
  role: UserRole
  phone?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  customer_code: string
  full_name: string
  phone: string
  email?: string
  gender: GenderType
  date_of_birth?: string
  address?: string
  city?: string
  notes?: string
  preferences?: string
  is_active: boolean
  total_orders: number
  total_spent: number
  created_by?: string
  created_at: string
  updated_at: string
}

export interface MeasurementProfile {
  id: string
  customer_id: string
  profile_name: string
  gender: GenderType
  is_default: boolean
  created_at: string
  updated_at: string
  measurement_versions?: MeasurementVersion[]
}

export interface MeasurementVersion {
  id: string
  profile_id: string
  version_number: number
  chest?: number
  waist?: number
  hips?: number
  shoulder?: number
  sleeve_length?: number
  shirt_length?: number
  neck?: number
  inseam?: number
  thigh?: number
  knee?: number
  ankle?: number
  pant_length?: number
  bust?: number
  under_bust?: number
  front_length?: number
  back_length?: number
  shoulder_to_waist?: number
  blouse_length?: number
  height?: number
  weight?: number
  notes?: string
  measured_by?: string
  created_at: string
}

export interface ServiceCategory {
  id: string
  name: string
  description?: string
  is_active: boolean
  sort_order: number
  created_at: string
  services?: Service[]
}

export interface Service {
  id: string
  category_id?: string
  name: string
  description?: string
  base_price: number
  urgent_price?: number
  duration_days: number
  is_active: boolean
  created_at: string
  updated_at: string
  service_categories?: ServiceCategory
}

export interface Employee {
  id: string
  user_id?: string
  employee_code: string
  full_name: string
  phone: string
  email?: string
  role: string
  specialization?: string[]
  joining_date: string
  salary?: number
  status: EmployeeStatus
  address?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  order_number: string
  customer_id: string
  status: OrderStatus
  priority: string
  is_urgent: boolean
  delivery_date?: string
  trial_date?: string
  special_instructions?: string
  total_amount: number
  discount_amount: number
  tax_amount: number
  final_amount: number
  advance_paid: number
  balance_due: number
  assigned_tailor_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  customers?: Customer
  employees?: Employee
  order_items?: OrderItem[]
  order_status_history?: OrderStatusHistory[]
}

export interface OrderItem {
  id: string
  order_id: string
  garment_type: GarmentType
  description?: string
  service_id?: string
  measurement_version_id?: string
  fabric_type?: string
  fabric_color?: string
  fabric_quantity?: number
  design_notes?: string
  reference_images?: string[]
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  services?: Service
}

export interface OrderStatusHistory {
  id: string
  order_id: string
  from_status?: OrderStatus
  to_status: OrderStatus
  notes?: string
  changed_by?: string
  created_at: string
  user_profiles?: UserProfile
}

export interface TailorAssignment {
  id: string
  order_id: string
  order_item_id?: string
  tailor_id: string
  assigned_by?: string
  assigned_at: string
  due_date?: string
  completed_at?: string
  notes?: string
  employees?: Employee
}

export interface Invoice {
  id: string
  invoice_number: string
  order_id: string
  customer_id: string
  status: InvoiceStatus
  subtotal: number
  discount_type?: string
  discount_value: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  paid_amount: number
  balance_due: number
  due_date?: string
  notes?: string
  terms?: string
  created_by?: string
  created_at: string
  updated_at: string
  customers?: Customer
  orders?: Order
  invoice_items?: InvoiceItem[]
  payments?: Payment[]
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  order_item_id?: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface Payment {
  id: string
  payment_number: string
  invoice_id?: string
  order_id?: string
  customer_id: string
  amount: number
  method: PaymentMethod
  reference_number?: string
  notes?: string
  received_by?: string
  payment_date: string
  created_at: string
  customers?: Customer
  invoices?: Invoice
  user_profiles?: UserProfile
}

export interface Delivery {
  id: string
  order_id: string
  customer_id: string
  status: DeliveryStatus
  scheduled_date?: string
  delivery_address?: string
  delivery_notes?: string
  signature_url?: string
  delivered_at?: string
  delivered_by?: string
  created_at: string
  updated_at: string
  orders?: Order
  customers?: Customer
}

export interface InventoryItem {
  id: string
  item_code: string
  name: string
  category: string
  sub_category?: string
  unit: string
  current_stock: number
  minimum_stock: number
  maximum_stock?: number
  unit_cost: number
  unit_selling_price?: number
  supplier?: string
  location?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StockTransaction {
  id: string
  item_id: string
  transaction_type: StockTransactionType
  quantity: number
  unit_cost?: number
  reference_id?: string
  reference_type?: string
  notes?: string
  performed_by?: string
  transaction_date: string
  created_at: string
  inventory_items?: InventoryItem
  user_profiles?: UserProfile
}

export interface NotificationTemplate {
  id: string
  name: string
  type: NotificationType
  trigger_event: string
  subject?: string
  body: string
  variables?: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  template_id?: string
  customer_id?: string
  order_id?: string
  type: NotificationType
  recipient: string
  subject?: string
  message: string
  status: NotificationStatus
  sent_at?: string
  error_message?: string
  created_at: string
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: string
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  performed_by?: string
  ip_address?: string
  created_at: string
}

// Dashboard types
export interface DashboardStats {
  total_customers: number
  active_orders: number
  pending_deliveries: number
  monthly_revenue: number
  outstanding_payments: number
  orders_by_status: { status: OrderStatus; count: number }[]
  revenue_trend: { date: string; revenue: number }[]
  top_services: { name: string; count: number; revenue: number }[]
}
