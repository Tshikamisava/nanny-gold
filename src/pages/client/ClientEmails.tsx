import { useAuthContext } from '@/components/AuthProvider';
import EmailComposer from '@/components/EmailComposer';
import EmailHistory from '@/components/EmailHistory';
import EmailTester from '@/components/EmailTester';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, History, TestTube } from 'lucide-react';

export default function ClientEmails() {
  const { user, profile } = useAuthContext();

  const userName = profile?.first_name && profile?.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : undefined;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Email Communication</h1>
        <p className="text-muted-foreground mt-2">
          Send emails from NannyGold official email addresses
        </p>
      </div>

      <Tabs defaultValue="compose" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Test
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-6">
          <EmailComposer userRole="client" userName={userName} />
        </TabsContent>

        <TabsContent value="test" className="mt-6">
          <EmailTester userRole="client" />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <EmailHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
