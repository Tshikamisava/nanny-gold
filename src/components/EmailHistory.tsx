import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getUserEmailLogs, getAllEmailLogs, EmailLog } from '@/services/emailService';
import { Mail, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EmailHistoryProps {
  isAdmin?: boolean;
}

export default function EmailHistory({ isAdmin = false }: EmailHistoryProps) {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmailLogs();
  }, [isAdmin]);

  const loadEmailLogs = async () => {
    try {
      const data = isAdmin ? await getAllEmailLogs() : await getUserEmailLogs();
      setLogs(data);
    } catch (error) {
      console.error('Error loading email logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: EmailLog['status']) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'bounced':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: EmailLog['status']) => {
    const variants = {
      sent: 'default',
      failed: 'destructive',
      bounced: 'secondary',
    } as const;

    return (
      <Badge variant={variants[status] || 'default'} className="text-xs">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email History
        </CardTitle>
        <CardDescription>
          {isAdmin ? 'All emails sent through NannyGold' : 'Your sent emails'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No emails sent yet
          </p>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(log.status)}
                    <h4 className="font-semibold text-sm">{log.subject}</h4>
                  </div>
                  {getStatusBadge(log.status)}
                </div>
                
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    <strong>From:</strong> {log.from_address}
                  </p>
                  <p>
                    <strong>To:</strong> {log.to_addresses.join(', ')}
                  </p>
                  {isAdmin && (
                    <p>
                      <strong>Sent by:</strong> {log.user_role}
                    </p>
                  )}
                  <p>
                    <strong>Sent:</strong>{' '}
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </p>
                  {log.error_message && (
                    <p className="text-red-600">
                      <strong>Error:</strong> {log.error_message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
