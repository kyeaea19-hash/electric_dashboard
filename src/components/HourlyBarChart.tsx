import React, { useMemo, useState } from 'react';

interface HourlyBarChartProps {
  hours: number[];
  weightedAvg: number;
  peakHour: number; // 1..24
  minHour: number; // 1..24
  selectedHour: number | null;
  onSelectHour?: (hour: number) => void;
}

export const HourlyBarChart: React.FC<HourlyBarChartProps> = ({
  hours,
  weightedAvg,
  peakHour,
  minHour,
  selectedHour,
  onSelectHour,
}) => {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  const { maxVal, minVal, avgPct } = useMemo(() => {
    const mx = Math.max(...hours, weightedAvg);
    const mn = Math.min(...hours);
    const ceiling = mx * 1.08;
    const floor = Math.max(0, mn * 0.72);
    const span = Math.max(1, ceiling - floor);
    const avgRatio = Math.max(0, Math.min(100, ((weightedAvg - floor) / span) * 100));
    return {
      maxVal: ceiling,
      minVal: floor,
      avgPct: avgRatio,
    };
  }, [hours, weightedAvg]);

  const activeHour = hoveredHour ?? selectedHour ?? peakHour;
  const activePrice = hours[activeHour - 1] ?? 0;
  const isPeakActive = activeHour === peakHour;
  const diffFromAvg = activePrice - weightedAvg;

  return (
    <div className="w-full select-none">
      {/* Interactive Hour Readout Bar */}
      <div className="flex items-center justify-between gap-2 mb-3 min-h-[24px]">
        <div className="flex items-center gap-2 text-xs tabular-nums">
          <span
            className={`font-bold ${
              isPeakActive ? 'text-orange-600' : 'text-slate-900'
            }`}
          >
            {String(activeHour).padStart(2, '0')}시
            {isPeakActive ? ' (최고가)' : activeHour === minHour ? ' (최저가)' : ''}
          </span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span
            className={`font-mono-num font-bold ${
              isPeakActive ? 'text-orange-600' : 'text-[#1E5EFF]'
            }`}
          >
            {activePrice.toFixed(2)} 원/kWh
          </span>
        </div>

        <span
          className={`text-[11px] font-medium tabular-nums shrink-0 ${
            diffFromAvg >= 0 ? 'text-orange-600' : 'text-emerald-600'
          }`}
        >
          평균 대비 {diffFromAvg >= 0 ? '+' : ''}
          {diffFromAvg.toFixed(2)}원
        </span>
      </div>

      {/* 24-Hour Bar Plot */}
      <div className="relative h-[168px] pt-4 pb-6">
        {/* Horizontal Dashed Average Line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-slate-300 pointer-events-none z-10"
          style={{ bottom: `calc(24px + (100% - 40px) * ${avgPct / 100})` }}
        >
          <span className="absolute right-0 -top-4 text-[10px] font-medium text-slate-400 bg-white/85 px-1 tabular-nums">
            평균 {weightedAvg.toFixed(1)}
          </span>
        </div>

        <div className="h-full grid grid-cols-24 gap-[3px] items-end">
          {hours.map((val, idx) => {
            const hour = idx + 1;
            const isPeak = hour === peakHour;
            const isSelected = hour === activeHour;
            const span = Math.max(1, maxVal - minVal);
            const heightPct = Math.max(
              10,
              Math.min(100, ((val - minVal) / span) * 100)
            );

            return (
              <button
                key={hour}
                type="button"
                onClick={() => onSelectHour?.(hour)}
                onMouseEnter={() => setHoveredHour(hour)}
                onMouseLeave={() => setHoveredHour(null)}
                aria-label={`${String(hour).padStart(2, '0')}시 ${val.toFixed(2)}원`}
                className="h-full flex flex-col justify-end items-center group cursor-pointer focus:outline-none"
              >
                <span
                  className={`w-full rounded-t-[4px] transition-all duration-150 ${
                    isPeak
                      ? isSelected
                        ? 'bg-orange-500 ring-2 ring-orange-200'
                        : 'bg-orange-500 hover:bg-orange-600'
                      : isSelected
                        ? 'bg-[#1E5EFF] ring-2 ring-blue-100'
                        : 'bg-[#1E5EFF]/70 group-hover:bg-[#1E5EFF]'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </button>
            );
          })}
        </div>

        {/* X-Axis Hour Ticks */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between text-[10px] font-medium text-slate-400 tabular-nums pointer-events-none">
          <span>01시</span>
          <span>06시</span>
          <span>12시</span>
          <span>18시</span>
          <span>24시</span>
        </div>
      </div>

      {/* Minimal Legend */}
      <div className="mt-2 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-orange-500" aria-hidden="true" />
            가장 비싼 시간대 ({String(peakHour).padStart(2, '0')}시)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#1E5EFF]/80" aria-hidden="true" />
            일반 시간대
          </span>
        </div>
        <span className="text-slate-400">막대 터치</span>
      </div>
    </div>
  );
};
