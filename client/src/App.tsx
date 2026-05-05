import { Routes, Route } from "react-router-dom";
import { useAuthState } from "./lib/useAuthState";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { LandingPage } from "./features/landing/LandingPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { RoastDetailPage } from "./features/roast-detail/RoastDetailPage";
import { BeanLibraryPage } from "./pages/BeanLibrary";
import { BeanDetailPage } from "./pages/BeanDetail";
import { ComparePage } from "./features/compare/ComparePage";
import { SignInPage } from "./features/auth/SignInPage";
import { SignUpPage } from "./features/auth/SignUpPage";
import { NotFoundPage } from "./features/NotFoundPage";
import { ErrorBoundary } from "./components/ErrorBoundary";

function HomePage() {
  const { isSignedIn, isLoaded } = useAuthState();

  if (!isLoaded) return null;

  return isSignedIn ? <DashboardPage /> : <LandingPage />;
}

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Routes with AppLayout (header + nav) */}
        <Route element={<AppLayout />}>
          {/* Home: Landing (logged out) or Dashboard (logged in) */}
          <Route index element={<HomePage />} />

          {/* Public routes */}
          <Route path="beans" element={<BeanLibraryPage />} />
          <Route path="beans/:id" element={<BeanDetailPage />} />
          <Route path="roasts/:id" element={<RoastDetailPage />} />

          {/* Auth — kept under AppLayout so the user can navigate back out */}
          <Route path="sign-in/*" element={<SignInPage />} />
          <Route path="sign-up/*" element={<SignUpPage />} />

          {/* Protected routes (auth required) */}
          <Route element={<ProtectedRoute />}>
            <Route path="compare" element={<ComparePage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
