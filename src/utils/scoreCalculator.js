/**
 * スコア計算のための重み付け
 * score_calc.txtの内容に基づいています。
 */
const SCORE_WEIGHTS = {
  totalGold: 1,
  kills: 300,
  deaths: -500,
  assists: 150,
  wardsPlaced: 100,
  wardsKilled: 100,
  totalDamageDoneToChampions: 1 / 10,
  totalDamageTaken: 1 / 10,
  buildingKill: 700,
  eliteMonsterKill: 500,
};

/**
 * タイムラインデータから、両プレイヤーのスコアとゲームイベントを抽出・計算します。
 * @param {object} timeline - Riot APIから取得した試合のタイムラインデータ
 * @param {number} mainPlayerId - 自身のparticipantId
 * @param {number} opponentPlayerId - 対面のparticipantId
 * @returns {{chartData: object[], gameEvents: object[]}} チャート描画用のデータとゲームイベントの配列
 */
export function processTimelineData(timeline, mainPlayerId, opponentPlayerId) {
  const chartData = [];
  const gameEvents = [];

  // イベントによるスコアはフレームデータに含まれないため、別途集計します。
  const mainPlayerEventScores = {
    kills: 0,
    deaths: 0,
    assists: 0,
    wardsPlaced: 0,
    wardsKilled: 0,
    buildingKill: 0,
    eliteMonsterKill: 0,
  };
  const opponentPlayerEventScores = { ...mainPlayerEventScores };

  // 最初のフレーム（0分時点）のデータを追加
  const initialMainPlayerFrame = timeline.info.frames[0]?.participantFrames[mainPlayerId];
  const initialOpponentPlayerFrame = timeline.info.frames[0]?.participantFrames[opponentPlayerId];

  if (initialMainPlayerFrame && initialOpponentPlayerFrame) {
    // 0分時点ではイベントスコアは全て0
    const mainPlayerInitialStats = calculateFrameStats(initialMainPlayerFrame, mainPlayerEventScores);
    const opponentPlayerInitialStats = calculateFrameStats(initialOpponentPlayerFrame, opponentPlayerEventScores);
    chartData.push({
      time: 0,
      scoreDifference: 0,
      mainPlayerScore: Object.values(mainPlayerInitialStats).reduce((a, b) => a + b, 0),
      opponentPlayerScore: Object.values(opponentPlayerInitialStats).reduce((a, b) => a + b, 0),
      mainPlayerStats: mainPlayerInitialStats,
      opponentPlayerStats: opponentPlayerInitialStats,
    });
  }

  // 各フレーム（1分ごと）をループしてデータを処理
  for (const frame of timeline.info.frames) {
    // 1分以降のフレームのみを処理
    if (frame.timestamp === 0) continue;

    const processedWardEvents = new Set(); // このフレームで処理したワードイベントを記録

    // フレーム内のイベントを処理
    for (const event of frame.events) {
      // イベントベースのスコアを更新
      updateEventScores(event, mainPlayerId, opponentPlayerId, mainPlayerEventScores, opponentPlayerEventScores, processedWardEvents);
      // チャートに表示する重要なゲームイベントを収集
      collectGameEvents(event, mainPlayerId, opponentPlayerId, gameEvents);
    }

    const mainPlayerFrame = frame.participantFrames[mainPlayerId];
    const opponentPlayerFrame = frame.participantFrames[opponentPlayerId];

    if (mainPlayerFrame && opponentPlayerFrame) {
      const mainPlayerStats = calculateFrameStats(mainPlayerFrame, mainPlayerEventScores);
      const opponentPlayerStats = calculateFrameStats(opponentPlayerFrame, opponentPlayerEventScores);

      const calculateTotalScore = (stats) => Object.values(stats).reduce((sum, val) => sum + val.weighted, 0);

      const mainPlayerTotalScore = calculateTotalScore(mainPlayerStats);
      const opponentPlayerTotalScore = calculateTotalScore(opponentPlayerStats);

      const scoreDifference = mainPlayerTotalScore - opponentPlayerTotalScore;

      chartData.push({
        time: frame.timestamp / 60000, // msを分に変換
        scoreDifference,
        mainPlayerScore: mainPlayerTotalScore,
        opponentPlayerScore: opponentPlayerTotalScore,
        mainPlayerStats,
        opponentPlayerStats,
      });
    }
  }

  return { chartData, gameEvents };
}

/**
 * イベントオブジェクトを元に、プレイヤーのイベントスコアを更新します。
 */
function updateEventScores(event, mainPlayerId, opponentPlayerId, mainPlayerEventScores, opponentPlayerEventScores, processedWardEvents) {
  switch (event.type) {
    case 'CHAMPION_KILL':
      if (event.killerId === mainPlayerId) mainPlayerEventScores.kills += 1;
      else if (event.killerId === opponentPlayerId) opponentPlayerEventScores.kills += 1;

      if (event.victimId === mainPlayerId) mainPlayerEventScores.deaths += 1;
      else if (event.victimId === opponentPlayerId) opponentPlayerEventScores.deaths += 1;

      if (event.assistingParticipantIds?.includes(mainPlayerId)) {
        mainPlayerEventScores.assists += 1;
      }
      if (event.assistingParticipantIds?.includes(opponentPlayerId)) {
        opponentPlayerEventScores.assists += 1;
      }
      break;

    case 'WARD_PLACED':
      const wardPlacedKey = `placed-${event.creatorId}-${event.timestamp}`;
      if (processedWardEvents.has(wardPlacedKey)) break; // 重複はスキップ

      if (event.creatorId === mainPlayerId) mainPlayerEventScores.wardsPlaced += 1;
      else if (event.creatorId === opponentPlayerId) opponentPlayerEventScores.wardsPlaced += 1;
      
      processedWardEvents.add(wardPlacedKey); // 処理済みとして記録
      break;

    case 'WARD_KILL':
      const wardKillKey = `killed-${event.killerId}-${event.timestamp}`;
      if (processedWardEvents.has(wardKillKey)) break; // 重複はスキップ

      if (event.killerId === mainPlayerId) mainPlayerEventScores.wardsKilled += 1;
      else if (event.killerId === opponentPlayerId) opponentPlayerEventScores.wardsKilled += 1;
      
      processedWardEvents.add(wardKillKey); // 処理済みとして記録
      break;

    case 'BUILDING_KILL':
      if (event.killerId === mainPlayerId) mainPlayerEventScores.buildingKill += 1;
      else if (event.killerId === opponentPlayerId) opponentPlayerEventScores.buildingKill += 1;
      break;

    case 'ELITE_MONSTER_KILL':
      if (event.killerId === mainPlayerId) mainPlayerEventScores.eliteMonsterKill += 1;
      else if (event.killerId === opponentPlayerId) opponentPlayerEventScores.eliteMonsterKill += 1;
      break;
  }
}

/**
 * チャートに表示するための重要なゲームイベントを収集します。
 */
function collectGameEvents(event, mainPlayerId, opponentPlayerId, gameEvents) {
  const time = event.timestamp / 60000; // msを分に変換

  if (event.type === 'CHAMPION_KILL') {
    // 自身または対面がキルした場合のみイベントを収集
    if (event.killerId === mainPlayerId || event.killerId === opponentPlayerId) {
      gameEvents.push({ type: 'KILL', time, killerId: event.killerId, victimId: event.victimId });
    }
  } else if (event.type === 'BUILDING_KILL' || event.type === 'ELITE_MONSTER_KILL') {
    // 自身または対面が関与するオブジェクト取得イベントのみを収集
    if (event.killerId === mainPlayerId || event.killerId === opponentPlayerId) {
      gameEvents.push({ type: 'OBJECTIVE', time, killerId: event.killerId, objectiveType: event.buildingType || event.monsterType });
    }
  }
}

/**
 * 特定のフレームにおけるプレイヤーの各スタッツのスコアを計算します。
 */
function calculateFrameStats(pFrame, eventScores) {
  const { damageStats } = pFrame;
  // 元の値を保持するオブジェクト
  const rawStats = {
    gold: pFrame.totalGold ?? 0,
    kills: eventScores.kills,
    deaths: eventScores.deaths,
    assists: eventScores.assists,
    wardsPlaced: eventScores.wardsPlaced,
    wardsKilled: eventScores.wardsKilled,
    damageDealt: damageStats?.totalDamageDoneToChampions ?? 0,
    damageTaken: damageStats?.totalDamageTaken ?? 0,
    buildings: eventScores.buildingKill,
    eliteMonsters: eventScores.eliteMonsterKill,
  };

  // ウェイト適用後のスコアを計算
  const weightedStats = {
    gold: rawStats.gold * SCORE_WEIGHTS.totalGold,
    kills: rawStats.kills * SCORE_WEIGHTS.kills,
    deaths: rawStats.deaths * SCORE_WEIGHTS.deaths,
    assists: rawStats.assists * SCORE_WEIGHTS.assists,
    wardsPlaced: rawStats.wardsPlaced * SCORE_WEIGHTS.wardsPlaced,
    wardsKilled: rawStats.wardsKilled * SCORE_WEIGHTS.wardsKilled,
    damageDealt: rawStats.damageDealt * SCORE_WEIGHTS.totalDamageDoneToChampions,
    damageTaken: rawStats.damageTaken * SCORE_WEIGHTS.totalDamageTaken,
    buildings: rawStats.buildings * SCORE_WEIGHTS.buildingKill,
    eliteMonsters: rawStats.eliteMonsters * SCORE_WEIGHTS.eliteMonsterKill,
  };

  // 表示用に両方の値を持つオブジェクトを作成
  const displayStats = {};
  for (const key in rawStats) {
    displayStats[key] = {
      raw: rawStats[key],
      weighted: weightedStats[key]
    };
  }

  return displayStats;
}
