import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { COMMUNITY_STATS_QUERY, PUBLIC_BEANS_QUERY } from "../../graphql/operations";
import { BeanCard } from "../../components/BeanCard";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { SkeletonLoader } from "../../components/SkeletonLoader";
import styles from "./LandingPage.module.css";

const POPULAR_BEANS_LIMIT = 6;

export function LandingPage() {
  const statsQuery = useQuery(COMMUNITY_STATS_QUERY);
  const beansQuery = useQuery(PUBLIC_BEANS_QUERY, {
    variables: { limit: POPULAR_BEANS_LIMIT },
  });

  const isLoading = statsQuery.loading || beansQuery.loading;
  const hasError = statsQuery.error || beansQuery.error;

  function handleRetry() {
    statsQuery.refetch();
    beansQuery.refetch();
  }

  return (
    <div className={styles.page} data-testid="landing-page">
      {/* Hero */}
      <section className={styles.hero} data-testid="hero-section">
        <h1 className={styles.heroTitle}>Coffee Roast Tracker</h1>
        <p className={styles.heroDescription}>
          Track, analyze, and share your home coffee roasts
        </p>
      </section>

      {/* Community Stats */}
      {isLoading && (
        <div className={styles.statsLoading} data-testid="stats-loading">
          <SkeletonLoader variant="card" count={2} width="10rem" height="5rem" />
        </div>
      )}

      {!isLoading && hasError && (
        <ErrorState
          message="Failed to load community data"
          onRetry={handleRetry}
        />
      )}

      {!isLoading && !hasError && statsQuery.data && (
        <section className={styles.statsSection} data-testid="community-stats">
          <div className={styles.statCard} data-testid="stat-roasts">
            <span className={styles.statNumber}>
              {statsQuery.data.communityStats.totalRoasts}
            </span>{" "}
            <span className={styles.statLabel}>roasts logged</span>
          </div>
          <div className={styles.statCard} data-testid="stat-beans">
            <span className={styles.statNumber}>
              {statsQuery.data.communityStats.totalBeans}
            </span>{" "}
            <span className={styles.statLabel}>beans tracked</span>
          </div>
        </section>
      )}

      {/* Popular Beans */}
      {isLoading && (
        <div className={styles.beansLoading} data-testid="beans-loading">
          <SkeletonLoader variant="card" count={6} />
        </div>
      )}

      {!isLoading && !hasError && beansQuery.data && (
        <section className={styles.beansSection} data-testid="popular-beans">
          {beansQuery.data.publicBeans.length === 0 ? (
            <EmptyState
              icon={<span>&#9749;</span>}
              message="Be the first to log a roast!"
            />
          ) : (
            <>
              <h2 className={styles.sectionTitle}>Popular Beans</h2>
              <div className={styles.beansGrid}>
                {beansQuery.data.publicBeans.map((bean) => (
                  <BeanCard
                    key={bean.id}
                    beanRef={{ __typename: "Bean" as const, id: bean.id }}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Sign-up CTA */}
      <section className={styles.ctaSection} data-testid="cta-section">
        <div className={styles.ctaCard}>
          <h2 className={styles.ctaHeading}>
            Track your own roasts — sign up free!
          </h2>
          <Link to="/sign-up" className={styles.ctaLink} data-testid="sign-up-link">
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
