import React, { useMemo } from 'react';
import ScoreChart from './ScoreChart';
import { getChampionImage } from '../utils/ddragon';
import { getPlayerName } from '../utils/player';

// ローカルのロールアイコンをインポート
import topIcon from '../../images/Top_icon.png';
import jungleIcon from '../../images/Jungle_icon.png';
import middleIcon from '../../images/Middle_icon.png';
import bottomIcon from '../../images/Bottom_icon.png';
import supportIcon from '../../images/Support_icon.png';

const ROLES = {
    TOP: { label: 'TOP', icon: topIcon },
    JUNGLE: { label: 'JG', icon: jungleIcon },
    MIDDLE: { label: 'MID', icon: middleIcon },
    BOTTOM: { label: 'BOT', icon: bottomIcon },
    UTILITY: { label: 'SUP', icon: supportIcon }
};

const MatchDetail = ({
  matchData,
  mainPlayer,
  opponent,
  chartData,
  gameEvents,
  selectedRole,
  roleScoreDifferences,
  onPlayerSelect, // For role switching
  onSearchPlayer, // For searching a new player
}) => {

  const { roleMappings, userTeamId } = useMemo(() => {
    if (!matchData) return { roleMappings: null, userTeamId: null };

    const { match, puuid } = matchData;
    const mappings = {
      100: {},
      200: {}
    };
    const searchedPlayer = match.info.participants.find(p => p.puuid === puuid);
    if (!searchedPlayer) return { roleMappings: null, userTeamId: null };

    const teamId = searchedPlayer.teamId;

    for (const p of match.info.participants) {
        const role = p.teamPosition;
        if (!role || !Object.keys(ROLES).includes(role)) continue;
        mappings[p.teamId][role] = p;
    }
    return { roleMappings: mappings, userTeamId: teamId };
  }, [matchData]);

  if (!matchData) {
    return null; // or a loading/error state
  }

  if (!roleMappings) {
    return (
      <div className="w-full max-w-5xl bg-gray-800 rounded-lg p-6 mt-2 text-center">
        <p className="text-slate-400">この試合ではロール情報が取得できませんでした。</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl bg-gray-800 rounded-lg p-6 mt-2">
      {/* ロール選択 & チャンピオンアイコン表示エリア */}
      <div className="flex justify-between items-center mb-4">
        
        {/* Ally Champion Icon & Text */}
        <div 
          className="flex items-center gap-3 w-48 cursor-pointer group"
          onClick={() => {
            if (!mainPlayer || !onSearchPlayer) return;
            const riotId = `${mainPlayer.riotIdGameName}#${mainPlayer.riotIdTagline}`;
            onSearchPlayer(riotId);
          }}
          title={`「${mainPlayer ? getPlayerName(mainPlayer) : ''}」の対戦履歴を検索`}
        >
          {mainPlayer && (
              <>
                  <img
                      src={getChampionImage(mainPlayer.championName)}
                      alt={mainPlayer.championName}
                      className="w-16 h-16 rounded-full border-4 border-blue-500 shadow-lg transition-transform duration-200 group-hover:scale-110"
                  />
                  <p className="text-lg font-bold text-blue-400">味方チーム</p>
              </>
          )}
        </div>

        {/* ロール切り替えボタン */}
        <div className="flex justify-center items-center gap-4">
            {Object.entries(ROLES).map(([apiRole, roleInfo]) => {
                const isActive = selectedRole === apiRole;
                const allyPlayer = roleMappings[userTeamId]?.[apiRole];
                const enemyPlayer = roleMappings[userTeamId === 100 ? 200 : 100]?.[apiRole];
                const isDisabled = !allyPlayer || !enemyPlayer;

                const score = roleScoreDifferences[apiRole];
                const scoreColor = score > 0 ? 'text-blue-400' : score < 0 ? 'text-red-400' : 'text-slate-400';
                const scoreSign = score > 0 ? '+' : '';

                return (
                    <div key={apiRole} className="flex flex-col items-center w-16">
                        <button 
                            onClick={() => onPlayerSelect(apiRole)}
                            title={isDisabled ? `${roleInfo.label}のプレイヤーが見つかりません` : roleInfo.label}
                            disabled={isDisabled}
                            className={`p-2 rounded-lg transition-all duration-200 border-2 ${isActive ? 'border-cyan-500 bg-gray-700' : 'border-transparent hover:bg-gray-700'} ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
                            <img 
                                src={roleInfo.icon}
                                alt={roleInfo.label}
                                className={`w-10 h-10 transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                            />
                        </button>
                        {score !== null && typeof score !== 'undefined' && (
                            <p className={`text-xs font-bold ${scoreColor}`}>
                                {scoreSign}{score.toLocaleString()}
                            </p>
                        )}
                    </div>
                )
            })}
        </div>

        {/* Opponent Champion Icon & Text */}
        <div 
          className="flex items-center justify-end gap-3 w-48 cursor-pointer group"
          onClick={() => {
            if (!opponent || !onSearchPlayer) return;
            const riotId = `${opponent.riotIdGameName}#${opponent.riotIdTagline}`;
            onSearchPlayer(riotId);
          }}
          title={`「${opponent ? getPlayerName(opponent) : ''}」の対戦履歴を検索`}
        >
            {opponent && (
                <>
                    <p className="text-lg font-bold text-red-400">敵チーム</p>
                    <img
                        src={getChampionImage(opponent.championName)}
                        alt={opponent.championName}
                        className="w-16 h-16 rounded-full border-4 border-red-500 shadow-lg transition-transform duration-200 group-hover:scale-110"
                    />
                </>
            )}
        </div>
      </div>

      <div className="relative">
        {mainPlayer && opponent ? (
            <ScoreChart
                chartData={chartData}
                gameEvents={gameEvents}
                showKillEvents={true}
                showObjectEvents={true}
                mainPlayerColor={'#3b82f6'} // blue-500
                opponentPlayerColor={'#ef4444'} // red-500
                mainPlayer={mainPlayer}
                opponent={opponent}
            />
        ) : (
            <div className="w-full h-[650px] flex items-center justify-center">
                <p className="text-slate-400">このロールのプレイヤーが見つかりませんでした。</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default MatchDetail;