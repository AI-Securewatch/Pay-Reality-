import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./auth/AuthContext";
import { HelpProvider } from "./help/HelpContext";

export default function App() {
  return (
    <AuthProvider>
      <HelpProvider>
        <RouterProvider router={router} />
      </HelpProvider>
    </AuthProvider>
  );
}