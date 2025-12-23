import { useState } from 'react';
import { Bell, MessageSquare, Calendar, Receipt, AlertCircle, CheckCircle, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications, useMarkNotificationRead, useDeleteNotification } from '@/hooks/useNotifications';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function NotificationPanel() {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkNotificationRead();
  const deleteNotification = useDeleteNotification();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const itemsPerPage = 10;

  const filteredNotifications = notifications?.filter(n => 
    filter === 'all' ? true : !n.read
  ) || [];

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_request':
      case 'booking_update':
      case 'booking_confirmed':
      case 'booking_cancelled':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'invoice_available':
      case 'payment_received':
        return <Receipt className="h-5 w-5 text-green-500" />;
      case 'message':
      case 'new_message':
        return <MessageSquare className="h-5 w-5 text-fuchsia-500" />;
      case 'admin_alert':
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getNotificationActionUrl = (notification: any) => {
    const data = notification.data || {};
    
    switch (notification.type) {
      case 'invoice_available':
        return '/client/invoices';
      case 'booking_request':
      case 'booking_update':
      case 'booking_confirmed':
      case 'booking_cancelled':
        // Navigate to dashboard which shows bookings
        return '/dashboard';
      case 'message':
      case 'new_message':
        return '/nanny/messages';
      case 'payment_received':
        return '/admin/payments';
      case 'admin_alert':
        return '/admin/invoice-management';
      default:
        return null;
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    
    const url = getNotificationActionUrl(notification);
    if (url) {
      navigate(url);
    }
  };

  const handleMarkAllRead = () => {
    const unreadIds = notifications?.filter(n => !n.read).map(n => n.id) || [];
    unreadIds.forEach(id => markAsRead.mutate(id));
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotificationToDelete(id);
  };

  const confirmDelete = () => {
    if (!notificationToDelete) return;

    deleteNotification.mutate(notificationToDelete, {
      onSuccess: () => {
        toast({
          title: "Notification deleted",
          description: "The notification has been removed.",
        });
        setNotificationToDelete(null);
      },
      onError: (error) => {
        console.error('Delete error:', error);
        toast({
          title: "Delete failed",
          description: "Could not delete the notification. Please try again.",
          variant: "destructive",
        });
        setNotificationToDelete(null);
      }
    });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Bell className="w-8 h-8 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your latest activities
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" value={filter} onValueChange={(v) => { setFilter(v as 'all' | 'unread'); setCurrentPage(1); }}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="all">All Notifications</TabsTrigger>
          <TabsTrigger value="unread">
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {filter === 'unread' 
                    ? 'You\'re all caught up! Check back later for new updates.' 
                    : 'When you receive notifications, they\'ll appear here.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-2">
                {paginatedNotifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      !notification.read && "border-primary/50 bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className={cn(
                                "font-medium text-sm mb-1",
                                !notification.read && "font-semibold"
                              )}>
                                {notification.title}
                              </h4>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </p>
                            </div>
                            
                            {!notification.read && (
                              <Badge variant="default" className="flex-shrink-0">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                              disabled={deleteNotification.isPending && notificationToDelete === notification.id}
                              onClick={(e) => handleDelete(notification.id, e)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Notification</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this notification? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setNotificationToDelete(null)}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={confirmDelete}
                                disabled={deleteNotification.isPending}
                              >
                                {deleteNotification.isPending ? 'Deleting...' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
