import React from 'react';
import { getPlayerName } from '../utils/player';

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

const MobileScoreBreakdownTable = ({ displayData, mainPlayer, opponent, showRawValueDiff, onToggleView }) => {
  if (!displayData || !mainPlayer || !opponent) {
    return null;
  }

  const mainPlayerStats = displayData.mainPlayerStats;
  const opponentPlayerStats = displayData.opponentPlayerStats;

  const scoreColor = (diff) => diff >= 0 ? 'text-cyan-400' : 'text-red-400';
  const scoreSign = (diff) => diff >= 0 ? '+' : '';

  const headers = [
    '項目',
    `${getPlayerName(mainPlayer)} (元)`,
    `${getPlayerName(mainPlayer)} (スコア)`,
    showRawValueDiff ? '差 (元)' : '差 (スコア)',
    `${getPlayerName(opponent)} (スコア)`,
    `${getPlayerName(opponent)} (元)`,
    '項目',
  ];

  return (
    <div className="w-full overflow-x-auto text-xs">
      <table className="w-full border-collapse table-fixed">
        <thead>
          <tr className="border-b border-gray-600">
            {headers.map((header, index) => (
              <th key={index} className="py-2 px-1 text-slate-400 font-semibold text-center"
                  style={{ overflowWrap: 'break-word' }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.keys(STAT_LABELS).map(key => {
            const mainValue = mainPlayerStats[key] || { raw: 0, weighted: 0 };
            const oppValue = opponentPlayerStats[key] || { raw: 0, weighted: 0 };

            const diff = showRawValueDiff
              ? mainValue.raw - oppValue.raw
              : mainValue.weighted - oppValue.weighted;

            return (
              <tr key={key} className="border-b border-gray-800">
                <td className="py-1 px-1 text-slate-400 text-center" style={{ overflowWrap: 'break-word' }}>{STAT_LABELS[key]}</td>
                <td className="py-1 px-1 text-center text-slate-300 font-semibold">{formatScore(mainValue.raw)}</td>
                <td className="py-1 px-1 text-center text-slate-200 font-semibold">{formatScore(mainValue.weighted)}</td>
                <td className={`py-1 px-1 text-center font-semibold ${scoreColor(diff)}`} onClick={onToggleView}>
                  {scoreSign(diff)}{formatScore(diff)}
                </td>
                <td className="py-1 px-1 text-center text-slate-200 font-semibold">{formatScore(oppValue.weighted)}</td>
                <td className="py-1 px-1 text-center text-slate-300 font-semibold">{formatScore(oppValue.raw)}</td>
                <td className="py-1 px-1 text-slate-400 text-center" style={{ overflowWrap: 'break-word' }}>{STAT_LABELS[key]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MobileScoreBreakdownTable;