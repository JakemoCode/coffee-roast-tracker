export function CoffeeCupIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Steam lines */}
      <path
        d="M20 18C20 14 22 12 22 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M28 16C28 12 30 10 30 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M36 18C36 14 38 12 38 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Cup body */}
      <rect
        x="12"
        y="24"
        width="34"
        height="26"
        rx="4"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      {/* Handle */}
      <path
        d="M46 30C52 30 54 34 54 38C54 42 52 46 46 46"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Saucer */}
      <ellipse
        cx="29"
        cy="54"
        rx="22"
        ry="4"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
