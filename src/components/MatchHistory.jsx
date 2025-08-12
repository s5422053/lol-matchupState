import React from 'react';
import MatchDetail from './MatchDetail';
import { getChampionImage } from '../utils/ddragon';

const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const PlayerInfo = ({ player, isMobileView }) => (
  <div className={`flex items-center gap-3 ${isMobileView ? 'w-28' : 'w-36'}`}>
    <img
      src={getChampionImage(player.championName)}
      alt={player.championName}
      className="w-12 h-12 rounded-full border-2 border-gray-600"
    />
    <div className="text-left flex-grow min-w-0">
      <p className="font-bold text-sm truncate sm:whitespace-normal" style={{ overflowWrap: 'break-word' }}>{player.summonerName}</p>
      <p className="text-xs text-slate-400">
        {player.kills} / <span className="text-red-500">{player.deaths}</span> / {player.assists}
      </p>
    </div>
  </div>
);

const MatchSummary = ({ matchData, onSelectMatch, selectedMatchId, puuid, isMobileView }) => {
  const { info, metadata } = matchData.match;
  const mainPlayer = info.participants.find(p => p.puuid === puuid);

  if (!mainPlayer) return null;

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

  const averageScoreDifference = matchData.averageScoreDifference || 0;
  const scoreDiffColor = averageScoreDifference > 0 ? 'text-blue-400' : averageScoreDifference < 0 ? 'text-red-400' : 'text-slate-400';
  const scoreDiffSign = averageScoreDifference > 0 ? '+' : '';

  return (
    <div
      onClick={() => onSelectMatch(metadata.matchId)}
      className={`bg-gray-800 rounded-lg p-2 sm:p-4 flex flex-row justify-between items-center cursor-pointer transition-all duration-200 ease-in-out ${resultClass} ${selectedClass}`}
    >
      <div className="flex items-center gap-3 sm:gap-6 flex-1 justify-center sm:justify-start">
        <div className="text-center w-16 flex-shrink-0">
          <p className={`font-bold text-sm ${mainPlayer.win ? 'text-blue-400' : 'text-red-400'}`}>
            {mainPlayer.win ? '勝利' : '敗北'}
          </p>
          <p className="text-xs text-slate-400">{info.gameMode}</p>
          <p className="text-xs text-slate-500">{formatDuration(info.gameDuration)}</p>
        </div>
        <PlayerInfo player={mainPlayer} isMobileView={isMobileView} />
      </div>

      {/* 平均スコア差 */}
      <div className="text-center my-2 sm:my-0">
        <p className="text-xs text-slate-500">平均スコア差</p>
        <p className={`text-lg font-bold ${scoreDiffColor}`}>
          {scoreDiffSign}{averageScoreDifference.toLocaleString()}
        </p>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 flex-1 justify-center sm:justify-end">
        {opponent ? (
          <PlayerInfo player={opponent} isMobileView={isMobileView} />
        ) : (
          <div className="w-36 text-center text-slate-500 text-sm">対面なし</div>
        )}
      </div>
    </div>
  );
};

const MatchHistory = ({
  matches,
  onSelectMatch,
  selectedMatchId,
  puuid,
  // Props for MatchDetail
  selectedMatchData,
  mainPlayer,
  opponent,
  chartData,
  gameEvents,
  selectedRole,
  roleScoreDifferences,
  onPlayerSelect,
  onSearchPlayer,
  // Props for loading more
  onLoadMore,
  hasMore,
  loading,
  isMobileView, // Add this
}) => {
  if (!matches || matches.length === 0) {
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
              isMobileView={isMobileView} // Pass it here
            />
            {isSelected && selectedMatchData && (
              <MatchDetail
                key={`${matchId}-detail`}
                matchData={selectedMatchData}
                mainPlayer={mainPlayer}
                opponent={opponent}
                chartData={chartData}
                gameEvents={gameEvents}
                selectedRole={selectedRole}
                roleScoreDifferences={roleScoreDifferences}
                onPlayerSelect={onPlayerSelect}
                onSearchPlayer={onSearchPlayer}
                isMobileView={isMobileView} // Pass it here
              />
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
