import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Instances from "@/pages/instances";
import Host from "@/pages/host";
import Logs from "@/pages/logs";
import Installer from "@/pages/installer";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import { getToken } from "@/api/client";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

function Router() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (location !== "/login" && !getToken()) {
      setLocation("/login");
    }
  }, [location, setLocation]);

  if (location === "/login") {
    return <Login />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/instances" component={Instances} />
        <Route path="/host" component={Host} />
        <Route path="/logs" component={Logs} />
        <Route path="/installer" component={Installer} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
