import React, { useMemo, useRef } from 'react';

// --- 定数定義 ---
const SVG_WIDTH = 1000;
const SVG_HEIGHT = 400;
const PADDING = { top: 40, right: 50, bottom: 50, left: 60 };
const CHART_WIDTH = SVG_WIDTH - PADDING.left - PADDING.right;
const CHART_HEIGHT = SVG_HEIGHT - PADDING.top - PADDING.bottom;

// --- ヘルパーコンポーネント ---

const AxesAndGrid = ({ xScale, yScale, yTicks, xTicks }) => (
  <g className="text-slate-500 text-xs pointer-events-none">
    {/* Y軸 (スコア差) */}
    <g className="y-axis">
      {yTicks.map((tick) => (
        <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
          <line x2={CHART_WIDTH} className="stroke-current opacity-10" />
          <text x="-10" dy="0.32em" textAnchor="end" className="fill-current">
            {tick.toLocaleString()}
          </text>
        </g>
      ))}
    </g>

    {/* X軸 (試合時間) */}
    <g className="x-axis" transform={`translate(0, ${CHART_HEIGHT})`}>
      {xTicks.map((tick) => (
        <g key={tick} transform={`translate(${xScale(tick)}, 0)`}>
          <line y2="6" className="stroke-current" />
          <text y="20" textAnchor="middle" className="fill-current">
            {tick}
          </text>
        </g>
      ))}
      <text x={CHART_WIDTH / 2} y="40" textAnchor="middle" className="fill-current text-sm">
        試合時間 (分)
      </text>
    </g>

    {/* Y=0 の中央線 */}
    <line
      x1="0"
      y1={yScale(0)}
      x2={CHART_WIDTH}
      y2={yScale(0)}
      className="stroke-slate-400 stroke-dasharray-2"
      strokeDasharray="3 3"
    />
  </g>
);

const EventMarker = ({ event, xScale, yScale, mainPlayerColor, opponentPlayerColor, mainPlayerId, opponentPlayerId }) => {
  const x = xScale(event.time);
  const y = yScale(0); // イベントは中央線上に表示

  if (event.type === 'KILL') {
    // キルしたプレイヤーに応じて色を決定
    const color = event.killerId === mainPlayerId ? mainPlayerColor
                : event.killerId === opponentPlayerId ? opponentPlayerColor
                : '#9ca3af'; // gray-400 for others (e.g. minions, turrets)
    return (
      <g transform={`translate(${x}, ${y})`} className="cursor-pointer group">
        <circle r="5" fill={color} />
        <text y="-10" textAnchor="middle" className="text-xs fill-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
          キル
        </text>
      </g>
    );
  }

  if (event.type === 'OBJECTIVE') {
        // 破壊したプレイヤーに応じて色を決定
    const color = event.killerId === mainPlayerId ? mainPlayerColor
                : event.killerId === opponentPlayerId ? opponentPlayerColor : '#9ca3af';
    return (
      <g transform={`translate(${x}, ${y})`} className="cursor-pointer group">
        <rect x="-4" y="-4" width="8" height="8" fill={color} />
        <text y="-10" textAnchor="middle" className="text-xs fill-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
          {event.objectiveType.includes('TOWER') ? 'タワー' : 'エピック'}
        </text>
      </g>
    );
  }

  return null;
};

const ScoreChart = ({
  chartData,
  gameEvents,
  showKillEvents,
  showObjectEvents,
  onPointClick,
  mainPlayerColor, // イベントマーカーで使用
  opponentPlayerColor, // イベントマーカーで使用
  mainPlayerId,
  opponentPlayerId,
}) => {
  const svgRef = useRef(null);

  const { xScale, yScale, linePath, areaAbovePath, areaBelowPath, yTicks, xTicks, maxTime } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { xScale: () => 0, yScale: () => 0, linePath: '', areaAbovePath: '', areaBelowPath: '', yTicks: [], xTicks: [], maxTime: 0 };
    }

    const maxTime = Math.max(...chartData.map(d => d.time), 1);
    const maxScoreAbs = Math.max(...chartData.map(d => Math.abs(d.scoreDifference)), 1000);

    const xScale = (time) => (time / maxTime) * CHART_WIDTH;
    const yScale = (score) => CHART_HEIGHT / 2 - (score / maxScoreAbs) * (CHART_HEIGHT / 2);

    const lineGenerator = (d) => `${xScale(d.time)},${yScale(d.scoreDifference)}`;
    const linePath = `M ${chartData.map(lineGenerator).join(' L ')}`;

    const yZero = yScale(0);
    const areaAbovePath = `M ${lineGenerator(chartData[0])} L ${chartData.slice(1).map(lineGenerator).join(' L ')} L ${xScale(maxTime)},${yZero} L ${xScale(0)},${yZero} Z`;
    const areaBelowPath = `M ${lineGenerator(chartData[0])} L ${chartData.slice(1).map(lineGenerator).join(' L ')} L ${xScale(maxTime)},${yZero} L ${xScale(0)},${yZero} Z`;

    const yTickCount = 5;
    const yTicks = Array.from({ length: yTickCount * 2 + 1 }, (_, i) => {
      const score = maxScoreAbs - (i * maxScoreAbs) / yTickCount;
      return Math.round(score / 100) * 100;
    });

    const xTickCount = Math.floor(maxTime / 5);
    const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => i * 5);

    return { xScale, yScale, linePath, areaAbovePath, areaBelowPath, yTicks, xTicks, maxTime };
  }, [chartData]);

  const handleClick = (event) => {
    if (!svgRef.current || chartData.length === 0) return;

    const svgRect = svgRef.current.getBoundingClientRect();
    // 1. Calculate the click's X coordinate relative to the SVG element's left edge.
    const clickXInSvg = event.clientX - svgRect.left;

    // 2. Convert the click's X coordinate to the viewBox's coordinate system.
    // This accounts for the responsive scaling of the SVG.
    const viewBoxX = (clickXInSvg / svgRect.width) * SVG_WIDTH;

    // 3. Calculate the click's X coordinate relative to the chart area's left edge (inside the viewBox).
    const clickXInChartArea = viewBoxX - PADDING.left;

    // 4. Calculate the ratio of the click position within the chart's width.
    // Clamp the value between 0 and 1 to handle clicks in the padding area.
    const timeRatio = Math.max(0, Math.min(1, clickXInChartArea / CHART_WIDTH));

    // 5. Calculate the game time at the clicked position.
    const timeAtClick = timeRatio * maxTime;

    // クリックされた時間に最も近いデータポイントを見つける
    const closestPoint = chartData.reduce((prev, curr) =>
      Math.abs(curr.time - timeAtClick) < Math.abs(prev.time - timeAtClick) ? curr : prev
    );

    const pointX = PADDING.left + xScale(closestPoint.time);
    const pointY = PADDING.top + yScale(closestPoint.scoreDifference);

    onPointClick({
      ...closestPoint,
      x: svgRect.left + pointX,
      y: svgRect.top + pointY,
      parentRect: svgRect,
    });
  };

  const visibleEvents = useMemo(() => {
    return gameEvents.filter(event =>
      (showKillEvents && event.type === 'KILL') ||
      (showObjectEvents && event.type === 'OBJECTIVE')
    );
  }, [gameEvents, showKillEvents, showObjectEvents]);

  return (
    <div className="w-full h-full flex justify-center items-center">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full h-auto"
        onClick={handleClick}
      >
        <defs>
          {/* 有利エリアのクリップパス */}
          <clipPath id="clip-above">
            <rect x="0" y="0" width={CHART_WIDTH} height={yScale(0)} />
          </clipPath>
          {/* 不利エリアのクリップパス */}
          <clipPath id="clip-below">
            <rect x="0" y={yScale(0)} width={CHART_WIDTH} height={CHART_HEIGHT - yScale(0)} />
          </clipPath>
        </defs>

        {/* 背景 */}
        <rect x="0" y="0" width={SVG_WIDTH} height={SVG_HEIGHT} className="fill-gray-800" />

        {/* メインのチャートエリア */}
        <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
          <AxesAndGrid xScale={xScale} yScale={yScale} yTicks={yTicks} xTicks={xTicks} />

          {/* 有利エリアと線 (青) */}
          <g clipPath="url(#clip-above)">
            <path d={areaAbovePath} fill="#3b82f6" fillOpacity="0.1" />
            <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" />
          </g>

          {/* 不利エリアと線 (赤) */}
          <g clipPath="url(#clip-below)">
            <path d={areaBelowPath} fill="#ef4444" fillOpacity="0.1" />
            <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="2" />
          </g>

          {/* イベントマーカー */}
          <g className="events-layer">
            {visibleEvents.map((event) => (
              <EventMarker
                key={`${event.type}-${event.time}-${event.killerId || event.victimId}`}
                event={event}
                xScale={xScale}
                yScale={yScale}
                mainPlayerColor={mainPlayerColor}
                opponentPlayerColor={opponentPlayerColor}
                mainPlayerId={mainPlayerId}
                opponentPlayerId={opponentPlayerId}
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
};

export default ScoreChart;
