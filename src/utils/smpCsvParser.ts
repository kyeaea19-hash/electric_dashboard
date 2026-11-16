export interface DailySmpRecord {
  date: string; // Always normalized "YYYY-MM-DD" when possible
  hours: number[]; // length 24 (01시 ~ 24시)
  max: number;
  min: number;
  weightedAvg: number;
  simpleAvg: number;
  peakHour: number; // 1..24
  minHour: number; // 1..24
  isCalibratedFromMonthly?: boolean;
  jejuAvg?: number;
  integratedAvg?: number;
}

export interface MonthlySmpRecord {
  period: string; // "YYYY/MM"
  mainland: number;
  jeju: number;
  integrated: number;
  blmp: number;
}

export type ParsedSmpResult =
  | {
      kind: 'daily-hourly';
      fileName: string;
      dailyRecords: DailySmpRecord[];
      minDate: string;
      maxDate: string;
    }
  | {
      kind: 'monthly';
      fileName: string;
      monthlyRecords: MonthlySmpRecord[];
      minDate: string;
      maxDate: string;
    };

export function decodeCsvBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('euc-kr').decode(bytes);
  }
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function detectDelimiter(headerLine: string): string {
  if (headerLine.includes('\t')) return '\t';
  if (headerLine.includes(',')) return ',';
  if (headerLine.includes(';')) return ';';
  return ',';
}

function toNum(val: string | undefined): number {
  if (!val) return NaN;
  const cleaned = val.replace(/,/g, '').replace(/[^0-9.-]/g, '');
  return Number.parseFloat(cleaned);
}

export function normalizeDateString(raw: string): string {
  const m = raw.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }
  return raw.trim();
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function shiftYmd(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(y, m - 1, d + deltaDays);
  return formatYmd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

export function formatKoreanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(y, m - 1, d);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}년 ${m}월 ${d}일 (${weekdays[dt.getDay()]})`;
}

// Normalized Korean intraday SMP diurnal weights (mean === 1.000)
const RAW_DIURNAL_WEIGHTS = [
  0.86, 0.82, 0.80, 0.79, 0.82, 0.88,
  0.95, 1.02, 1.08, 1.12, 1.06, 0.98,
  1.00, 1.10, 1.17, 1.22, 1.19, 1.15,
  1.09, 1.04, 1.01, 0.96, 0.91, 0.87,
];
const WEIGHT_MEAN =
  RAW_DIURNAL_WEIGHTS.reduce((s, w) => s + w, 0) / RAW_DIURNAL_WEIGHTS.length;
const KPX_DIURNAL_WEIGHTS = RAW_DIURNAL_WEIGHTS.map((w) => w / WEIGHT_MEAN);

/**
 * Generates a deterministic daily 24-hour SMP record for any calendar date (YYYY-MM-DD)
 * anchored to that month's exact KPX CSV data.
 */
export function buildRecordForCalendarDate(
  dateStr: string,
  monthlyMap: Map<string, MonthlySmpRecord>
): DailySmpRecord | null {
  const [yStr, mStr, dStr] = dateStr.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  if (!year || !month || !day) return null;

  const periodKey = `${year}/${String(month).padStart(2, '0')}`;
  const monthRec = monthlyMap.get(periodKey);
  if (!monthRec) return null;

  const baseMonthAvg =
    monthRec.mainland > 0 ? monthRec.mainland : monthRec.integrated;
  const jejuMonthAvg = monthRec.jeju > 0 ? monthRec.jeju : baseMonthAvg;
  const integratedMonthAvg =
    monthRec.integrated > 0 ? monthRec.integrated : baseMonthAvg;

  if (baseMonthAvg <= 0) return null;

  const dayOfWeek = new Date(year, month - 1, day).getDay(); // 0=Sun, 6=Sat
  const weekendFactor = dayOfWeek === 0 ? 0.955 : dayOfWeek === 6 ? 0.972 : 1.012;
  const dailyWave = Math.sin((day * 1.13 + month * 0.7) % (Math.PI * 2)) * 0.024;
  const dayFactor = weekendFactor + dailyWave;

  const dailyMean = baseMonthAvg * dayFactor;
  const peakShift = (day % 3) - 1; // subtly shifts peak between 15h-17h depending on day

  const hours = KPX_DIURNAL_WEIGHTS.map((w, idx) => {
    const shiftedIdx = Math.max(0, Math.min(23, idx + (idx >= 12 && idx <= 19 ? peakShift : 0)));
    const micro = Math.cos((day + 2) * (idx + 1) * 0.55) * 0.015;
    return Number((dailyMean * (KPX_DIURNAL_WEIGHTS[shiftedIdx] * 0.35 + w * 0.65 + micro)).toFixed(2));
  });

  const max = Math.max(...hours);
  const min = Math.min(...hours);
  const peakHour = hours.indexOf(max) + 1;
  const minHour = hours.indexOf(min) + 1;
  const simpleAvg = Number(
    (hours.reduce((s, v) => s + v, 0) / 24).toFixed(2)
  );
  const weightedAvg = Number((dailyMean * 1.012).toFixed(2));
  const jejuRatio = baseMonthAvg > 0 ? jejuMonthAvg / baseMonthAvg : 1;
  const intRatio = baseMonthAvg > 0 ? integratedMonthAvg / baseMonthAvg : 1;

  return {
    date: dateStr,
    hours,
    max,
    min,
    weightedAvg,
    simpleAvg,
    peakHour,
    minHour,
    isCalibratedFromMonthly: true,
    jejuAvg: Number((weightedAvg * jejuRatio).toFixed(2)),
    integratedAvg: Number((weightedAvg * intRatio).toFixed(2)),
  };
}

export function parseSmpCsv(text: string, fileName: string): ParsedSmpResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV 파일에 데이터가 충분하지 않습니다.');
  }

  const headerIdx = lines.findIndex((l) => l.includes('기간'));
  const startIdx = headerIdx >= 0 ? headerIdx : 0;
  const headerLine = lines[startIdx];
  const delimiter = detectDelimiter(headerLine);
  const headers = splitCsvLine(headerLine, delimiter).map((h) =>
    h.replace(/\s+/g, '')
  );

  // Format A: Daily 24-hour SMP [기간, 01시 ... 24시, 최대, 최소, 가중평균]
  const hasHourlyCols =
    headers.some((h) => h === '01시' || h === '1시') &&
    headers.some((h) => h === '24시');

  if (hasHourlyCols) {
    const dateCol = headers.findIndex((h) => h.includes('기간') || h.includes('일자'));
    const hourCols: number[] = [];
    for (let h = 1; h <= 24; h++) {
      const padded = `${String(h).padStart(2, '0')}시`;
      const unpadded = `${h}시`;
      const idx = headers.findIndex((col) => col === padded || col === unpadded);
      hourCols.push(idx);
    }
    const maxCol = headers.findIndex((h) => h.includes('최대'));
    const minCol = headers.findIndex((h) => h.includes('최소'));
    const weightedCol = headers.findIndex((h) => h.includes('가중평균') || h.includes('평균'));

    const dailyRecords: DailySmpRecord[] = [];

    for (let i = startIdx + 1; i < lines.length; i++) {
      const cells = splitCsvLine(lines[i], delimiter);
      const rawDate = cells[dateCol >= 0 ? dateCol : 0];
      if (!rawDate || !/\d/.test(rawDate)) continue;

      const hours = hourCols.map((colIdx) => {
        if (colIdx < 0) return NaN;
        return toNum(cells[colIdx]);
      });

      if (hours.some((v) => Number.isNaN(v))) continue;

      const computedMax = Math.max(...hours);
      const computedMin = Math.min(...hours);
      const peakHour = hours.indexOf(computedMax) + 1;
      const minHour = hours.indexOf(computedMin) + 1;
      const simpleAvg = Number(
        (hours.reduce((sum, v) => sum + v, 0) / hours.length).toFixed(2)
      );

      const maxVal =
        maxCol >= 0 && !Number.isNaN(toNum(cells[maxCol]))
          ? toNum(cells[maxCol])
          : computedMax;
      const minVal =
        minCol >= 0 && !Number.isNaN(toNum(cells[minCol]))
          ? toNum(cells[minCol])
          : computedMin;
      const weightedVal =
        weightedCol >= 0 && !Number.isNaN(toNum(cells[weightedCol]))
          ? toNum(cells[weightedCol])
          : simpleAvg;

      dailyRecords.push({
        date: normalizeDateString(rawDate),
        hours,
        max: Number(maxVal.toFixed(2)),
        min: Number(minVal.toFixed(2)),
        weightedAvg: Number(weightedVal.toFixed(2)),
        simpleAvg,
        peakHour,
        minHour,
        isCalibratedFromMonthly: false,
      });
    }

    if (dailyRecords.length === 0) {
      throw new Error('일별 24시간 SMP 행을 파싱하지 못했습니다.');
    }

    dailyRecords.sort((a, b) => b.date.localeCompare(a.date));

    return {
      kind: 'daily-hourly',
      fileName,
      dailyRecords,
      minDate: dailyRecords[dailyRecords.length - 1].date,
      maxDate: dailyRecords[0].date,
    };
  }

  // Format B: KPX Monthly SMP (기간,SMP,,,BLMP / ,육지,제주,통합)
  const monthlyRecords: MonthlySmpRecord[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], delimiter);
    const rawPeriod = cells[0];
    if (!rawPeriod || !/^\d{4}[./-]\d{2}/.test(rawPeriod)) continue;

    const period = rawPeriod.replace(/[.-]/g, '/').slice(0, 7);
    const mainland = toNum(cells[1]);
    const jeju = toNum(cells[2]);
    const integrated = toNum(cells[3]);
    const blmp = toNum(cells[4]);

    if (Number.isNaN(mainland) && Number.isNaN(integrated)) continue;

    monthlyRecords.push({
      period,
      mainland: Number.isNaN(mainland) ? 0 : Number(mainland.toFixed(2)),
      jeju: Number.isNaN(jeju) ? 0 : Number(jeju.toFixed(2)),
      integrated: Number.isNaN(integrated) ? 0 : Number(integrated.toFixed(2)),
      blmp: Number.isNaN(blmp) ? 0 : Number(blmp.toFixed(2)),
    });
  }

  if (monthlyRecords.length === 0) {
    throw new Error('지원되는 한국전력거래소 SMP CSV 형식이 아닙니다.');
  }

  monthlyRecords.sort((a, b) => b.period.localeCompare(a.period));

  const newest = monthlyRecords[0].period.split('/').map(Number);
  const oldest = monthlyRecords[monthlyRecords.length - 1].period
    .split('/')
    .map(Number);

  const maxDate = formatYmd(
    newest[0],
    newest[1],
    getDaysInMonth(newest[0], newest[1])
  );
  const minDate = formatYmd(oldest[0], oldest[1], 1);

  return {
    kind: 'monthly',
    fileName,
    monthlyRecords,
    minDate,
    maxDate,
  };
}
