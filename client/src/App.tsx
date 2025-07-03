import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Therapists from "@/pages/therapists";
import TherapistProfile from "@/pages/therapist-profile";
import Booking from "@/pages/booking";
import BookingSuccess from "@/pages/booking-success";
import BookingFailure from "@/pages/booking-failure";
import Dashboard from "@/pages/dashboard";
import TherapistRegistration from "@/pages/therapist-registration";
import TherapistDashboard from "@/pages/therapist-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/therapists" component={Therapists} />
          <Route path="/therapists/:id" component={TherapistProfile} />
          <Route path="/booking/:therapistId?" component={Booking} />
          <Route path="/booking-success/:appointmentId" component={BookingSuccess} />
          <Route path="/booking-failure" component={BookingFailure} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/therapist-registration" component={TherapistRegistration} />
          <Route path="/therapist-dashboard" component={TherapistDashboard} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
