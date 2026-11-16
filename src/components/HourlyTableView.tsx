import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  HOURLY_SMP_DATA,
  LOAD_TIER_LABELS,
  LoadTier,
  MarketRegion,
  REGION_LABELS,
} from '../data/powerMarketData';
import { DailySmpRecord } from '../utils/smpCsvParser';

interface HourlyTableViewProps {
  region: MarketRegion;
  selectedRecord: DailySmpRecord;
  prevRecord?: DailySmpRecord | null;
  highlightedHour: number;
}

type TierFilter = 'all' | LoadTier;

export const HourlyTableView: React.FC<HourlyTableViewProps> = ({
  region,
  selectedRecord,
  prevRecord = null,
  highlightedHour,
}) => {
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [expandedHour, setExpandedHour] = useState<number | null>(
    selectedRecord.peakHour
  );

  const enrichedData = useMemo(() => {
    return selectedRecord.hours.map((mainlandPrice, idx) => {
      const hour = idx + 1;
      const refPt = HOURLY_SMP_DATA[idx] || HOURLY_SMP_DATA[0];
      // If user switches to jeju/average, adjust proportionally or use exact CSV mainland value
      const price =
        region === 'mainland'
          ? mainlandPrice
          : region === 'jeju'
            ? Number((mainlandPrice * (refPt.jeju / refPt.mainland)).toFixed(2))
            : Number((mainlandPrice * 1.01).toFixed(2));

      const prevMainland = prevRecord?.hours[idx] ?? refPt.prevMainland;
      const prevPrice =
        region === 'mainland'
          ? prevMainland
          : region === 'jeju'
            ? Number((prevMainland * (refPt.jeju / refPt.mainland)).toFixed(2))
            : Number((prevMainland * 1.01).toFixed(2));

      const delta = price - prevPrice;
      return {
        hour,
        label: `${String(hour).padStart(2, '0')}시`,
        price,
        prevPrice,
        delta,
        loadMw: refPt.loadMw,
        reservePct: refPt.reservePct,
        loadTier: refPt.loadTier,
        marginalFuel: refPt.marginalFuel,
      };
    });
  }, [region, selectedRecord, prevRecord]);

  const { maxPrice, minPrice } = useMemo(() => {
    const prices = enrichedData.map((d) => d.price);
    return {
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices),
    };
  }, [enrichedData]);

  const filteredRows = useMemo(() => {
    if (tierFilter === 'all') return enrichedData;
    return enrichedData.filter((r) => r.loadTier === tierFilter);
  }, [enrichedData, tierFilter]);

  const filterOptions: Array<{ key: TierFilter; label: string }> = [
    { key: 'all', label: '전체 24시간' },
    { key: 'on-peak', label: '최대부하' },
    { key: 'mid-peak', label: '중간부하' },
    { key: 'off-peak', label: '경부하' },
  ];

  return (
    <div className="space-y-4">
      {/* Header & Filter Card */}
      <section className="bg-white rounded-[24px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {selectedRecord.date} · {REGION_LABELS[region]} 시간별 SMP
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              최소 {minPrice.toFixed(2)}원 · 최대 {maxPrice.toFixed(2)}원/kWh
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 tabular-nums">
            {filteredRows.length}개 구간
          </span>
        </div>

        {/* Segmented Filter Control */}
        <div
          className="grid grid-cols-4 gap-1 p-1 bg-[#F3F5F8] rounded-2xl"
          role="tablist"
          aria-label="부하 시간대 필터"
        >
          {filterOptions.map((opt) => {
            const active = tierFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTierFilter(opt.key)}
                className={`min-h-[40px] px-2 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Hourly List Card */}
      <section className="bg-white rounded-[24px] px-5 py-2 border border-slate-200/70 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
        <div className="divide-y divide-slate-100">
          {filteredRows.map((row) => {
            const isHighlighted = row.hour === highlightedHour;
            const isMax = Math.abs(row.price - maxPrice) < 0.01;
            const isMin = Math.abs(row.price - minPrice) < 0.01;
            const isExpanded = expandedHour === row.hour;
            const barWidthPct = Math.max(
              14,
              Math.min(
                100,
                ((row.price - minPrice * 0.8) /
                  Math.max(1, maxPrice - minPrice * 0.8)) *
                  100
              )
            );
            const deltaUp = row.delta > 0.05;
            const deltaDown = row.delta < -0.05;

            return (
              <div key={row.hour} className="py-1">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedHour(isExpanded ? null : row.hour)
                  }
                  aria-expanded={isExpanded}
                  className="w-full min-h-[56px] py-2.5 flex items-center justify-between gap-3 text-left transition-colors hover:bg-slate-50/70 rounded-xl px-1 -mx-1 cursor-pointer"
                >
                  {/* Left: Time + Tier */}
                  <div className="w-[76px] shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          isMax
                            ? 'text-orange-600'
                            : isHighlighted
                              ? 'text-[#1E5EFF]'
                              : 'text-slate-900'
                        }`}
                      >
                        {row.label}
                      </span>
                      {isMax && (
                        <span className="text-[11px] font-semibold text-orange-600">
                          최고
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {LOAD_TIER_LABELS[row.loadTier]}
                      {isMin ? ' · 최저' : ''}
                    </div>
                  </div>

                  {/* Center: Visual Relative Price Bar */}
                  <div className="flex-1 min-w-0">
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isMax
                            ? 'bg-orange-500'
                            : isMin
                              ? 'bg-emerald-500'
                              : isHighlighted
                                ? 'bg-[#1E5EFF]'
                                : 'bg-[#1E5EFF]/70'
                        }`}
                        style={{ width: `${barWidthPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400 tabular-nums">
                      <span>{row.marginalFuel}</span>
                      <span>예비 {row.reservePct.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Right: Price + Delta */}
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <div
                        className={`text-sm font-bold font-mono-num tabular-nums ${
                          isMax ? 'text-orange-600' : 'text-slate-900'
                        }`}
                      >
                        {row.price.toFixed(2)}
                        <span className="text-[11px] font-sans font-normal text-slate-400 ml-0.5">
                          원
                        </span>
                      </div>
                      <div
                        className={`text-[11px] font-medium tabular-nums ${
                          deltaUp
                            ? 'text-rose-600'
                            : deltaDown
                              ? 'text-emerald-600'
                              : 'text-slate-400'
                        }`}
                      >
                        {deltaUp ? '▲' : deltaDown ? '▼' : '–'}{' '}
                        {Math.abs(row.delta).toFixed(2)}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="pb-3 pt-1 px-1 grid grid-cols-3 gap-2 text-xs text-slate-600 bg-[#F8FAFC] rounded-2xl p-3 mb-2">
                    <div>
                      <div className="text-[11px] text-slate-400">전일 동시간</div>
                      <div className="font-semibold font-mono-num text-slate-800 mt-0.5">
                        {row.prevPrice.toFixed(2)} 원
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">예상 전력 수요</div>
                      <div className="font-semibold font-mono-num text-slate-800 mt-0.5">
                        {row.loadMw.toLocaleString()} MW
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">한계 발전원</div>
                      <div className="font-semibold text-slate-800 mt-0.5 truncate">
                        {row.marginalFuel}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
