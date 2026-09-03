/*
 * The solid person glyph the Profile tab uses, drawn rather than scaled from
 * the 67px nav export so it stays sharp at avatar size.
 */
export default function PersonIcon({ size = 24, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="7.8" r="4.3" />
      <path d="M12 14.1c-4.35 0-7.85 2.63-7.85 5.87 0 .57.47 1.03 1.05 1.03h13.6c.58 0 1.05-.46 1.05-1.03 0-3.24-3.5-5.87-7.85-5.87z" />
    </svg>
  );
}
