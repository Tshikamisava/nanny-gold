import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, MessageSquare, Calendar } from 'lucide-react';

export default function ClientNotifications() {
  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Notification Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage how you receive notifications and updates.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Control which email notifications you receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label htmlFor="booking-updates" className="text-xs sm:text-sm">Booking Updates</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Get notified when your booking status changes
                  </p>
                </div>
              </div>
              <Switch id="booking-updates" defaultChecked />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label htmlFor="interview-reminders" className="text-xs sm:text-sm">Interview Reminders</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Receive reminders about upcoming interviews
                  </p>
                </div>
              </div>
              <Switch id="interview-reminders" defaultChecked />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label htmlFor="general-updates" className="text-xs sm:text-sm">General Updates</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Platform updates and new features
                  </p>
                </div>
              </div>
              <Switch id="general-updates" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Push Notifications</CardTitle>
            <CardDescription>
              Manage browser and mobile push notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="new-messages">New Messages</Label>
                  <p className="text-sm text-muted-foreground">
                    Instant notifications for new messages
                  </p>
                </div>
              </div>
              <Switch id="new-messages" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="appointment-alerts">Appointment Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerts 30 minutes before appointments
                  </p>
                </div>
              </div>
              <Switch id="appointment-alerts" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="emergency-alerts">Emergency Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Critical notifications and emergency updates
                  </p>
                </div>
              </div>
              <Switch id="emergency-alerts" defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}