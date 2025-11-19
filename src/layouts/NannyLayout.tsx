import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { NannySidebar } from '@/components/nanny/NannySidebar';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/components/AuthProvider';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

export const NannyLayout = () => {
  const { signOut } = useAuthContext();
  const navigate = useNavigate();

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

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex">
        <NannySidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger className="lg:hidden" />
              <h1 className="text-lg md:text-xl font-semibold">Nanny Dashboard</h1>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};