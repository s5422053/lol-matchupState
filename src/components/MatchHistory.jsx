import React from 'react';
import MatchDetail from './MatchDetail';
import { getChampionImage } from '../utils/ddragon';

const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const PlayerInfo = ({ player }) => (
  <div className="flex items-center gap-3">
    <img
      src={getChampionImage(player.championName)}
      alt={player.championName}
      className="w-12 h-12 rounded-full border-2 border-gray-600"
    />
    <div className="text-left">
      <p className="font-bold text-sm">{player.summonerName.slice(0, 12)}</p>
      <p className="text-xs text-slate-400">
        {player.kills} / <span className="text-red-500">{player.deaths}</span> / {player.assists}
      </p>
    </div>
  </div>
);

const MatchSummary = ({ matchData, onSelectMatch, selectedMatchId, puuid }) => {
  const { info, metadata } = matchData.match;
  const mainPlayer = info.participants.find(p => p.puuid === puuid);

  if (!mainPlayer) return null; // 検索したプレイヤーが試合にいない場合はスキップ

  // ARAMや特殊モードを考慮し、teamPositionがない場合は対面を探さない
  const opponent = mainPlayer.teamPosition ? info.participants.find(p =>
    p.teamId !== mainPlayer.teamId && p.teamPosition === mainPlayer.teamPosition
  ) : null;

  const isSelected = selectedMatchId === metadata.matchId;
  const resultClass = mainPlayer.win
    ? 'border-l-4 border-blue-500 hover:border-blue-400'
    : 'border-l-4 border-red-500 hover:border-red-400';
  const selectedClass = isSelected
    ? '!border-cyan-400 scale-105 shadow-lg shadow-cyan-500/10'
    : 'hover:bg-gray-700/50';

  return (
    <div
      onClick={() => onSelectMatch(metadata.matchId)}
      className={`bg-gray-800 rounded-lg p-4 flex justify-between items-center cursor-pointer transition-all duration-200 ease-in-out ${resultClass} ${selectedClass}`}
    >
      <div className="flex items-center gap-6">
        <div className="text-center w-16">
          <p className={`font-bold text-sm ${mainPlayer.win ? 'text-blue-400' : 'text-red-400'}`}>
            {mainPlayer.win ? '勝利' : '敗北'}
          </p>
          <p className="text-xs text-slate-400">{info.gameMode}</p>
          <p className="text-xs text-slate-500">{formatDuration(info.gameDuration)}</p>
        </div>
        <PlayerInfo player={mainPlayer} />
      </div>

      <div className="flex items-center gap-4">
        <p className="text-sm font-bold text-slate-500">VS</p>
        {opponent ? (
          <PlayerInfo player={opponent} />
        ) : (
          <div className="w-48 text-center text-slate-500 text-sm">対面なし</div>
        )}
      </div>
    </div>
  );
};

const MatchHistory = ({ matches, onSelectMatch, selectedMatchId, puuid, selectedMatchData, onLoadMore, hasMore, loading, onPlayerSelect }) => {
  if (!matches || matches.length === 0) {
    // ローディング中やエラー表示はApp.jsx側で行うため、ここでは何も表示しない
    return null;
  }

  return (
    <div className="w-full max-w-4xl flex flex-col gap-2">
      {matches.map(matchDataItem => {
        const matchId = matchDataItem.match.metadata.matchId;
        const isSelected = selectedMatchId === matchId;

        return (
          <React.Fragment key={matchId}>
            <MatchSummary
              matchData={matchDataItem}
              onSelectMatch={onSelectMatch}
              selectedMatchId={selectedMatchId}
              puuid={puuid}
            />
            {isSelected && selectedMatchData?.timeline && (
              <MatchDetail key={`${matchId}-detail`} matchData={selectedMatchData} onPlayerSelect={onPlayerSelect} />
            )}
          </React.Fragment>
        );
      })}

      {hasMore && (
        <div className="flex justify-center mt-4">
            <button 
                onClick={onLoadMore}
                disabled={loading}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200 shadow-lg"
            >
                {loading ? '読み込み中...' : 'さらに読み込む'}
            </button>
        </div>
      )}
    </div>
  );
};

export default MatchHistory;
