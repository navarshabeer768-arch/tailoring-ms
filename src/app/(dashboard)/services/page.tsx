'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Wrench, Tag, Clock } from 'lucide-react'
import { toast } from 'sonner'
import type { ServiceCategory, Service } from '@/types/database'

export default function ServicesPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [svcOpen, setSvcOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    category_id: '', name: '', description: '',
    base_price: '', urgent_price: '', duration_days: '7', is_active: true,
  })

  const fetchData = async () => {
    const [{ data: cats }, { data: svcs }] = await Promise.all([
      supabase.from('service_categories').select('*').order('sort_order'),
      supabase.from('services').select('*, service_categories(name)').order('name'),
    ])
    setCategories((cats || []) as ServiceCategory[])
    setServices((svcs || []) as Service[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleSave = async () => {
    if (!form.name || !form.base_price) { toast.error('Name and price are required'); return }
    setSaving(true)
    const { error } = await supabase.from('services').insert({
      ...form,
      base_price: parseFloat(form.base_price),
      urgent_price: form.urgent_price ? parseFloat(form.urgent_price) : null,
      duration_days: parseInt(form.duration_days),
      category_id: form.category_id || null,
    })
    if (error) toast.error(error.message)
    else { toast.success('Service added'); setSvcOpen(false); fetchData() }
    setSaving(false)
  }

  const toggleService = async (id: string, is_active: boolean) => {
    await supabase.from('services').update({ is_active }).eq('id', id)
    fetchData()
  }

  const servicesByCategory = categories.map(cat => ({
    ...cat,
    items: services.filter(s => s.category_id === cat.id),
  }))
  const uncategorized = services.filter(s => !s.category_id)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Services & Pricing</h2>
          <p className="text-sm text-muted-foreground">{services.filter(s => s.is_active).length} active services</p>
        </div>
        <Dialog open={svcOpen} onOpenChange={setSvcOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Service</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add New Service</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v: string) => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Service Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Men's Shirt" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Base Price (₹) *</Label>
                  <Input type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} placeholder="800" />
                </div>
                <div className="space-y-2">
                  <Label>Urgent Price (₹)</Label>
                  <Input type="number" value={form.urgent_price} onChange={e => setForm(f => ({ ...f, urgent_price: e.target.value }))} placeholder="1200" />
                </div>
                <div className="space-y-2">
                  <Label>Days</Label>
                  <Input type="number" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: e.target.value }))} placeholder="7" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label>Active</Label>
              </div>
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Add Service'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : (
        <div className="space-y-6">
          {servicesByCategory.map(cat => (
            <Card key={cat.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  {cat.name}
                  <Badge variant="secondary" className="ml-auto">{cat.items.length} services</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {cat.items.map(svc => (
                    <ServiceCard key={svc.id} service={svc} onToggle={toggleService} />
                  ))}
                </div>
                {cat.items.length === 0 && <p className="text-sm text-muted-foreground">No services in this category</p>}
              </CardContent>
            </Card>
          ))}
          {uncategorized.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Other Services</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {uncategorized.map(svc => <ServiceCard key={svc.id} service={svc} onToggle={toggleService} />)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function ServiceCard({ service, onToggle }: { service: Service; onToggle: (id: string, active: boolean) => void }) {
  return (
    <div className={`p-3 border rounded-lg ${!service.is_active ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{service.name}</p>
          {service.description && <p className="text-xs text-muted-foreground truncate">{service.description}</p>}
        </div>
        <Switch checked={service.is_active} onCheckedChange={v => onToggle(service.id, v)} />
      </div>
      <div className="flex items-center justify-between mt-2">
        <div>
          <p className="text-sm font-semibold text-primary">₹{service.base_price.toLocaleString()}</p>
          {service.urgent_price && <p className="text-xs text-orange-500">Urgent: ₹{service.urgent_price.toLocaleString()}</p>}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> {service.duration_days}d
        </div>
      </div>
    </div>
  )
}
