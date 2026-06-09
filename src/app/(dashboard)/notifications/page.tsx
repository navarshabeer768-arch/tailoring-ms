'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, MessageSquare, Mail, Phone, Plus, Send, CheckCircle, XCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { Notification, NotificationTemplate, NotificationType, NotificationStatus } from '@/types/database'

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; color: string; label: string }> = {
  whatsapp: { icon: <MessageSquare className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-600', label: 'WhatsApp' },
  sms:      { icon: <Phone className="h-3.5 w-3.5" />,        color: 'bg-blue-100 text-blue-600',   label: 'SMS' },
  email:    { icon: <Mail className="h-3.5 w-3.5" />,         color: 'bg-purple-100 text-purple-600', label: 'Email' },
}

const STATUS_CONFIG: Record<NotificationStatus, { icon: React.ReactNode; color: string }> = {
  pending:   { icon: <Clock className="h-3.5 w-3.5" />,       color: 'text-slate-500' },
  sent:      { icon: <Send className="h-3.5 w-3.5" />,        color: 'text-blue-500' },
  delivered: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: 'text-green-500' },
  failed:    { icon: <XCircle className="h-3.5 w-3.5" />,     color: 'text-red-500' },
}

export default function NotificationsPage() {
  const supabase = createClient()
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tmplForm, setTmplForm] = useState({
    name: '', type: 'sms' as NotificationType, trigger_event: '', subject: '', body: '', is_active: true,
  })
  const [sendForm, setSendForm] = useState({
    type: 'sms' as NotificationType, recipient: '', subject: '', message: '', customer_id: '',
  })
  const [customers, setCustomers] = useState<any[]>([])

  const fetchData = async () => {
    const [{ data: t }, { data: n }] = await Promise.all([
      supabase.from('notification_templates').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*, customers(full_name)').order('created_at', { ascending: false }).limit(50),
    ])
    setTemplates((t || []) as NotificationTemplate[])
    setNotifications((n || []) as Notification[])
    supabase.from('customers').select('id, full_name, phone, email').then(({ data }) => setCustomers(data || []))
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleSaveTemplate = async () => {
    if (!tmplForm.name || !tmplForm.body || !tmplForm.trigger_event) { toast.error('Fill required fields'); return }
    setSaving(true)
    const { error } = await supabase.from('notification_templates').insert(tmplForm)
    if (error) toast.error(error.message)
    else { toast.success('Template saved'); setOpen(false); fetchData() }
    setSaving(false)
  }

  const handleSendNotification = async () => {
    if (!sendForm.recipient || !sendForm.message) { toast.error('Fill required fields'); return }
    setSaving(true)
    const { error } = await supabase.from('notifications').insert({
      ...sendForm,
      customer_id: sendForm.customer_id || null,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    if (error) toast.error(error.message)
    else { toast.success('Notification sent (demo mode — integrate provider in production)'); setSendOpen(false); fetchData() }
    setSaving(false)
  }

  const toggleTemplate = async (id: string, is_active: boolean) => {
    await supabase.from('notification_templates').update({ is_active }).eq('id', id)
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground">Manage templates and send messages</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={sendOpen} onOpenChange={setSendOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><Send className="h-4 w-4" /> Send Now</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Send Notification</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Customer (optional)</Label>
                  <Select value={sendForm.customer_id} onValueChange={(v: string) => {
                    const c = customers.find(c => c.id === v)
                    setSendForm(f => ({ ...f, customer_id: v, recipient: f.type === 'email' ? c?.email || '' : c?.phone || '' }))
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={sendForm.type} onValueChange={(v: string) => setSendForm(f => ({ ...f, type: v as NotificationType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Recipient *</Label>
                    <Input value={sendForm.recipient} onChange={e => setSendForm(f => ({ ...f, recipient: e.target.value }))} placeholder="+971..." />
                  </div>
                </div>
                {sendForm.type === 'email' && (
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input value={sendForm.subject} onChange={e => setSendForm(f => ({ ...f, subject: e.target.value }))} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Message *</Label>
                  <Textarea value={sendForm.message} onChange={e => setSendForm(f => ({ ...f, message: e.target.value }))} rows={3} />
                </div>
                <Button className="w-full" onClick={handleSendNotification} disabled={saving}>{saving ? 'Sending...' : 'Send'}</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Template</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Notification Template</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Template Name *</Label>
                    <Input value={tmplForm.name} onChange={e => setTmplForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={tmplForm.type} onValueChange={(v: string) => setTmplForm(f => ({ ...f, type: v as NotificationType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Trigger Event *</Label>
                  <Select value={tmplForm.trigger_event} onValueChange={(v: string) => setTmplForm(f => ({ ...f, trigger_event: v }))}>
                    <SelectTrigger><SelectValue placeholder="When to send" /></SelectTrigger>
                    <SelectContent>
                      {['order_received','order_ready','trial_reminder','delivery_reminder','payment_reminder','order_delivered'].map(e => (
                        <SelectItem key={e} value={e} className="capitalize">{e.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {tmplForm.type === 'email' && (
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input value={tmplForm.subject} onChange={e => setTmplForm(f => ({ ...f, subject: e.target.value }))} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Message Body * (use {'{{variable}}'} for dynamic content)</Label>
                  <Textarea value={tmplForm.body} onChange={e => setTmplForm(f => ({ ...f, body: e.target.value }))} rows={4} placeholder="Dear {{customer_name}}, your order {{order_number}} is ready..." />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={tmplForm.is_active} onCheckedChange={v => setTmplForm(f => ({ ...f, is_active: v }))} />
                  <Label>Active</Label>
                </div>
                <Button className="w-full" onClick={handleSaveTemplate} disabled={saving}>{saving ? 'Saving...' : 'Save Template'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">History ({notifications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(t => {
                const cfg = TYPE_CONFIG[t.type]
                return (
                  <Card key={t.id} className={!t.is_active ? 'opacity-60' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{t.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                            <Badge variant="outline" className="text-[10px] capitalize">{t.trigger_event.replace(/_/g, ' ')}</Badge>
                          </div>
                        </div>
                        <Switch checked={t.is_active} onCheckedChange={v => toggleTemplate(t.id, v)} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {t.subject && <p className="text-xs font-medium mb-1">Subject: {t.subject}</p>}
                      <p className="text-xs text-muted-foreground line-clamp-3">{t.body}</p>
                    </CardContent>
                  </Card>
                )
              })}
              {templates.length === 0 && (
                <Card className="md:col-span-2">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Bell className="h-12 w-12 mb-4 opacity-30" />
                    <p>No templates yet. Create your first notification template.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="space-y-3">
            {notifications.map(n => {
              const typeCfg = TYPE_CONFIG[n.type]
              const statusCfg = STATUS_CONFIG[n.status]
              return (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${typeCfg.color}`}>
                    {typeCfg.icon} {typeCfg.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{(n as any).customers?.full_name || n.recipient}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`flex items-center gap-1 text-xs ${statusCfg.color}`}>
                      {statusCfg.icon} {n.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), 'MMM dd HH:mm')}</span>
                  </div>
                </div>
              )
            })}
            {notifications.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="h-10 w-10 mb-3 opacity-30" />
                  <p>No notifications sent yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
