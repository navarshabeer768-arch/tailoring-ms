'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useOrder, useUpdateOrderStatus } from '@/lib/hooks/use-orders'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Clock, User, Calendar, FileText, ChevronRight, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import type { OrderStatus } from '@/types/database'

const STATUS_STEPS: OrderStatus[] = ['received', 'assigned', 'cutting', 'stitching', 'trial', 'alteration', 'ready', 'delivered']
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  received: 'assigned', assigned: 'cutting', cutting: 'stitching',
  stitching: 'trial', trial: 'alteration', alteration: 'ready', ready: 'delivered',
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  received: '#6366f1', assigned: '#8b5cf6', cutting: '#f59e0b',
  stitching: '#3b82f6', trial: '#14b8a6', alteration: '#f97316',
  ready: '#22c55e', delivered: '#10b981', cancelled: '#ef4444',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading } = useOrder(id)
  const updateStatus = useUpdateOrderStatus()

  if (isLoading) return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
    </div>
  )
  if (!order) return <div className="text-center py-16 text-muted-foreground">Order not found</div>

  const customer = (order as any).customers
  const tailor = (order as any).employees
  const currentStepIndex = STATUS_STEPS.indexOf(order.status)
  const nextStatus = NEXT_STATUS[order.status]

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/orders"><ArrowLeft className="h-4 w-4" /> Back to Orders</Link>
        </Button>
        <div className="flex items-center gap-2">
          {order.is_urgent && <Badge variant="destructive" className="gap-1"><Clock className="h-3 w-3" /> URGENT</Badge>}
          {nextStatus && (
            <Button
              onClick={() => updateStatus.mutate({ id: order.id, status: nextStatus })}
              disabled={updateStatus.isPending}
              className="gap-2"
            >
              <ChevronRight className="h-4 w-4" /> Move to {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
            </Button>
          )}
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/billing/new?order=${id}`}><FileText className="h-4 w-4" /> Create Invoice</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{order.order_number}</CardTitle>
            <span className="text-sm text-muted-foreground">{format(new Date(order.created_at), 'MMM dd, yyyy')}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {STATUS_STEPS.map((step, i) => {
              const isCompleted = i <= currentStepIndex
              const isCurrent = i === currentStepIndex
              const color = STATUS_COLORS[step]
              return (
                <div key={step} className="flex items-center gap-1 flex-shrink-0">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                      style={{
                        backgroundColor: isCompleted ? color : 'var(--muted)',
                        color: isCompleted ? 'white' : 'var(--muted-foreground)',
                        boxShadow: isCurrent ? `0 0 0 3px ${color}40` : 'none',
                      }}
                    >
                      {isCompleted && !isCurrent ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className="text-[10px] capitalize text-center w-14 leading-tight" style={{ color: isCurrent ? color : 'inherit' }}>
                      {step}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className="h-0.5 w-6 -mt-4 rounded" style={{ backgroundColor: i < currentStepIndex ? color : 'var(--border)' }} />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Order Items</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(order as any).order_items?.map((item: any) => (
                  <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg bg-muted/30">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize text-xs">{item.garment_type}</Badge>
                        {item.services && <span className="text-xs text-muted-foreground">{item.services.name}</span>}
                      </div>
                      {item.fabric_type && <p className="text-xs text-muted-foreground mt-1">Fabric: {item.fabric_type} {item.fabric_color && `· ${item.fabric_color}`}</p>}
                      {item.design_notes && <p className="text-xs text-muted-foreground">{item.design_notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">₹{item.total_price.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {(order as any).order_status_history?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Status History</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(order as any).order_status_history?.map((h: any) => (
                    <div key={h.id} className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      <div className="flex-1">
                        <span className="capitalize font-medium">{h.to_status}</span>
                        {h.from_status && <span className="text-muted-foreground"> from {h.from_status}</span>}
                        {h.user_profiles && <span className="text-muted-foreground"> · {h.user_profiles.full_name}</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">{format(new Date(h.created_at), 'MMM dd, HH:mm')}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{customer?.full_name}</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">{customer?.phone}</p>
              {customer?.city && <p className="text-sm text-muted-foreground pl-6">{customer.city}</p>}
              <Button asChild variant="outline" size="sm" className="w-full mt-2">
                <Link href={`/customers/${order.customer_id}`}>View Profile</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Payment Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">₹{order.final_amount.toLocaleString()}</span></div>
              <div className="flex justify-between text-green-600"><span>Paid</span><span>₹{order.advance_paid.toLocaleString()}</span></div>
              <Separator />
              <div className={`flex justify-between font-semibold ${order.balance_due > 0 ? 'text-red-500' : 'text-green-500'}`}>
                <span>Balance Due</span><span>₹{order.balance_due.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {order.delivery_date && (
            <Card>
              <CardHeader><CardTitle className="text-base">Scheduling</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">Delivery Date</p>
                    <p className="font-medium">{format(new Date(order.delivery_date), 'MMMM dd, yyyy')}</p>
                  </div>
                </div>
                {order.trial_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div><p className="text-xs text-muted-foreground">Trial Date</p>
                      <p className="font-medium">{format(new Date(order.trial_date), 'MMMM dd, yyyy')}</p>
                    </div>
                  </div>
                )}
                {tailor && (
                  <div className="flex items-center gap-2 pt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div><p className="text-xs text-muted-foreground">Assigned Tailor</p>
                      <p className="font-medium">{tailor.full_name}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {order.special_instructions && (
            <Card>
              <CardHeader><CardTitle className="text-base">Special Instructions</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{order.special_instructions}</p></CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
