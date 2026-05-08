import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuthState } from "./lib/useAuthState";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./utils/ProtectedRoute";
import { LandingPage } from "./pages/Landing";
import { DashboardPage } from "./pages/Dashboard";
import { BeanLibraryPage } from "./pages/BeanLibrary";
import { BeanDetailPage } from "./pages/BeanDetail";
import { SignInPage } from "./pages/SignIn";
import { SignUpPage } from "./pages/SignUp";
import { NotFoundPage } from "./pages/NotFound";
import { ErrorBoundary } from "./utils/ErrorBoundary";
import { SkeletonLoader } from "./components/placeholders/SkeletonLoader";

// Chart-heavy pages — lazy-loaded to keep chart.js + plugins out of the
// initial bundle. Worth ~250 kB raw / ~70 kB gzip on first load.
const RoastDetailPage = lazy(() =>
  import("./pages/RoastDetail/RoastDetailPage").then((m) => ({
    default: m.RoastDetailPage,
  })),
);
const ComparePage = lazy(() =>
  import("./pages/Compare/ComparePage").then((m) => ({
    default: m.ComparePage,
  })),
);

function ChartRouteFallback() {
  return <SkeletonLoader variant="card" count={3} />;
}

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
          <Route
            path="roasts/:id"
            element={
              <Suspense fallback={<ChartRouteFallback />}>
                <RoastDetailPage />
              </Suspense>
            }
          />

          {/* Auth — kept under AppLayout so the user can navigate back out */}
          <Route path="sign-in/*" element={<SignInPage />} />
          <Route path="sign-up/*" element={<SignUpPage />} />

          {/* Protected routes (auth required) */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="compare"
              element={
                <Suspense fallback={<ChartRouteFallback />}>
                  <ComparePage />
                </Suspense>
              }
            />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
