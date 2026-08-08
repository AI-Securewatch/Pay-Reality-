import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./auth/AuthContext";
import { HelpProvider } from "./help/HelpContext";
import { ToastProvider } from "./components/ui/toast";
import { DEMO_MODE } from "./demo/config";
import { DemoSeoGuard } from "./demo/DemoSeoGuard";
import { initAnalytics } from "./services/analytics";

export default function App() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <AuthProvider>
      <HelpProvider>
        <ToastProvider>
          {DEMO_MODE && <DemoSeoGuard />}
          <RouterProvider router={router} />
        </ToastProvider>
      </HelpProvider>
    </AuthProvider>
  );
}