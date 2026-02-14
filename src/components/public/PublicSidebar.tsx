import { NavLink, useNavigate } from 'react-router-dom';
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
    Home,
    Info,
    Briefcase,
    Phone,
    LogIn,
    UserPlus
} from 'lucide-react';

const mainItems = [
    { title: 'Home', url: '/', icon: Home },
    { title: 'About Us', url: '/about', icon: Info },
    { title: 'Services', url: '/services', icon: Briefcase },
    { title: 'Contact', url: '/contact', icon: Phone },
];

export function PublicSidebar() {
    const { setOpenMobile, isMobile } = useSidebar();
    const navigate = useNavigate();

    const handleNavClick = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <Sidebar collapsible="offcanvas">
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-black">Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {mainItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild tooltip={item.title}>
                                        <NavLink
                                            to={item.url}
                                            onClick={handleNavClick}
                                            className={({ isActive }) => `flex items-center w-full rounded-lg transition-all ${isActive
                                                    ? 'bg-primary text-primary-foreground font-medium shadow-md'
                                                    : 'hover:bg-muted text-black'
                                                }`}
                                        >
                                            <item.icon className="mr-2 h-4 w-4" />
                                            <span>{item.title}</span>
                                        </NavLink>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => navigate('/login')}
                            tooltip="Sign In"
                            className="text-primary hover:text-primary/80 text-black"
                        >
                            <LogIn className="mr-2 h-4 w-4" />
                            <span>Sign In</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => navigate('/enhanced-signup')}
                            tooltip="Get Started"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 text-black"
                        >
                            <UserPlus className="mr-2 h-4 w-4" />
                            <span>Get Started</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
