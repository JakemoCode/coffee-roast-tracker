import { SignUp } from "@clerk/clerk-react";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import styles from "./SignUpPage.module.css";

function SignUpContent() {
  return <SignUp routing="path" path="/sign-up" />;
}

export function SignUpPage() {
  return (
    <div className={styles.container}>
      <ErrorBoundary
        fallback={
          <div className={styles.fallback}>
            <h2>Sign up is unavailable</h2>
            <p>Authentication service could not be loaded.</p>
            <a href="/">Back to home</a>
          </div>
        }
      >
        <SignUpContent />
      </ErrorBoundary>
    </div>
  );
}
