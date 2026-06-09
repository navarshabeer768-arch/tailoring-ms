'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Search, Package, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import type { InventoryItem } from '@/types/database'

const CATEGORIES = ['Fabric', 'Thread', 'Buttons', 'Zippers', 'Lining', 'Labels', 'Other']

export default function InventoryPage() {
  const supabase = createClient()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [open, setOpen] = useState(false)
  const [txOpen, setTxOpen] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', category: 'Fabric', sub_category: '', unit: 'meters',
    current_stock: '0', minimum_stock: '5', unit_cost: '0', supplier: '', description: '',
  })
  const [txForm, setTxForm] = useState({ type: 'in', quantity: '', notes: '' })

  const fetchItems = async () => {
    let q = supabase.from('inventory_items').select('*').eq('is_active', true).order('name')
    if (category !== 'all') q = q.eq('category', category)
    if (search) q = q.ilike('name', `%${search}%`)
    const { data } = await q
    setItems((data || []) as InventoryItem[])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [category, search])

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return }
    setSaving(true)
    const { data: code } = await supabase.rpc('generate_item_code')
    const { error } = await supabase.from('inventory_items').insert({
      ...form,
      item_code: code,
      current_stock: parseFloat(form.current_stock),
      minimum_stock: parseFloat(form.minimum_stock),
      unit_cost: parseFloat(form.unit_cost),
    })
    if (error) toast.error(error.message)
    else { toast.success('Item added'); setOpen(false); fetchItems() }
    setSaving(false)
  }

  const handleTransaction = async (itemId: string) => {
    if (!txForm.quantity) { toast.error('Enter quantity'); return }
    const { error } = await supabase.from('stock_transactions').insert({
      item_id: itemId,
      transaction_type: txForm.type,
      quantity: parseFloat(txForm.quantity),
      notes: txForm.notes || null,
      transaction_date: new Date().toISOString(),
    })
    if (error) toast.error(error.message)
    else { toast.success('Stock updated'); setTxOpen(null); fetchItems(); setTxForm({ type: 'in', quantity: '', notes: '' }) }
  }

  const lowStockItems = items.filter(i => i.current_stock <= i.minimum_stock)
  const filtered = items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Inventory Management</h2>
          <p className="text-sm text-muted-foreground">{items.length} items tracked</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label>Item Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="White Cotton Fabric" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v: string) => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={form.unit} onValueChange={(v: string) => setForm(f => ({ ...f, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['meters', 'yards', 'kg', 'pieces', 'rolls', 'boxes', 'pcs'].map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Opening Stock</Label>
                  <Input type="number" value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Min. Stock Alert</Label>
                  <Input type="number" value={form.minimum_stock} onChange={e => setForm(f => ({ ...f, minimum_stock: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Unit Cost (₹)</Label>
                  <Input type="number" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Add Item'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-900/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            <strong>{lowStockItems.length} items</strong> are below minimum stock: {lowStockItems.map(i => i.name).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mb-4 opacity-30" />
          <p>No items found</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(item => {
            const stockPercent = item.maximum_stock ? (item.current_stock / item.maximum_stock) * 100 : Math.min((item.current_stock / (item.minimum_stock * 2)) * 100, 100)
            const isLow = item.current_stock <= item.minimum_stock
            return (
              <Card key={item.id} className={`hover:shadow-md transition-shadow ${isLow ? 'border-amber-300 dark:border-amber-700' : ''}`}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.item_code}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1.5">{item.category}</Badge>
                        {isLow && <Badge variant="destructive" className="text-[10px] px-1.5 gap-1"><AlertTriangle className="h-2.5 w-2.5" /> Low</Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{item.current_stock}</p>
                      <p className="text-xs text-muted-foreground">{item.unit}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Min: {item.minimum_stock}</span>
                      {item.maximum_stock && <span>Max: {item.maximum_stock}</span>}
                    </div>
                    <Progress value={stockPercent} className={isLow ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'} />
                  </div>
                  {item.unit_cost > 0 && <p className="text-xs text-muted-foreground">Unit cost: ₹{item.unit_cost}</p>}

                  {/* Stock transaction dialog */}
                  <Dialog open={txOpen === item.id} onOpenChange={o => setTxOpen(o ? item.id : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full gap-1.5 h-8 text-xs">
                        <TrendingUp className="h-3.5 w-3.5" /> Update Stock
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader><DialogTitle>Update Stock — {item.name}</DialogTitle></DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label>Transaction Type</Label>
                          <Select value={txForm.type} onValueChange={(v: string) => setTxForm(f => ({ ...f, type: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in"><span className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" /> Stock In</span></SelectItem>
                              <SelectItem value="out"><span className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" /> Stock Out</span></SelectItem>
                              <SelectItem value="adjustment">Adjustment</SelectItem>
                              <SelectItem value="return">Return</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Quantity ({item.unit})</Label>
                          <Input type="number" value={txForm.quantity} onChange={e => setTxForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" />
                        </div>
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea value={txForm.notes} onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                        </div>
                        <Button className="w-full" onClick={() => handleTransaction(item.id)}>Update Stock</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
