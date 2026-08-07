export default function Spinner({ size = 32 }) {
  return (
    <div
      className="animate-spin rounded-full border-4 border-brand-100 border-t-brand-500"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}
