import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { NannySidebar } from '@/components/nanny/NannySidebar';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/components/AuthProvider';
import { LogOut, MessageCircle, Bell, User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Footer } from '@/components/Footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNotifications } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const NannyLayout = () => {
  const { signOut, user } = useAuthContext();
  const navigate = useNavigate();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const userInitials = user?.user_metadata?.first_name && user?.user_metadata?.last_name
    ? `${user.user_metadata.first_name[0]}${user.user_metadata.last_name[0]}`
    : user?.email?.[0]?.toUpperCase() || 'N';

  return (
    <SidebarProvider>
      <div className="h-screen w-full flex overflow-hidden">
        <NannySidebar />
        
        <div className="flex-1 flex flex-col h-screen">
          {/* Header - Fixed */}
          <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-6 flex-shrink-0">
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger className="lg:hidden" />
              <h1 className="text-lg md:text-xl font-semibold">Nanny Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Chat Icon */}
              <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/dashboard/messages')}>
                <MessageCircle className="h-5 w-5" />
              </Button>
              
              {/* Notification Bell */}
              <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/nanny/notifications-inbox')}>
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              
              {/* Profile Avatar with Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-9 w-9 cursor-pointer border-2 border-primary hover:border-primary/80 transition-colors">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/nanny/profile-settings')} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/nanny/settings')} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content - Scrollable */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
          
          {/* Footer - Fixed */}
          <div className="flex-shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};