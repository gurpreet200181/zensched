
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

function AuthRouteEffects() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard on successful sign-in
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      console.log("[auth] state change:", event);
      if (event === "SIGNED_IN") {
        navigate("/dashboard", { replace: true });
      }
      if (event === "SIGNED_OUT") {
        navigate("/", { replace: true });
      }
    });

    // Also check current session on mount
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate("/dashboard", { replace: true });
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

