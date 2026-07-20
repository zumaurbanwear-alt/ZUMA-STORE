// Petite courbe de ventes en SVG pur — évite d'ajouter une dépendance
// (recharts) que Vercel ne peut pas résoudre sans passer par package.json.
export const SalesChart = ({ data }: { data: { date: string; total: number }[] }) => {
  const width = 600;
  const height = 180;
  const padding = 24;

  const max = Math.max(1, ...data.map((d) => d.total));
  const count = Math.max(1, data.length - 1);

  const getX = (i: number) =>
    padding + (i / count) * (width - padding * 2);

  const getY = (v: number) =>
    height - padding - (v / max) * (height - padding * 2);

  const points = data.map((d, i) => `${getX(i)},${getY(d.total)}`);
  const pathD = points.length ? `M${points.join(" L")}` : "";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height: 180 }}
      preserveAspectRatio="none"
    >
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#e5e5e5"
      />

      {pathD && (
        <path d={pathD} fill="none" stroke="#111111" strokeWidth={2} />
      )}

      {data.map((d, i) =>
        i % 5 === 0 ? (
          <text
            key={i}
            x={getX(i)}
            y={height - 6}
            fontSize="8"
            textAnchor="middle"
            fill="#9CA3AF"
          >
            {d.date}
          </text>
        ) : null
      )}
    </svg>
  );
};
