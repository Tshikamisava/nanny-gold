
import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, useMarkNotificationRead } from '@/hooks/useNotifications';
import { BackupNannyNotification } from './BackupNannyNotification';
import { Tables } from '@/integrations/supabase/types';

type Notification = Tables<'notifications'>;

export const NotificationCenter: React.FC = () => {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkNotificationRead();

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <h3 className="font-semibold">Notifications</h3>
          <ScrollArea className="h-80">
            {isLoading ? (
              <p className="text-center text-gray-500">Loading notifications...</p>
            ) : notifications?.length === 0 ? (
              <p className="text-center text-gray-500">No notifications</p>
            ) : (
              <div className="space-y-2">
                {notifications?.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      notification.read ? 'bg-gray-50' : 'bg-blue-50'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};
