const LAYERS: Array<[string, number]> = [
  ['deco-accent', 0],
  ['deco-light', 34],
  ['deco-accent', 68],
  ['deco-dark', 102],
];

/** Диагональные полосы в правом нижнем углу */
export function Deco() {
  return (
    <svg className="deco" viewBox="0 0 960 750" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="deco-gradient" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--deco-dark-from)' }} />
          <stop offset="1" style={{ stopColor: 'var(--deco-dark-to)' }} />
        </linearGradient>
      </defs>
      {LAYERS.map(([cls, o]) => (
        <polygon
          key={`${cls}-${o}`}
          className={cls}
          points={`${o},750 ${o + 960},0 ${o + 1400},0 ${o + 1400},750`}
        />
      ))}
    </svg>
  );
}
