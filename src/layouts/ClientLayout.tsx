import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/client/ClientSidebar';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/components/AuthProvider';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

export const ClientLayout = () => {
  const { signOut } = useAuthContext();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login'); // Navigate to login instead of home
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

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex">
        <ClientSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-lg md:text-xl font-semibold">Client Dashboard</h1>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};