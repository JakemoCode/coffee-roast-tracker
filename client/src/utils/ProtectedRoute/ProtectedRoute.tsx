import { Navigate, Outlet } from "react-router-dom";
import { useAuthState } from "../../lib/useAuthState";

export function ProtectedRoute() {
  const { isSignedIn, isLoaded } = useAuthState();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  return <Outlet />;
}
