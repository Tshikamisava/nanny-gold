import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/components/AuthProvider';
import { LogOut } from 'lucide-react';

export const AdminLayout = () => {
  const { signOut } = useAuthContext();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger className="lg:hidden" />
              <h1 className="text-lg md:text-xl font-semibold">Admin Dashboard</h1>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
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