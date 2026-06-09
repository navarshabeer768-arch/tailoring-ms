'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Plus, CreditCard, Search } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { Payment, PaymentMethod } from '@/types/database'

const METHOD_ICONS: Record<PaymentMethod, string> = {
  cash: '💵', credit_card: '💳', debit_card: '💳', bank_transfer: '🏦', online: '📱',
}

export default function PaymentsPage() {
  const supabase = createClient()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    customer_id: '', invoice_id: '', amount: '', method: 'cash' as PaymentMethod,
    reference_number: '', notes: '', payment_date: new Date().toISOString().split('T')[0],
  })
  const [customers, setCustomers] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])

  const fetchPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select('*, customers(full_name, phone)')
      .order('payment_date', { ascending: false })
      .limit(100)
    setPayments((data || []) as Payment[])
    setLoading(false)
  }

  useEffect(() => {
    fetchPayments()
    supabase.from('customers').select('id, full_name, phone').then(({ data }) => setCustomers(data || []))
  }, [supabase])

  useEffect(() => {
    if (form.customer_id) {
      supabase.from('invoices').select('id, invoice_number, balance_due').eq('customer_id', form.customer_id).gt('balance_due', 0)
        .then(({ data }) => setInvoices(data || []))
    }
  }, [form.customer_id, supabase])

  const totalToday = payments.filter(p => p.payment_date.startsWith(new Date().toISOString().split('T')[0])).reduce((s, p) => s + p.amount, 0)
  const totalMonth = payments.reduce((s, p) => s + p.amount, 0)

  const handleSave = async () => {
    if (!form.customer_id || !form.amount) { toast.error('Fill required fields'); return }
    setSaving(true)
    const { data: payNum } = await supabase.rpc('generate_payment_number')
    const { error } = await supabase.from('payments').insert({
      payment_number: payNum,
      customer_id: form.customer_id,
      invoice_id: form.invoice_id || null,
      amount: parseFloat(form.amount),
      method: form.method,
      reference_number: form.reference_number || null,
      notes: form.notes || null,
      payment_date: new Date(form.payment_date).toISOString(),
    })
    if (error) { toast.error(error.message) } else {
      toast.success('Payment recorded')
      setOpen(false)
      fetchPayments()
      setForm({ customer_id: '', invoice_id: '', amount: '', method: 'cash', reference_number: '', notes: '', payment_date: new Date().toISOString().split('T')[0] })
    }
    setSaving(false)
  }

  const filtered = payments.filter(p =>
    !search || (p as any).customers?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Payments</h2>
          <p className="text-sm text-muted-foreground">{payments.length} transactions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Record Payment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select value={form.customer_id} onValueChange={(v: string) => setForm(f => ({ ...f, customer_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name} — {c.phone}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {invoices.length > 0 && (
                <div className="space-y-2">
                  <Label>Invoice (optional)</Label>
                  <Select value={form.invoice_id} onValueChange={(v: string) => setForm(f => ({ ...f, invoice_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                    <SelectContent>
                      {invoices.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.invoice_number} — ₹{i.balance_due} due</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Amount (₹) *</Label>
                  <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={form.method} onValueChange={(v: string) => setForm(f => ({ ...f, method: v as PaymentMethod }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'online'] as PaymentMethod[]).map(m => (
                        <SelectItem key={m} value={m} className="capitalize">{m.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Reference #</Label>
                  <Input value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} placeholder="Optional" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>

              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Record Payment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Today&apos;s Collection</p>
          <p className="text-2xl font-bold text-emerald-500">₹{totalToday.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total Collected (All)</p>
          <p className="text-2xl font-bold text-primary">₹{totalMonth.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by customer..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Payments list */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>{['#', 'Customer', 'Method', 'Amount', 'Date', 'Reference'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{p.payment_number}</td>
                  <td className="px-4 py-3 text-sm">{(p as any).customers?.full_name}</td>
                  <td className="px-4 py-3 text-sm capitalize">
                    {METHOD_ICONS[p.method]} {p.method.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-emerald-600">₹{p.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(p.payment_date), 'MMM dd, yyyy')}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.reference_number || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No payments found</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
