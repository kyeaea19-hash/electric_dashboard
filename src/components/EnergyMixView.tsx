import React, { useMemo, useState } from 'react';
import { ENERGY_MIX_DATA, EnergySourceItem } from '../data/powerMarketData';

export const EnergyMixView: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>(ENERGY_MIX_DATA[0].id);

  const totalMw = useMemo(
    () => ENERGY_MIX_DATA.reduce((sum, item) => sum + item.mw, 0),
    []
  );

  const weightedCarbon = useMemo(() => {
    const totalEmissions = ENERGY_MIX_DATA.reduce(
      (sum, item) => sum + item.mw * item.carbonIntensity,
      0
    );
    return Math.round(totalEmissions / totalMw);
  }, [totalMw]);

  const selectedSource: EnergySourceItem =
    ENERGY_MIX_DATA.find((s) => s.id === selectedId) || ENERGY_MIX_DATA[0];

  // Build SVG donut segments
  const donutSegments = useMemo(() => {
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    let cumulativePct = 0;

    return ENERGY_MIX_DATA.map((item) => {
      const strokeLength = (item.sharePct / 100) * circumference;
      const gap = 3;
      const dashArray = `${Math.max(0, strokeLength - gap)} ${circumference}`;
      const dashOffset = -(cumulativePct / 100) * circumference;
      cumulativePct += item.sharePct;

      return {
        ...item,
        radius,
        dashArray,
        dashOffset,
      };
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Main Energy Mix Donut Card */}
      <section className="bg-white rounded-[24px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              실시간 발전원별 전력 믹스
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              총 발전 출력 {totalMw.toLocaleString()} MW · 평균 탄소배출{' '}
              {weightedCarbon} gCO₂/kWh
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center py-2">
          <div className="relative w-[176px] h-[176px] flex items-center justify-center">
            <svg
              viewBox="0 0 156 156"
              className="w-full h-full -rotate-90"
              role="img"
              aria-label="실시간 발전원 비중 도넛 차트"
            >
              <circle
                cx="78"
                cy="78"
                r="58"
                fill="none"
                stroke="#F1F5F9"
                strokeWidth="18"
              />
              {donutSegments.map((seg) => {
                const isSelected = seg.id === selectedSource.id;
                return (
                  <circle
                    key={seg.id}
                    cx="78"
                    cy="78"
                    r={seg.radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={isSelected ? 22 : 17}
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                    strokeLinecap="butt"
                    className="transition-all duration-200 cursor-pointer"
                    onClick={() => setSelectedId(seg.id)}
                  />
                );
              })}
            </svg>

            {/* Center Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
              <span className="text-xs font-medium text-slate-500">
                {selectedSource.name}
              </span>
              <span className="text-2xl font-extrabold font-mono-num text-slate-900 tabular-nums mt-0.5">
                {selectedSource.sharePct.toFixed(1)}%
              </span>
              <span className="text-[11px] font-mono-num text-slate-400 tabular-nums">
                {selectedSource.mw.toLocaleString()} MW
              </span>
            </div>
          </div>
        </div>

        {/* Selected Source Summary */}
        <div className="mt-3 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-800">
              {selectedSource.name} 상세 현황
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {selectedSource.note}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] text-slate-400">탄소 배출계수</div>
            <div className="text-xs font-bold font-mono-num text-slate-800">
              {selectedSource.carbonIntensity} g/kWh
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Breakdown List */}
      <section className="bg-white rounded-[24px] px-5 py-3 border border-slate-200/70 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
        <h3 className="text-sm font-bold text-slate-900 py-2">
          발전원별 상세 출력
        </h3>
        <div className="divide-y divide-slate-100">
          {ENERGY_MIX_DATA.map((item) => {
            const active = item.id === selectedSource.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full min-h-[54px] py-3 flex items-center justify-between gap-3 text-left transition-colors rounded-xl px-2 -mx-2 cursor-pointer ${
                  active ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {item.note}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold font-mono-num text-slate-900 tabular-nums">
                    {item.sharePct.toFixed(1)}%
                  </div>
                  <div className="text-xs font-mono-num text-slate-400 tabular-nums">
                    {item.mw.toLocaleString()} MW
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Renewable & SMP Relationship Insight */}
      <section className="bg-white rounded-[24px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
        <h3 className="text-sm font-bold text-slate-900">
          재생에너지 출력과 시세 영향
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
          낮 시간대(11시~14시) 태양광 발전량이 증가하면 고비용 LNG 첨두 발전기 가동이
          줄어 계통한계가격(SMP)이 일시적으로 하락하는 덕 커브(Duck Curve) 현상이
          나타납니다. 일몰 이후에는 LNG 복합 발전이 한계가격을 결정하며 저녁 피크 시세가
          형성됩니다.
        </p>
      </section>
    </div>
  );
};
