
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { Calendar } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import HRDashboard from "./pages/HRDashboard";
import { supabase } from "@/integrations/supabase/client";

function AuthRouteEffects() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if this is an email confirmation flow
    const isEmailConfirmation = window.location.hash.includes('access_token') || 
                               window.location.hash.includes('type=signup') ||
                               window.location.hash.includes('type=email');

    // Handle authentication state changes (no async work directly in callback)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[auth] state change:", event, session?.user?.id, "isEmailConfirmation:", isEmailConfirmation);

      if (event === "SIGNED_IN" && session?.user) {
        // If this is from email confirmation, ALWAYS go to profile and stay there
        if (isEmailConfirmation) {
          console.log("[auth] Email confirmation detected, navigating to profile");
          navigate("/profile", { replace: true });
          return;
        }
        
        // For normal sign-ins, check profile completeness
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', session.user!.id)
            .maybeSingle();
          if (!profile || !profile.display_name) {
            navigate("/profile", { replace: true });
          } else {
            navigate("/dashboard", { replace: true });
          }
        }, 0);
      }

      if (event === "SIGNED_OUT") {
        navigate("/", { replace: true });
      }
    });

    // On initial load, if returning from email link, let Supabase process the hash then route
    if (isEmailConfirmation) {
      console.log("[auth] Initial email confirmation detected");
      setTimeout(async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          console.log("[auth] Session confirmed, navigating to profile");
          navigate("/profile", { replace: true });
        }
      }, 100); // Slightly longer delay to ensure session is set
    } else {
      // Also check current session on mount for normal navigations
      supabase.auth.getSession().then(({ data }) => {
        if (data.session && location.pathname === "/") {
          navigate("/dashboard", { replace: true });
        }
      });
    }

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  return null;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 bg-wellness-gradient">
          {/* Mobile header with sidebar trigger */}
          <header className="flex items-center h-14 border-b border-white/20 bg-white/40 backdrop-blur-md md:hidden">
            <SidebarTrigger className="ml-4" />
            <div className="flex items-center gap-2 ml-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg font-bold gradient-text">ZenSched</h1>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

const App = () => {
  // Create QueryClient inside component to ensure proper React context
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthRouteEffects />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route
              path="/dashboard"
              element={
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              }
            />
            <Route
              path="/analytics"
              element={
                <AppLayout>
                  <Analytics />
                </AppLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <AppLayout>
                  <Profile />
                </AppLayout>
              }
            />
            <Route
              path="/hr"
              element={
                <AppLayout>
                  <HRDashboard />
                </AppLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
