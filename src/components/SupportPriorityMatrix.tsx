import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Users, MessageSquare } from "lucide-react";

export const SupportPriorityMatrix = () => {
  const priorityLevels = [
    {
      level: "urgent",
      color: "destructive",
      icon: AlertTriangle,
      title: "Urgent (Immediate Response)",
      timeframe: "< 1 hour",
      criteria: [
        "Safety concerns (child hurt, accident, medical)",
        "Emergency situations (locked out, no show, missing)",
        "Security issues (fraud, unauthorized charges)",
        "After-hours critical issues"
      ],
      examples: [
        "Nanny didn't show up for work",
        "Child safety concern reported",
        "Unauthorized payment taken"
      ]
    },
    {
      level: "high",
      color: "destructive",
      icon: Clock,
      title: "High (Same Day Response)",
      timeframe: "< 4 hours",
      criteria: [
        "Payment failures or billing errors",
        "Service complaints (unprofessional behavior)",
        "VIP customer issues",
        "Multiple tickets from same user (3+ this week)"
      ],
      examples: [
        "Payment card declined",
        "Complaint about nanny behavior",
        "Admin user reporting issue"
      ]
    },
    {
      level: "medium",
      color: "default",
      icon: MessageSquare,
      title: "Medium (Next Business Day)",
      timeframe: "< 24 hours",
      criteria: [
        "General booking issues",
        "Technical problems",
        "Profile or account updates",
        "Standard service questions"
      ],
      examples: [
        "Booking modification request",
        "App technical issue",
        "Profile update assistance"
      ]
    },
    {
      level: "low",
      color: "secondary",
      icon: Users,
      title: "Low (2-3 Business Days)",
      timeframe: "< 72 hours",
      criteria: [
        "General inquiries",
        "How-to questions",
        "Feature requests",
        "Non-urgent feedback"
      ],
      examples: [
        "How do I update my profile?",
        "General service information",
        "Suggestion for new feature"
      ]
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {priorityLevels.map((priority) => {
          const IconComponent = priority.icon;
          return (
            <Card key={priority.level} className="border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-5 w-5" />
                  <CardTitle className="text-lg">{priority.title}</CardTitle>
                  <Badge variant={priority.color as any} className="ml-auto">
                    {priority.timeframe}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">Triggers:</h4>
                  <ul className="text-sm space-y-1">
                    {priority.criteria.map((criterion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-1 h-1 bg-foreground/60 rounded-full mt-2 flex-shrink-0" />
                        {criterion}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Examples:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {priority.examples.map((example, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                        "{example}"
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-sm space-y-2">
            <h4 className="font-medium">Escalation Rules:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• VIP users (admins) automatically get HIGH priority</li>
              <li>• 3+ tickets from same user in one week = priority upgrade</li>
              <li>• Financial keywords (payment, charge, refund) = HIGH priority</li>
              <li>• After-hours urgent tickets trigger email alerts</li>
              <li>• System auto-assigns to admin with least active tickets</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};