'use client';

import { Settings, Theme, FontFamily, THEME_STYLES } from '@/lib/settings';

interface SettingsPanelProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onSettingsChange, onClose }: SettingsPanelProps) {
  const theme = THEME_STYLES[settings.theme];

  const update = (partial: Partial<Settings>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  const themes: { value: Theme; label: string; dot: string }[] = [
    { value: 'light', label: '라이트', dot: 'bg-[#f8f5ef] border border-[#d0c8bc]' },
    { value: 'dark',  label: '다크',   dot: 'bg-[#1c1916]' },
    { value: 'sepia', label: '세피아', dot: 'bg-[#f2e8d4] border border-[#c8b090]' },
  ];

  const fonts: { value: FontFamily; label: string; sub: string }[] = [
    { value: 'gothic', label: '고딕체', sub: 'AaBbCc' },
    { value: 'serif',  label: '명조체', sub: 'AaBbCc' },
  ];

  const rangeTrack = settings.theme === 'dark' ? '#3a3530' : settings.theme === 'sepia' ? '#d8c8a8' : '#e8e2d6';

  return (
    <>
      <div className="fixed inset-0 z-40 animate-fade-in" onClick={onClose} />

      <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] max-w-lg mx-auto animate-slide-up-sheet ${theme.panelSolid}`}>
        {/* 핸들 */}
        <div className="flex justify-center pt-3.5 pb-1">
          <div className={`w-9 h-[3px] rounded-full ${theme.handle}`} />
        </div>

        <div className="px-6 pb-12 pt-3 space-y-7">
          {/* 타이틀 */}
          <h2 className={`text-lg font-semibold tracking-tight ${theme.text}`}>읽기 설정</h2>

          {/* ── 글자 크기 ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${theme.text}`}>글자 크기</span>
              <span className={`text-sm tabular-nums font-medium ${theme.accentText}`}>{settings.fontSize}px</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => update({ fontSize: Math.max(12, settings.fontSize - 1) })}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg font-light border ${theme.border} ${theme.text} active:scale-90 transition-transform`}
              >−</button>
              <div className="flex-1 relative">
                <div className="absolute inset-y-1/2 left-0 right-0 h-[3px] -translate-y-1/2 rounded-full" style={{ background: rangeTrack }} />
                <div
                  className="absolute inset-y-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full"
                  style={{ background: '#2c5f4e', width: `${((settings.fontSize - 12) / (28 - 12)) * 100}%` }}
                />
                <input
                  type="range" min={12} max={28}
                  value={settings.fontSize}
                  onChange={(e) => update({ fontSize: Number(e.target.value) })}
                  className="relative w-full opacity-0 cursor-pointer h-6"
                  style={{ background: 'transparent' }}
                />
              </div>
              <button
                onClick={() => update({ fontSize: Math.min(28, settings.fontSize + 1) })}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg font-light border ${theme.border} ${theme.text} active:scale-90 transition-transform`}
              >+</button>
            </div>
          </div>

          {/* ── 줄 간격 ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${theme.text}`}>줄 간격</span>
              <span className={`text-sm tabular-nums font-medium ${theme.accentText}`}>{settings.lineHeight.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => update({ lineHeight: Math.max(1.2, Number((settings.lineHeight - 0.1).toFixed(1))) })}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg font-light border ${theme.border} ${theme.text} active:scale-90 transition-transform`}
              >−</button>
              <div className="flex-1 relative">
                <div className="absolute inset-y-1/2 left-0 right-0 h-[3px] -translate-y-1/2 rounded-full" style={{ background: rangeTrack }} />
                <div
                  className="absolute inset-y-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full"
                  style={{ background: '#2c5f4e', width: `${((settings.lineHeight - 1.2) / (2.5 - 1.2)) * 100}%` }}
                />
                <input
                  type="range" min={1.2} max={2.5} step={0.1}
                  value={settings.lineHeight}
                  onChange={(e) => update({ lineHeight: Number(e.target.value) })}
                  className="relative w-full opacity-0 cursor-pointer h-6"
                />
              </div>
              <button
                onClick={() => update({ lineHeight: Math.min(2.5, Number((settings.lineHeight + 0.1).toFixed(1))) })}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg font-light border ${theme.border} ${theme.text} active:scale-90 transition-transform`}
              >+</button>
            </div>
          </div>

          {/* ── 테마 ── */}
          <div className="space-y-3">
            <span className={`text-sm font-medium ${theme.text}`}>테마</span>
            <div className="flex gap-2">
              {themes.map((t) => {
                const active = settings.theme === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => update({ theme: t.value })}
                    className={`flex-1 flex flex-col items-center gap-2 py-3.5 rounded-2xl border-2 transition-all active:scale-95 ${
                      active
                        ? 'border-[#2c5f4e]'
                        : `${theme.border}`
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full ${t.dot}`} />
                    <span className={`text-xs font-medium ${active ? theme.accentText : theme.subtext}`}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 글꼴 ── */}
          <div className="space-y-3">
            <span className={`text-sm font-medium ${theme.text}`}>글꼴</span>
            <div className={`flex rounded-2xl border overflow-hidden ${theme.border}`}>
              {fonts.map((f, i) => {
                const active = settings.fontFamily === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => update({ fontFamily: f.value })}
                    className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-all ${
                      i === 0 ? '' : `border-l ${theme.border}`
                    } ${active ? 'bg-[#2c5f4e]' : ''}`}
                  >
                    <span
                      className={`text-sm font-medium ${active ? 'text-white' : theme.text}`}
                      style={f.value === 'serif' ? { fontFamily: 'var(--font-reading)' } : {}}
                    >
                      {f.label}
                    </span>
                    <span
                      className={`text-xs ${active ? 'text-white/70' : theme.subtext}`}
                      style={f.value === 'serif' ? { fontFamily: 'var(--font-reading)' } : {}}
                    >
                      {f.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
