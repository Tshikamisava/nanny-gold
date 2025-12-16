import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { sendNannyGoldEmail, EmailType } from '@/services/emailService';
import { Mail, Send, Loader2 } from 'lucide-react';

interface EmailComposerProps {
  userRole: 'client' | 'nanny' | 'admin';
  userName?: string;
}

export default function EmailComposer({ userRole, userName }: EmailComposerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [emailType, setEmailType] = useState<EmailType>('care');
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.to || !formData.subject || !formData.message) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const toEmails = formData.to.split(',').map(email => email.trim());

      await sendNannyGoldEmail({
        to: toEmails,
        from: emailType,
        subject: formData.subject,
        html: `<p>${formData.message.replace(/\n/g, '<br>')}</p>`,
        senderName: userName,
      });

      toast({
        title: 'Email Sent Successfully',
        description: `Your email was sent from ${emailType}@nannygold.co.za`,
      });

      // Reset form
      setFormData({ to: '', subject: '', message: '' });
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: 'Failed to Send Email',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Send Email via NannyGold
        </CardTitle>
        <CardDescription>
          Send emails from official NannyGold email addresses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Type Selection */}
          <div className="space-y-3">
            <Label>Select Email Address</Label>
            <RadioGroup value={emailType} onValueChange={(value) => setEmailType(value as EmailType)}>
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="care" id="care" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="care" className="font-semibold cursor-pointer">
                    care@nannygold.co.za
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    General care and support inquiries
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    335 Long Avenue, Ferndale, Johannesburg, Gauteng
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="bespoke" id="bespoke" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="bespoke" className="font-semibold cursor-pointer">
                    bespoke@nannygold.co.za
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Premium and bespoke service requests
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    335 Long Avenue, Ferndale, Johannesburg, Gauteng
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* To Field */}
          <div className="space-y-2">
            <Label htmlFor="to">To (comma-separated for multiple recipients)</Label>
            <Input
              id="to"
              type="text"
              placeholder="recipient@example.com, another@example.com"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              disabled={loading}
            />
          </div>

          {/* Subject Field */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              type="text"
              placeholder="Email subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              disabled={loading}
            />
          </div>

          {/* Message Field */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Type your message here..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              disabled={loading}
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              Your email will include the NannyGold signature automatically
            </p>
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
