import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  MessageSquare, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Mail,
  Users,
  TrendingUp,
  Bot,
  Bell
} from 'lucide-react';

export const SupportWorkflowDiagram = () => {
  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Support Ticket Lifecycle & Escalation Flow
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Step 1: Ticket Creation */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="w-px h-12 bg-gray-300 mt-2"></div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">1. Ticket Creation</h3>
              <p className="text-sm text-gray-600 mb-3">
                Customer creates support ticket through SupportCenter or SupportTicketDialog
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-xs mb-1">Frontend Actions</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Form validation & submission</li>
                    <li>• Category selection (general, booking, etc.)</li>
                    <li>• Priority assignment</li>
                    <li>• Auto-response for bespoke arrangements</li>
                  </ul>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-xs mb-1">Backend Logic</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Insert into support_tickets table</li>
                    <li>• Trigger auto_assign_support_ticket()</li>
                    <li>• Send email via send-support-email function</li>
                    <li>• Create notification for assigned admin</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Auto Assignment */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-fuchsia-100 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-fuchsia-600" />
              </div>
              <div className="w-px h-12 bg-gray-300 mt-2"></div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-fuchsia-900 mb-2">2. Auto Assignment</h3>
              <p className="text-sm text-gray-600 mb-3">
                Database trigger automatically assigns ticket to available admin
              </p>
              <div className="p-3 bg-fuchsia-50 rounded-lg">
                <h4 className="font-medium text-xs mb-1">auto_assign_support_ticket() Function</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Query user_roles table for admins</li>
                  <li>• Count assigned tickets per admin</li>
                  <li>• Assign to admin with least workload</li>
                  <li>• Update assigned_to field</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Step 3: Admin Management */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div className="w-px h-12 bg-gray-300 mt-2"></div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-2">3. Admin Response & Management</h3>
              <p className="text-sm text-gray-600 mb-3">
                Admin views ticket in AdminSupport dashboard and responds via chat
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <h4 className="font-medium text-xs mb-1">Admin Actions</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• View ticket details & chat history</li>
                    <li>• Send messages via support_chat_messages</li>
                    <li>• Update status (open → in_progress → resolved)</li>
                    <li>• Escalate if needed</li>
                  </ul>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-xs mb-1">Status Updates</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge className="bg-gray-500 text-white text-xs">open</Badge>
                    <Badge className="bg-blue-500 text-white text-xs">in_progress</Badge>
                    <Badge className="bg-green-500 text-white text-xs">resolved</Badge>
                    <Badge className="bg-gray-700 text-white text-xs">closed</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Escalation */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-red-600" />
              </div>
              <div className="w-px h-12 bg-gray-300 mt-2"></div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">4. Escalation Process</h3>
              <p className="text-sm text-gray-600 mb-3">
                Manual or automatic escalation based on priority, age, or complexity
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-red-50 rounded-lg">
                  <h4 className="font-medium text-xs mb-1">Manual Escalation</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• SupportTicketEscalation component</li>
                    <li>• escalate-support-ticket edge function</li>
                    <li>• Priority upgrade (low → high → urgent)</li>
                    <li>• Email alerts for urgent tickets</li>
                  </ul>
                </div>
                <div className="p-3 bg-pink-50 rounded-lg">
                  <h4 className="font-medium text-xs mb-1">Auto Escalation</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• support-workflow-automation function</li>
                    <li>• Tickets older than 2 days</li>
                    <li>• Auto priority bump</li>
                    <li>• System-generated escalation notes</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5: Resolution & Follow-up */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-2">5. Resolution & Follow-up</h3>
              <p className="text-sm text-gray-600 mb-3">
                Ticket marked as resolved with automatic follow-up workflow
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-xs mb-1">Resolution Actions</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Status updated to 'resolved'</li>
                    <li>• resolved_at timestamp set</li>
                    <li>• Resolution notes added</li>
                    <li>• Customer notification sent</li>
                  </ul>
                </div>
                <div className="p-3 bg-teal-50 rounded-lg">
                  <h4 className="font-medium text-xs mb-1">Follow-up Process</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• 24-hour follow-up email</li>
                    <li>• Customer satisfaction survey</li>
                    <li>• Feedback collection</li>
                    <li>• Ticket closure</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Features */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="flex items-center gap-2 font-semibold text-blue-900 mb-2">
            <Bell className="w-5 h-5" />
            Real-time Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-800 mb-1">Live Updates</h4>
              <ul className="text-blue-700 text-xs space-y-1">
                <li>• Supabase realtime subscriptions</li>
                <li>• Chat message sync</li>
                <li>• Status change notifications</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-1">Notifications</h4>
              <ul className="text-blue-700 text-xs space-y-1">
                <li>• In-app notification system</li>
                <li>• Email alerts for escalations</li>
                <li>• Admin dashboard badges</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-1">Workflow Automation</h4>
              <ul className="text-blue-700 text-xs space-y-1">
                <li>• Daily automation cron job</li>
                <li>• Auto-escalation rules</li>
                <li>• Performance analytics</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};