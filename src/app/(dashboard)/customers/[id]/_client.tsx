'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useCustomer } from '@/lib/hooks/use-customers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, ShoppingBag, Ruler, CreditCard } from 'lucide-react'
import { format } from 'date-fns'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: customer, isLoading } = useCustomer(id)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!customer) return <div className="text-center py-16 text-muted-foreground">Customer not found</div>

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/customers"><ArrowLeft className="h-4 w-4" /> Back to Customers</Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href={`/customers/${id}/edit`}><Edit className="h-4 w-4" /> Edit Customer</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-20 w-20 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {customer.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-bold">{customer.full_name}</h2>
                  <p className="text-muted-foreground">{customer.customer_code}</p>
                </div>
                <Badge variant="outline" className="capitalize">{customer.gender}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" /> {customer.phone}
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" /> {customer.email}
                  </div>
                )}
                {customer.city && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" /> {customer.city}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Joined {format(new Date(customer.created_at), 'MMMM dd, yyyy')}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{customer.total_orders}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-500">₹{customer.total_spent.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">
                {customer.total_orders > 0 ? Math.round(customer.total_spent / customer.total_orders).toLocaleString() : 0}
              </p>
              <p className="text-xs text-muted-foreground">Avg. Order Value</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders" className="gap-2"><ShoppingBag className="h-4 w-4" /> Orders</TabsTrigger>
          <TabsTrigger value="measurements" className="gap-2"><Ruler className="h-4 w-4" /> Measurements</TabsTrigger>
          <TabsTrigger value="payments" className="gap-2"><CreditCard className="h-4 w-4" /> Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Order History</CardTitle>
                <Button asChild size="sm">
                  <Link href={`/orders/new?customer=${id}`}>New Order</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No orders yet</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="measurements">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Measurement Profiles</CardTitle>
                <Button asChild size="sm">
                  <Link href={`/measurements/new?customer=${id}`}>Add Measurements</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Ruler className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No measurements recorded yet</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No payments recorded yet</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {(customer.notes || customer.preferences) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customer.preferences && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Style Preferences</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{customer.preferences}</p></CardContent>
            </Card>
          )}
          {customer.notes && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{customer.notes}</p></CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
