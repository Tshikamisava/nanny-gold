import { AdminLiveChat } from '@/components/AdminLiveChat';
import { AdminChatRooms } from '@/components/AdminChatRooms';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, LifeBuoy } from 'lucide-react';

const AdminSupport = () => {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Live Support Center</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Real-time support chat with clients and nannies. Respond to urgent requests and provide immediate assistance.
        </p>
      </div>

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <LifeBuoy className="w-4 h-4" />
            Support Tickets
          </TabsTrigger>
          {/* HIDDEN: Chat Rooms tab - disabled until post-launch */}
          {/* {(
            <TabsTrigger value="chats" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Chat Rooms
            </TabsTrigger>
          )} */ }
        </TabsList>

        <TabsContent value="tickets" className="mt-6">
          <AdminLiveChat />
        </TabsContent>

        {/* HIDDEN: Chat Rooms content - disabled until post-launch */}
        {/* {(
          <TabsContent value="chats" className="mt-6">
            <AdminChatRooms />
          </TabsContent>
        )} */ }
      </Tabs>
    </div>
  );
};

export default AdminSupport;