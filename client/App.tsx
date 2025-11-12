import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import Setup from "./pages/Setup";
import PatientDashboard from "./pages/PatientDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { useEffect } from "react";

// Runtime API base rewrite for cross-host setups (Firebase frontend + Netlify backend)
// Set VITE_API_BASE_URL to your Netlify functions endpoint, e.g.:
// VITE_API_BASE_URL="https://your-site.netlify.app/.netlify/functions/api"
const API_BASE =  "https://app-for-patient.netlify.app/";
if (typeof window !== "undefined" && API_BASE) {
  try {
    const originalFetch = window.fetch.bind(window);
    (window as any).fetch = (input: RequestInfo, init?: RequestInit) => {
      try {
        if (typeof input === "string") {
          if (input.startsWith("/api")) {
            const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
            input = `${base}${input}`;
          }
        } else if (input instanceof Request) {
          const url = input.url || "";
          if (url.startsWith("/api")) {
            const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
            // create a new Request with rewritten URL (preserve method/headers/body)
            input = new Request(`${base}${url}`, input);
          }
        }
      } catch (e) {
        // fallback to original fetch if rewrite fails
      }
      return originalFetch(input as RequestInfo, init as RequestInit);
    };
    console.info("[API] Rewriting /api ->", API_BASE);
  } catch {
    /* ignore */
  }
}
// --- end API base rewrite ---

const queryClient = new QueryClient();

const App = () => {
  // Apply branding globally on app mount
  useEffect(() => {
    const hexToHsl = (hex: string) => {
      const m = hex?.replace("#","").match(/.{1,2}/g);
      if (!m) return "";
      const [r,g,b] = m.map((x)=>parseInt(x,16)/255);
      const max = Math.max(r,g,b), min = Math.min(r,g,b);
      let h=0, s=0, l=(max+min)/2;
      const d = max - min;
      if (d !== 0) {
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return `${Math.round(h*360)} ${Math.round(s*100)}% ${Math.round(l*100)}%`;
    };

    const applyBranding = (s: any) => {
      const root = document.documentElement;
      if (s?.primaryColor) root.style.setProperty("--brand-primary", s.primaryColor);
      if (s?.secondaryColor) root.style.setProperty("--brand-secondary", s.secondaryColor);
      if (s?.accentColor) root.style.setProperty("--brand-accent", s.accentColor);
      if (s?.fontFamily) document.body.style.fontFamily = s.fontFamily;

      // Map to shadcn tokens (expects HSL triplet)
      if (s?.primaryColor) root.style.setProperty("--primary", hexToHsl(s.primaryColor));
      if (s?.secondaryColor) root.style.setProperty("--secondary", hexToHsl(s.secondaryColor));
      if (s?.accentColor) root.style.setProperty("--accent", hexToHsl(s.accentColor));
    };

    (async () => {
      try {
        const r = await fetch("/api/public/settings/branding");
        if (r.ok) applyBranding(await r.json());
      } catch { /* ignore */ }
    })();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<Login />} />
            <Route
              path="/admin/dashboard"
              element={<ProtectedRoute component={AdminDashboard} requiredRoles={["admin", "provider", "staff"]} />}
            />
            
            <Route path="/appointments" element={<PatientDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
