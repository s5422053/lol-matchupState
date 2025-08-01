import React, { useState, useMemo, useCallback } from 'react';
import SearchForm from './components/SearchForm';
import MatchHistory from './components/MatchHistory';
import { getAccountByRiotId, getMatchIdsByPuuid, getMatchDetails, getMatchTimeline } from './api/riotApi';

const MATCH_COUNT_PER_PAGE = 10;
const MATCH_ID_COUNT_PER_API_CALL = 100;

function App() {
  const [matchData, setMatchData] = useState([]);
  const [allMatchIds, setAllMatchIds] = useState([]);
  const [displayedMatchesCount, setDisplayedMatchesCount] = useState(MATCH_COUNT_PER_PAGE);
  const [apiMatchStart, setApiMatchStart] = useState(0);
  const [hasMoreMatches, setHasMoreMatches] = useState(true); // API含め、まだ続きがあるか

  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchedPuuid, setSearchedPuuid] = useState(null);

  const fetchMatchDetails = useCallback(async (matchIds, puuid) => {
    return Promise.all(
      matchIds.map(async (matchId) => {
        const match = await getMatchDetails(matchId);
        return { match, puuid };
      })
    );
  }, []);

  const handleSearch = useCallback(async (riotId) => {
    if (!riotId || !riotId.includes('#')) {
      setError('正しい形式でRiot IDを入力してください (例: PlayerName#JP1)。');
      return;
    }
    const [gameName, tagLine] = riotId.split('#');

    if (!gameName || !tagLine) {
      setError('正しい形式でRiot IDを入力してください (例: PlayerName#JP1)。');
      return;
    }
    setLoading(true);
    setError(null);
    setMatchData([]);
    setAllMatchIds([]);
    setSelectedMatchId(null);
    setSearchedPuuid(null);
    setDisplayedMatchesCount(MATCH_COUNT_PER_PAGE);
    setApiMatchStart(0);
    setHasMoreMatches(true);

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
      const matchesDetails = await fetchMatchDetails(initialMatchIds, account.puuid);
      setMatchData(matchesDetails);

    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 404) {
        setError('プレイヤーが見つかりませんでした。');
      } else {
        setError('データの取得に失敗しました。APIキーが有効か確認してください。');
      }
    } finally {
      setLoading(false);
    }
  }, [fetchMatchDetails]);

  const handleLoadMore = useCallback(async () => {
    setLoading(true);

    const localHasMore = allMatchIds.length > displayedMatchesCount;

    if (localHasMore) {
      // ローカルに未表示の試合IDがある場合
      const nextMatchIds = allMatchIds.slice(displayedMatchesCount, displayedMatchesCount + MATCH_COUNT_PER_PAGE);
      try {
        const newMatchesDetails = await fetchMatchDetails(nextMatchIds, searchedPuuid);
        setMatchData(prevData => [...prevData, ...newMatchesDetails]);
        setDisplayedMatchesCount(prevCount => prevCount + MATCH_COUNT_PER_PAGE);
      } catch (err) {
        console.error(err);
        setError('追加の試合履歴の読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    } else if (hasMoreMatches) {
      // APIから追加で試合IDを取得する必要がある場合
      try {
        const newMatchIds = await getMatchIdsByPuuid(searchedPuuid, { start: apiMatchStart, count: MATCH_ID_COUNT_PER_API_CALL });
        if (newMatchIds.length > 0) {
          setAllMatchIds(prevIds => [...prevIds, ...newMatchIds]);
          setApiMatchStart(prevStart => prevStart + MATCH_ID_COUNT_PER_API_CALL);
          
          const nextMatchIds = newMatchIds.slice(0, MATCH_COUNT_PER_PAGE);
          const newMatchesDetails = await fetchMatchDetails(nextMatchIds, searchedPuuid);
          setMatchData(prevData => [...prevData, ...newMatchesDetails]);
          setDisplayedMatchesCount(prevCount => prevCount + MATCH_COUNT_PER_PAGE);
        }

        if (newMatchIds.length < MATCH_ID_COUNT_PER_API_CALL) {
          setHasMoreMatches(false);
        }
      } catch (err) {
        console.error(err);
        setError('追加の試合履歴の読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    }

  }, [allMatchIds, displayedMatchesCount, apiMatchStart, hasMoreMatches, searchedPuuid, fetchMatchDetails]);

  const handleSelectMatch = useCallback(async (matchId) => {
    if (selectedMatchId === matchId) {
      setSelectedMatchId(null);
      return;
    }

    setSelectedMatchId(matchId);
    const targetMatchIndex = matchData.findIndex(m => m.match.metadata.matchId === matchId);
    if (targetMatchIndex !== -1 && !matchData[targetMatchIndex].timeline) {
      try {
        setLoading(true);
        const timeline = await getMatchTimeline(matchId);
        setMatchData(prevData => {
          const newData = [...prevData];
          newData[targetMatchIndex] = { ...newData[targetMatchIndex], timeline };
          return newData;
        });
      } catch (err) {
        console.error("Failed to fetch timeline:", err);
        setError("試合のタイムラインデータの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    }
  }, [selectedMatchId, matchData]);

  const selectedMatchData = useMemo(() => {
    return matchData.find(m => m.match.metadata.matchId === selectedMatchId) || null;
  }, [selectedMatchId, matchData]);

  return (
    <div className="bg-gray-900 text-slate-200 min-h-screen font-sans">
      <header className="text-center py-10">
        <h1 className="text-5xl font-bold text-cyan-400">LoL Matchup Stats</h1>
        <p className="text-xl text-slate-400 mt-2">対面プレイヤーとの影響力差を可視化</p>
      </header>
      <main className="container mx-auto px-4 pb-10 flex flex-col items-center gap-8">
        <SearchForm onSearch={handleSearch} loading={loading} />

        {loading && matchData.length === 0 && <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400"></div>}
        {error && <p className="bg-red-900/50 text-red-300 border border-red-500 rounded-md px-4 py-2">{error}</p>}

        <MatchHistory
          matches={matchData}
          onSelectMatch={handleSelectMatch}
          selectedMatchId={selectedMatchId}
          puuid={searchedPuuid}
          selectedMatchData={selectedMatchData}
          onLoadMore={handleLoadMore}
          hasMore={hasMoreMatches || allMatchIds.length > displayedMatchesCount}
          loading={loading}
          onPlayerSelect={handleSearch} // プレイヤー選択時の検索実行用
        />
      </main>
      <footer className="text-center text-xs text-slate-500 py-6 px-4 max-w-3xl mx-auto">
        <p>LoL Matchup Stats isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.</p>
      </footer>
    </div>
  );
}

export default App;