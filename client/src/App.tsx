import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

import HomePage from "@/pages/home-page";
import EventsPage from "@/pages/events-page";
import EventDetailsPage from "@/pages/event-details-page";
import CalendarPage from "@/pages/calendar-page";
import AuthPage from "@/pages/auth-page";
import CheckoutPage from "@/pages/checkout-page";
import UserDashboard from "@/pages/user-dashboard";
import AdminPage from "@/pages/admin-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/events" component={EventsPage} />
      <Route path="/events/:id" component={EventDetailsPage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/checkout/:eventId" component={CheckoutPage} />
      <ProtectedRoute path="/dashboard" component={UserDashboard} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
