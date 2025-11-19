import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Calendar,
  CalendarDays,
  User,
  MessageCircle
} from 'lucide-react';

const navItems = [
  { title: 'Dashboard', url: '/nanny', icon: Home, exact: true },
  { title: 'Messages', url: '/nanny/messages', icon: MessageCircle },
  { title: 'Bookings', url: '/nanny/bookings', icon: Calendar },
  { title: 'Calendar', url: '/nanny/calendar', icon: CalendarDays },
  { title: 'Profile', url: '/nanny/profile', icon: User },
];

export function NannyNavigation() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string, exact = false) => {
    if (exact) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.url, item.exact);
          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors min-w-0 flex-1 ${
                active
                  ? 'text-primary bg-muted'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs truncate">{item.title}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}