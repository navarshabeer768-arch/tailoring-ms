'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCustomer, useUpdateCustomer } from '@/lib/hooks/use-customers'
import { CustomerForm } from '@/components/customers/customer-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: customer, isLoading } = useCustomer(id)
  const updateCustomer = useUpdateCustomer()

  if (isLoading) return <Skeleton className="h-96" />
  if (!customer) return <div>Customer not found</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <Button variant="ghost" asChild className="gap-2">
        <Link href={`/customers/${id}`}><ArrowLeft className="h-4 w-4" /> Back to Customer</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            defaultValues={customer}
            onSubmit={(data) =>
              updateCustomer.mutate({ id, data }, { onSuccess: () => router.push(`/customers/${id}`) })
            }
            isLoading={updateCustomer.isPending}
            submitLabel="Update Customer"
          />
        </CardContent>
      </Card>
    </div>
  )
}
