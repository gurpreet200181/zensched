
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import HRDashboard from "./pages/HRDashboard";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

function AuthRouteEffects() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Handle authentication state changes (no async work directly in callback)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[auth] state change:", event, session?.user?.id);

      if (event === "SIGNED_IN" && session?.user) {
        const fromSignupLink = window.location.hash.includes('type=signup') || window.location.hash.includes('access_token');
        if (fromSignupLink) {
          navigate("/profile", { replace: true });
          return;
        }
        // Defer DB calls to avoid deadlocks - only for normal sign-ins, not email confirmations
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
    if (window.location.hash.includes('access_token') || window.location.hash.includes('type=signup')) {
      setTimeout(async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate("/profile", { replace: true });
        }
      }, 0);
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
        <main className="flex-1 bg-wellness-gradient">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
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

export default App;
