'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCustomers, useDeleteCustomer } from '@/lib/hooks/use-customers'
import { useCreateCustomer } from '@/lib/hooks/use-customers'
import { CustomerForm } from '@/components/customers/customer-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { UserPlus, Search, MoreVertical, Eye, Edit, Trash2, Phone, Mail, Users } from 'lucide-react'
import { format } from 'date-fns'
import type { Customer } from '@/types/database'

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: customers, isLoading } = useCustomers(search)
  const createCustomer = useCreateCustomer()
  const deleteCustomer = useDeleteCustomer()

  const genderColors = { male: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', female: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400', child: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">All Customers</h2>
          <p className="text-sm text-muted-foreground">{customers?.length || 0} registered customers</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>Fill in the customer details below</DialogDescription>
            </DialogHeader>
            <CustomerForm
              onSubmit={(data) => createCustomer.mutate(data, { onSuccess: () => setAddOpen(false) })}
              isLoading={createCustomer.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Customer Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : customers?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">No customers found</p>
            <p className="text-sm">{search ? 'Try a different search term' : 'Add your first customer to get started'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers?.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              genderColors={genderColors}
              onDelete={() => setDeleteId(customer.id)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will deactivate the customer record. Their order history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) { deleteCustomer.mutate(deleteId); setDeleteId(null) } }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CustomerCard({ customer, genderColors, onDelete }: {
  customer: Customer
  genderColors: Record<string, string>
  onDelete: () => void
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {customer.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{customer.full_name}</CardTitle>
              <p className="text-xs text-muted-foreground">{customer.customer_code}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/customers/${customer.id}`} className="flex items-center gap-2 cursor-pointer">
                  <Eye className="h-4 w-4" /> View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/customers/${customer.id}/edit`} className="flex items-center gap-2 cursor-pointer">
                  <Edit className="h-4 w-4" /> Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive flex items-center gap-2 cursor-pointer">
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{customer.phone}</span>
        </div>
        {customer.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2">
          <Badge variant="secondary" className={genderColors[customer.gender]}>
            {customer.gender}
          </Badge>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{customer.total_orders} orders</span>
            <span>₹{customer.total_spent.toLocaleString()}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Joined {format(new Date(customer.created_at), 'MMM dd, yyyy')}
        </p>
      </CardContent>
    </Card>
  )
}
