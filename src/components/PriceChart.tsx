import React, { useMemo, useRef, useState } from 'react';

export interface ChartDatum {
  label: string;
  subLabel?: string;
  value: number;
  reservePct: number;
}

interface PriceChartProps {
  data: ChartDatum[];
  accentColor?: string;
  unit?: string;
  activeIndex?: number | null;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  data,
  accentColor = '#1E5EFF',
  unit = '원/kWh',
  activeIndex = null,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const width = 360;
  const height = 168;
  const padLeft = 10;
  const padRight = 10;
  const padTop = 22;
  const padBottom = 26;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const { minVal, maxVal, avgVal, coords, linePath, areaPath, avgY } = useMemo(() => {
    if (data.length === 0) {
      return {
        minVal: 0,
        maxVal: 0,
        avgVal: 0,
        coords: [] as Array<{ x: number; y: number }>,
        linePath: '',
        areaPath: '',
        avgY: padTop + plotH / 2,
      };
    }

    const values = data.map((d) => d.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const avg = values.reduce((acc, v) => acc + v, 0) / values.length;
    const spread = Math.max(rawMax - rawMin, 8);
    const min = rawMin - spread * 0.16;
    const max = rawMax + spread * 0.16;

    const pts = data.map((d, idx) => {
      const x =
        data.length === 1
          ? padLeft + plotW / 2
          : padLeft + (idx / (data.length - 1)) * plotW;
      const y = padTop + ((max - d.value) / (max - min)) * plotH;
      return { x, y };
    });

    // Smooth cubic bezier path
    let path = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cpX = (curr.x + next.x) / 2;
      path += ` C ${cpX.toFixed(2)} ${curr.y.toFixed(2)}, ${cpX.toFixed(2)} ${next.y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
    }

    const last = pts[pts.length - 1];
    const first = pts[0];
    const bottomY = padTop + plotH;
    const area = `${path} L ${last.x.toFixed(2)} ${bottomY} L ${first.x.toFixed(2)} ${bottomY} Z`;
    const avgLineY = padTop + ((max - avg) / (max - min)) * plotH;

    return {
      minVal: rawMin,
      maxVal: rawMax,
      avgVal: avg,
      coords: pts,
      linePath: path,
      areaPath: area,
      avgY: avgLineY,
    };
  }, [data, plotH, plotW]);

  const displayIdx = hoveredIdx !== null ? hoveredIdx : activeIndex;
  const activePoint =
    displayIdx !== null && data[displayIdx] ? data[displayIdx] : null;
  const activeCoord =
    displayIdx !== null && coords[displayIdx] ? coords[displayIdx] : null;

  const handlePointerMove = (clientX: number) => {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * width;
    const clamped = Math.max(padLeft, Math.min(width - padRight, relX));
    const ratio = (clamped - padLeft) / plotW;
    const idx = Math.round(ratio * (data.length - 1));
    setHoveredIdx(Math.max(0, Math.min(data.length - 1, idx)));
  };

  // Pick 4-5 evenly spaced x-axis labels
  const labelIndices = useMemo(() => {
    if (data.length <= 6) return data.map((_, i) => i);
    const step = Math.floor((data.length - 1) / 4);
    return [0, step, step * 2, step * 3, data.length - 1];
  }, [data]);

  return (
    <div className="w-full select-none">
      {/* Interactive Scrub Header */}
      <div className="flex items-center justify-between text-xs mb-2 min-h-[20px]">
        {activePoint ? (
          <div className="flex items-center gap-2 text-slate-700 font-medium tabular-nums">
            <span className="font-semibold text-slate-900">
              {activePoint.label}
              {activePoint.subLabel ? ` (${activePoint.subLabel})` : ''}
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="font-mono-num font-bold text-[#1E5EFF]">
              {activePoint.value.toFixed(2)} {unit}
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-slate-500">예비율 {activePoint.reservePct.toFixed(1)}%</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-500 tabular-nums">
            <span>평균 {avgVal.toFixed(2)}</span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>최고 {maxVal.toFixed(2)}</span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>최저 {minVal.toFixed(2)}</span>
          </div>
        )}
        <span className="text-[11px] text-slate-400 shrink-0">터치하여 탐색</span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto touch-pan-y cursor-crosshair overflow-visible"
        onMouseMove={(e) => handlePointerMove(e.clientX)}
        onMouseLeave={() => setHoveredIdx(null)}
        onTouchStart={(e) => {
          if (e.touches[0]) handlePointerMove(e.touches[0].clientX);
        }}
        onTouchMove={(e) => {
          if (e.touches[0]) handlePointerMove(e.touches[0].clientX);
        }}
        onTouchEnd={() => setHoveredIdx(null)}
        role="img"
        aria-label="시간대별 전기 시세 추이 차트"
      >
        <defs>
          <linearGradient id="smpAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Horizontal dashed average line */}
        <line
          x1={padLeft}
          y1={avgY}
          x2={width - padRight}
          y2={avgY}
          stroke="#CBD5E1"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#smpAreaGrad)" />}

        {/* Main line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={accentColor}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Active crosshair + dot */}
        {activeCoord && (
          <g>
            <line
              x1={activeCoord.x}
              y1={padTop - 4}
              x2={activeCoord.x}
              y2={padTop + plotH}
              stroke="#94A3B8"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle
              cx={activeCoord.x}
              cy={activeCoord.y}
              r="7"
              fill={accentColor}
              fillOpacity="0.16"
            />
            <circle
              cx={activeCoord.x}
              cy={activeCoord.y}
              r="4"
              fill="#FFFFFF"
              stroke={accentColor}
              strokeWidth="2.5"
            />
          </g>
        )}

        {/* X-Axis Labels */}
        {labelIndices.map((idx) => {
          const pt = coords[idx];
          const item = data[idx];
          if (!pt || !item) return null;
          return (
            <text
              key={`${item.label}-${idx}`}
              x={pt.x}
              y={height - 4}
              textAnchor={
                idx === 0 ? 'start' : idx === data.length - 1 ? 'end' : 'middle'
              }
              className="fill-slate-400 text-[10px] font-medium tabular-nums"
            >
              {item.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
