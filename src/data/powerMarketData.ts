export type MarketRegion = 'mainland' | 'jeju' | 'average';
export type ChartTimeframe = '24h' | '7d' | '30d';
export type LoadTier = 'off-peak' | 'mid-peak' | 'on-peak';

export interface HourlySmpPoint {
  hour: number;
  label: string;
  mainland: number;
  jeju: number;
  average: number;
  prevMainland: number;
  prevJeju: number;
  loadMw: number;
  reservePct: number;
  loadTier: LoadTier;
  marginalFuel: string;
}

export interface TrendPoint {
  label: string;
  subLabel: string;
  mainland: number;
  jeju: number;
  average: number;
  reservePct: number;
}

export interface EnergySourceItem {
  id: string;
  name: string;
  mw: number;
  sharePct: number;
  color: string;
  carbonIntensity: number; // gCO2/kWh
  note: string;
}

export interface TariffPreset {
  id: string;
  name: string;
  baseFee: number; // 원
  multiplier: number; // retail factor over wholesale SMP or unit surcharge
  fixedDistributionFee: number; // 원/kWh
  description: string;
}

export const REGION_LABELS: Record<MarketRegion, string> = {
  mainland: '육지',
  jeju: '제주',
  average: '전국 평균',
};

export const LOAD_TIER_LABELS: Record<LoadTier, string> = {
  'off-peak': '경부하',
  'mid-peak': '중간부하',
  'on-peak': '최대부하',
};

export const HOURLY_SMP_DATA: HourlySmpPoint[] = [
  { hour: 1, label: '01시', mainland: 121.4, jeju: 138.9, average: 123.1, prevMainland: 124.8, prevJeju: 141.2, loadMw: 54200, reservePct: 24.8, loadTier: 'off-peak', marginalFuel: 'LNG 복합' },
  { hour: 2, label: '02시', mainland: 118.2, jeju: 134.5, average: 119.8, prevMainland: 121.0, prevJeju: 137.4, loadMw: 51800, reservePct: 27.2, loadTier: 'off-peak', marginalFuel: '유연탄·LNG' },
  { hour: 3, label: '03시', mainland: 116.8, jeju: 131.2, average: 118.2, prevMainland: 119.5, prevJeju: 135.8, loadMw: 50400, reservePct: 28.9, loadTier: 'off-peak', marginalFuel: '유연탄·LNG' },
  { hour: 4, label: '04시', mainland: 115.6, jeju: 129.8, average: 117.0, prevMainland: 118.9, prevJeju: 134.1, loadMw: 49900, reservePct: 29.4, loadTier: 'off-peak', marginalFuel: '유연탄·LNG' },
  { hour: 5, label: '05시', mainland: 119.4, jeju: 133.4, average: 120.8, prevMainland: 122.1, prevJeju: 136.9, loadMw: 51600, reservePct: 27.6, loadTier: 'off-peak', marginalFuel: 'LNG 복합' },
  { hour: 6, label: '06시', mainland: 126.9, jeju: 142.1, average: 128.4, prevMainland: 128.5, prevJeju: 144.0, loadMw: 55900, reservePct: 23.1, loadTier: 'off-peak', marginalFuel: 'LNG 복합' },
  { hour: 7, label: '07시', mainland: 136.2, jeju: 151.6, average: 137.7, prevMainland: 139.0, prevJeju: 153.2, loadMw: 61300, reservePct: 19.4, loadTier: 'off-peak', marginalFuel: 'LNG 복합' },
  { hour: 8, label: '08시', mainland: 144.8, jeju: 159.4, average: 146.3, prevMainland: 147.2, prevJeju: 162.8, loadMw: 66800, reservePct: 16.8, loadTier: 'off-peak', marginalFuel: 'LNG 복합' },
  { hour: 9, label: '09시', mainland: 152.3, jeju: 164.8, average: 153.5, prevMainland: 155.1, prevJeju: 168.4, loadMw: 71400, reservePct: 14.9, loadTier: 'mid-peak', marginalFuel: 'LNG 복합' },
  { hour: 10, label: '10시', mainland: 156.9, jeju: 162.1, average: 157.4, prevMainland: 158.6, prevJeju: 165.0, loadMw: 73900, reservePct: 14.1, loadTier: 'on-peak', marginalFuel: 'LNG 복합' },
  { hour: 11, label: '11시', mainland: 149.4, jeju: 148.6, average: 149.3, prevMainland: 152.8, prevJeju: 154.2, loadMw: 72100, reservePct: 15.2, loadTier: 'on-peak', marginalFuel: '태양광·LNG' },
  { hour: 12, label: '12시', mainland: 138.7, jeju: 136.2, average: 138.5, prevMainland: 143.4, prevJeju: 145.6, loadMw: 69400, reservePct: 16.5, loadTier: 'mid-peak', marginalFuel: '태양광·LNG' },
  { hour: 13, label: '13시', mainland: 141.2, jeju: 139.4, average: 141.0, prevMainland: 145.9, prevJeju: 147.8, loadMw: 70600, reservePct: 15.9, loadTier: 'on-peak', marginalFuel: '태양광·LNG' },
  { hour: 14, label: '14시', mainland: 154.6, jeju: 152.9, average: 154.4, prevMainland: 159.2, prevJeju: 160.4, loadMw: 73200, reservePct: 14.4, loadTier: 'on-peak', marginalFuel: 'LNG 복합' },
  { hour: 15, label: '15시', mainland: 162.8, jeju: 168.5, average: 163.4, prevMainland: 166.1, prevJeju: 171.0, loadMw: 74800, reservePct: 13.8, loadTier: 'on-peak', marginalFuel: 'LNG 복합' },
  { hour: 16, label: '16시', mainland: 168.4, jeju: 178.2, average: 169.4, prevMainland: 171.2, prevJeju: 181.5, loadMw: 75600, reservePct: 13.4, loadTier: 'on-peak', marginalFuel: 'LNG 첨두' },
  { hour: 17, label: '17시', mainland: 164.2, jeju: 184.6, average: 166.2, prevMainland: 168.4, prevJeju: 186.2, loadMw: 74100, reservePct: 14.2, loadTier: 'mid-peak', marginalFuel: 'LNG 첨두' },
  { hour: 18, label: '18시', mainland: 158.9, jeju: 189.4, average: 161.9, prevMainland: 163.1, prevJeju: 192.0, loadMw: 71900, reservePct: 14.9, loadTier: 'on-peak', marginalFuel: 'LNG·유류' },
  { hour: 19, label: '19시', mainland: 151.4, jeju: 182.1, average: 154.5, prevMainland: 156.0, prevJeju: 184.7, loadMw: 69800, reservePct: 15.6, loadTier: 'on-peak', marginalFuel: 'LNG 복합' },
  { hour: 20, label: '20시', mainland: 146.3, jeju: 173.8, average: 149.1, prevMainland: 150.2, prevJeju: 176.4, loadMw: 67900, reservePct: 16.4, loadTier: 'on-peak', marginalFuel: 'LNG 복합' },
  { hour: 21, label: '21시', mainland: 142.85, jeju: 166.4, average: 145.2, prevMainland: 147.05, prevJeju: 169.8, loadMw: 65800, reservePct: 17.5, loadTier: 'on-peak', marginalFuel: 'LNG 복합' },
  { hour: 22, label: '22시', mainland: 137.5, jeju: 157.9, average: 139.5, prevMainland: 141.2, prevJeju: 161.3, loadMw: 62900, reservePct: 19.2, loadTier: 'mid-peak', marginalFuel: 'LNG 복합' },
  { hour: 23, label: '23시', mainland: 131.2, jeju: 149.6, average: 133.0, prevMainland: 134.8, prevJeju: 152.5, loadMw: 59100, reservePct: 21.6, loadTier: 'off-peak', marginalFuel: 'LNG 복합' },
  { hour: 24, label: '24시', mainland: 125.4, jeju: 142.8, average: 127.1, prevMainland: 128.9, prevJeju: 145.4, loadMw: 56200, reservePct: 23.4, loadTier: 'off-peak', marginalFuel: 'LNG 복합' },
];

export const SEVEN_DAY_TREND: TrendPoint[] = [
  { label: '11.09', subLabel: '월', mainland: 145.8, jeju: 161.2, average: 147.3, reservePct: 16.2 },
  { label: '11.10', subLabel: '화', mainland: 148.2, jeju: 164.5, average: 149.8, reservePct: 15.1 },
  { label: '11.11', subLabel: '수', mainland: 151.4, jeju: 169.1, average: 153.2, reservePct: 14.3 },
  { label: '11.12', subLabel: '목', mainland: 146.9, jeju: 163.8, average: 148.6, reservePct: 15.8 },
  { label: '11.13', subLabel: '금', mainland: 144.3, jeju: 158.9, average: 145.8, reservePct: 16.9 },
  { label: '11.14', subLabel: '토', mainland: 138.6, jeju: 152.4, average: 140.0, reservePct: 19.4 },
  { label: '11.15', subLabel: '오늘', mainland: 142.85, jeju: 156.9, average: 144.3, reservePct: 17.5 },
];

export const THIRTY_DAY_TREND: TrendPoint[] = [
  { label: '10.17', subLabel: '4주 전', mainland: 134.2, jeju: 149.5, average: 135.7, reservePct: 20.1 },
  { label: '10.21', subLabel: '10월 3주', mainland: 137.8, jeju: 152.1, average: 139.2, reservePct: 19.3 },
  { label: '10.25', subLabel: '10월 4주', mainland: 141.5, jeju: 155.8, average: 142.9, reservePct: 18.0 },
  { label: '10.29', subLabel: '10월 말', mainland: 139.9, jeju: 154.0, average: 141.3, reservePct: 18.6 },
  { label: '11.02', subLabel: '11월 1주', mainland: 143.6, jeju: 159.4, average: 145.2, reservePct: 16.8 },
  { label: '11.06', subLabel: '11월 2주', mainland: 147.1, jeju: 163.2, average: 148.7, reservePct: 15.5 },
  { label: '11.10', subLabel: '이번 주', mainland: 148.2, jeju: 164.5, average: 149.8, reservePct: 15.1 },
  { label: '11.15', subLabel: '오늘', mainland: 142.85, jeju: 156.9, average: 144.3, reservePct: 17.5 },
];

export const ENERGY_MIX_DATA: EnergySourceItem[] = [
  {
    id: 'nuclear',
    name: '원자력',
    mw: 21450,
    sharePct: 32.6,
    color: '#1E5EFF',
    carbonIntensity: 12,
    note: '기저부하 안정 공급 · 가동률 88.4%',
  },
  {
    id: 'coal',
    name: '석탄(유연탄)',
    mw: 18120,
    sharePct: 27.5,
    color: '#475569',
    carbonIntensity: 820,
    note: '중간 기저부하 · 감축 운전 적용 중',
  },
  {
    id: 'lng',
    name: 'LNG 복합',
    mw: 16940,
    sharePct: 25.8,
    color: '#0EA5E9',
    carbonIntensity: 410,
    note: '현재 SMP 결정 주력 발전원',
  },
  {
    id: 'renewable',
    name: '태양광·풍력',
    mw: 6820,
    sharePct: 10.4,
    color: '#10B981',
    carbonIntensity: 24,
    note: '정오 피크 대비 일몰 후 출력 감소',
  },
  {
    id: 'hydro',
    name: '양수·기타',
    mw: 2470,
    sharePct: 3.7,
    color: '#F59E0B',
    carbonIntensity: 32,
    note: '저녁 피크 부하 대응 예비 출력',
  },
];

export const TARIFF_PRESETS: TariffPreset[] = [
  {
    id: 'residential',
    name: '주택용 (저압)',
    baseFee: 1600,
    multiplier: 0.78,
    fixedDistributionFee: 38.4,
    description: '가정용 누진 2구간 평균 단가 반영',
  },
  {
    id: 'ev',
    name: '전기차 충전',
    baseFee: 0,
    multiplier: 1.05,
    fixedDistributionFee: 174.0,
    description: '완속·급속 공용 충전기 실시간 연동 가정',
  },
  {
    id: 'commercial',
    name: '일반용 (갑)',
    baseFee: 6160,
    multiplier: 0.92,
    fixedDistributionFee: 44.2,
    description: '소규모 상가·오피스 표준 부하 기준',
  },
  {
    id: 'industrial',
    name: '산업용 (을)',
    baseFee: 8320,
    multiplier: 1.02,
    fixedDistributionFee: 36.8,
    description: '계시별(경·중간·최대부하) 차등 단가 반영',
  },
];

export const SUPPLY_TELEMETRY = {
  supplyCapacityMw: 78950,
  currentDemandMw: 65800,
  reserveMw: 13150,
  reservePct: 17.5,
  peakForecastMw: 75600,
  peakForecastHour: '16시',
  recSpotPrice: 76400,
  recDeltaPct: 1.24,
  lngFuelIndex: 118.4,
  lngDeltaPct: -0.65,
};

export function getRegionPrice(point: HourlySmpPoint | TrendPoint, region: MarketRegion): number {
  return point[region];
}
