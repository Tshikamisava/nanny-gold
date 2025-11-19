import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, CalendarDays, Users, GraduationCap, User, LogOut, Lock, Handshake, MessageCircle, Gift } from 'lucide-react';
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
import { useAuthContext } from '@/components/AuthProvider';
import { toast } from '@/hooks/use-toast';

const menuItems = [
  { title: 'Dashboard', url: '/nanny', icon: Home, exact: true },
  { title: 'Messages', url: '/nanny/messages', icon: MessageCircle },
  { title: 'Bookings', url: '/nanny/bookings', icon: Calendar },
  { title: 'Calendar', url: '/nanny/calendar', icon: CalendarDays },
  { title: 'Interviews', url: '/nanny/interviews', icon: Users },
  { title: 'Referrals & Rewards', url: '/nanny/referrals', icon: Gift },
  { title: 'Training', url: '/nanny/professional-development', icon: GraduationCap },
  { title: 'Profile', url: '/nanny/profile', icon: User },
];

const legalItems = [
  { title: 'Privacy Policy', url: '/nanny/privacy-policy', icon: Lock },
  { title: 'Terms & Conditions', url: '/nanny/terms-conditions', icon: Handshake },
];

export function NannySidebar() {
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

  const isActive = (path: string, exact = false) => {
    if (exact) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const active = isActive(item.url, item.exact);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink 
                        to={item.url} 
                        end={item.exact}
                        className="flex items-center w-full"
                        onClick={handleNavClick}
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
                        className="flex items-center w-full"
                        onClick={handleNavClick}
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