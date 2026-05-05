import { SignIn } from "@clerk/clerk-react";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import styles from "./SignInPage.module.css";

function SignInContent() {
  return <SignIn routing="path" path="/sign-in" />;
}

export function SignInPage() {
  return (
    <div className={styles.container}>
      <ErrorBoundary
        fallback={
          <div className={styles.fallback}>
            <h2>Sign in is unavailable</h2>
            <p>Authentication service could not be loaded.</p>
            <a href="/">Back to home</a>
          </div>
        }
      >
        <SignInContent />
      </ErrorBoundary>
    </div>
  );
}
