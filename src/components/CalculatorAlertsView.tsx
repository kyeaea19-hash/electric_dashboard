import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Check, Zap } from 'lucide-react';
import {
  HOURLY_SMP_DATA,
  MarketRegion,
  REGION_LABELS,
  TARIFF_PRESETS,
  getRegionPrice,
} from '../data/powerMarketData';

interface CalculatorAlertsViewProps {
  region: MarketRegion;
  currentSmp: number;
  reservePct: number;
  selectedHours?: number[];
}

interface AlertSettings {
  lowAlertEnabled: boolean;
  lowThreshold: number;
  highAlertEnabled: boolean;
  highThreshold: number;
  reserveAlertEnabled: boolean;
}

const DEFAULT_ALERTS: AlertSettings = {
  lowAlertEnabled: true,
  lowThreshold: 125,
  highAlertEnabled: true,
  highThreshold: 165,
  reserveAlertEnabled: false,
};

export const CalculatorAlertsView: React.FC<CalculatorAlertsViewProps> = ({
  region,
  currentSmp,
  reservePct,
  selectedHours,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('ev');
  const [kwhAmount, setKwhAmount] = useState<number>(50);
  const [alerts, setAlerts] = useState<AlertSettings>(() => {
    try {
      const saved = localStorage.getItem('smp_alert_settings_v1');
      if (saved) return { ...DEFAULT_ALERTS, ...JSON.parse(saved) };
    } catch {
      // ignore storage errors
    }
    return DEFAULT_ALERTS;
  });
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('smp_alert_settings_v1', JSON.stringify(alerts));
    } catch {
      // ignore
    }
  }, [alerts]);

  const preset =
    TARIFF_PRESETS.find((p) => p.id === selectedPresetId) || TARIFF_PRESETS[0];

  const { estimatedUnitRate, estimatedTotalWon, cheapestWindow, savingsPct } =
    useMemo(() => {
      const unitRate =
        currentSmp * preset.multiplier + preset.fixedDistributionFee;
      const total = Math.round(preset.baseFee + unitRate * kwhAmount);

      // Find cheapest 3-hour window in today's schedule
      const hourlyValues =
        selectedHours && selectedHours.length === 24
          ? selectedHours
          : HOURLY_SMP_DATA.map((pt) => getRegionPrice(pt, region));

      let bestStartIdx = 0;
      let bestSum = Infinity;
      for (let i = 0; i <= hourlyValues.length - 3; i++) {
        const sum =
          hourlyValues[i] + hourlyValues[i + 1] + hourlyValues[i + 2];
        if (sum < bestSum) {
          bestSum = sum;
          bestStartIdx = i;
        }
      }
      const bestAvgSmp = bestSum / 3;
      const bestUnitRate =
        bestAvgSmp * preset.multiplier + preset.fixedDistributionFee;
      const pct = Math.max(
        0,
        Math.round(((unitRate - bestUnitRate) / unitRate) * 100)
      );

      return {
        estimatedUnitRate: unitRate,
        estimatedTotalWon: total,
        cheapestWindow: `${HOURLY_SMP_DATA[bestStartIdx].label} ~ ${HOURLY_SMP_DATA[bestStartIdx + 2].label}`,
        savingsPct: pct,
      };
    }, [currentSmp, preset, kwhAmount, region, selectedHours]);

  const activeAlertsTriggered = useMemo(() => {
    const msgs: string[] = [];
    if (alerts.lowAlertEnabled && currentSmp <= alerts.lowThreshold) {
      msgs.push(
        `현재 ${REGION_LABELS[region]} 시세(${currentSmp.toFixed(2)}원)가 목표 하한(${alerts.lowThreshold}원) 이하입니다.`
      );
    }
    if (alerts.highAlertEnabled && currentSmp >= alerts.highThreshold) {
      msgs.push(
        `현재 ${REGION_LABELS[region]} 시세(${currentSmp.toFixed(2)}원)가 급등 기준(${alerts.highThreshold}원) 이상입니다.`
      );
    }
    if (alerts.reserveAlertEnabled && reservePct < 10) {
      msgs.push(`공급 예비율(${reservePct.toFixed(1)}%)이 10% 미만으로 낮아졌습니다.`);
    }
    return msgs;
  }, [alerts, currentSmp, region, reservePct]);

  const handleSaveNotify = () => {
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 1800);
  };

  return (
    <div className="space-y-4">
      {/* Live Alert Status Banner (only if triggered) */}
      {activeAlertsTriggered.length > 0 && (
        <section className="bg-blue-50/90 rounded-[24px] p-4 border border-blue-200/80">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-[#1E5EFF] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-900">
                설정한 시세 알림 조건 충족
              </div>
              {activeAlertsTriggered.map((msg, i) => (
                <p key={i} className="text-xs text-slate-700 leading-relaxed">
                  {msg}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Electricity Cost & EV Charging Calculator */}
      <section className="bg-white rounded-[24px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              실시간 전력 요금 계산기
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              현재 {REGION_LABELS[region]} SMP({currentSmp.toFixed(2)}원/kWh) 기준 예상 비용
            </p>
          </div>
          <Zap className="w-5 h-5 text-[#1E5EFF]" />
        </div>

        {/* Tariff Preset Selector */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {TARIFF_PRESETS.map((item) => {
            const active = item.id === preset.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedPresetId(item.id)}
                className={`min-h-[44px] px-3 py-2 rounded-2xl text-left transition-all border cursor-pointer ${
                  active
                    ? 'bg-[#1E5EFF] text-white border-[#1E5EFF]'
                    : 'bg-[#F8FAFC] text-slate-700 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold">{item.name}</div>
                <div
                  className={`text-[11px] mt-0.5 truncate ${
                    active ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  기본료 {item.baseFee.toLocaleString()}원
                </div>
              </button>
            );
          })}
        </div>

        {/* Usage Slider & Presets */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="kwh-range"
              className="text-xs font-semibold text-slate-700"
            >
              사용량 · 충전량 선택
            </label>
            <span className="text-sm font-bold font-mono-num text-[#1E5EFF] tabular-nums">
              {kwhAmount} kWh
            </span>
          </div>
          <input
            id="kwh-range"
            type="range"
            min={10}
            max={500}
            step={5}
            value={kwhAmount}
            onChange={(e) => setKwhAmount(Number(e.target.value))}
            className="w-full accent-[#1E5EFF] cursor-pointer h-2 bg-slate-100 rounded-lg"
          />
          <div className="flex items-center gap-2 mt-2.5">
            {[30, 50, 77, 150, 300].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setKwhAmount(val)}
                className={`flex-1 min-h-[36px] text-xs font-semibold rounded-xl transition-colors tabular-nums cursor-pointer ${
                  kwhAmount === val
                    ? 'bg-slate-900 text-white'
                    : 'bg-[#F3F5F8] text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Result Summary (hairline divider, no nested card) */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">예상 총 청구 요금</span>
            <span className="text-2xl font-extrabold font-mono-num text-slate-900 tabular-nums">
              {estimatedTotalWon.toLocaleString()}
              <span className="text-sm font-sans font-semibold text-slate-500 ml-1">
                원
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums">
            <span>추정 환산 단가</span>
            <span className="font-semibold font-mono-num text-slate-800">
              {estimatedUnitRate.toFixed(1)} 원/kWh
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums">
            <span>오늘 최저가 추천 구간</span>
            <span className="font-semibold text-emerald-700">
              {cheapestWindow} (약 {savingsPct}% 절감)
            </span>
          </div>
        </div>
      </section>

      {/* Price Alert Settings Card */}
      <section className="bg-white rounded-[24px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">시세 알림 설정</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              원하는 SMP 단가 도달 시 즉시 화면에 표시합니다
            </p>
          </div>
          {savedToast && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <Check className="w-3.5 h-3.5" />
              저장됨
            </span>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {/* Low SMP Threshold */}
          <div className="py-3.5 first:pt-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  저가 매수·충전 추천 알림
                </div>
                <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {alerts.lowThreshold} 원/kWh 이하 하락 시
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={alerts.lowAlertEnabled}
                aria-label="저가 알림 켜기 또는 끄기"
                onClick={() => {
                  setAlerts((prev) => ({
                    ...prev,
                    lowAlertEnabled: !prev.lowAlertEnabled,
                  }));
                  handleSaveNotify();
                }}
                className={`w-12 h-7 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                  alerts.lowAlertEnabled ? 'bg-[#1E5EFF]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`block w-6 h-6 rounded-full bg-white shadow-xs transition-transform ${
                    alerts.lowAlertEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {alerts.lowAlertEnabled && (
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="range"
                  min={100}
                  max={160}
                  step={1}
                  value={alerts.lowThreshold}
                  onChange={(e) =>
                    setAlerts((prev) => ({
                      ...prev,
                      lowThreshold: Number(e.target.value),
                    }))
                  }
                  className="flex-1 accent-[#1E5EFF] h-1.5 cursor-pointer"
                />
                <span className="text-xs font-bold font-mono-num text-slate-800 w-16 text-right tabular-nums">
                  {alerts.lowThreshold}원
                </span>
              </div>
            )}
          </div>

          {/* High SMP Threshold */}
          <div className="py-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  단가 급등 주의 알림
                </div>
                <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {alerts.highThreshold} 원/kWh 이상 상승 시
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={alerts.highAlertEnabled}
                aria-label="급등 알림 켜기 또는 끄기"
                onClick={() => {
                  setAlerts((prev) => ({
                    ...prev,
                    highAlertEnabled: !prev.highAlertEnabled,
                  }));
                  handleSaveNotify();
                }}
                className={`w-12 h-7 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                  alerts.highAlertEnabled ? 'bg-[#1E5EFF]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`block w-6 h-6 rounded-full bg-white shadow-xs transition-transform ${
                    alerts.highAlertEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {alerts.highAlertEnabled && (
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="range"
                  min={140}
                  max={220}
                  step={1}
                  value={alerts.highThreshold}
                  onChange={(e) =>
                    setAlerts((prev) => ({
                      ...prev,
                      highThreshold: Number(e.target.value),
                    }))
                  }
                  className="flex-1 accent-[#1E5EFF] h-1.5 cursor-pointer"
                />
                <span className="text-xs font-bold font-mono-num text-slate-800 w-16 text-right tabular-nums">
                  {alerts.highThreshold}원
                </span>
              </div>
            )}
          </div>

          {/* Reserve Alert */}
          <div className="pt-3.5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                전력 공급 예비율 경보
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                예비율 10% 미만 시 알림 표시
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={alerts.reserveAlertEnabled}
              aria-label="예비율 경보 켜기 또는 끄기"
              onClick={() => {
                setAlerts((prev) => ({
                  ...prev,
                  reserveAlertEnabled: !prev.reserveAlertEnabled,
                }));
                handleSaveNotify();
              }}
              className={`w-12 h-7 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                alerts.reserveAlertEnabled ? 'bg-[#1E5EFF]' : 'bg-slate-200'
              }`}
            >
              <span
                className={`block w-6 h-6 rounded-full bg-white shadow-xs transition-transform ${
                  alerts.reserveAlertEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
