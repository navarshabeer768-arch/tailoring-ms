'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Shield, User, Bell, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { profile, user } = useAuth()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')

  const handleSaveProfile = async () => {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase.from('user_profiles').update({ full_name: name, phone }).eq('id', profile.id)
    if (error) toast.error(error.message)
    else toast.success('Profile updated')
    setSaving(false)
  }

  const handleChangePassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '', {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) toast.error(error.message)
    else toast.success('Password reset email sent')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold">Settings</h2>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{profile?.full_name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="outline" className="capitalize mt-1">{profile?.role}</Badge>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+971 50 000 0000" />
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Security</CardTitle>
          <CardDescription>Manage your password and account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Last changed: Unknown</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleChangePassword}>Change Password</Button>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Badge variant="outline">Not enabled</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Configure notification preferences via the Notifications module. WhatsApp/SMS/Email providers need to be configured in environment variables.</p>
          <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
            <p className="font-medium">Integration Setup:</p>
            <p>• <strong>WhatsApp</strong>: Configure Twilio or Meta Business API</p>
            <p>• <strong>SMS</strong>: Configure Twilio, MSG91, or similar</p>
            <p>• <strong>Email</strong>: Configure SendGrid, Resend, or Supabase SMTP</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
