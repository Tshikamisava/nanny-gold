import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function ClientPrivacyPolicyEditor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [content, setContent] = useState(`
# Privacy Policy

This privacy policy outlines how we collect, use, and protect your personal information when using our nanny booking platform.

## Information We Collect

We collect information you provide directly to us, such as when you create an account, book services, or contact our support team.

## How We Use Your Information

We use the information we collect to provide, maintain, and improve our services, process payments, and communicate with you.

## Data Protection

We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

## Contact Us

If you have any questions about this privacy policy, please contact us through our support chat.
  `);

  const handleSave = () => {
    // In a real implementation, this would save to a CMS or database
    toast({
      title: "Privacy Policy Updated",
      description: "The privacy policy has been saved successfully."
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Edit Privacy Policy</h1>
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy Content</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="font-mono text-sm"
              placeholder="Enter your privacy policy content in Markdown format..."
            />
            <p className="text-sm text-muted-foreground mt-2">
              You can use Markdown formatting for headings, lists, and other styling.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}