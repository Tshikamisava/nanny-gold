import { Outlet, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { PublicSidebar } from '@/components/public/PublicSidebar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

export const PublicLayout = () => {
    const navigate = useNavigate();

    return (
        <SidebarProvider>
            <div className="min-h-screen w-full flex overflow-hidden bg-background">
                <PublicSidebar />

                <div className="flex-1 flex flex-col h-screen overflow-hidden">
                    {/* Header */}
                    <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-10 relative">
                        <div className="flex items-center gap-2 md:gap-4">
                            <SidebarTrigger />
                            <div
                                className="flex items-center space-x-2 cursor-pointer"
                                onClick={() => navigate('/')}
                            >
                                <Heart className="h-6 w-6 text-primary fill-primary hidden sm:block" />
                                <h1 className="text-xl font-bold">
                                    <span className="text-primary">Nanny</span>
                                    <span className="gold-shimmer">Gold</span>
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => navigate('/login')}>
                                Sign In
                            </Button>
                            <Button onClick={() => navigate('/enhanced-signup')}>
                                Get Started
                            </Button>
                        </div>
                    </header>

                    {/* Main Content */}
                    <main className="flex-1 overflow-y-auto overflow-x-hidden">
                        <Outlet />
                        <Footer />
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
};
