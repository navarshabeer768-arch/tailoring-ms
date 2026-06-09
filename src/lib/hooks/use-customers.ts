'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Customer } from '@/types/database'
import type { CustomerInput } from '@/lib/validations/customer'

export function useCustomers(search?: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      let query = supabase.from('customers').select('*').eq('is_active', true).order('created_at', { ascending: false })
      if (search) query = query.ilike('full_name', `%${search}%`)
      const { data, error } = await query
      if (error) throw error
      return data as Customer[]
    },
  })
}

export function useCustomer(id: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*, measurement_profiles(*, measurement_versions(*))')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Customer
    },
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CustomerInput) => {
      const { data: codeData } = await supabase.rpc('generate_customer_code')
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({ ...data, customer_code: codeData })
        .select()
        .single()
      if (error) throw error
      return customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateCustomer() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomerInput> }) => {
      const { data: customer, error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return customer
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers', id] })
      toast.success('Customer updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteCustomer() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
