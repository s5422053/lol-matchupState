import React, { useState, useMemo } from 'react';
import ScoreChart from './ScoreChart';
import ChartTooltip from './ChartTooltip';
import { processTimelineData } from '../utils/scoreCalculator';

const MatchDetail = ({ matchData }) => {
  const [showKillEvents, setShowKillEvents] = useState(true);
  const [showObjectEvents, setShowObjectEvents] = useState(true);
  const [tooltipData, setTooltipData] = useState(null);

  const { match, timeline, puuid } = matchData;

  // useMemoを使用して、matchDataが変更された場合にのみ再計算する
  const { mainPlayer, opponent, chartData, gameEvents } = useMemo(() => {
    if (!match || !timeline) return { mainPlayer: null, opponent: null, chartData: [], gameEvents: [] };

    const mainP = match.info.participants.find(p => p.puuid === puuid);
    if (!mainP) return { mainPlayer: null, opponent: null, chartData: [], gameEvents: [] };

    const opp = mainP.teamPosition ? match.info.participants.find(p =>
      p.teamId !== mainP.teamId && p.teamPosition === mainP.teamPosition
    ) : null;

    // 対面が見つからない場合はチャートを表示しない
    if (!opp) return { mainPlayer: mainP, opponent: null, chartData: [], gameEvents: [] };

    const { chartData: processedChartData, gameEvents: processedGameEvents } = processTimelineData(timeline, mainP.participantId, opp.participantId);

    return {
      mainPlayer: mainP,
      opponent: opp,
      chartData: processedChartData,
      gameEvents: processedGameEvents,
    };
  }, [match, timeline, puuid]);

  const handleChartClick = (data) => {
    // ツールチップが既に表示されている場所をクリックしたら閉じる
    if (tooltipData && tooltipData.time === data.time) {
      setTooltipData(null);
    } else {
      setTooltipData(data);
    }
  };

  const handleCloseTooltip = () => {
    setTooltipData(null);
  };

  if (!opponent) {
    return (
      <div className="w-full max-w-5xl bg-gray-800 rounded-lg p-6 mt-4 text-center">
        <p className="text-slate-400">この試合では対面のプレイヤーが見つかりませんでした。</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl bg-gray-800 rounded-lg p-6 mt-2">
      <div className="flex justify-center items-center gap-6 mb-4">
        <h3 className="text-lg font-semibold">チャートオプション:</h3>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={showKillEvents}
            onChange={() => setShowKillEvents(!showKillEvents)}
            className="form-checkbox h-4 w-4 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-600"
          />
          キルイベント
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={showObjectEvents}
            onChange={() => setShowObjectEvents(!showObjectEvents)}
            className="form-checkbox h-4 w-4 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-600"
          />
          オブジェクトイベント
        </label>
      </div>

      <div className="relative" onClick={(e) => { if (e.target === e.currentTarget) handleCloseTooltip(); }}>
        <ScoreChart
          chartData={chartData}
          gameEvents={gameEvents}
          showKillEvents={showKillEvents}
          showObjectEvents={showObjectEvents}
          onPointClick={handleChartClick}
          mainPlayerColor={mainPlayer.win ? '#3b82f6' : '#ef4444'} // blue-500 or red-500
          opponentPlayerColor={opponent.win ? '#3b82f6' : '#ef4444'}
          mainPlayer={mainPlayer}
          opponent={opponent}
        />
        {tooltipData && (
          <ChartTooltip
            tooltipData={tooltipData}
            onClose={handleCloseTooltip}
            mainPlayer={mainPlayer}
            opponent={opponent}
          />
        )}
      </div>
    </div>
  );
};

export default MatchDetail;
