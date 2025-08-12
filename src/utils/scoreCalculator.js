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

export function processTimelineData(timeline, mainPlayerPuuid, opponentPuuid) {
  const chartData = [];
  const gameEvents = [];
  const scoreDifferences = [];

  if (!timeline || !timeline.info || !timeline.info.frames || !timeline.info.participants) {
    return { chartData, gameEvents, averageScoreDifference: 0 };
  }

  const mainPlayerTimelineParticipant = timeline.info.participants.find(p => p.puuid === mainPlayerPuuid);
  const opponentTimelineParticipant = timeline.info.participants.find(p => p.puuid === opponentPuuid);

  if (!mainPlayerTimelineParticipant || !opponentTimelineParticipant) {
    return { chartData, gameEvents, averageScoreDifference: 0 };
  }

  const mainPlayerId = mainPlayerTimelineParticipant.participantId;
  const opponentPlayerId = opponentTimelineParticipant.participantId;

  // Pre-scan for abnormal ward counts
  let mainPlayerTotalWards = 0;
  let opponentPlayerTotalWards = 0;
  const processedWardEventsPreScan = new Set();
  for (const frame of timeline.info.frames) {
    for (const event of frame.events) {
      if (event.type === 'WARD_PLACED') {
        const wardPlacedKey = `placed-${event.creatorId}-${event.timestamp}`;
        if (processedWardEventsPreScan.has(wardPlacedKey)) continue;
        if (event.creatorId === mainPlayerId) {
          mainPlayerTotalWards++;
        } else if (event.creatorId === opponentPlayerId) {
          opponentPlayerTotalWards++;
        }
        processedWardEventsPreScan.add(wardPlacedKey);
      }
    }
  }

  const isWardCountAbnormal = mainPlayerTotalWards > 200 || opponentPlayerTotalWards > 200;

  const mainPlayerEventScores = { kills: 0, deaths: 0, assists: 0, wardsPlaced: 0, wardsKilled: 0, buildingKill: 0, eliteMonsterKill: 0 };
  const opponentPlayerEventScores = { ...mainPlayerEventScores };

  for (const frame of timeline.info.frames) {
    const processedWardEvents = new Set();

    for (const event of frame.events) {
      updateEventScores(event, mainPlayerId, opponentPlayerId, mainPlayerEventScores, opponentPlayerEventScores, processedWardEvents);
      if (frame.timestamp !== 0) {
        collectGameEvents(event, mainPlayerId, opponentPlayerId, gameEvents);
      }
    }

    if (frame.timestamp === 0) continue;

    const mainPlayerFrame = frame.participantFrames[mainPlayerId];
    const opponentPlayerFrame = frame.participantFrames[opponentPlayerId];

    if (mainPlayerFrame && opponentPlayerFrame) {
      const mainPlayerStats = calculateFrameStats(mainPlayerFrame, mainPlayerEventScores, isWardCountAbnormal);
      const opponentPlayerStats = calculateFrameStats(opponentPlayerFrame, opponentPlayerEventScores, isWardCountAbnormal);

      const calculateTotalScore = (stats) => Object.values(stats).reduce((sum, val) => sum + val.weighted, 0);

      const mainPlayerTotalScore = calculateTotalScore(mainPlayerStats);
      const opponentPlayerTotalScore = calculateTotalScore(opponentPlayerStats);
      const scoreDifference = mainPlayerTotalScore - opponentPlayerTotalScore;

      chartData.push({
        time: frame.timestamp / 60000,
        scoreDifference,
        mainPlayerScore: mainPlayerTotalScore,
        opponentPlayerScore: opponentPlayerTotalScore,
        mainPlayerStats,
        opponentPlayerStats,
      });
      scoreDifferences.push(scoreDifference);
    }
  }

  const averageScoreDifference = scoreDifferences.length > 0
    ? Math.round(scoreDifferences.reduce((a, b) => a + b, 0) / scoreDifferences.length)
    : 0;

  return { chartData, gameEvents, averageScoreDifference };
}

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
      if (processedWardEvents.has(wardPlacedKey)) break;
      if (event.creatorId === mainPlayerId) mainPlayerEventScores.wardsPlaced += 1;
      else if (event.creatorId === opponentPlayerId) opponentPlayerEventScores.wardsPlaced += 1;
      processedWardEvents.add(wardPlacedKey);
      break;

    case 'WARD_KILL':
      const wardKillKey = `killed-${event.killerId}-${event.timestamp}`;
      if (processedWardEvents.has(wardKillKey)) break;
      if (event.killerId === mainPlayerId) mainPlayerEventScores.wardsKilled += 1;
      else if (event.killerId === opponentPlayerId) opponentPlayerEventScores.wardsKilled += 1;
      processedWardEvents.add(wardKillKey);
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

function collectGameEvents(event, mainPlayerId, opponentPlayerId, gameEvents) {
  const time = event.timestamp / 60000;

  if (event.type === 'CHAMPION_KILL') {
    if (event.killerId === mainPlayerId || event.killerId === opponentPlayerId) {
      gameEvents.push({ type: 'KILL', time, killerId: event.killerId, victimId: event.victimId });
    }
  } else if (event.type === 'BUILDING_KILL' || event.type === 'ELITE_MONSTER_KILL') {
    if (event.killerId === mainPlayerId || event.killerId === opponentPlayerId) {
      gameEvents.push({ type: 'OBJECTIVE', time, killerId: event.killerId, objectiveType: event.buildingType || event.monsterType });
    }
  }
}

function calculateFrameStats(pFrame, eventScores, isWardCountAbnormal) {
  const { damageStats } = pFrame;
  const rawStats = {
    gold: pFrame.totalGold ?? 0,
    kills: eventScores.kills,
    deaths: eventScores.deaths,
    assists: eventScores.assists,
    wardsPlaced: isWardCountAbnormal ? -1 : eventScores.wardsPlaced,
    wardsKilled: eventScores.wardsKilled,
    damageDealt: damageStats?.totalDamageDoneToChampions ?? 0,
    damageTaken: damageStats?.totalDamageTaken ?? 0,
    buildings: eventScores.buildingKill,
    eliteMonsters: eventScores.eliteMonsterKill,
  };

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

  const displayStats = {};
  for (const key in rawStats) {
    displayStats[key] = {
      raw: rawStats[key],
      weighted: weightedStats[key]
    };
  }

  return displayStats;
}
