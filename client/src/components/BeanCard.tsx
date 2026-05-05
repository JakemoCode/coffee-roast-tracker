import { Link } from "react-router-dom";
import { useFragment, useQuery } from "@apollo/client/react";
import { graphql } from "../graphql/graphql";
import { FlavorPill } from "./FlavorPill";
import { StarRating } from "./StarRating";
import styles from "./styles/BeanCard.module.css";

const BEAN_CARD_FLAVOR_COLORS_QUERY = graphql(`
  query BeanCardFlavorColors {
    flavorDescriptors {
      name
      color
    }
  }
`);

export const BEAN_CARD_FIELDS = graphql(`
  fragment BeanCardFields on Bean @_unmask {
    id
    name
    origin
    process
    suggestedFlavors
  }
`);

interface BeanCardProps {
  beanRef: { __typename: "Bean"; id: string };
  roastCount?: number;
  avgRating?: number;
}

const MAX_VISIBLE_FLAVORS = 3;

export function BeanCard({
  beanRef,
  roastCount,
  avgRating,
}: BeanCardProps) {
  const { data: bean } = useFragment({
    fragment: BEAN_CARD_FIELDS,
    from: beanRef,
  });

  const { data: flavorData } = useQuery(BEAN_CARD_FLAVOR_COLORS_QUERY, {
    fetchPolicy: "cache-first",
  });
  const colorByName = new Map<string, string>(
    (flavorData?.flavorDescriptors ?? []).map((f) => [f.name, f.color]),
  );

  const flavors = (bean.suggestedFlavors ?? []).map((name) => ({
    name,
    color: colorByName.get(name) ?? "#888888",
  }));
  const visibleFlavors = flavors.slice(0, MAX_VISIBLE_FLAVORS);
  const overflowCount = flavors.length - MAX_VISIBLE_FLAVORS;

  return (
    <Link
      to={`/beans/${bean.id}`}
      className={styles.card}
      data-testid="bean-card"
    >
      <h3 className={styles.name}>{bean.name}</h3>

      {(bean.origin || bean.process) && (
        <p className={styles.details}>
          {[bean.origin, bean.process].filter(Boolean).join(" · ")}
        </p>
      )}

      {flavors.length > 0 && (
        <div className={styles.flavors}>
          {visibleFlavors.map((flavor) => (
            <FlavorPill
              key={flavor.name}
              name={flavor.name}
              color={flavor.color}
            />
          ))}
          {overflowCount > 0 && (
            <span className={styles.more}>+{overflowCount} more</span>
          )}
        </div>
      )}

      <div className={styles.footer}>
        {roastCount != null && (
          <span className={styles.roastCount}>
            {roastCount} roast{roastCount === 1 ? "" : "s"}
          </span>
        )}
        {avgRating != null && (
          <StarRating value={avgRating} readOnly size="sm" />
        )}
      </div>
    </Link>
  );
}
