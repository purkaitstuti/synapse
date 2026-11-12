export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-display font-bold text-white">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <g stroke="#22D3EE" strokeWidth="1.6" strokeLinecap="round">
          <path d="M8 22 L16 8 L24 22" /><path d="M8 22 H24" strokeDasharray="2 3" stroke="#8B5CF6" />
        </g>
        <circle cx="16" cy="8" r="3.2" fill="#3B82F6" /><circle cx="8" cy="22" r="3.2" fill="#8B5CF6" />
        <circle cx="24" cy="22" r="3.2" fill="#22D3EE" />
      </svg>
      Synapse
    </span>
  );
}
