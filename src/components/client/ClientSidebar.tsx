import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  UserCircle,
  Heart,
  Calendar,
  CalendarDays,
  MessageCircle,
  Settings,
  CreditCard,
  Bell,
  Scale,
  FileText,
  Search,
  LogOut,
  Gift,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/components/AuthProvider';
import { toast } from '@/hooks/use-toast';

const mainItems = [
  { title: 'Dashboard', url: '/dashboard', icon: UserCircle },
  { title: 'Find your perfect Nanny', url: '/service-prompt', icon: Search },
  { title: 'Calendar', url: '/client/calendar', icon: CalendarDays },
  { title: 'Interviews', url: '/dashboard/interviews', icon: Calendar },
  { title: 'Favorites', url: '/dashboard/favorites', icon: Heart },
  { title: 'My Invoices', url: '/client/invoices', icon: Receipt },
  { title: 'Referrals & Rewards', url: '/client/referrals', icon: Gift },
  { title: 'Support Chat', url: '/support', icon: MessageCircle },
];

const settingsItems = [
  { title: 'Payment Settings', url: '/client/payment-settings', icon: CreditCard },
  { title: 'Profile Settings', url: '/client/profile-settings', icon: UserCircle },
  { title: 'Notifications', url: '/client/notifications', icon: Bell },
];

const legalItems = [
  { title: 'Privacy Policy', url: '/client-privacy-policy', icon: Scale },
  { title: 'Terms & Conditions', url: '/client-terms-conditions', icon: FileText },
];

export function ClientSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const { signOut } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

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

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink 
                        to={item.url} 
                        end
                        onClick={handleNavClick}
                        className={`flex items-center w-full rounded-lg transition-all ${
                          active 
                            ? 'bg-gradient-to-r from-fuchsia-600 to-orange-400 text-white font-medium shadow-md' 
                            : 'hover:bg-gradient-to-r hover:from-fuchsia-600 hover:to-orange-400 hover:text-white'
                        }`}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {state !== 'collapsed' && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink 
                        to={item.url}
                        onClick={handleNavClick}
                        className={`flex items-center w-full rounded-lg transition-all ${
                          active 
                            ? 'bg-gradient-to-r from-fuchsia-600 to-orange-400 text-white font-medium shadow-md' 
                            : 'hover:bg-gradient-to-r hover:from-fuchsia-600 hover:to-orange-400 hover:text-white'
                        }`}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {state !== 'collapsed' && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Legal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {legalItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink 
                        to={item.url}
                        onClick={handleNavClick}
                        className={`flex items-center w-full rounded-lg transition-all ${
                          active 
                            ? 'bg-gradient-to-r from-fuchsia-600 to-orange-400 text-white font-medium shadow-md' 
                            : 'hover:bg-gradient-to-r hover:from-fuchsia-600 hover:to-orange-400 hover:text-white'
                        }`}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {state !== 'collapsed' && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleSignOut} 
              className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {state !== 'collapsed' && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}