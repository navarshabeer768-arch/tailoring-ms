'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Truck, Calendar, MapPin, CheckCircle, Clock, Package } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { Delivery, DeliveryStatus } from '@/types/database'

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:          { label: 'Pending',          color: 'bg-slate-100 text-slate-600', icon: <Clock className="h-3.5 w-3.5" /> },
  scheduled:        { label: 'Scheduled',        color: 'bg-blue-100 text-blue-600',  icon: <Calendar className="h-3.5 w-3.5" /> },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-amber-100 text-amber-600',icon: <Truck className="h-3.5 w-3.5" /> },
  delivered:        { label: 'Delivered',        color: 'bg-green-100 text-green-600',icon: <CheckCircle className="h-3.5 w-3.5" /> },
  failed:           { label: 'Failed',           color: 'bg-red-100 text-red-600',    icon: <Package className="h-3.5 w-3.5" /> },
}

export default function DeliveriesPage() {
  const supabase = createClient()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchDeliveries = async () => {
    let q = supabase.from('deliveries')
      .select('*, orders(order_number, final_amount), customers(full_name, phone, address)')
      .order('scheduled_date', { ascending: true })
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data } = await q
    setDeliveries((data || []) as Delivery[])
    setLoading(false)
  }

  useEffect(() => { fetchDeliveries() }, [statusFilter])

  const updateStatus = async (id: string, status: DeliveryStatus) => {
    const updates: any = { status }
    if (status === 'delivered') updates.delivered_at = new Date().toISOString()
    const { error } = await supabase.from('deliveries').update(updates).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Delivery status updated'); fetchDeliveries() }
  }

  const pending = deliveries.filter(d => d.status === 'pending').length
  const scheduled = deliveries.filter(d => d.status === 'scheduled').length
  const outForDelivery = deliveries.filter(d => d.status === 'out_for_delivery').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Deliveries</h2>
          <p className="text-sm text-muted-foreground">{deliveries.length} total deliveries</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-slate-600">{pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{scheduled}</p>
          <p className="text-xs text-muted-foreground">Scheduled</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{outForDelivery}</p>
          <p className="text-xs text-muted-foreground">Out for Delivery</p>
        </CardContent></Card>
      </div>

      {/* Filter */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Deliveries List */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : deliveries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Truck className="h-12 w-12 mb-4 opacity-30" />
            <p>No deliveries found</p>
            <p className="text-sm">Deliveries are created automatically when orders are ready</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {deliveries.map(delivery => {
            const cfg = STATUS_CONFIG[delivery.status]
            const order = (delivery as any).orders
            const customer = (delivery as any).customers
            return (
              <Card key={delivery.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{order?.order_number || 'N/A'}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{customer?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{customer?.phone}</p>
                      {delivery.delivery_address && (
                        <div className="flex items-start gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" /> {delivery.delivery_address}
                        </div>
                      )}
                      {delivery.scheduled_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" /> {format(new Date(delivery.scheduled_date), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {order?.final_amount && <span className="font-semibold text-sm">₹{order.final_amount.toLocaleString()}</span>}
                      {delivery.status !== 'delivered' && (
                        <Select value={delivery.status} onValueChange={(v: string) => updateStatus(delivery.id, v as DeliveryStatus)}>
                          <SelectTrigger className="h-8 w-44 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {delivery.delivered_at && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> {format(new Date(delivery.delivered_at), 'MMM dd HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
