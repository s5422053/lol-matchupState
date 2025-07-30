import React, { useMemo, useRef, useState } from 'react';
import { path } from 'd3-path';

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

// --- 定数定義 (ChartTooltipから移植) ---
const STAT_LABELS = {
  gold: 'ゴールド',
  kills: 'キル',
  deaths: 'デス',
  assists: 'アシスト',
  wardsPlaced: 'ワード設置',
  wardsKilled: 'ワード破壊',
  damageDealt: 'チャンピオンへのダメージ',
  damageTaken: '被ダメージ',
  buildings: '建物破壊',
  eliteMonsters: 'エピックモンスター',
};

const formatScore = (score) => Math.round(score).toLocaleString();

// --- ヘルパーコンポーネント (ChartTooltipから移植) ---
const getPlayerName = (player) => player.riotIdGameName || player.summonerName;

const PlayerTooltipInfo = ({ player, stats, totalScore, isMainPlayer }) => {
  const nameColor = isMainPlayer ? 'text-cyan-400' : 'text-red-400';
  const bgColor = isMainPlayer ? 'bg-cyan-950/10' : 'bg-red-950/10';

  const playerName = getPlayerName(player);

  return (
    <div className={`flex-1 ${bgColor} rounded-lg`}>
      <div className="text-center mb-3">
        <div className="flex justify-center items-baseline gap-2">
            <p className="text-xs text-slate-400">合計スコア</p>
            <h4 className={`text-lg font-bold ${nameColor}`}>
                {playerName}
            </h4>
        </div>
        <p className="text-xl font-semibold mt-1">{formatScore(totalScore)}</p>
      </div>
      <div className="text-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-600">
              {isMainPlayer ? (
                <>
                  <th className="py-2 px-3 text-slate-400 font-semibold">項目</th>
                  <th className="py-2 px-3 text-slate-400 font-semibold text-right">元の値</th>
                  <th className="py-2 px-3 text-slate-400 font-semibold text-right">スコア</th>
                </>
              ) : (
                <>
                  <th className="py-2 px-3 text-slate-400 font-semibold">スコア</th>
                  <th className="py-2 px-3 text-slate-400 font-semibold">元の値</th>
                  <th className="py-2 px-3 text-slate-400 font-semibold">項目</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {Object.entries(stats).map(([key, value]) => (
              <tr key={key} className="border-b border-gray-800 hover:bg-gray-700/50">
                {isMainPlayer ? (
                  <>
                    <td className="py-1 px-3 text-slate-400">{STAT_LABELS[key]}</td>
                    <td className="py-1 px-3 text-right text-slate-300 font-semibold">{formatScore(value.raw)}</td>
                    <td className={`py-1 px-3 text-right font-medium font-semibold ${value.weighted >= 0 ? 'text-slate-200' : 'text-red-400'}`}>
                      {formatScore(value.weighted)}
                    </td>
                  </>
                ) : (
                  <>
                    <td className={`py-1 px-3 font-medium font-semibold ${value.weighted >= 0 ? 'text-slate-200' : 'text-red-400'}`}>
                      {formatScore(value.weighted)}
                    </td>
                    <td className="py-1 px-3 text-slate-300 font-semibold">{formatScore(value.raw)}</td>
                    <td className="py-1 px-3 text-slate-400">{STAT_LABELS[key]}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


const ScoreChart = ({
  chartData,
  gameEvents,
  showKillEvents,
  showObjectEvents,
  mainPlayerColor, // イベントマーカーで使用
  opponentPlayerColor, // イベントマーカーで使用
  mainPlayer,
  opponent,
}) => {
  const svgRef = useRef(null);
  const [hoverX, setHoverX] = useState(null);
  const [hoveredData, setHoveredData] = useState(null);

  const mainPlayerId = mainPlayer?.participantId;
  const opponentPlayerId = opponent?.participantId;

  const { xScale, yScale, linePath, areaPath, yTicks, xTicks, maxTime } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { xScale: () => 0, yScale: () => 0, linePath: '', areaPath: '', yTicks: [], xTicks: [], maxTime: 0 };
    }

    const maxTime = Math.max(...chartData.map(d => d.time), 1);
    const maxScoreAbs = Math.max(...chartData.map(d => Math.abs(d.scoreDifference)), 1000);

    const xScale = (time) => (time / maxTime) * CHART_WIDTH;
    const yScale = (score) => CHART_HEIGHT / 2 - (score / maxScoreAbs) * (CHART_HEIGHT / 2);

    // d3-pathを使用してパスを生成
    const linePathGenerator = path();
    const areaPathGenerator = path();

    chartData.forEach((d, i) => {
      const x = xScale(d.time);
      const y = yScale(d.scoreDifference);
      if (i === 0) {
        linePathGenerator.moveTo(x, y);
        areaPathGenerator.moveTo(x, y);
      } else {
        linePathGenerator.lineTo(x, y);
        areaPathGenerator.lineTo(x, y);
      }
    });
    const linePath = linePathGenerator.toString();

    // エリアのパスを閉じる
    const yZero = yScale(0);
    if (chartData.length > 0) {
      areaPathGenerator.lineTo(xScale(maxTime), yZero);
      areaPathGenerator.lineTo(xScale(0), yZero);
      areaPathGenerator.closePath();
    }
    const areaPath = areaPathGenerator.toString();

    const yTickCount = 5;
    const yTicks = Array.from({ length: yTickCount * 2 + 1 }, (_, i) => {
      const score = maxScoreAbs - (i * maxScoreAbs) / yTickCount;
      return Math.round(score / 100) * 100;
    });

    const xTickCount = Math.floor(maxTime / 5);
    const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => i * 5);

    return { xScale, yScale, linePath, areaPath, yTicks, xTicks, maxTime };
  }, [chartData]);

  const handleMouseMove = (event) => {
    if (!svgRef.current || chartData.length === 0) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    // SVG要素内でのマウスのX座標を計算
    const moveXInSvg = event.clientX - svgRect.left;
    // viewBox座標系に変換
    const viewBoxX = (moveXInSvg / svgRect.width) * SVG_WIDTH;

    if (viewBoxX >= PADDING.left && viewBoxX <= SVG_WIDTH - PADDING.right) {
      setHoverX(viewBoxX);

      // ホバー位置に対応するデータポイントを見つける
      const hoverXInChartArea = viewBoxX - PADDING.left;
      const timeRatio = Math.max(0, Math.min(1, hoverXInChartArea / CHART_WIDTH));
      const timeAtHover = timeRatio * maxTime;

      const closestPoint = chartData.reduce((prev, curr) =>
        Math.abs(curr.time - timeAtHover) < Math.abs(prev.time - timeAtHover) ? curr : prev
      );
      setHoveredData(closestPoint);

    } else {
      setHoverX(null);
      setHoveredData(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverX(null);
    setHoveredData(null);
  };

  const visibleEvents = useMemo(() => {
    return gameEvents.filter(event =>
      (showKillEvents && event.type === 'KILL') ||
      (showObjectEvents && event.type === 'OBJECTIVE')
    );
  }, [gameEvents, showKillEvents, showObjectEvents]);

  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full h-auto cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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
            <path d={areaPath} fill="#3b82f6" fillOpacity="0.1" />
            <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" />
          </g>

          {/* 不利エリアと線 (赤) */}
          <g clipPath="url(#clip-below)">
            <path d={areaPath} fill="#ef4444" fillOpacity="0.1" />
            <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="2" />
          </g>

          {/* イベントマーカー */}
          <g className="events-layer">
            {/* ホバー時の縦線 */}
            {hoverX !== null && (
              <line
                x1={hoverX - PADDING.left}
                y1={0}
                x2={hoverX - PADDING.left}
                y2={CHART_HEIGHT}
                className="stroke-slate-400"
                strokeWidth="1"
                pointerEvents="none" // この線がマウスイベントを妨げないようにする
              />
            )}
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

      {/* スコア内訳表示エリア */}
      <div className="w-full max-w-5xl mt-1 p-4 bg-gray-900/80 rounded-lg text-slate-200 shadow-lg min-h-[250px]">
        {hoveredData ? (
          <div className="flex gap-2 justify-center items-start">
            {/* 自プレイヤー */}
            {mainPlayer && hoveredData.mainPlayerStats && (
              <PlayerTooltipInfo
                player={mainPlayer}
                stats={hoveredData.mainPlayerStats}
                totalScore={hoveredData.mainPlayerScore}
                isMainPlayer={true}
              />
            )}

            {/* 中央のスコア差表示 */}
            <div className="flex-shrink-0">
                {/* 左右のテーブルと高さを合わせるためのヘッダー部分 */}
                <div className="text-center mb-3">
                    <div className="flex justify-center items-baseline gap-2 h-[28px]">
                         <p className="text-xs text-slate-400">タイムスタンプ</p>
                    </div>
                    <p className="text-xl font-semibold mt-1">
                        {Math.floor(hoveredData.time)}:{Math.round((hoveredData.time % 1) * 60).toString().padStart(2, '0')}
                    </p>
                </div>
                {/* スコア差テーブル */}
                <div className="text-sm">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-gray-600">
                                <th className="py-2 px-3 text-slate-400 font-semibold text-center">スコア差</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(STAT_LABELS).map(key => {
                                const mainValue = hoveredData.mainPlayerStats[key]?.weighted || 0;
                                const oppValue = hoveredData.opponentPlayerStats[key]?.weighted || 0;
                                const diff = mainValue - oppValue;
                                const color = diff >= 0 ? 'text-cyan-400' : 'text-red-400';
                                const sign = diff >= 0 ? '+' : '';

                                return (
                                    <tr key={key} className="border-b border-gray-800">
                                        <td className={`py-1 px-3 text-center font-semibold ${color}`}>
                                            {sign}{formatScore(diff)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 敵プレイヤー */}
            {opponent && hoveredData.opponentPlayerStats && (
              <PlayerTooltipInfo
                player={opponent}
                stats={hoveredData.opponentPlayerStats}
                totalScore={hoveredData.opponentPlayerScore}
                isMainPlayer={false}
              />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-center text-slate-400">グラフにカーソルを合わせて、特定の時点での詳細データを表示します。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoreChart;
