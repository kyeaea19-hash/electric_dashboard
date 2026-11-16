import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { MarketRegion, REGION_LABELS } from '../data/powerMarketData';

interface PowerSupplyItem {
  date: string;
  hour: number;
  areaName: string;
  smp: number;
  mlfd: number;
  jlfd: number;
  slfd: number;
}

interface PowerSupplySuccess {
  ok: true;
  endpoint: string;
  requestedDate: string;
  fetchedAt: string;
  items: PowerSupplyItem[];
}

interface PowerSupplyFailure {
  ok: false;
  code?: string;
  error: string;
  detail?: string;
  endpoint?: string;
}

interface RealtimePowerSupplySectionProps {
  region: MarketRegion;
}

export const RealtimePowerSupplySection: React.FC<
  RealtimePowerSupplySectionProps
> = ({ region }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<PowerSupplySuccess | null>(null);
  const [errorState, setErrorState] = useState<PowerSupplyFailure | null>(null);

  const fetchPowerSupply = useCallback(async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const res = await fetch('/api/power-supply');
      const payload = (await res.json()) as PowerSupplySuccess | PowerSupplyFailure;
      if (!res.ok || !payload.ok) {
        const errPayload = payload as PowerSupplyFailure;
        setData(null);
        setErrorState({
          ok: false,
          code: errPayload.code || `HTTP_${res.status}`,
          error: errPayload.error || '실시간 전력 수급 데이터를 불러오지 못했습니다.',
          detail: errPayload.detail,
          endpoint: errPayload.endpoint,
        });
      } else {
        setData(payload);
        setErrorState(null);
      }
    } catch (err) {
      setData(null);
      setErrorState({
        ok: false,
        code: 'CLIENT_FETCH_ERROR',
        error: '서버 프록시(/api/power-supply)와 통신하지 못했습니다.',
        detail: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPowerSupply();
  }, [fetchPowerSupply]);

  const summary = useMemo(() => {
    if (!data || data.items.length === 0) return null;

    const targetArea = region === 'jeju' ? '제주' : '육지';
    const areaItems = data.items.filter((i) =>
      i.areaName.includes(targetArea)
    );
    const activeItems = areaItems.length > 0 ? areaItems : data.items;

    const kstHour = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCHours() || 24;
    const currentItem =
      activeItems.find((i) => i.hour === kstHour) ||
      activeItems[activeItems.length - 1];

    const peakForecastItem = activeItems.reduce((best, cur) =>
      (cur.slfd || cur.mlfd) > (best.slfd || best.mlfd) ? cur : best
    );

    const totalDemandMw =
      currentItem.slfd > 0
        ? currentItem.slfd
        : currentItem.mlfd + currentItem.jlfd;

    const mainlandLoad = currentItem.mlfd;
    const jejuLoad = currentItem.jlfd;

    return {
      currentItem,
      peakForecastItem,
      totalDemandMw,
      mainlandLoad,
      jejuLoad,
      count: activeItems.length,
    };
  }, [data, region]);

  return (
    <section
      aria-label="실시간 전력 수급"
      className="bg-white rounded-[24px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(15,23,42,0.03)]"
    >
      {/* Section Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#1E5EFF]" />
            <h2 className="text-sm font-bold text-slate-900">
              실시간 전력 수급
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            한국전력거래소 예측 수요·SMP API 연동 ({REGION_LABELS[region]})
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchPowerSupply()}
          disabled={loading}
          aria-label="실시간 전력 수급 다시 불러오기"
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-[#F3F5F8] hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#1E5EFF]' : ''}`} />
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-5 space-y-2.5 animate-pulse">
          <div className="h-8 w-44 bg-slate-100 rounded-xl" />
          <div className="h-4 w-full bg-slate-100 rounded-lg" />
          <div className="h-14 w-full bg-slate-100 rounded-2xl" />
        </div>
      )}

      {/* Error State (rendered inside section as requested) */}
      {!loading && errorState && (
        <div className="rounded-2xl bg-rose-50/80 border border-rose-200/80 p-4 space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-rose-800">
                API 요청 실패{errorState.code ? ` (${errorState.code})` : ''}
              </div>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed break-words">
                {errorState.error}
              </p>
              {errorState.detail && (
                <p className="text-[11px] font-mono-num text-rose-600/90 mt-1.5 break-all bg-white/70 rounded-xl p-2 border border-rose-100">
                  {errorState.detail}
                </p>
              )}
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between gap-2">
            <span className="text-[11px] text-rose-600/80 truncate">
              요청: SmpWithForecastDemand
            </span>
            <button
              type="button"
              onClick={() => void fetchPowerSupply()}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              다시 요청
            </button>
          </div>
        </div>
      )}

      {/* Success State */}
      {!loading && !errorState && summary && data && (
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold font-mono-num text-slate-900 tabular-nums">
                {Math.round(summary.totalDemandMw).toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-slate-500">MW</span>
            </div>
            <span className="text-xs text-slate-500 tabular-nums">
              {summary.currentItem.date} · {String(summary.currentItem.hour).padStart(2, '0')}시 기준
            </span>
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-3 gap-3">
            <div>
              <div className="text-[11px] text-slate-400">육지 수요예측</div>
              <div className="text-sm font-bold font-mono-num text-slate-900 tabular-nums mt-0.5">
                {Math.round(summary.mainlandLoad).toLocaleString()}
                <span className="text-[10px] font-sans font-normal text-slate-400 ml-0.5">
                  MW
                </span>
              </div>
            </div>
            <div className="border-l border-slate-100 pl-3">
              <div className="text-[11px] text-slate-400">제주 수요예측</div>
              <div className="text-sm font-bold font-mono-num text-slate-900 tabular-nums mt-0.5">
                {Math.round(summary.jejuLoad).toLocaleString()}
                <span className="text-[10px] font-sans font-normal text-slate-400 ml-0.5">
                  MW
                </span>
              </div>
            </div>
            <div className="border-l border-slate-100 pl-3">
              <div className="text-[11px] text-slate-400">예측 SMP</div>
              <div className="text-sm font-bold font-mono-num text-[#1E5EFF] tabular-nums mt-0.5">
                {summary.currentItem.smp.toFixed(2)}
                <span className="text-[10px] font-sans font-normal text-slate-400 ml-0.5">
                  원
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
            <span>
              금일 최대 예측{' '}
              <strong className="text-slate-800 font-mono-num">
                {Math.round(
                  summary.peakForecastItem.slfd || summary.peakForecastItem.mlfd
                ).toLocaleString()}{' '}
                MW
              </strong>{' '}
              ({String(summary.peakForecastItem.hour).padStart(2, '0')}시)
            </span>
            <span className="text-slate-400">{summary.count}시간 수신</span>
          </div>
        </div>
      )}
    </section>
  );
};
