import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Maximize2,
  Minimize2,
  PieChart,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Upload,
  Zap,
} from 'lucide-react';
import { CalculatorAlertsView } from './components/CalculatorAlertsView';
import { DateCalendarSheet } from './components/DateCalendarSheet';
import { EnergyMixView } from './components/EnergyMixView';
import { HourlyBarChart } from './components/HourlyBarChart';
import { HourlyTableView } from './components/HourlyTableView';
import { ChartDatum, PriceChart } from './components/PriceChart';
import { RealtimePowerSupplySection } from './components/RealtimePowerSupplySection';
import {
  HOURLY_SMP_DATA,
  MarketRegion,
  REGION_LABELS,
  SUPPLY_TELEMETRY,
} from './data/powerMarketData';
import {
  DailySmpRecord,
  MonthlySmpRecord,
  buildRecordForCalendarDate,
  decodeCsvBuffer,
  formatKoreanDate,
  parseSmpCsv,
  shiftYmd,
} from './utils/smpCsvParser';

type NavTab = 'home' | 'hourly' | 'mix' | 'calculator';

const ATTACHED_CSV_URL = '/assets/aistudio/HOME________________SMP_90d0ffe3.csv';

const FALLBACK_HOURS = HOURLY_SMP_DATA.map((d) => d.mainland);
const FALLBACK_MAX = Math.max(...FALLBACK_HOURS);
const FALLBACK_MIN = Math.min(...FALLBACK_HOURS);
const FALLBACK_AVG = Number(
  (FALLBACK_HOURS.reduce((s, v) => s + v, 0) / 24).toFixed(2)
);
const FALLBACK_RECORD: DailySmpRecord = {
  date: '2026-09-30',
  hours: FALLBACK_HOURS,
  max: FALLBACK_MAX,
  min: FALLBACK_MIN,
  weightedAvg: FALLBACK_AVG,
  simpleAvg: FALLBACK_AVG,
  peakHour: FALLBACK_HOURS.indexOf(FALLBACK_MAX) + 1,
  minHour: FALLBACK_HOURS.indexOf(FALLBACK_MIN) + 1,
  isCalibratedFromMonthly: true,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [region, setRegion] = useState<MarketRegion>('mainland');
  const [wideMode, setWideMode] = useState<boolean>(false);

  // CSV & Calendar State
  const [csvSourceName, setCsvSourceName] = useState<string>(
    'HOME________________SMP_90d0ffe3.csv'
  );
  const [csvKind, setCsvKind] = useState<'daily-hourly' | 'monthly'>('monthly');
  const [dailyHourlyList, setDailyHourlyList] = useState<DailySmpRecord[]>([]);
  const [monthlyRecords, setMonthlyRecords] = useState<MonthlySmpRecord[]>([]);
  const [minDate, setMinDate] = useState<string>('2001-04-01');
  const [maxDate, setMaxDate] = useState<string>('2026-09-30');
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-30');
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isLoadingCsv, setIsLoadingCsv] = useState<boolean>(true);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('CSV 연동');
  const [monthlyChartRange, setMonthlyChartRange] = useState<12 | 24>(12);

  const loadAttachedCsv = async () => {
    setIsLoadingCsv(true);
    setCsvError(null);
    try {
      const res = await fetch(ATTACHED_CSV_URL);
      if (!res.ok) {
        throw new Error('첨부 CSV 파일을 불러올 수 없습니다.');
      }
      const buffer = await res.arrayBuffer();
      const text = decodeCsvBuffer(buffer);
      const parsed = parseSmpCsv(text, 'HOME________________SMP_90d0ffe3.csv');

      setCsvSourceName(parsed.fileName);
      setCsvKind(parsed.kind);
      setMinDate(parsed.minDate);
      setMaxDate(parsed.maxDate);
      setSelectedDate(parsed.maxDate);
      setSelectedHour(null);

      if (parsed.kind === 'monthly') {
        setMonthlyRecords(parsed.monthlyRecords);
        setDailyHourlyList([]);
      } else {
        setDailyHourlyList(parsed.dailyRecords);
        setMonthlyRecords([]);
      }
      setLastUpdatedTime('CSV 동기화 완료');
    } catch (err) {
      setCsvError(
        err instanceof Error ? err.message : 'CSV 파싱 중 오류가 발생했습니다.'
      );
    } finally {
      setIsLoadingCsv(false);
    }
  };

  useEffect(() => {
    void loadAttachedCsv();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);
    setIsLoadingCsv(true);
    try {
      const buffer = await file.arrayBuffer();
      const text = decodeCsvBuffer(buffer);
      const parsed = parseSmpCsv(text, file.name);
      setCsvSourceName(parsed.fileName);
      setCsvKind(parsed.kind);
      setMinDate(parsed.minDate);
      setMaxDate(parsed.maxDate);
      setSelectedDate(parsed.maxDate);
      setSelectedHour(null);

      if (parsed.kind === 'monthly') {
        setMonthlyRecords(parsed.monthlyRecords);
        setDailyHourlyList([]);
      } else {
        setDailyHourlyList(parsed.dailyRecords);
        setMonthlyRecords([]);
      }
      const now = new Date();
      setLastUpdatedTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} 업로드`
      );
    } catch (err) {
      setCsvError(
        err instanceof Error
          ? err.message
          : '올바른 전력거래소 SMP CSV 파일이 아닙니다.'
      );
    } finally {
      setIsLoadingCsv(false);
      e.target.value = '';
    }
  };

  const monthlyMap = useMemo(() => {
    const map = new Map<string, MonthlySmpRecord>();
    for (const m of monthlyRecords) {
      map.set(m.period, m);
    }
    return map;
  }, [monthlyRecords]);

  const dailyHourlyMap = useMemo(() => {
    const map = new Map<string, DailySmpRecord>();
    for (const d of dailyHourlyList) {
      map.set(d.date, d);
    }
    return map;
  }, [dailyHourlyList]);

  const availableDatesSet = useMemo(() => {
    if (csvKind !== 'daily-hourly' || dailyHourlyList.length === 0) return null;
    return new Set(dailyHourlyList.map((d) => d.date));
  }, [csvKind, dailyHourlyList]);

  const getRawRecordByDate = (dateStr: string): DailySmpRecord | null => {
    if (csvKind === 'daily-hourly') {
      return dailyHourlyMap.get(dateStr) || null;
    }
    return buildRecordForCalendarDate(dateStr, monthlyMap);
  };

  const rawSelectedRecord =
    getRawRecordByDate(selectedDate) ||
    dailyHourlyList[0] ||
    FALLBACK_RECORD;

  const prevDateStr = shiftYmd(rawSelectedRecord.date, -1);
  const prevRawRecord = getRawRecordByDate(prevDateStr);

  // Region scaling / exact regional CSV average
  const applyRegionToRecord = (rec: DailySmpRecord): DailySmpRecord => {
    if (region === 'mainland') return rec;

    const targetAvg =
      region === 'jeju' ? rec.jejuAvg : rec.integratedAvg;

    const baseAvg = rec.weightedAvg || 1;
    const factor =
      targetAvg && targetAvg > 0
        ? targetAvg / baseAvg
        : region === 'jeju'
          ? 1.08
          : 1.01;

    const scaledHours = rec.hours.map((v) => Number((v * factor).toFixed(2)));
    const max = Math.max(...scaledHours);
    const min = Math.min(...scaledHours);
    const simpleAvg = Number(
      (scaledHours.reduce((s, v) => s + v, 0) / 24).toFixed(2)
    );
    const weightedAvg =
      targetAvg && targetAvg > 0
        ? Number(targetAvg.toFixed(2))
        : Number((rec.weightedAvg * factor).toFixed(2));

    return {
      ...rec,
      hours: scaledHours,
      max,
      min,
      simpleAvg,
      weightedAvg,
      peakHour: scaledHours.indexOf(max) + 1,
      minHour: scaledHours.indexOf(min) + 1,
    };
  };

  const activeRecord = useMemo(
    () => applyRegionToRecord(rawSelectedRecord),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawSelectedRecord, region]
  );

  const prevAvg = useMemo(() => {
    if (!prevRawRecord) return activeRecord.weightedAvg;
    return applyRegionToRecord(prevRawRecord).weightedAvg;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevRawRecord, region, activeRecord.weightedAvg]);

  const avgDelta = activeRecord.weightedAvg - prevAvg;
  const avgDeltaPct = prevAvg > 0 ? (avgDelta / prevAvg) * 100 : 0;
  const isAvgUp = avgDelta > 0.02;
  const isAvgDown = avgDelta < -0.02;

  const getDayPreviewPrice = (dateStr: string): number | null => {
    const rec = getRawRecordByDate(dateStr);
    if (!rec) return null;
    return applyRegionToRecord(rec).weightedAvg;
  };

  // Day stepper buttons (< / >)
  const canStepPrev =
    csvKind === 'daily-hourly'
      ? dailyHourlyList.findIndex((d) => d.date === activeRecord.date) <
        dailyHourlyList.length - 1
      : activeRecord.date > minDate;

  const canStepNext =
    csvKind === 'daily-hourly'
      ? dailyHourlyList.findIndex((d) => d.date === activeRecord.date) > 0
      : activeRecord.date < maxDate;

  const handleStepDay = (delta: -1 | 1) => {
    if (csvKind === 'daily-hourly') {
      const idx = dailyHourlyList.findIndex((d) => d.date === activeRecord.date);
      const nextIdx = delta === -1 ? idx + 1 : idx - 1;
      if (nextIdx >= 0 && nextIdx < dailyHourlyList.length) {
        setSelectedDate(dailyHourlyList[nextIdx].date);
        setSelectedHour(null);
      }
      return;
    }
    const candidate = shiftYmd(activeRecord.date, delta);
    if (candidate >= minDate && candidate <= maxDate) {
      setSelectedDate(candidate);
      setSelectedHour(null);
    }
  };

  // Monthly chart data centered on the selected date's month
  const selectedPeriodSlash = activeRecord.date.slice(0, 7).replace('-', '/');
  const { monthlyChartData, monthlyActiveIdx } = useMemo(() => {
    if (monthlyRecords.length === 0) {
      return { monthlyChartData: [] as ChartDatum[], monthlyActiveIdx: null };
    }
    const selIdx = monthlyRecords.findIndex(
      (m) => m.period === selectedPeriodSlash
    );
    const anchor = selIdx >= 0 ? selIdx : 0;
    const start = Math.max(
      0,
      Math.min(anchor, monthlyRecords.length - monthlyChartRange)
    );
    const slice = monthlyRecords
      .slice(start, start + monthlyChartRange)
      .reverse();

    const mapped = slice.map((m) => {
      const val =
        region === 'jeju'
          ? m.jeju > 0
            ? m.jeju
            : m.integrated
          : region === 'average'
            ? m.integrated > 0
              ? m.integrated
              : m.mainland
            : m.mainland > 0
              ? m.mainland
              : m.integrated;
      return {
        label: m.period,
        subLabel: '월별 평균',
        value: val,
        reservePct: 17.5,
      };
    });

    const activeIdxInChart = mapped.findIndex(
      (d) => d.label === selectedPeriodSlash
    );
    return {
      monthlyChartData: mapped,
      monthlyActiveIdx:
        activeIdxInChart >= 0 ? activeIdxInChart : mapped.length - 1,
    };
  }, [monthlyRecords, monthlyChartRange, region, selectedPeriodSlash]);

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'home', label: '시세 홈', icon: Activity },
    { id: 'hourly', label: '시간별', icon: Clock },
    { id: 'mix', label: '발전원', icon: PieChart },
    { id: 'calculator', label: '계산·알림', icon: Calculator },
  ];

  return (
    <div className="min-h-dvh w-full bg-[#EAEEF4] flex justify-center">
      <div
        className={`w-full min-h-dvh bg-[#F3F5F8] flex flex-col relative transition-all duration-200 ${
          wideMode
            ? 'md:max-w-4xl md:shadow-[0_12px_40px_rgba(15,23,42,0.06)]'
            : 'md:max-w-[430px] md:shadow-[0_12px_40px_rgba(15,23,42,0.08)] md:border-x md:border-slate-200/70'
        }`}
      >
        {/* Compact Sticky Top App Bar */}
        <header className="sticky top-0 z-30 h-[54px] bg-[#F3F5F8]/90 backdrop-blur-md border-b border-slate-200/70 px-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-xl bg-[#1E5EFF] text-white flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 fill-current" />
            </span>
            <h1 className="text-[17px] font-bold tracking-tight text-slate-900 whitespace-nowrap truncate">
              실시간 전기 시세
            </h1>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[11px] font-medium text-slate-500 tabular-nums mr-1">
              {lastUpdatedTime}
            </span>
            <button
              type="button"
              onClick={() => void loadAttachedCsv()}
              aria-label="CSV 다시 불러오기"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingCsv ? 'animate-spin text-[#1E5EFF]' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={() => setWideMode((v) => !v)}
              aria-label={wideMode ? '스마트폰 크기로 보기' : '넓은 화면으로 보기'}
              className="hidden md:flex min-w-[40px] min-h-[40px] items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              {wideMode ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 px-4 pt-3.5 pb-24 space-y-4">
          {/* Calendar Date Selector & CSV Upload Bar */}
          <section className="bg-white rounded-[24px] p-3.5 border border-slate-200/70 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
            <div className="flex items-center gap-1.5">
              {/* Previous Day Stepper */}
              <button
                type="button"
                onClick={() => handleStepDay(-1)}
                disabled={!canStepPrev}
                aria-label="이전 날짜"
                className="min-w-[40px] min-h-[44px] flex items-center justify-center rounded-2xl bg-[#F3F5F8] hover:bg-slate-200/60 text-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Calendar Modal Trigger Button */}
              <button
                type="button"
                onClick={() => setIsCalendarOpen(true)}
                aria-label="달력으로 날짜 선택"
                className="flex-1 min-w-0 min-h-[44px] px-3 py-2 bg-[#F3F5F8] hover:bg-slate-200/60 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-slate-900 transition-colors cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-[#1E5EFF] shrink-0" />
                <span className="truncate tabular-nums">
                  {formatKoreanDate(activeRecord.date)}
                </span>
              </button>

              {/* Next Day Stepper */}
              <button
                type="button"
                onClick={() => handleStepDay(1)}
                disabled={!canStepNext}
                aria-label="다음 날짜"
                className="min-w-[40px] min-h-[44px] flex items-center justify-center rounded-2xl bg-[#F3F5F8] hover:bg-slate-200/60 text-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* CSV Upload Button */}
              <label
                htmlFor="csv-file-upload"
                className="min-h-[44px] px-3 py-2 rounded-2xl bg-[#1E5EFF]/10 hover:bg-[#1E5EFF]/15 text-[#1E5EFF] text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer transition-colors whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>CSV</span>
                <input
                  id="csv-file-upload"
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="mt-2 px-1 flex items-center justify-between text-[11px] text-slate-500 gap-2">
              <span className="truncate">연결 파일: {csvSourceName}</span>
              <span className="shrink-0 text-slate-400 tabular-nums">
                {minDate} ~ {maxDate}
              </span>
            </div>

            {csvError && (
              <p className="mt-2 text-xs text-rose-600 px-1 font-medium">
                {csvError}
              </p>
            )}
          </section>

          {/* Region Segmented Bar */}
          <div
            className="grid grid-cols-3 gap-1 p-1 bg-slate-200/65 rounded-2xl"
            role="tablist"
            aria-label="전력 시장 지역 선택"
          >
            {(['mainland', 'jeju', 'average'] as MarketRegion[]).map((key) => {
              const active = region === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setRegion(key)}
                  className={`min-h-[40px] py-1.5 px-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {REGION_LABELS[key]}
                </button>
              );
            })}
          </div>

          {activeTab === 'home' && (
            <div
              className={
                wideMode
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4 items-start'
                  : 'space-y-4'
              }
            >
              {/* Left / Primary Column */}
              <div className="space-y-4">
                {/* Daily Average Card */}
                <section className="bg-white rounded-[24px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {REGION_LABELS[region]} 하루 평균 SMP (가중평균)
                    </span>
                    <span className="tabular-nums">{activeRecord.date}</span>
                  </div>

                  {/* Hero Daily Weighted Average Readout */}
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-[38px] leading-none font-extrabold font-mono-num tracking-tight text-slate-900 tabular-nums">
                      {activeRecord.weightedAvg.toFixed(2)}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">
                      원/kWh
                    </span>
                  </div>

                  {/* Comparison vs Previous Day */}
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold tabular-nums">
                    {isAvgUp ? (
                      <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                    ) : isAvgDown ? (
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : null}
                    <span
                      className={
                        isAvgUp
                          ? 'text-rose-600'
                          : isAvgDown
                            ? 'text-emerald-600'
                            : 'text-slate-500'
                      }
                    >
                      {isAvgUp ? '▲' : isAvgDown ? '▼' : '–'}{' '}
                      {Math.abs(avgDelta).toFixed(2)}원 (
                      {avgDeltaPct > 0 ? '+' : ''}
                      {avgDeltaPct.toFixed(2)}%)
                    </span>
                    <span className="text-slate-400 font-normal">
                      {prevRawRecord
                        ? `전일(${prevRawRecord.date}) 대비`
                        : '선택일 기준'}
                    </span>
                  </div>

                  {/* Clean Hairline Sub-Metrics */}
                  <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3">
                    <div>
                      <div className="text-[11px] text-slate-400">
                        최고 시간대
                      </div>
                      <div className="text-sm font-bold font-mono-num text-orange-600 tabular-nums mt-0.5">
                        {activeRecord.max.toFixed(2)}원
                      </div>
                      <div className="text-[11px] text-orange-600/90 font-medium tabular-nums">
                        {String(activeRecord.peakHour).padStart(2, '0')}시 최고
                      </div>
                    </div>
                    <div className="border-l border-slate-100 pl-3">
                      <div className="text-[11px] text-slate-400">
                        최저 시간대
                      </div>
                      <div className="text-sm font-bold font-mono-num text-emerald-600 tabular-nums mt-0.5">
                        {activeRecord.min.toFixed(2)}원
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        {String(activeRecord.minHour).padStart(2, '0')}시 최저
                      </div>
                    </div>
                    <div className="border-l border-slate-100 pl-3">
                      <div className="text-[11px] text-slate-400">산술 평균</div>
                      <div className="text-sm font-bold font-mono-num text-slate-900 tabular-nums mt-0.5">
                        {activeRecord.simpleAvg.toFixed(2)}원
                      </div>
                      <div className="text-[11px] text-slate-400">
                        24시간 단순평균
                      </div>
                    </div>
                  </div>
                </section>

                {/* 24-Hour Bar Chart Card */}
                <section className="bg-white rounded-[24px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
                  <div className="flex items-baseline justify-between gap-2 mb-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        24시간 시간대별 SMP 막대 차트
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                        {formatKoreanDate(activeRecord.date)} · 단위 원/kWh
                      </p>
                    </div>
                  </div>

                  <HourlyBarChart
                    hours={activeRecord.hours}
                    weightedAvg={activeRecord.weightedAvg}
                    peakHour={activeRecord.peakHour}
                    minHour={activeRecord.minHour}
                    selectedHour={selectedHour}
                    onSelectHour={(h) => setSelectedHour(h)}
                  />
                </section>
              </div>

              {/* Right / Secondary Column */}
              <div className="space-y-4">
                {/* Attached Monthly CSV Trend Card */}
                {monthlyChartData.length > 0 && (
                  <section className="bg-white rounded-[24px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">
                          첨부 CSV 월별 SMP 추이
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                          {selectedPeriodSlash} {REGION_LABELS[region]}{' '}
                          {(region === 'jeju'
                            ? monthlyMap.get(selectedPeriodSlash)?.jeju ||
                              monthlyMap.get(selectedPeriodSlash)?.integrated
                            : region === 'average'
                              ? monthlyMap.get(selectedPeriodSlash)?.integrated ||
                                monthlyMap.get(selectedPeriodSlash)?.mainland
                              : monthlyMap.get(selectedPeriodSlash)?.mainland ||
                                monthlyMap.get(selectedPeriodSlash)?.integrated
                          )?.toFixed(2)}
                          원/kWh
                        </p>
                      </div>

                      <div className="flex items-center gap-1 p-1 bg-[#F3F5F8] rounded-xl">
                        {([12, 24] as const).map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setMonthlyChartRange(cnt)}
                            className={`min-h-[30px] px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                              monthlyChartRange === cnt
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {cnt}개월
                          </button>
                        ))}
                      </div>
                    </div>

                    <PriceChart
                      data={monthlyChartData}
                      activeIndex={monthlyActiveIdx}
                    />
                  </section>
                )}

                {/* Live API-Connected Realtime Power Supply Section */}
                <RealtimePowerSupplySection region={region} />

                {/* Market Benchmarks Card */}
                <section className="bg-white rounded-[24px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        연관 에너지 시장 지표
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                        REC 현물가 및 한계발전 연료 지표
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    <div className="pb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <Activity className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            REC 현물 시장 (신재생)
                          </div>
                          <div className="text-[11px] text-slate-400">
                            육지·제주 통합 평균
                          </div>
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        <div className="text-sm font-bold font-mono-num text-slate-900">
                          {SUPPLY_TELEMETRY.recSpotPrice.toLocaleString()} 원
                        </div>
                        <div className="text-[11px] font-semibold text-rose-600">
                          ▲ {SUPPLY_TELEMETRY.recDeltaPct}%
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                          <Flame className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            LNG 열량단가 지수
                          </div>
                          <div className="text-[11px] text-slate-400">
                            한계가격 결정 연료 지표
                          </div>
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        <div className="text-sm font-bold font-mono-num text-slate-900">
                          {SUPPLY_TELEMETRY.lngFuelIndex} pt
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-600">
                          ▼ {Math.abs(SUPPLY_TELEMETRY.lngDeltaPct)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('hourly')}
                      className="min-h-[44px] px-3 py-2 rounded-2xl bg-[#F3F5F8] hover:bg-slate-200/75 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                    >
                      24시간 시세표 보기
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('calculator')}
                      className="min-h-[44px] px-3 py-2 rounded-2xl bg-[#1E5EFF] hover:bg-blue-700 text-xs font-bold text-white transition-colors cursor-pointer"
                    >
                      예상 요금 계산하기
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'hourly' && (
            <HourlyTableView
              region={region}
              selectedRecord={activeRecord}
              prevRecord={prevRawRecord}
              highlightedHour={selectedHour ?? activeRecord.peakHour}
            />
          )}

          {activeTab === 'mix' && <EnergyMixView />}

          {activeTab === 'calculator' && (
            <CalculatorAlertsView
              region={region}
              currentSmp={activeRecord.weightedAvg}
              reservePct={SUPPLY_TELEMETRY.reservePct}
              selectedHours={activeRecord.hours}
            />
          )}
        </main>

        {/* Calendar Date Picker Sheet */}
        <DateCalendarSheet
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          selectedDate={activeRecord.date}
          onSelectDate={(d) => {
            setSelectedDate(d);
            setSelectedHour(null);
          }}
          minDate={minDate}
          maxDate={maxDate}
          availableDatesSet={availableDatesSet}
          getDayPreviewPrice={getDayPreviewPrice}
        />

        {/* Fixed Bottom Navigation Bar */}
        <nav
          aria-label="하단 주 메뉴"
          className={`fixed bottom-0 z-40 h-[62px] w-full bg-white/92 backdrop-blur-md border-t border-slate-200/80 grid grid-cols-4 items-center transition-all duration-200 ${
            wideMode ? 'md:max-w-4xl' : 'md:max-w-[430px]'
          }`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`h-full min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  active
                    ? 'text-[#1E5EFF]'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Icon className="w-[21px] h-[21px]" />
                <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
