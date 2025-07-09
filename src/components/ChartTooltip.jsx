import React, { useRef, useLayoutEffect, useState } from 'react';

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

const PlayerTooltipInfo = ({ player, stats, totalScore, isMainPlayer }) => {
  const nameColor = isMainPlayer ? 'text-cyan-400' : 'text-red-400';

  return (
    <div className="flex-1">
      <h4 className={`text-lg font-bold mb-2 text-center ${nameColor}`}>
        {player.summonerName}
      </h4>
      <div className="text-center mb-3">
        <p className="text-xs text-slate-400">合計スコア</p>
        <p className="text-2xl font-semibold">{formatScore(totalScore)}</p>
      </div>
      <div className="space-y-1 text-sm">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center bg-gray-900/50 px-2 py-1 rounded">
            <span className="text-slate-400">{STAT_LABELS[key]}</span>
            <span className={`font-medium ${value >= 0 ? 'text-slate-200' : 'text-red-400'}`}>
              {formatScore(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChartTooltip = ({ tooltipData, onClose, mainPlayer, opponent }) => {
  const tooltipRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, opacity: 0 });

  useLayoutEffect(() => {
    if (tooltipRef.current && tooltipData) {
      const { x, y, parentRect } = tooltipData;
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let left = x + 20;
      let top = y;

      // 画面右端からはみ出ないように調整
      if (left + tooltipRect.width > parentRect.right) {
        left = x - tooltipRect.width - 20;
      }

      // 画面上端・下端からはみ出ないように調整
      if (top + tooltipRect.height > parentRect.bottom) {
        top = y - (top + tooltipRect.height - parentRect.bottom);
      }
      if (top < parentRect.top) {
        top = parentRect.top;
      }

      setPosition({
        // 親要素からの相対位置に変換
        left: left - parentRect.left,
        top: top - parentRect.top,
        opacity: 1,
      });
    }
  }, [tooltipData]);

  if (!tooltipData) return null;

  const { time, mainPlayerScore, opponentPlayerScore, mainPlayerStats, opponentPlayerStats } = tooltipData;

  const formatTime = (minutes) => {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={tooltipRef}
      className="absolute bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-4 w-[500px] z-20 transition-opacity duration-200 pointer-events-auto"
      style={{ ...position }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-200">
          スコア内訳 ({formatTime(time)})
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="閉じる"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex gap-4">
        <PlayerTooltipInfo
          player={mainPlayer}
          stats={mainPlayerStats}
          totalScore={mainPlayerScore}
          isMainPlayer={true}
        />
        <div className="border-l border-gray-600"></div>
        <PlayerTooltipInfo
          player={opponent}
          stats={opponentPlayerStats}
          totalScore={opponentPlayerScore}
          isMainPlayer={false}
        />
      </div>
    </div>
  );
};

export default ChartTooltip;

