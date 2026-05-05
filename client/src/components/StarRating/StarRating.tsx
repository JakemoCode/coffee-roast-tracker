import { useState } from "react";
import styles from "./StarRating.module.css";

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const isInteractive = !readOnly && !!onChange;
  const displayValue = hoverValue ?? value;

  const label = `Rating: ${value} out of 5`;

  function getStarValue(starIndex: number, isLeftHalf: boolean): number {
    return isLeftHalf ? starIndex - 0.5 : starIndex;
  }

  function renderGlyph(starIndex: number) {
    const isFull = displayValue >= starIndex;
    const isHalf = !isFull && displayValue >= starIndex - 0.5;

    if (isFull) return "\u2605";
    if (isHalf) {
      return (
        <span className={styles.halfStar}>
          <span className={styles.halfStarEmpty}>{"\u2606"}</span>
          <span className={styles.halfStarFilled}>{"\u2605"}</span>
        </span>
      );
    }
    return "\u2606";
  }

  function renderStars() {
    const stars: React.ReactNode[] = [];

    for (let i = 1; i <= 5; i++) {
      const isFull = displayValue >= i;
      const isHalf = !isFull && displayValue >= i - 0.5;

      const starClass = [
        styles.star,
        isFull || isHalf ? styles.filled : "",
        styles[size],
      ]
        .filter(Boolean)
        .join(" ");

      if (isInteractive) {
        stars.push(
          <span
            key={i}
            className={`${starClass} ${styles.interactive}`}
            onMouseLeave={() => setHoverValue(null)}
          >
            <button
              type="button"
              className={`${styles.halfTarget} ${styles.halfTargetLeft}`}
              onClick={() => onChange(getStarValue(i, true))}
              onMouseEnter={() => setHoverValue(getStarValue(i, true))}
              aria-label={`Rate ${i - 0.5} stars`}
              role="radio"
              aria-checked={value === i - 0.5}
            />
            <button
              type="button"
              className={`${styles.halfTarget} ${styles.halfTargetRight}`}
              onClick={() => onChange(getStarValue(i, false))}
              onMouseEnter={() => setHoverValue(getStarValue(i, false))}
              aria-label={`Rate ${i} stars`}
              role="radio"
              aria-checked={value === i}
            />
            <span className={styles.glyph} aria-hidden="true">
              {renderGlyph(i)}
            </span>
          </span>,
        );
      } else {
        stars.push(
          <span key={i} className={starClass} aria-hidden="true">
            {renderGlyph(i)}
          </span>,
        );
      }
    }
    return stars;
  }

  return (
    <div
      className={styles.container}
      aria-label={label}
      data-testid="star-rating"
      role={isInteractive ? "radiogroup" : "img"}
    >
      {renderStars()}
    </div>
  );
}
