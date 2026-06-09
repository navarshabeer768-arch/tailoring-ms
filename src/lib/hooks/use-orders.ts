'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Order, OrderStatus } from '@/types/database'
import type { OrderInput } from '@/lib/validations/order'

export function useOrders(filters?: { status?: OrderStatus; search?: string }) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*, customers(full_name, phone, customer_code), employees(full_name)')
        .order('created_at', { ascending: false })

      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.search) query = query.ilike('order_number', `%${filters.search}%`)

      const { data, error } = await query
      if (error) throw error
      return data as Order[]
    },
  })
}

export function useOrder(id: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customers(*), employees(full_name), order_items(*, services(name, base_price)), order_status_history(*, user_profiles(full_name))')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Order
    },
    enabled: !!id,
  })
}

export function useCreateOrder() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: OrderInput) => {
      const { data: orderNum } = await supabase.rpc('generate_order_number')
      const subtotal = input.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
      const finalAmount = subtotal - (input.discount_amount || 0) + (input.tax_amount || 0)

      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          order_number: orderNum,
          customer_id: input.customer_id,
          delivery_date: input.delivery_date,
          trial_date: input.trial_date,
          is_urgent: input.is_urgent,
          special_instructions: input.special_instructions,
          advance_paid: input.advance_paid,
          discount_amount: input.discount_amount,
          tax_amount: input.tax_amount,
          total_amount: subtotal,
          final_amount: finalAmount,
          balance_due: finalAmount - (input.advance_paid || 0),
          assigned_tailor_id: input.assigned_tailor_id,
          status: 'received',
        })
        .select()
        .single()
      if (error) throw error

      // Insert order items
      const items = input.items.map(item => ({
        order_id: order.id,
        ...item,
        total_price: item.unit_price * item.quantity,
      }))
      const { error: itemsError } = await supabase.from('order_items').insert(items)
      if (itemsError) throw itemsError

      return order
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Order created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateOrderStatus() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: OrderStatus; notes?: string }) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', id] })
      toast.success('Order status updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
