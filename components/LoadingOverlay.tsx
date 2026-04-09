'use client';

interface LoadingOverlayProps {
  label: string;
  detail?: string;
  dimmed?: boolean;
}

export default function LoadingOverlay({ label, detail, dimmed = true }: LoadingOverlayProps) {
  return (
    <div className={`fixed inset-0 z-[120] flex items-center justify-center ${dimmed ? 'bg-[#f8f5ef]/82 backdrop-blur-sm' : 'bg-transparent'}`}>
      <div className="w-[min(320px,calc(100vw-32px))] rounded-[28px] border border-[#e8e2d6] bg-white/96 px-5 py-5 shadow-[0_20px_60px_rgba(26,23,20,0.12)]">
        <div className="h-1.5 overflow-hidden rounded-full bg-[#ede7db]">
          <div className="loading-bar h-full w-2/5 rounded-full bg-[#2c5f4e]" />
        </div>
        <p className="mt-4 text-sm font-semibold tracking-tight text-[#1a1714]">{label}</p>
        {detail ? (
          <p className="mt-1 text-sm leading-6 text-[#7a7068]">{detail}</p>
        ) : null}
      </div>
    </div>
  );
}
