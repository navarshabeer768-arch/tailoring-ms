'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { format, subDays, startOfMonth, endOfMonth, startOfWeek } from 'date-fns'
import { TrendingUp, Users, ShoppingBag, DollarSign, Star } from 'lucide-react'

const COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#3b82f6', '#14b8a6', '#22c55e', '#f97316', '#ef4444']

export default function ReportsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [salesData, setSalesData] = useState<any[]>([])
  const [orderStatusData, setOrderStatusData] = useState<any[]>([])
  const [topServices, setTopServices] = useState<any[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])
  const [tailorPerformance, setTailorPerformance] = useState<any[]>([])
  const [summary, setSummary] = useState({ revenue: 0, orders: 0, customers: 0, avgOrder: 0 })

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      const now = new Date()
      const startDate = period === 'week' ? startOfWeek(now) :
        period === 'month' ? startOfMonth(now) :
        subDays(now, 365)

      const [
        { data: payments },
        { data: orders },
        { data: newCustomers },
        { data: orderItems },
        { data: tailors },
      ] = await Promise.all([
        supabase.from('payments').select('amount, payment_date').gte('payment_date', startDate.toISOString()),
        supabase.from('orders').select('status, created_at, final_amount').gte('created_at', startDate.toISOString()),
        supabase.from('customers').select('created_at').gte('created_at', startDate.toISOString()),
        supabase.from('order_items').select('total_price, services(name)').limit(200),
        supabase.from('employees').select('full_name, tailor_assignments(count)').eq('role', 'tailor'),
      ])

      // Revenue trend
      const dayCount = period === 'week' ? 7 : period === 'month' ? 30 : 12
      const salesByDay = Array.from({ length: dayCount }, (_, i) => {
        const date = subDays(now, dayCount - 1 - i)
        const dayPayments = payments?.filter((p: any) => {
          const pDate = new Date(p.payment_date)
          return pDate.toDateString() === date.toDateString()
        })
        return {
          date: format(date, dayCount > 30 ? 'MMM' : 'MMM dd'),
          revenue: dayPayments?.reduce((s: number, p: any) => s + (p.amount || 0), 0) || 0,
          orders: orders?.filter((o: any) => new Date(o.created_at).toDateString() === date.toDateString()).length || 0,
        }
      })
      setSalesData(salesByDay)

      // Order status distribution
      const statusCounts: Record<string, number> = {}
      orders?.forEach((o: any) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1 })
      setOrderStatusData(Object.entries(statusCounts).map(([name, value], i) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1), value, color: COLORS[i % COLORS.length]
      })))

      // Top services
      const serviceCounts: Record<string, { count: number; revenue: number }> = {}
      orderItems?.forEach((item: any) => {
        const name = (item as any).services?.name || 'Custom'
        if (!serviceCounts[name]) serviceCounts[name] = { count: 0, revenue: 0 }
        serviceCounts[name].count++
        serviceCounts[name].revenue += item.total_price
      })
      setTopServices(Object.entries(serviceCounts).map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue).slice(0, 6))

      // Summary
      const totalRevenue = payments?.reduce((s: number, p: any) => s + (p.amount || 0), 0) || 0
      const totalOrders = orders?.length || 0
      setSummary({
        revenue: totalRevenue,
        orders: totalOrders,
        customers: newCustomers?.length || 0,
        avgOrder: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      })

      setLoading(false)
    }
    fetchReports()
  }, [period, supabase])

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <div className="grid grid-cols-2 gap-6">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Reports & Analytics</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold text-primary">₹{summary.revenue.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg"><TrendingUp className="h-5 w-5 text-primary" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Orders</p>
                <p className="text-xl font-bold text-purple-600">{summary.orders}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/30"><ShoppingBag className="h-5 w-5 text-purple-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">New Customers</p>
                <p className="text-xl font-bold text-blue-600">{summary.customers}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30"><Users className="h-5 w-5 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg. Order Value</p>
                <p className="text-xl font-bold text-emerald-600">₹{summary.avgOrder.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="p-2 bg-emerald-100 rounded-lg dark:bg-emerald-900/30"><DollarSign className="h-5 w-5 text-emerald-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue & Orders Trend</CardTitle>
            <CardDescription>Daily revenue and order count for selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, name) => [name === 'revenue' ? `₹${v}` : v, name === 'revenue' ? 'Revenue' : 'Orders']} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#rev)" strokeWidth={2} />
                <Bar dataKey="orders" fill="#8b5cf6" opacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {orderStatusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {orderStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {orderStatusData.map(item => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-center text-muted-foreground py-12">No order data</p>}
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card>
          <CardHeader>
            <CardTitle>Top Services by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {topServices.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topServices} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip formatter={v => [`₹${v}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-12">No service data</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
