import React, { useState, useMemo, useCallback } from 'react';
import SearchForm from './components/SearchForm';
import MatchHistory from './components/MatchHistory';
import MatchDetail from './components/MatchDetail'; // MatchDetailを直接使う可能性
import { getAccountByRiotId, getMatchIdsByPuuid, getMatchDetails, getMatchTimeline } from './api/riotApi';
import { processTimelineData } from './utils/scoreCalculator';

const MATCH_COUNT_PER_PAGE = 5;
const MATCH_ID_COUNT_PER_API_CALL = 100;

function App() {
  // Search and data states
  const [allMatchData, setAllMatchData] = useState([]);
  const [allMatchIds, setAllMatchIds] = useState([]);
  const [displayedMatchesCount, setDisplayedMatchesCount] = useState(MATCH_COUNT_PER_PAGE);
  const [apiMatchStart, setApiMatchStart] = useState(0);
  const [hasMoreMatches, setHasMoreMatches] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchedPuuid, setSearchedPuuid] = useState(null);

  // Selected match and player states
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [mainPlayer, setMainPlayer] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [gameEvents, setGameEvents] = useState([]);

  const fetchFullMatchDetails = useCallback(async (matchIds) => {
    return Promise.all(
      matchIds.map(async (matchId) => {
        const match = await getMatchDetails(matchId);
        const timeline = await getMatchTimeline(matchId);
        return { match, timeline };
      })
    );
  }, []);

  const handleSearch = useCallback(async (riotId) => {
    if (!riotId || !riotId.includes('#')) {
      setError('正しい形式でRiot IDを入力してください (例: PlayerName#JP1)。');
      return;
    }
    const [gameName, tagLine] = riotId.split('#');

    setLoading(true);
    setError(null);
    setAllMatchData([]);
    setAllMatchIds([]);
    setSelectedMatchId(null);
    setSearchedPuuid(null);
    setDisplayedMatchesCount(MATCH_COUNT_PER_PAGE);
    setApiMatchStart(0);
    setHasMoreMatches(true);
    // Reset player/chart states
    setMainPlayer(null);
    setOpponent(null);
    setChartData([]);
    setGameEvents([]);
    setSelectedRole(null);

    try {
      const account = await getAccountByRiotId(gameName, tagLine);
      setSearchedPuuid(account.puuid);

      const matchIds = await getMatchIdsByPuuid(account.puuid, { start: 0, count: MATCH_ID_COUNT_PER_API_CALL });
      setAllMatchIds(matchIds);
      setApiMatchStart(MATCH_ID_COUNT_PER_API_CALL);

      if (matchIds.length < MATCH_ID_COUNT_PER_API_CALL) {
        setHasMoreMatches(false);
      }

      const initialMatchIds = matchIds.slice(0, MATCH_COUNT_PER_PAGE);
      const matchesDetails = await fetchFullMatchDetails(initialMatchIds);
      
      const processedMatches = matchesDetails.map(({ match, timeline }) => {
        const mainP = match.info.participants.find(p => p.puuid === account.puuid);
        const opp = mainP ? match.info.participants.find(p => p.teamId !== mainP.teamId && p.teamPosition === mainP.teamPosition) : null;
        const { averageScoreDifference } = processTimelineData(timeline, mainP?.puuid, opp?.puuid);
        return { match, timeline, puuid: account.puuid, averageScoreDifference };
      });

      setAllMatchData(processedMatches);

    } catch (err) {
      console.error(err);
      setError(err.response?.status === 404 ? 'プレイヤーが見つかりませんでした。' : 'データの取得に失敗しました。APIキーが有効か確認してください。');
    } finally {
      setLoading(false);
    }
  }, [fetchFullMatchDetails]);

  const handleLoadMore = useCallback(async () => {
    setLoading(true);
    const currentIdCount = allMatchIds.length;
    const currentDataCount = allMatchData.length;

    try {
      let newMatchIds = [];
      if (currentDataCount < currentIdCount) {
        // Load more from existing allMatchIds
        newMatchIds = allMatchIds.slice(currentDataCount, currentDataCount + MATCH_COUNT_PER_PAGE);
      } else if (hasMoreMatches) {
        // Fetch new match IDs from API
        const fetchedIds = await getMatchIdsByPuuid(searchedPuuid, { start: apiMatchStart, count: MATCH_ID_COUNT_PER_API_CALL });
        if (fetchedIds.length < MATCH_ID_COUNT_PER_API_CALL) {
          setHasMoreMatches(false);
        }
        setAllMatchIds(prev => [...prev, ...fetchedIds]);
        setApiMatchStart(prev => prev + MATCH_ID_COUNT_PER_API_CALL);
        newMatchIds = fetchedIds.slice(0, MATCH_COUNT_PER_PAGE);
      }

      if (newMatchIds.length > 0) {
        const newMatchesDetails = await fetchFullMatchDetails(newMatchIds);
        const processedMatches = newMatchesDetails.map(({ match, timeline }) => {
            const mainP = match.info.participants.find(p => p.puuid === searchedPuuid);
            const opp = mainP ? match.info.participants.find(p => p.teamId !== mainP.teamId && p.teamPosition === mainP.teamPosition) : null;
            const { averageScoreDifference } = processTimelineData(timeline, mainP?.puuid, opp?.puuid);
            return { match, timeline, puuid: searchedPuuid, averageScoreDifference };
        });
        setAllMatchData(prev => [...prev, ...processedMatches]);
      }
    } catch (err) {
      console.error(err);
      setError('追加の試合履歴の読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [apiMatchStart, hasMoreMatches, searchedPuuid, fetchFullMatchDetails, allMatchIds, allMatchData]);

  const selectedMatchData = useMemo(() => {
    return allMatchData.find(m => m.match.metadata.matchId === selectedMatchId) || null;
  }, [selectedMatchId, allMatchData]);

  const handleSelectMatch = useCallback((matchId) => {
    if (selectedMatchId === matchId) {
      setSelectedMatchId(null);
      return;
    }
    
    const matchDataItem = allMatchData.find(m => m.match.metadata.matchId === matchId);
    if (!matchDataItem) return;

    const { match, timeline, puuid } = matchDataItem;
    const initialPlayer = match.info.participants.find(p => p.puuid === puuid);
    if (!initialPlayer) return;

    const initialOpponent = match.info.participants.find(p => p.teamId !== initialPlayer.teamId && p.teamPosition === initialPlayer.teamPosition);
    const initialRole = initialPlayer.teamPosition;

    const { chartData, gameEvents } = processTimelineData(timeline, initialPlayer.puuid, initialOpponent?.puuid);

    setMainPlayer(initialPlayer);
    setOpponent(initialOpponent);
    setChartData(chartData);
    setGameEvents(gameEvents);
    setSelectedRole(initialRole);
    setSelectedMatchId(matchId);
  }, [selectedMatchId, allMatchData]);

  const handlePlayerSelect = useCallback((role) => {
    if (!selectedMatchData) return;

    const { match, timeline } = selectedMatchData;
    const searchedPlayer = match.info.participants.find(p => p.puuid === searchedPuuid);
    if (!searchedPlayer) return;

    const newMainPlayer = match.info.participants.find(p => p.teamId === searchedPlayer.teamId && p.teamPosition === role) || searchedPlayer;
    const newOpponent = match.info.participants.find(p => p.teamId !== newMainPlayer.teamId && p.teamPosition === newMainPlayer.teamPosition);

    const { chartData, gameEvents } = processTimelineData(timeline, newMainPlayer.puuid, newOpponent?.puuid);

    setMainPlayer(newMainPlayer);
    setOpponent(newOpponent);
    setChartData(chartData);
    setGameEvents(gameEvents);
    setSelectedRole(role);
  }, [selectedMatchData, searchedPuuid]);

  return (
    <div className="bg-gray-900 text-slate-200 min-h-screen font-sans">
      <header className="text-center py-10">
        <h1 className="text-5xl font-bold text-cyan-400">LoL Lane Diff Visualizer</h1>
        <p className="text-xl text-slate-400 mt-2">対面プレイヤーとの影響力差を可視化</p>
      </header>
      <main className="container mx-auto px-4 pb-10 flex flex-col items-center gap-8">
        <SearchForm onSearch={handleSearch} loading={loading} />

        {loading && allMatchData.length === 0 && <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400"></div>}
        {error && <p className="bg-red-900/50 text-red-300 border border-red-500 rounded-md px-4 py-2">{error}</p>}

        <MatchHistory
          matches={allMatchData}
          onSelectMatch={handleSelectMatch}
          selectedMatchId={selectedMatchId}
          puuid={searchedPuuid}
          // Props for MatchDetail
          selectedMatchData={selectedMatchData}
          mainPlayer={mainPlayer}
          opponent={opponent}
          chartData={chartData}
          gameEvents={gameEvents}
          selectedRole={selectedRole}
          onPlayerSelect={handlePlayerSelect}
          onSearchPlayer={handleSearch}
          // Props for loading more
          onLoadMore={handleLoadMore}
          hasMore={hasMoreMatches || allMatchIds.length > allMatchData.length}
          loading={loading}
        />
      </main>
      <footer className="text-center text-xs text-slate-500 py-6 px-4 max-w-3xl mx-auto">
        <p>LoL Matchup Stats isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.</p>
      </footer>
    </div>
  );
}

export default App;
