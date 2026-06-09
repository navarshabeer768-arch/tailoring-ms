import { z } from 'zod'

export const customerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').regex(/^[+\d\s\-()]+$/, 'Invalid phone number'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'child']),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  preferences: z.string().optional(),
})

export type CustomerInput = z.infer<typeof customerSchema>
