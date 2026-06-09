'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Ruler, Plus, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { MeasurementProfile } from '@/types/database'

const MEN_FIELDS = ['chest','waist','hips','shoulder','sleeve_length','shirt_length','neck','inseam','thigh','knee','ankle','pant_length']
const WOMEN_FIELDS = ['bust','under_bust','waist','hips','shoulder','sleeve_length','blouse_length','front_length','back_length','shoulder_to_waist']
const CHILD_FIELDS = ['height','weight','chest','waist','shoulder','shirt_length','pant_length']

function MeasurementsContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const customerId = searchParams.get('customer')

  const [profiles, setProfiles] = useState<MeasurementProfile[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(customerId || '')
  const [gender, setGender] = useState<'male' | 'female' | 'child'>('male')
  const [profileName, setProfileName] = useState('Default')
  const [measurements, setMeasurements] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')

  const fetchData = async () => {
    let q = supabase.from('measurement_profiles')
      .select('*, customers(full_name, customer_code), measurement_versions(*)')
      .order('created_at', { ascending: false })
    if (customerId) q = q.eq('customer_id', customerId)
    const { data } = await q
    setProfiles((data || []) as MeasurementProfile[])

    const { data: custs } = await supabase.from('customers').select('id, full_name, customer_code, gender').eq('is_active', true)
    setCustomers(custs || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [customerId])

  const getFields = () => gender === 'male' ? MEN_FIELDS : gender === 'female' ? WOMEN_FIELDS : CHILD_FIELDS

  const handleSave = async () => {
    if (!selectedCustomer) { toast.error('Select a customer'); return }
    setSaving(true)

    const { data: profile, error: profileError } = await supabase.from('measurement_profiles').insert({
      customer_id: selectedCustomer,
      profile_name: profileName,
      gender,
      is_default: profiles.filter(p => (p as any).customer_id === selectedCustomer).length === 0,
    }).select().single()

    if (profileError) { toast.error(profileError.message); setSaving(false); return }

    const versionData = Object.fromEntries(
      Object.entries(measurements).filter(([, v]) => v !== '').map(([k, v]) => [k, parseFloat(v)])
    )

    const { error: versionError } = await supabase.from('measurement_versions').insert({
      profile_id: profile.id,
      version_number: 1,
      ...versionData,
      notes,
    })

    if (versionError) toast.error(versionError.message)
    else { toast.success('Measurements saved'); setOpen(false); fetchData() }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Measurements</h2>
          <p className="text-sm text-muted-foreground">{profiles.length} measurement profiles</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Measurements</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Record Measurements</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name} ({c.customer_code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Profile Name</Label>
                  <Input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Default, Wedding, etc." />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Tabs value={gender} onValueChange={(v: string) => { setGender(v as any); setMeasurements({}) }}>
                  <TabsList className="w-full">
                    <TabsTrigger value="male" className="flex-1">Men&apos;s</TabsTrigger>
                    <TabsTrigger value="female" className="flex-1">Women&apos;s</TabsTrigger>
                    <TabsTrigger value="child" className="flex-1">Children&apos;s</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {getFields().map(field => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs capitalize">{field.replace('_', ' ')} (in)</Label>
                    <Input
                      type="number"
                      step="0.25"
                      className="h-8"
                      value={measurements[field] || ''}
                      onChange={e => setMeasurements(m => ({ ...m, [field]: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Special fitting notes..." />
              </div>

              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Measurements'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : profiles.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Ruler className="h-12 w-12 mb-4 opacity-30" />
          <p>No measurement profiles yet</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map(profile => {
            const latestVersion = (profile as any).measurement_versions?.sort((a: any, b: any) => b.version_number - a.version_number)[0]
            const customer = (profile as any).customers
            return (
              <Card key={profile.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{profile.profile_name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{customer?.full_name}</span>
                        <span className="text-xs text-muted-foreground">{customer?.customer_code}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="capitalize">{profile.gender}</Badge>
                      {profile.is_default && <Badge className="text-[10px]">Default</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {latestVersion ? (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {Object.entries(latestVersion)
                        .filter(([k, v]) => !['id','profile_id','version_number','notes','measured_by','created_at'].includes(k) && v !== null)
                        .slice(0, 9)
                        .map(([k, v]) => (
                          <div key={k} className="text-center p-1.5 bg-muted/50 rounded">
                            <p className="font-semibold">{v as string}&quot;</p>
                            <p className="text-muted-foreground capitalize">{k.replace('_', ' ')}</p>
                          </div>
                        ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground">No measurements recorded</p>}

                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    v{(profile as any).measurement_versions?.length || 0} · Last updated {format(new Date(profile.updated_at || profile.created_at), 'MMM dd, yyyy')}
                  </div>
                  {latestVersion?.notes && <p className="text-xs text-muted-foreground mt-1 italic">{latestVersion.notes}</p>}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function MeasurementsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
      <MeasurementsContent />
    </Suspense>
  )
}
