import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Users,
  UserCheck,
  Calendar,
  MessageSquare,
  Shield,
  CreditCard,
  Settings,
  Home,
  CheckCircle,
  UserCog,
  GraduationCap,
  TestTube,
  Gift,
  Receipt,
  CalendarDays
} from 'lucide-react';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const menuItems = [
  { title: 'Overview', url: '/admin', icon: Home, exact: true },
  { title: 'Nanny Management', url: '/admin/nannies', icon: UserCheck, permission: 'nannies' },
  { title: 'Nanny Profiles', url: '/admin/nanny-profiles', icon: UserCog, permission: 'nannies' },
  { title: 'Client Management', url: '/admin/clients', icon: Users, permission: 'clients' },
  { title: 'Booking Management', url: '/admin/bookings', icon: Calendar, permission: 'bookings' },
  { title: 'Booking Calendar', url: '/admin/booking-calendar', icon: CalendarDays, permission: 'bookings' },
  { title: 'Referral Program', url: '/admin/referral-program', icon: Gift, permission: 'user_management' },
  { title: 'Invoicing & Rewards', url: '/admin/invoicing-rewards', icon: Receipt, permission: 'payments' },
  { title: 'Professional Development', url: '/admin/professional-development', icon: GraduationCap, permission: 'professional_development' },
  { title: 'Support & Disputes', url: '/admin/support', icon: MessageSquare, permission: 'support' },
  { title: 'Onboarding & Verification', url: '/admin/verification', icon: CheckCircle, permission: 'verification' },
  { title: 'Interview Management', url: '/admin/interviews', icon: UserCog, permission: 'verification' },
  { title: 'User Management', url: '/admin/user-management', icon: Settings, permission: 'user_management' },
  { title: 'Admin Tools', url: '/admin/tools', icon: Settings, permission: 'user_management' },
  { title: 'Testing Suite', url: '/admin/testing-suite', icon: TestTube, permission: 'user_management' },
  { title: 'Payments & Finance', url: '/admin/payments', icon: CreditCard, permission: 'payments' },
  { title: 'Analytics & Reports', url: '/admin/analytics', icon: BarChart3, permission: 'analytics' },
];

export function AdminSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';
  const { permissions, isSuperAdmin } = useAdminPermissions();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isActive = (path: string, exact = false) => {
    if (exact) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-60'} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                // Only restrict super admin sections: payments, analytics, professional_development, user_management
                if (item.permission && ['payments', 'analytics', 'professional_development', 'user_management'].includes(item.permission) && !isSuperAdmin) {
                  return null;
                }
                
                // All other sections are accessible to regular admins
                const active = isActive(item.url, item.exact);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end={item.exact}
                        className={`flex items-center w-full rounded-lg transition-all ${
                          active 
                            ? 'bg-gradient-to-r from-purple-600 to-orange-400 text-white font-medium shadow-md' 
                            : 'hover:bg-gradient-to-r hover:from-purple-600 hover:to-orange-400 hover:text-white'
                        }`}
                        onClick={handleNavClick}
                      >
                        <item.icon className="w-4 h-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}