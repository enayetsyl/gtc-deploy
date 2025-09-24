export default function Spinner({
  className = "w-4 h-4 mr-2",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className + " animate-spin"}
      viewBox="0 0 50 50"
      aria-hidden
      fill="none"
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="31.4 31.4"
      />
    </svg>
  );
}
