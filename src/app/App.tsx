import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./auth/AuthContext";
import { HelpProvider } from "./help/HelpContext";
import { initAnalytics } from "./services/analytics";

export default function App() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <AuthProvider>
      <HelpProvider>
        <RouterProvider router={router} />
      </HelpProvider>
    </AuthProvider>
  );
}