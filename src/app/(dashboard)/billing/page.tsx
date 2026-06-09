'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, FileText, Download, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { Invoice, InvoiceStatus } from '@/types/database'

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft:     'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  sent:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  paid:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  partial:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  overdue:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
}

export default function BillingPage() {
  const supabase = createClient()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const fetch = async () => {
      let q = supabase.from('invoices').select('*, customers(full_name, phone), orders(order_number)').order('created_at', { ascending: false })
      if (statusFilter !== 'all') q = q.eq('status', statusFilter)
      if (search) q = q.ilike('invoice_number', `%${search}%`)
      const { data } = await q
      setInvoices((data || []) as Invoice[])
      setLoading(false)
    }
    fetch()
  }, [supabase, search, statusFilter])

  const totalRevenue = invoices.reduce((s, i) => s + i.total_amount, 0)
  const totalPaid = invoices.reduce((s, i) => s + i.paid_amount, 0)
  const totalOutstanding = invoices.reduce((s, i) => s + i.balance_due, 0)

  const downloadInvoice = async (invoice: Invoice) => {
    toast.info('PDF generation — integrate jsPDF for production use')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Billing & Invoicing</h2>
          <p className="text-sm text-muted-foreground">{invoices.length} invoices</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/billing/new"><Plus className="h-4 w-4" /> New Invoice</Link>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Invoiced</p>
            <p className="text-2xl font-bold text-primary">₹{totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Collected</p>
            <p className="text-2xl font-bold text-emerald-500">₹{totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold text-red-500">₹{totalOutstanding.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search invoice number..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'] as InvoiceStatus[]).map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Invoice Table */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">No invoices found</p>
            <Button asChild className="mt-4"><Link href="/billing/new">Create Invoice</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  {['Invoice #', 'Customer', 'Order', 'Date', 'Total', 'Paid', 'Balance', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map(inv => {
                  const customer = (inv as any).customers
                  const order = (inv as any).orders
                  return (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-sm">{customer?.full_name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{order?.order_number}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(inv.created_at), 'MMM dd, yyyy')}</td>
                      <td className="px-4 py-3 text-sm font-medium">₹{inv.total_amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-green-600">₹{inv.paid_amount.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-sm font-medium ${inv.balance_due > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        ₹{inv.balance_due.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[inv.status]}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <Link href={`/billing/${inv.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadInvoice(inv)}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
