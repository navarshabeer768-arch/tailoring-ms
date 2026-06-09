'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { UserPlus, Phone, Mail, Search, Users, Briefcase } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { Employee, EmployeeStatus } from '@/types/database'

const STATUS_STYLES: Record<EmployeeStatus, string> = {
  active:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  on_leave: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export default function EmployeesPage() {
  const supabase = createClient()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', role: 'tailor', joining_date: new Date().toISOString().split('T')[0],
    salary: '', status: 'active' as EmployeeStatus, address: '', notes: '',
  })

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('*').order('created_at', { ascending: false })
    setEmployees((data || []) as Employee[])
    setLoading(false)
  }

  useEffect(() => { fetchEmployees() }, [])

  const handleSave = async () => {
    if (!form.full_name || !form.phone) { toast.error('Name and phone are required'); return }
    setSaving(true)
    const { data: code } = await supabase.rpc('generate_employee_code')
    const { error } = await supabase.from('employees').insert({
      ...form,
      employee_code: code,
      salary: form.salary ? parseFloat(form.salary) : null,
    })
    if (error) toast.error(error.message)
    else { toast.success('Employee added'); setOpen(false); fetchEmployees() }
    setSaving(false)
  }

  const filtered = employees.filter(e =>
    !search || e.full_name.toLowerCase().includes(search.toLowerCase()) || e.phone.includes(search)
  )

  const active = employees.filter(e => e.status === 'active').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Employees & Tailors</h2>
          <p className="text-sm text-muted-foreground">{active} active of {employees.length} total</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><UserPlus className="h-4 w-4" /> Add Employee</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label>Full Name *</Label>
                  <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Ahmad Tailor" />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+971..." />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v: string) => setForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['tailor', 'cutter', 'embroiderer', 'presser', 'manager', 'receptionist'].map(r => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v: string) => setForm(f => ({ ...f, status: v as EmployeeStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Joining Date</Label>
                  <Input type="date" value={form.joining_date} onChange={e => setForm(f => ({ ...f, joining_date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Salary (₹)</Label>
                  <Input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="25000" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Add Employee'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search employees..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-30" />
            <p>No employees found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(emp => (
            <Card key={emp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {emp.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{emp.full_name}</p>
                    <p className="text-xs text-muted-foreground">{emp.employee_code}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Briefcase className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs capitalize text-muted-foreground">{emp.role}</span>
                    </div>
                  </div>
                  <Badge className={`text-[10px] ${STATUS_STYLES[emp.status]}`}>{emp.status}</Badge>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {emp.phone}
                  </div>
                  {emp.email && <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                    <Mail className="h-3.5 w-3.5" /> {emp.email}
                  </div>}
                  {emp.salary && <p className="text-xs font-medium text-emerald-600">₹{emp.salary.toLocaleString()}/month</p>}
                  <p className="text-xs text-muted-foreground">Joined {format(new Date(emp.joining_date), 'MMM dd, yyyy')}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
