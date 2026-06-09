import { z } from 'zod'

export const orderItemSchema = z.object({
  garment_type: z.enum(['shirt', 'pant', 'suit', 'sherwani', 'kurta', 'salwar_kameez', 'lehenga', 'saree_blouse', 'dress', 'coat', 'jacket', 'other']),
  description: z.string().optional(),
  service_id: z.string().uuid().optional(),
  measurement_version_id: z.string().uuid().optional(),
  fabric_type: z.string().optional(),
  fabric_color: z.string().optional(),
  fabric_quantity: z.number().positive().optional(),
  design_notes: z.string().optional(),
  quantity: z.number().int().positive(),
  unit_price: z.number().min(0),
})

export const orderSchema = z.object({
  customer_id: z.string().uuid('Select a customer'),
  delivery_date: z.string().optional(),
  trial_date: z.string().optional(),
  is_urgent: z.boolean(),
  special_instructions: z.string().optional(),
  advance_paid: z.number().min(0),
  discount_amount: z.number().min(0),
  tax_amount: z.number().min(0),
  assigned_tailor_id: z.string().uuid().optional(),
  items: z.array(orderItemSchema).min(1, 'Add at least one item'),
})

export type OrderInput = z.infer<typeof orderSchema>
export type OrderItemInput = z.infer<typeof orderItemSchema>
