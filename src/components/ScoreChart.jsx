import React, { useMemo, useRef, useState } from 'react';
import { path } from 'd3-path';
import { getPlayerName } from '../utils/player';
import MobileScoreBreakdownTable from './MobileScoreBreakdownTable';

// --- 定数定義 ---
const SVG_WIDTH = 1000;
const SVG_HEIGHT = 350;
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
    const color = event.killerId === mainPlayerId ? mainPlayerColor
                : event.killerId === opponentPlayerId ? opponentPlayerColor
                : '#9ca3af';
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

const PlayerInfoColumn = ({ player, stats, totalScore, isMainPlayer, isMobileView }) => {
    const nameColor = isMainPlayer ? 'text-cyan-400' : 'text-red-400';
    const bgColor = isMainPlayer ? 'bg-cyan-950/10' : 'bg-red-950/10';
    const playerName = getPlayerName(player);

    return (
        <div className={`flex-1 p-1 sm:p-2 rounded-lg ${bgColor} ${isMobileView ? 'w-full' : ''}`}>
            {/* Header */}
            <div className="text-center">
                <div className="flex justify-center items-baseline gap-2">
                    <p className={`text-slate-400 ${isMobileView ? 'text-xs' : 'text-xs'}`}>合計スコア</p>
                    <h4 className={`font-bold ${nameColor} ${isMobileView ? 'text-base' : 'text-lg'}`} style={{ overflowWrap: 'break-word' }}>{playerName}</h4>
                </div>
                <p className={`font-semibold mt-1 ${isMobileView ? 'text-lg' : 'text-xl'}`}>{formatScore(totalScore)}</p>
            </div>
            {/* Table */}
            <div className="text-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-600">
                        {isMainPlayer ? (
                            <>
                            <th className={`py-2 px-1 sm:px-3 text-slate-400 font-semibold ${isMobileView ? 'text-xs' : 'text-sm'}`}>項目</th>
                            <th className={`py-2 px-1 sm:px-3 text-slate-400 font-semibold text-right ${isMobileView ? 'text-xs' : 'text-sm'}`}>元の値</th>
                            <th className={`py-2 px-1 sm:px-3 text-slate-400 font-semibold text-right ${isMobileView ? 'text-xs' : 'text-sm'}`}>スコア</th>
                            </>
                        ) : (
                            <>
                            <th className={`py-2 px-1 sm:px-3 text-slate-400 font-semibold ${isMobileView ? 'text-xs' : 'text-sm'}`}>スコア</th>
                            <th className={`py-2 px-1 sm:px-3 text-slate-400 font-semibold ${isMobileView ? 'text-xs' : 'text-sm'}`}>元の値</th>
                            <th className={`py-2 px-1 sm:px-3 text-slate-400 font-semibold ${isMobileView ? 'text-xs' : 'text-sm'}`}>項目</th>
                            </>
                        )}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(stats).map(([key, value]) => (
                        <tr key={key} className="border-b border-gray-800 hover:bg-gray-700/50">
                            {isMainPlayer ? (
                            <>
                                <td className={`py-1 px-1 sm:px-3 text-slate-400 ${isMobileView ? 'text-xs' : 'text-sm'}`} style={{ overflowWrap: 'break-word' }}>{STAT_LABELS[key]}</td>
                                <td className={`py-1 px-1 sm:px-3 text-right text-slate-300 font-semibold ${isMobileView ? 'text-xs' : 'text-sm'}`}>{formatScore(value.raw)}</td>
                                <td className={`py-1 px-1 sm:px-3 text-right font-medium font-semibold ${value.weighted >= 0 ? 'text-slate-200' : 'text-red-400'} ${isMobileView ? 'text-xs' : 'text-sm'}`}>
                                {formatScore(value.weighted)}
                                </td>
                            </>
                            ) : (
                            <>
                                <td className={`py-1 px-1 sm:px-3 font-medium font-semibold ${value.weighted >= 0 ? 'text-slate-200' : 'text-red-400'} ${isMobileView ? 'text-xs' : 'text-sm'}`}>
                                {formatScore(value.weighted)}
                                </td>
                                <td className={`py-1 px-1 sm:px-3 text-slate-300 font-semibold ${isMobileView ? 'text-xs' : 'text-sm'}`}>{formatScore(value.raw)}</td>
                                <td className={`py-1 px-1 sm:px-3 text-slate-400 ${isMobileView ? 'text-xs' : 'text-sm'}`} style={{ overflowWrap: 'break-word' }}>{STAT_LABELS[key]}</td>
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

const CenterColumn = ({ time, mainPlayerStats, opponentPlayerStats, showRawValueDiff, onToggleView, isMobileView }) => (
    <div className={`flex-shrink-0 cursor-pointer group ${isMobileView ? 'w-full' : 'w-20 text-center'}`} onClick={onToggleView}>
        {/* Header */}
        <div className="text-center mb-2 h-[60px] flex flex-col justify-end">
            <p className={`text-slate-400 ${isMobileView ? 'text-xs' : 'text-xs'}`}>タイムスタンプ</p>
            <p className={`font-semibold ${isMobileView ? 'text-lg' : 'text-xl'}`}>
                {Math.floor(time)}:{Math.round((time % 1) * 60).toString().padStart(2, '0')}
            </p>
        </div>
        {/* Table */}
        <div className="text-sm">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-gray-600">
                        <th className={`py-2 px-3 text-slate-400 font-semibold text-center group-hover:text-cyan-400 transition-colors ${isMobileView ? 'text-xs min-w-[5rem]' : 'min-w-[4rem]'}`}>
                            {showRawValueDiff ? '元値差' : 'スコア差'}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {Object.keys(STAT_LABELS).map(key => {
                        const mainValue = mainPlayerStats[key] || { raw: 0, weighted: 0 };
                        const oppValue = opponentPlayerStats[key] || { raw: 0, weighted: 0 };
                        
                        const diff = showRawValueDiff 
                            ? mainValue.raw - oppValue.raw
                            : mainValue.weighted - oppValue.weighted;

                        const color = diff >= 0 ? 'text-cyan-400' : 'text-red-400';
                        const sign = diff >= 0 ? '+' : '';

                        return (
                            <tr key={key} className="border-b border-gray-800">
                                <td className={`py-1 px-3 text-center font-semibold ${color} ${isMobileView ? 'text-xs' : ''}`}>
                                    {sign}{formatScore(diff)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
);


const ScoreChart = ({
  chartData,
  gameEvents,
  showKillEvents,
  showObjectEvents,
  mainPlayerColor,
  opponentPlayerColor,
  mainPlayer,
  opponent,
  isMobileView, // Add this
}) => {
  const svgRef = useRef(null);
  const [hoverX, setHoverX] = useState(null);
  const [hoveredData, setHoveredData] = useState(null);
  const [lockedData, setLockedData] = useState(null);
  const [showRawValueDiff, setShowRawValueDiff] = useState(false);
  const [simpleTooltipPos, setSimpleTooltipPos] = useState({ x: 0, y: 0, visible: false, time: 0, scoreDiff: 0 });

  const mainPlayerId = mainPlayer?.participantId;
  const opponentPlayerId = opponent?.participantId;

  const handleToggleDiffView = () => {
    setShowRawValueDiff(prev => !prev);
  };

  const { xScale, yScale, linePath, areaPath, yTicks, xTicks, maxTime } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { xScale: () => 0, yScale: () => 0, linePath: '', areaPath: '', yTicks: [], xTicks: [], maxTime: 0 };
    }

    const maxTime = Math.max(...chartData.map(d => d.time), 1);
    const maxScoreAbs = Math.max(...chartData.map(d => Math.abs(d.scoreDifference)), 1000);

    const xScale = (time) => (time / maxTime) * CHART_WIDTH;
    const yScale = (score) => CHART_HEIGHT / 2 - (score / maxScoreAbs) * (CHART_HEIGHT / 2);

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
    const moveXInSvg = event.clientX - svgRect.left;
    const viewBoxX = (moveXInSvg / svgRect.width) * SVG_WIDTH;

    if (viewBoxX >= PADDING.left && viewBoxX <= SVG_WIDTH - PADDING.right) {
      setHoverX(viewBoxX);

      const hoverXInChartArea = viewBoxX - PADDING.left;
      const timeRatio = Math.max(0, Math.min(1, hoverXInChartArea / CHART_WIDTH));
      const timeAtHover = timeRatio * maxTime;

      const closestPoint = chartData.reduce((prev, curr) =>
        Math.abs(curr.time - timeAtHover) < Math.abs(prev.time - timeAtHover) ? curr : prev
      );
      setHoveredData(closestPoint);

      // Update simpleTooltipPos
      if (!isMobileView) { // Only show on PC
        const tooltipY = event.clientY - svgRect.top + 10; // Offset from mouse Y
        setSimpleTooltipPos({
          x: viewBoxX,
          y: tooltipY,
          visible: true,
          time: closestPoint.time,
          scoreDiff: closestPoint.scoreDifference,
        });
      }

    } else {
      setHoverX(null);
      setHoveredData(null);
      setSimpleTooltipPos({ ...simpleTooltipPos, visible: false }); // Hide tooltip
    }
  };

  const handleMouseLeave = () => {
    setHoverX(null);
    setHoveredData(null);
    setSimpleTooltipPos({ ...simpleTooltipPos, visible: false }); // Hide tooltip
  };

  const handleClick = (event) => {
    if (!svgRef.current || chartData.length === 0) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const clickXInSvg = event.clientX - svgRect.left;
    const viewBoxX = (clickXInSvg / svgRect.width) * SVG_WIDTH;

    if (viewBoxX >= PADDING.left && viewBoxX <= SVG_WIDTH - PADDING.right) {
      const clickXInChartArea = viewBoxX - PADDING.left;
      const timeRatio = Math.max(0, Math.min(1, clickXInChartArea / CHART_WIDTH));
      const timeAtClick = timeRatio * maxTime;

      const closestPoint = chartData.reduce((prev, curr) =>
        Math.abs(curr.time - timeAtClick) < Math.abs(prev.time - timeAtClick) ? curr : prev
      );
      setLockedData(closestPoint);
    } else {
      setLockedData(null); // Unlock if clicked outside chart area
    }
  };

  const visibleEvents = useMemo(() => {
    return gameEvents.filter(event =>
      (showKillEvents && event.type === 'KILL') ||
      (showObjectEvents && event.type === 'OBJECTIVE')
    );
  }, [gameEvents, showKillEvents, showObjectEvents]);

  const displayData = lockedData || hoveredData;

  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <div className="relative w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto cursor-pointer"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          <defs>
            <clipPath id="clip-above">
              <rect x="0" y="0" width={CHART_WIDTH} height={yScale(0)} />
            </clipPath>
            <clipPath id="clip-below">
              <rect x="0" y={yScale(0)} width={CHART_WIDTH} height={CHART_HEIGHT - yScale(0)} />
            </clipPath>
          </defs>

          <rect x="0" y="0" width={SVG_WIDTH} height={SVG_HEIGHT} className="fill-gray-800" />

          <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
            <AxesAndGrid xScale={xScale} yScale={yScale} yTicks={yTicks} xTicks={xTicks} />

            {/* 有利エリアと線 (青) */}
            <g clipPath="url(#clip-above)">
              <path d={areaPath} fill="#3b82f6" fillOpacity="0.1" />
              <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" />
            </g>

            <g clipPath="url(#clip-below)">
              <path d={areaPath} fill="#ef4444" fillOpacity="0.1" />
              <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="2" />
            </g>

            <g className="events-layer">
              {lockedData && (
                <line
                  x1={xScale(lockedData.time)}
                  y1={0}
                  x2={xScale(lockedData.time)}
                  y2={CHART_HEIGHT}
                  className="stroke-fuchsia-600"
                  strokeWidth="2"
                  pointerEvents="none"
                />
              )}
              {hoverX !== null && (
                <line
                  x1={hoverX - PADDING.left}
                  y1={0}
                  x2={hoverX - PADDING.left}
                  y2={CHART_HEIGHT}
                  className="stroke-slate-400"
                  strokeWidth="1"
                  pointerEvents="none"
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

        {/* Simple Tooltip */}
        {simpleTooltipPos.visible && !isMobileView && (
          <div
            className="absolute bg-gray-700 text-white text-xs px-2 py-1 rounded shadow-md pointer-events-none w-28"
            style={{
              left: simpleTooltipPos.x,
              top: simpleTooltipPos.y,
              transform: 'translate(-50%, -100%)', // Center horizontally, move above cursor
            }}
          >
            <p className="whitespace-nowrap">時間: {Math.floor(simpleTooltipPos.time)}:{Math.round((simpleTooltipPos.time % 1) * 60).toString().padStart(2, '0')}</p>
            <p className="whitespace-nowrap">スコア差: {simpleTooltipPos.scoreDiff.toLocaleString()}</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-5xl mt-1 p-2 sm:p-4 bg-gray-900/50 rounded-lg text-slate-200 shadow-lg min-h-[300px]">
        {displayData ? (
          isMobileView ? (
            <MobileScoreBreakdownTable
              displayData={displayData}
              mainPlayer={mainPlayer}
              opponent={opponent}
              showRawValueDiff={showRawValueDiff}
              onToggleView={handleToggleDiffView}
            />
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 justify-center items-start">
              {mainPlayer && displayData.mainPlayerStats && 
                  <PlayerInfoColumn 
                      player={mainPlayer} 
                      stats={displayData.mainPlayerStats} 
                      totalScore={displayData.mainPlayerScore} 
                      isMainPlayer={true} 
                      isMobileView={isMobileView}
                  />}
            
              {mainPlayer && opponent && 
                  <CenterColumn 
                      time={displayData.time} 
                      mainPlayerStats={displayData.mainPlayerStats} 
                      opponentPlayerStats={displayData.opponentPlayerStats} 
                      showRawValueDiff={showRawValueDiff}
                      onToggleView={handleToggleDiffView}
                      isMobileView={isMobileView}
                  />}

              {opponent && displayData.opponentPlayerStats && 
                  <PlayerInfoColumn 
                      player={opponent} 
                      stats={displayData.opponentPlayerStats} 
                      totalScore={displayData.opponentPlayerScore} 
                      isMainPlayer={false} 
                      isMobileView={isMobileView}
                  />}
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-center text-slate-400">グラフをクリックして、特定の時点での詳細データを表示します。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoreChart;