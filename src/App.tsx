
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
    // Handle authentication state changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[auth] state change:", event, session?.user?.id);
      
      if (event === "SIGNED_IN" && session?.user) {
        // Check if user has completed profile setup
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, work_start_time, work_end_time')
          .eq('user_id', session.user.id)
          .maybeSingle();

        // If no profile or incomplete setup, redirect to profile
        if (!profile || !profile.display_name) {
          navigate("/profile", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
      
      if (event === "SIGNED_OUT") {
        navigate("/", { replace: true });
      }
    });

    // Also check current session on mount
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session && location.pathname === "/") {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, work_start_time, work_end_time')
          .eq('user_id', data.session.user.id)
          .maybeSingle();

        if (!profile || !profile.display_name) {
          navigate("/profile", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
    });

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
