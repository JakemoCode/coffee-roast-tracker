import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter } from "react-router-dom";
import { ApolloProvider } from "./ApolloProvider";
import { E2eApolloProvider } from "./E2eApolloProvider";
import { E2eAuthProvider } from "./E2eAuthContext";
import { ThemeProvider } from "./ThemeContext";
import { TempProvider } from "./TempContext";
import { ToastProvider } from "../utils/Toast";

export { useTheme } from "./ThemeContext";
export { useTempUnit } from "./TempContext";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const isE2e = import.meta.env.VITE_E2E_TEST === "true";

  const inner = (
    <ThemeProvider>
      <ToastProvider>
        <TempProvider>{children}</TempProvider>
      </ToastProvider>
    </ThemeProvider>
  );

  if (isE2e) {
    return (
      <BrowserRouter>
        <E2eAuthProvider>
          <E2eApolloProvider>{inner}</E2eApolloProvider>
        </E2eAuthProvider>
      </BrowserRouter>
    );
  }

  const clerkPublishableKey = import.meta.env
    .VITE_CLERK_PUBLISHABLE_KEY as string;

  if (!clerkPublishableKey) {
    throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      afterSignOutUrl="/sign-in"
    >
      <BrowserRouter>
        <ApolloProvider>{inner}</ApolloProvider>
      </BrowserRouter>
    </ClerkProvider>
  );
}
