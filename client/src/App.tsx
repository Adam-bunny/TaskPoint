import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { ProtectedRoute } from "./lib/protected-route";
import HomePage from "@/pages/home-page";
import AdminDashboard from "@/pages/admin-dashboard";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";

function NotificationWrapper({ children }: { children: React.ReactNode }) {
  useNotifications();
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/admin" component={AdminDashboard} adminOnly={true} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/admin/login" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationWrapper>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </NotificationWrapper>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
