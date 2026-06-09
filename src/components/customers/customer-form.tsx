'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { customerSchema, type CustomerInput } from '@/lib/validations/customer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { Customer } from '@/types/database'

interface CustomerFormProps {
  defaultValues?: Partial<Customer>
  onSubmit: (data: CustomerInput) => void
  isLoading?: boolean
  submitLabel?: string
}

export function CustomerForm({ defaultValues, onSubmit, isLoading, submitLabel = 'Save Customer' }: CustomerFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      full_name: defaultValues?.full_name || '',
      phone: defaultValues?.phone || '',
      email: defaultValues?.email || '',
      gender: defaultValues?.gender || 'male',
      address: defaultValues?.address || '',
      city: defaultValues?.city || '',
      notes: defaultValues?.notes || '',
      preferences: defaultValues?.preferences || '',
    },
  })

  const gender = watch('gender')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name *</Label>
          <Input id="full_name" placeholder="Ahmed Ali" {...register('full_name')} />
          {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input id="phone" placeholder="+971 50 123 4567" {...register('phone')} />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="ahmed@example.com" {...register('email')} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Gender *</Label>
          <Select value={gender} onValueChange={(val: string) => setValue('gender', val as CustomerInput['gender'])}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="child">Child</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of Birth</Label>
          <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" placeholder="Dubai" {...register('city')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" placeholder="Full address..." rows={2} {...register('address')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferences">Style Preferences</Label>
        <Textarea id="preferences" placeholder="Customer preferences, style notes..." rows={2} {...register('preferences')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Additional notes..." rows={2} {...register('notes')} />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
