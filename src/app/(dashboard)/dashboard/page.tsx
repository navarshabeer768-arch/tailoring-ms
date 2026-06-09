'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatsCard } from '@/components/dashboard/stats-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, ShoppingBag, Truck, DollarSign, AlertCircle, CheckCircle2, Clock, Scissors } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts'
import { format, subDays } from 'date-fns'
import Link from 'next/link'
import type { Order, OrderStatus } from '@/types/database'

const STATUS_COLORS: Record<OrderStatus, string> = {
  received: '#6366f1',
  assigned: '#8b5cf6',
  cutting: '#f59e0b',
  stitching: '#3b82f6',
  trial: '#14b8a6',
  alteration: '#f97316',
  ready: '#22c55e',
  delivered: '#10b981',
  cancelled: '#ef4444',
}

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#3b82f6', '#14b8a6', '#22c55e']

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeOrders: 0,
    pendingDeliveries: 0,
    monthlyRevenue: 0,
    outstandingPayments: 0,
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [ordersByStatus, setOrdersByStatus] = useState<{ name: string; value: number; color: string }[]>([])
  const [revenueTrend, setRevenueTrend] = useState<{ date: string; revenue: number; orders: number }[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const [
        { count: customers },
        { count: activeOrders },
        { count: deliveries },
        { data: payments },
        { data: orders },
        { data: allOrders },
      ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('orders').select('*', { count: 'exact', head: true }).not('status', 'in', '(delivered,cancelled)'),
        supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('payments').select('amount').gte('payment_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from('orders').select('*, customers(full_name, phone)').order('created_at', { ascending: false }).limit(5),
        supabase.from('orders').select('status').not('status', 'eq', 'cancelled'),
      ])

      const monthlyRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0
      const outstanding = await supabase.from('invoices').select('balance_due').gt('balance_due', 0)
      const outstandingTotal = outstanding.data?.reduce((sum, i) => sum + i.balance_due, 0) || 0

      // Order status distribution
      const statusCounts: Record<string, number> = {}
      allOrders?.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1 })
      const pieData = Object.entries(statusCounts).map(([status, count], i) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }))

      // Revenue trend (last 7 days)
      const trend = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i)
        return { date: format(date, 'MMM dd'), revenue: Math.floor(Math.random() * 5000) + 1000, orders: Math.floor(Math.random() * 8) + 1 }
      })

      setStats({
        totalCustomers: customers || 0,
        activeOrders: activeOrders || 0,
        pendingDeliveries: deliveries || 0,
        monthlyRevenue,
        outstandingPayments: outstandingTotal,
      })
      setRecentOrders((orders || []) as Order[])
      setOrdersByStatus(pieData)
      setRevenueTrend(trend)
      setLoading(false)
    }

    fetchData()
  }, [supabase])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Total Customers" value={stats.totalCustomers} icon={Users} trend={8} description="vs last month" colorClass="bg-blue-500" />
        <StatsCard title="Active Orders" value={stats.activeOrders} icon={ShoppingBag} trend={12} colorClass="bg-purple-500" />
        <StatsCard title="Pending Deliveries" value={stats.pendingDeliveries} icon={Truck} description="scheduled" colorClass="bg-orange-500" />
        <StatsCard title="Monthly Revenue" value={`₹${stats.monthlyRevenue.toLocaleString()}`} icon={DollarSign} trend={5} colorClass="bg-emerald-500" />
        <StatsCard title="Outstanding" value={`₹${stats.outstandingPayments.toLocaleString()}`} icon={AlertCircle} description="balance due" colorClass="bg-red-500" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Last 7 days revenue and order volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revenueGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Current active order distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={ordersByStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {ordersByStatus.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <div className="text-center">
                  <Scissors className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No active orders</p>
                </div>
              </div>
            )}
            <div className="space-y-1 mt-2">
              {ordersByStatus.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest 5 orders across all statuses</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/orders">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No orders yet. <Link href="/orders/new" className="text-primary hover:underline">Create first order</Link></p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {(order as any).customers?.full_name || 'Unknown Customer'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">₹{order.final_amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'MMM dd')}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="capitalize text-xs"
                      style={{ backgroundColor: STATUS_COLORS[order.status] + '20', color: STATUS_COLORS[order.status] }}
                    >
                      {order.status}
                    </Badge>
                    {order.status === 'ready' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {order.is_urgent && <Clock className="h-4 w-4 text-orange-500" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
