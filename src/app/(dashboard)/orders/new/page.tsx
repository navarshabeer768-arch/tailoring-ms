'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { orderSchema, type OrderInput } from '@/lib/validations/order'
import { useCreateOrder } from '@/lib/hooks/use-orders'
import { useCustomers } from '@/lib/hooks/use-customers'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { Service, Employee } from '@/types/database'

const GARMENT_TYPES = ['shirt', 'pant', 'suit', 'sherwani', 'kurta', 'salwar_kameez', 'lehenga', 'saree_blouse', 'dress', 'coat', 'jacket', 'other']

function NewOrderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultCustomer = searchParams.get('customer') || ''
  const supabase = createClient()

  const [services, setServices] = useState<Service[]>([])
  const [tailors, setTailors] = useState<Employee[]>([])
  const { data: customers } = useCustomers()
  const createOrder = useCreateOrder()

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<OrderInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_id: defaultCustomer,
      is_urgent: false,
      advance_paid: 0,
      discount_amount: 0,
      tax_amount: 0,
      items: [{ garment_type: 'shirt', quantity: 1, unit_price: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const subtotal = items.reduce((sum, item) => sum + (item.unit_price || 0) * (item.quantity || 1), 0)
  const discount = watch('discount_amount') || 0
  const tax = watch('tax_amount') || 0
  const advance = watch('advance_paid') || 0
  const finalAmount = subtotal - discount + tax
  const balance = finalAmount - advance

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: svcs }, { data: emps }] = await Promise.all([
        supabase.from('services').select('*, service_categories(name)').eq('is_active', true),
        supabase.from('employees').select('*').eq('status', 'active').like('role', '%tailor%'),
      ])
      setServices(svcs || [])
      setTailors(emps || [])
    }
    fetchData()
  }, [supabase])

  const onSubmit = (data: OrderInput) => {
    createOrder.mutate(data, {
      onSuccess: (order) => router.push(`/orders/${order.id}`),
    })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/orders"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        <h2 className="text-lg font-semibold">Create New Order</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Customer & Scheduling</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer *</Label>
                    <Select
                      value={watch('customer_id')}
                      onValueChange={(v: string) => setValue('customer_id', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.full_name} — {c.phone}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.customer_id && <p className="text-sm text-destructive">{errors.customer_id.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Assign Tailor</Label>
                    <Select onValueChange={(v: string) => setValue('assigned_tailor_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Select tailor" /></SelectTrigger>
                      <SelectContent>
                        {tailors.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delivery_date">Delivery Date</Label>
                    <Input id="delivery_date" type="date" {...register('delivery_date')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trial_date">Trial Date</Label>
                    <Input id="trial_date" type="date" {...register('trial_date')} />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={watch('is_urgent')}
                    onCheckedChange={(v) => setValue('is_urgent', v)}
                  />
                  <div>
                    <Label>Mark as Urgent</Label>
                    <p className="text-xs text-muted-foreground">Urgent orders get priority processing</p>
                  </div>
                  {watch('is_urgent') && <Badge variant="destructive" className="ml-auto">URGENT</Badge>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="special_instructions">Special Instructions</Label>
                  <Textarea id="special_instructions" placeholder="Any special requirements..." rows={2} {...register('special_instructions')} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Order Items</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => append({ garment_type: 'shirt', quantity: 1, unit_price: 0 })}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {errors.items && <p className="text-sm text-destructive">{errors.items.message}</p>}
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Item {index + 1}</Badge>
                      {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Garment Type *</Label>
                        <Select
                          value={watch(`items.${index}.garment_type`)}
                          onValueChange={(v: string) => setValue(`items.${index}.garment_type`, v as OrderInput['items'][0]['garment_type'])}
                        >
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {GARMENT_TYPES.map(g => (
                              <SelectItem key={g} value={g} className="capitalize">{g.replace('_', ' ')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Service</Label>
                        <Select onValueChange={(v: string) => {
                          setValue(`items.${index}.service_id`, v)
                          const svc = services.find(s => s.id === v)
                          if (svc) setValue(`items.${index}.unit_price`, svc.base_price)
                        }}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Unit Price (₹) *</Label>
                        <Input type="number" className="h-9" {...register(`items.${index}.unit_price`, { valueAsNumber: true })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Qty</Label>
                        <Input type="number" min={1} className="h-9" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fabric Type</Label>
                        <Input className="h-9" placeholder="Cotton, Silk..." {...register(`items.${index}.fabric_type`)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fabric Color</Label>
                        <Input className="h-9" placeholder="White, Blue..." {...register(`items.${index}.fabric_color`)} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Design Notes</Label>
                      <Input className="h-9" placeholder="Design details, embroidery, buttons..." {...register(`items.${index}.design_notes`)} />
                    </div>
                    <div className="text-right text-sm font-medium">
                      Item Total: ₹{((watch(`items.${index}.unit_price`) || 0) * (watch(`items.${index}.quantity`) || 1)).toLocaleString()}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <Card className="sticky top-20">
              <CardHeader><CardTitle className="text-base">Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Discount (₹)</Label>
                    <Input type="number" min={0} className="h-8 text-sm" {...register('discount_amount', { valueAsNumber: true })} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tax (₹)</Label>
                    <Input type="number" min={0} className="h-8 text-sm" {...register('tax_amount', { valueAsNumber: true })} />
                  </div>

                  <Separator />
                  <div className="flex justify-between font-semibold"><span>Total</span><span>₹{finalAmount.toLocaleString()}</span></div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Advance Payment (₹)</Label>
                    <Input type="number" min={0} className="h-8 text-sm" {...register('advance_paid', { valueAsNumber: true })} />
                  </div>

                  <div className={`flex justify-between font-semibold ${balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    <span>Balance Due</span><span>₹{balance.toLocaleString()}</span>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={createOrder.isPending}>
                  {createOrder.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Order'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
      <NewOrderContent />
    </Suspense>
  )
}
