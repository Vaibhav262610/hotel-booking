"use client"

import { useState, Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  Bell,
  Database,
  Printer,
  Mail,
  MessageSquare,
  Home,
  UserCheck,
  Calendar,
  ClipboardCheck,
} from "lucide-react"

const quickAccessFeatures = [
  { id: "home", name: "Dashboard", icon: Home, enabled: true },
  { id: "checkin", name: "Quick Check-in", icon: UserCheck, enabled: true },
  { id: "checkin-list", name: "Check-in List", icon: Calendar, enabled: true },
  { id: "reservations", name: "Reservations", icon: Calendar, enabled: true },
  { id: "housekeeping", name: "Housekeeping", icon: ClipboardCheck, enabled: false },
]

export default function SettingsPage() {
  const [hotelName, setHotelName] = useState("Grand Palace Hotel")
  const [hotelAddress, setHotelAddress] = useState("123 Main Street, City, State 12345")
  const [hotelPhone, setHotelPhone] = useState("+91 9876543210")
  const [hotelEmail, setHotelEmail] = useState("info@grandpalace.com")
  const [currency, setCurrency] = useState("INR")
  const [timezone, setTimezone] = useState("Asia/Kolkata")
  const [language, setLanguage] = useState("en")

  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    whatsapp: true,
    desktop: true,
  })



  const [quickAccess, setQuickAccess] = useState(quickAccessFeatures)

  const toggleQuickAccess = (id: string) => {
    setQuickAccess((prev) =>
      prev.map((feature) => (feature.id === id ? { ...feature, enabled: !feature.enabled } : feature)),
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Configure hotel management system settings and preferences</p>
          </div>
          <Button>
            <Settings className="w-4 h-4 mr-2" />
            Save All Settings
          </Button>
        </div>

        {/* Settings Tabs */}
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
      
                <TabsTrigger value="integrations">Integrations</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="quick-access">Quick Access</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Hotel Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="hotel-name" className="text-foreground">
                        Hotel Name
                      </Label>
                      <Input
                        id="hotel-name"
                        value={hotelName}
                        onChange={(e) => setHotelName(e.target.value)}
                        className="bg-background text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hotel-phone" className="text-foreground">
                        Phone Number
                      </Label>
                      <Input
                        id="hotel-phone"
                        value={hotelPhone}
                        onChange={(e) => setHotelPhone(e.target.value)}
                        className="bg-background text-foreground"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="hotel-address" className="text-foreground">
                        Address
                      </Label>
                      <Textarea
                        id="hotel-address"
                        value={hotelAddress}
                        onChange={(e) => setHotelAddress(e.target.value)}
                        className="bg-background text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hotel-email" className="text-foreground">
                        Email
                      </Label>
                      <Input
                        id="hotel-email"
                        type="email"
                        value={hotelEmail}
                        onChange={(e) => setHotelEmail(e.target.value)}
                        className="bg-background text-foreground"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Regional Settings</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="currency" className="text-foreground">
                        Currency
                      </Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger className="bg-background text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone" className="text-foreground">
                        Timezone
                      </Label>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger className="bg-background text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                          <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                          <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                          <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language" className="text-foreground">
                        Language
                      </Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="bg-background text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="hi">Hindi</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Notification Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium text-foreground">Email Notifications</div>
                          <div className="text-sm text-muted-foreground">Receive notifications via email</div>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.email}
                        onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, email: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-medium text-foreground">SMS Notifications</div>
                          <div className="text-sm text-muted-foreground">Receive notifications via SMS</div>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.sms}
                        onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, sms: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-medium text-foreground">WhatsApp Notifications</div>
                          <div className="text-sm text-muted-foreground">Receive notifications via WhatsApp</div>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.whatsapp}
                        onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, whatsapp: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-orange-600" />
                        <div>
                          <div className="font-medium text-foreground">Desktop Notifications</div>
                          <div className="text-sm text-muted-foreground">Show browser notifications</div>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.desktop}
                        onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, desktop: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>



              <TabsContent value="integrations" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Third-party Integrations</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <MessageSquare className="h-6 w-6 text-green-600" />
                          <div>
                            <CardTitle className="text-base text-foreground">WhatsApp Business</CardTitle>
                            <CardDescription>Send notifications to staff and guests</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Connected
                          </Badge>
                          <Button variant="outline" size="sm">
                            Configure
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Mail className="h-6 w-6 text-blue-600" />
                          <div>
                            <CardTitle className="text-base text-foreground">Email Service</CardTitle>
                            <CardDescription>Send email notifications and receipts</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            Connected
                          </Badge>
                          <Button variant="outline" size="sm">
                            Configure
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Printer className="h-6 w-6 text-gray-600" />
                          <div>
                            <CardTitle className="text-base text-foreground">Receipt Printer</CardTitle>
                            <CardDescription>Print receipts and invoices</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">Not Connected</Badge>
                          <Button variant="outline" size="sm">
                            Setup
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Database className="h-6 w-6 text-purple-600" />
                          <div>
                            <CardTitle className="text-base text-foreground">Backup Service</CardTitle>
                            <CardDescription>Automatic data backup and sync</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-purple-600 border-purple-600">
                            Connected
                          </Badge>
                          <Button variant="outline" size="sm">
                            Configure
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Security Settings</h3>
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base text-foreground">Password Policy</CardTitle>
                        <CardDescription>Configure password requirements for staff accounts</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-foreground">Minimum password length</Label>
                          <Select defaultValue="8">
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="6">6</SelectItem>
                              <SelectItem value="8">8</SelectItem>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="12">12</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-foreground">Require special characters</Label>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-foreground">Require numbers</Label>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-foreground">Password expiry (days)</Label>
                          <Select defaultValue="90">
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30">30</SelectItem>
                              <SelectItem value="60">60</SelectItem>
                              <SelectItem value="90">90</SelectItem>
                              <SelectItem value="never">Never</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base text-foreground">Session Management</CardTitle>
                        <CardDescription>Configure user session settings</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-foreground">Session timeout (minutes)</Label>
                          <Select defaultValue="60">
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15">15</SelectItem>
                              <SelectItem value="30">30</SelectItem>
                              <SelectItem value="60">60</SelectItem>
                              <SelectItem value="120">120</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-foreground">Force logout on password change</Label>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-foreground">Allow multiple sessions</Label>
                          <Switch />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="quick-access" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Quick Access Features</h3>
                  <p className="text-muted-foreground mb-6">
                    Configure which features appear in the quick access menu and dashboard shortcuts
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {quickAccess.map((feature) => (
                      <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <feature.icon className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="font-medium text-foreground">{feature.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {feature.enabled ? "Enabled in quick access" : "Disabled"}
                            </div>
                          </div>
                        </div>
                        <Switch checked={feature.enabled} onCheckedChange={() => toggleQuickAccess(feature.id)} />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Dashboard Analytics</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure which analytics and stats appear on the home dashboard
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium text-foreground">Revenue Metrics</div>
                        <div className="text-sm text-muted-foreground">Show daily/monthly revenue stats</div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium text-foreground">Occupancy Charts</div>
                        <div className="text-sm text-muted-foreground">Display occupancy rate charts</div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium text-foreground">Room Status Grid</div>
                        <div className="text-sm text-muted-foreground">Show real-time room status overview</div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium text-foreground">Recent Bookings</div>
                        <div className="text-sm text-muted-foreground">Display latest booking activities</div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
