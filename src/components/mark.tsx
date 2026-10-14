export function LedgerMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0071E3" />
      <rect x="8" y="7" width="16" height="18" rx="3" fill="#FFFFFF" />
      <path
        d="M12 13h8M12 16.5h8M12 20h5"
        stroke="#0071E3"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
