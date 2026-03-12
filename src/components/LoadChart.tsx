import React, { useMemo } from "react";

type Entry = {
  id?: number | string;
  powderGrains: number;
  mv: number;
  sd: number;
  es: number;
};

const padding = { top: 12, right: 12, bottom: 36, left: 44 };
const width = 700;
const height = 320;

const colors = {
  mv: "#2563eb",
  sd: "#dc2626",
  es: "#059669",
};

const LoadChart: React.FC<{ data: Entry[] }> = ({ data }) => {
  const prepared = useMemo(() => {
    const arr = (data || []).map((d) => ({
      powderGrains: Number(d.powderGrains) || 0,
      mv: Number(d.mv) || 0,
      sd: Number(d.sd) || 0,
      es: Number(d.es) || 0,
      id: d.id,
    }));
    arr.sort((a, b) => a.powderGrains - b.powderGrains);

    if (arr.length === 0) return { points: [], mostStableIndex: -1 };

    // compute a composite stability score to find most stable point (unchanged logic)
    const mvVals = arr.map((r) => r.mv);
    const esVals = arr.map((r) => r.es);
    const sdVals = arr.map((r) => r.sd);
    const minMax = (vals: number[]) => ({
      min: Math.min(...vals),
      max: Math.max(...vals),
    });
    const mvMM = minMax(mvVals);
    const esMM = minMax(esVals);
    const sdMM = minMax(sdVals);
    const norm = (v: number, mm: { min: number; max: number }) => {
      const r = mm.max - mm.min || 1;
      return (v - mm.min) / r;
    };

    const points = arr.map((r) => {
      const nmv = norm(r.mv, mvMM);
      const nes = 1 - norm(r.es, esMM);
      const nsd = 1 - norm(r.sd, sdMM);
      const composite = nmv * 0.5 + nes * 0.25 + nsd * 0.25;
      return { ...r, composite };
    });

    const mostStableIndex = points.reduce((bestIdx, _p, idx, a) => {
      if (bestIdx === -1) return 0;
      return a[idx].composite > a[bestIdx].composite ? idx : bestIdx;
    }, -1);

    return { points, mostStableIndex };
  }, [data]);

  if (!prepared.points.length)
    return <div className="text-sm text-gray-600">No chart data</div>;

  const pts = prepared.points;
  const xVals = pts.map((p) => p.powderGrains);
  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals) || xMin + 1;

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const xToPx = (x: number) =>
    padding.left + ((x - xMin) / (xMax - xMin || 1)) * innerW;
  const yToPxNorm = (yNorm: number) => padding.top + (1 - yNorm) * innerH;

  // Normalize each series to 0-1 for plotting so lines overlay and are readable
  const mvVals = pts.map((p) => p.mv);
  const sdVals = pts.map((p) => p.sd);
  const esVals = pts.map((p) => p.es);
  const minMax = (vals: number[]) => ({
    min: Math.min(...vals),
    max: Math.max(...vals),
  });
  const mvMM = minMax(mvVals);
  const sdMM = minMax(sdVals);
  const esMM = minMax(esVals);
  const norm = (v: number, mm: { min: number; max: number }) =>
    (v - mm.min) / (mm.max - mm.min || 1);

  const mvNorm = pts.map((p) => norm(p.mv, mvMM));
  const sdNorm = pts.map((p) => 1 - norm(p.sd, sdMM));
  const esNorm = pts.map((p) => 1 - norm(p.es, esMM));

  const buildPathNorm = (valsNorm: number[]) =>
    valsNorm
      .map(
        (v, i) =>
          `${i === 0 ? "M" : "L"} ${xToPx(pts[i].powderGrains)} ${yToPxNorm(v)}`,
      )
      .join(" ");

  const mvPath = buildPathNorm(mvNorm);
  const sdPath = buildPathNorm(sdNorm);
  const esPath = buildPathNorm(esNorm);

  const maxIdx = prepared.mostStableIndex;

  // y ticks 0-1 (normalized)
  const ticks = 5;
  const tickVals = Array.from({ length: ticks }, (_, i) => i / (ticks - 1));

  return (
    <div className="mt-4 overflow-auto">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        {/* axes */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#e5e7eb"
        />
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#e5e7eb"
        />

        {/* normalized y ticks and labels */}
        {tickVals.map((t, idx) => {
          const y = yToPxNorm(t);
          return (
            <g key={idx}>
              <line
                x1={padding.left - 6}
                x2={padding.left}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                fontSize={11}
                textAnchor="end"
                fill="#6b7280"
              >
                {t.toFixed(2)}
              </text>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="#f3f4f6"
              />
            </g>
          );
        })}

        {/* x labels */}
        {pts.map((p, i) => (
          <text
            key={i}
            x={xToPx(p.powderGrains)}
            y={height - padding.bottom + 14}
            fontSize={11}
            textAnchor="middle"
            fill="#374151"
          >
            {p.powderGrains}
          </text>
        ))}

        {/* normalized lines */}
        <path
          d={mvPath}
          fill="none"
          stroke={colors.mv}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={sdPath}
          fill="none"
          stroke={colors.sd}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={esPath}
          fill="none"
          stroke={colors.es}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* points for each series (using normalized y) */}
        {pts.map((p, i) => (
          <g key={p.id ?? i}>
            <circle
              cx={xToPx(p.powderGrains)}
              cy={yToPxNorm(mvNorm[i])}
              r={i === maxIdx ? 6 : 4}
              fill={i === maxIdx ? colors.mv : "#fff"}
              stroke={colors.mv}
              strokeWidth={1.5}
            >
              <title>MV {p.mv}</title>
            </circle>
            <circle
              cx={xToPx(p.powderGrains)}
              cy={yToPxNorm(sdNorm[i])}
              r={i === maxIdx ? 6 : 4}
              fill={i === maxIdx ? colors.sd : "#fff"}
              stroke={colors.sd}
              strokeWidth={1.5}
            >
              <title>SD {p.sd}</title>
            </circle>
            <circle
              cx={xToPx(p.powderGrains)}
              cy={yToPxNorm(esNorm[i])}
              r={i === maxIdx ? 6 : 4}
              fill={i === maxIdx ? colors.es : "#fff"}
              stroke={colors.es}
              strokeWidth={1.5}
            >
              <title>ES {p.es}</title>
            </circle>
          </g>
        ))}
      </svg>

      <div className="flex items-center gap-4 mt-2 text-sm">
        <div className="flex items-center gap-2">
          <span
            style={{
              width: 12,
              height: 12,
              background: colors.mv,
              display: "inline-block",
            }}
          />{" "}
          MV ({mvMM.min.toFixed(0)}–{mvMM.max.toFixed(0)})
        </div>
        <div className="flex items-center gap-2">
          <span
            style={{
              width: 12,
              height: 12,
              background: colors.sd,
              display: "inline-block",
            }}
          />{" "}
          SD ({sdMM.min.toFixed(2)}–{sdMM.max.toFixed(2)})
        </div>
        <div className="flex items-center gap-2">
          <span
            style={{
              width: 12,
              height: 12,
              background: colors.es,
              display: "inline-block",
            }}
          />{" "}
          ES ({esMM.min.toFixed(2)}–{esMM.max.toFixed(2)})
        </div>
        <div className="ml-auto text-gray-600">
          Most stable: Powder {pts[maxIdx]?.powderGrains} gr
        </div>
      </div>
    </div>
  );
};

export default LoadChart;
