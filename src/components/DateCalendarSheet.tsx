import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatYmd, getDaysInMonth } from '../utils/smpCsvParser';

interface DateCalendarSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  minDate: string; // YYYY-MM-DD
  maxDate: string; // YYYY-MM-DD
  /** If provided (from daily-hourly CSV), only dates in this set are selectable */
  availableDatesSet?: Set<string> | null;
  /** Optional helper to preview daily avg price inside calendar cells */
  getDayPreviewPrice?: (dateStr: string) => number | null;
}

const WEEKDAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토'];

export const DateCalendarSheet: React.FC<DateCalendarSheetProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
  availableDatesSet = null,
  getDayPreviewPrice,
}) => {
  const [viewYear, setViewYear] = useState<number>(() => {
    const [y] = selectedDate.split('-').map(Number);
    return y || 2026;
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const [, m] = selectedDate.split('-').map(Number);
    return m || 9;
  });

  useEffect(() => {
    if (isOpen) {
      const [y, m] = selectedDate.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m);
      }
    }
  }, [isOpen, selectedDate]);

  const { minYear, maxYear } = useMemo(() => {
    const minY = Number(minDate.split('-')[0]) || 2001;
    const maxY = Number(maxDate.split('-')[0]) || 2026;
    return { minYear: minY, maxYear: maxY };
  }, [minDate, maxDate]);

  const yearOptions = useMemo(() => {
    const arr: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      arr.push(y);
    }
    return arr;
  }, [minYear, maxYear]);

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();
    const daysCount = getDaysInMonth(viewYear, viewMonth);
    const cells: Array<{ day: number | null; dateStr: string | null }> = [];

    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ day: null, dateStr: null });
    }
    for (let d = 1; d <= daysCount; d++) {
      cells.push({
        day: d,
        dateStr: formatYmd(viewYear, viewMonth, d),
      });
    }
    return cells;
  }, [viewYear, viewMonth]);

  if (!isOpen) return null;

  const canGoPrevMonth =
    viewYear > minYear ||
    (viewYear === minYear &&
      viewMonth > (Number(minDate.split('-')[1]) || 1));
  const canGoNextMonth =
    viewYear < maxYear ||
    (viewYear === maxYear &&
      viewMonth < (Number(maxDate.split('-')[1]) || 12));

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNextMonth) return;
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const isDateAvailable = (dateStr: string) => {
    if (availableDatesSet) {
      return availableDatesSet.has(dateStr);
    }
    return dateStr >= minDate && dateStr <= maxDate;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-[2px] px-0 sm:px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="날짜 달력 선택"
    >
      <div
        className="w-full max-w-[430px] bg-white rounded-t-[28px] sm:rounded-[28px] p-5 pb-6 shadow-[0_-8px_32px_rgba(15,23,42,0.14)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle (Mobile Sheet Affordance) */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">날짜 선택</h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              조회 가능 기간: {minDate} ~ {maxDate}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="달력 닫기"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Year & Month Navigator */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={!canGoPrevMonth}
            aria-label="이전 달"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl bg-[#F3F5F8] text-slate-700 hover:bg-slate-200/70 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <select
              aria-label="연도 선택"
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="min-h-[40px] px-3 py-1.5 bg-[#F3F5F8] rounded-xl text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1E5EFF] cursor-pointer"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>

            <select
              aria-label="월 선택"
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="min-h-[40px] px-3 py-1.5 bg-[#F3F5F8] rounded-xl text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1E5EFF] cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={!canGoNextMonth}
            aria-label="다음 달"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl bg-[#F3F5F8] text-slate-700 hover:bg-slate-200/70 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
          {WEEKDAY_HEADERS.map((wd, idx) => (
            <div
              key={wd}
              className={`text-[11px] font-bold py-1 ${
                idx === 0
                  ? 'text-rose-500'
                  : idx === 6
                    ? 'text-[#1E5EFF]'
                    : 'text-slate-400'
              }`}
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((cell, idx) => {
            if (!cell.day || !cell.dateStr) {
              return <div key={`empty-${idx}`} className="h-[46px]" />;
            }

            const dateStr = cell.dateStr;
            const available = isDateAvailable(dateStr);
            const isSelected = dateStr === selectedDate;
            const dayOfWeek = idx % 7;
            const previewPrice =
              available && getDayPreviewPrice ? getDayPreviewPrice(dateStr) : null;

            return (
              <button
                key={dateStr}
                type="button"
                disabled={!available}
                onClick={() => {
                  onSelectDate(dateStr);
                  onClose();
                }}
                className={`min-h-[46px] rounded-2xl flex flex-col items-center justify-center transition-all tabular-nums ${
                  isSelected
                    ? 'bg-[#1E5EFF] text-white shadow-sm cursor-pointer'
                    : available
                      ? 'hover:bg-[#F3F5F8] active:scale-95 cursor-pointer'
                      : 'opacity-25 cursor-not-allowed'
                }`}
              >
                <span
                  className={`text-xs font-bold leading-tight ${
                    isSelected
                      ? 'text-white'
                      : dayOfWeek === 0
                        ? 'text-rose-600'
                        : dayOfWeek === 6
                          ? 'text-[#1E5EFF]'
                          : 'text-slate-800'
                  }`}
                >
                  {cell.day}
                </span>
                {previewPrice !== null && (
                  <span
                    className={`text-[9px] font-mono-num leading-none mt-0.5 ${
                      isSelected ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {Math.round(previewPrice)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Quick Jump */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            날짜 아래 숫자는 일평균(원/kWh)
          </span>
          <button
            type="button"
            onClick={() => {
              onSelectDate(maxDate);
              onClose();
            }}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#F3F5F8] hover:bg-slate-200/70 text-xs font-bold text-slate-800 transition-colors cursor-pointer shrink-0"
          >
            최신 날짜 ({maxDate})
          </button>
        </div>
      </div>
    </div>
  );
};
