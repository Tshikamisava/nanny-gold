import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function ClientTermsConditionsEditor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [content, setContent] = useState(`
# Terms & Conditions

These terms and conditions govern your use of our nanny booking platform and the services we provide.

## Service Agreement

By using our platform, you agree to book nanny services in accordance with our established procedures and payment terms.

## Payment Terms

All bookings require payment in advance. Cancellation policies apply as outlined in your booking confirmation.

## User Responsibilities

You are responsible for providing accurate information and maintaining appropriate communication with your assigned nanny.

## Limitation of Liability

Our liability is limited to the terms outlined in your service agreement. We provide a platform to connect families with qualified nannies.

## Contact Information

For questions about these terms, please contact our support team through the support chat feature.
  `);

  const handleSave = () => {
    // In a real implementation, this would save to a CMS or database
    toast({
      title: "Terms & Conditions Updated",
      description: "The terms and conditions have been saved successfully."
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
            <h1 className="text-3xl font-bold">Edit Terms & Conditions</h1>
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions Content</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="font-mono text-sm"
              placeholder="Enter your terms and conditions content in Markdown format..."
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