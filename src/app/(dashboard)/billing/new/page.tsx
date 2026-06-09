'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { Order, Customer } from '@/types/database'

function NewInvoiceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order') || ''
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [discountValue, setDiscountValue] = useState(0)
  const [discountType, setDiscountType] = useState('amount')
  const [taxRate, setTaxRate] = useState(0)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('Payment due within 30 days of invoice date.')

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, customers(full_name, phone, customer_code), order_items(*, services(name))')
        .not('status', 'in', '(cancelled)')
        .order('created_at', { ascending: false })
      setOrders((data || []) as Order[])
      if (orderId) {
        const found = data?.find(o => o.id === orderId)
        if (found) setSelectedOrder(found as Order)
      }
    }
    fetchOrders()
  }, [supabase, orderId])

  const subtotal = selectedOrder?.total_amount || 0
  const discountAmount = discountType === 'percent' ? (subtotal * discountValue) / 100 : discountValue
  const taxAmount = ((subtotal - discountAmount) * taxRate) / 100
  const total = subtotal - discountAmount + taxAmount

  const handleCreate = async () => {
    if (!selectedOrder) { toast.error('Select an order'); return }
    setLoading(true)
    const { data: invNum } = await supabase.rpc('generate_invoice_number')
    const items = (selectedOrder as any).order_items?.map((item: any) => ({
      description: `${item.garment_type.replace('_', ' ')} — ${item.services?.name || 'Custom'}`,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      order_item_id: item.id,
    }))

    const { data: inv, error } = await supabase.from('invoices').insert({
      invoice_number: invNum,
      order_id: selectedOrder.id,
      customer_id: selectedOrder.customer_id,
      status: 'draft',
      subtotal,
      discount_type: discountType,
      discount_value: discountValue,
      discount_amount: discountAmount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: total,
      paid_amount: selectedOrder.advance_paid,
      balance_due: total - selectedOrder.advance_paid,
      notes,
      terms,
    }).select().single()

    if (error) { toast.error(error.message); setLoading(false); return }
    if (items?.length) await supabase.from('invoice_items').insert(items.map((i: any) => ({ ...i, invoice_id: inv.id })))
    toast.success('Invoice created successfully')
    router.push(`/billing/${inv.id}`)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" asChild className="gap-2">
        <Link href="/billing"><ArrowLeft className="h-4 w-4" /> Back to Billing</Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Select Order</CardTitle></CardHeader>
            <CardContent>
              <Select value={selectedOrder?.id || ''} onValueChange={(v: string) => setSelectedOrder(orders.find(o => o.id === v) || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an order to invoice" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.order_number} — {(o as any).customers?.full_name} (₹{o.total_amount.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedOrder && (
            <Card>
              <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(selectedOrder as any).order_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm p-2 border rounded">
                      <span className="capitalize">{item.garment_type.replace('_', ' ')} {item.services?.name && `— ${item.services.name}`}</span>
                      <span className="font-medium">₹{item.total_price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Terms & Notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Textarea value={terms} onChange={e => setTerms(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Additional notes for customer..." />
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-20">
            <CardHeader><CardTitle className="text-base">Invoice Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Discount</Label>
                  <div className="flex gap-2">
                    <Select value={discountType} onValueChange={setDiscountType}>
                      <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">Amount (₹)</SelectItem>
                        <SelectItem value="percent">Percent (%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" className="h-8 text-sm" value={discountValue} onChange={e => setDiscountValue(+e.target.value)} />
                  </div>
                  {discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{discountAmount.toLocaleString()}</span></div>}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tax Rate (%)</Label>
                  <Input type="number" className="h-8 text-sm" value={taxRate} onChange={e => setTaxRate(+e.target.value)} />
                  {taxAmount > 0 && <div className="flex justify-between"><span>Tax</span><span>+₹{taxAmount.toLocaleString()}</span></div>}
                </div>

                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span><span>₹{total.toLocaleString()}</span>
                </div>

                {selectedOrder && selectedOrder.advance_paid > 0 && (
                  <>
                    <div className="flex justify-between text-green-600">
                      <span>Advance Paid</span><span>-₹{selectedOrder.advance_paid.toLocaleString()}</span>
                    </div>
                    <div className={`flex justify-between font-semibold ${(total - selectedOrder.advance_paid) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      <span>Balance Due</span><span>₹{(total - selectedOrder.advance_paid).toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              <Button className="w-full" onClick={handleCreate} disabled={loading || !selectedOrder}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Invoice'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
      <NewInvoiceContent />
    </Suspense>
  )
}
