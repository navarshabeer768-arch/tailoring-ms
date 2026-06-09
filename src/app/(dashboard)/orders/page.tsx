'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useOrders, useUpdateOrderStatus } from '@/lib/hooks/use-orders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, ShoppingBag, MoreVertical, Eye, ChevronRight, Clock, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import type { OrderStatus } from '@/types/database'

const ORDER_STATUSES: OrderStatus[] = ['received', 'assigned', 'cutting', 'stitching', 'trial', 'alteration', 'ready', 'delivered', 'cancelled']

const STATUS_CONFIG: Record<OrderStatus, { color: string; bg: string }> = {
  received:    { color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  assigned:    { color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  cutting:     { color: 'text-amber-600',  bg: 'bg-amber-100 dark:bg-amber-900/30' },
  stitching:   { color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
  trial:       { color: 'text-teal-600',   bg: 'bg-teal-100 dark:bg-teal-900/30' },
  alteration:  { color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  ready:       { color: 'text-green-600',  bg: 'bg-green-100 dark:bg-green-900/30' },
  delivered:   { color: 'text-emerald-600',bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  cancelled:   { color: 'text-red-600',    bg: 'bg-red-100 dark:bg-red-900/30' },
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  received: 'assigned', assigned: 'cutting', cutting: 'stitching',
  stitching: 'trial', trial: 'alteration', alteration: 'ready', ready: 'delivered',
}

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { data: orders, isLoading } = useOrders({
    status: statusFilter !== 'all' ? statusFilter as OrderStatus : undefined,
    search,
  })
  const updateStatus = useUpdateOrderStatus()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">All Orders</h2>
          <p className="text-sm text-muted-foreground">{orders?.length || 0} orders found</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/orders/new"><Plus className="h-4 w-4" /> New Order</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search order number..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Pills */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...ORDER_STATUSES] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as string)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-transparent hover:border-border'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : orders?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">No orders found</p>
            <p className="text-sm mb-4">{search ? 'Try a different search' : 'Create your first order'}</p>
            <Button asChild><Link href="/orders/new">Create Order</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders?.map((order) => {
            const cfg = STATUS_CONFIG[order.status]
            const nextStatus = NEXT_STATUS[order.status]
            const customer = (order as any).customers
            return (
              <div key={order.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{order.order_number}</span>
                    {order.is_urgent && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
                        <Clock className="h-2.5 w-2.5" /> URGENT
                      </Badge>
                    )}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cfg.bg} ${cfg.color}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{customer?.full_name || 'Unknown'} · {customer?.phone || ''}</p>
                  {order.delivery_date && (
                    <p className="text-xs text-muted-foreground">
                      Delivery: {format(new Date(order.delivery_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-sm">₹{order.final_amount.toLocaleString()}</p>
                  {order.balance_due > 0 && (
                    <p className="text-xs text-red-500 flex items-center gap-1 justify-end">
                      <AlertCircle className="h-3 w-3" /> ₹{order.balance_due.toLocaleString()} due
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'MMM dd')}</p>
                </div>

                <div className="flex items-center gap-1">
                  {nextStatus && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 hidden sm:flex"
                      onClick={() => updateStatus.mutate({ id: order.id, status: nextStatus })}
                    >
                      → {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/orders/${order.id}`} className="flex items-center gap-2 cursor-pointer">
                          <Eye className="h-4 w-4" /> View Details
                        </Link>
                      </DropdownMenuItem>
                      {nextStatus && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => updateStatus.mutate({ id: order.id, status: nextStatus })}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <ChevronRight className="h-4 w-4" /> Move to {nextStatus}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
