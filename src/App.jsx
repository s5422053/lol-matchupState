import React, { useState, useMemo, useCallback } from 'react';
import SearchForm from './components/SearchForm';
import MatchHistory from './components/MatchHistory';
import { getAccountByRiotId, getMatchIdsByPuuid, getMatchDetails, getMatchTimeline } from './api/riotApi';

function App() {
  const [matchData, setMatchData] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchedPuuid, setSearchedPuuid] = useState(null);

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
    setSelectedMatchId(null);
    setSearchedPuuid(null);

    try {
      const account = await getAccountByRiotId(gameName, tagLine);
      setSearchedPuuid(account.puuid);

      const matchIds = await getMatchIdsByPuuid(account.puuid);
      const limitedMatchIds = matchIds.slice(0, 10);

      const matchesDetails = await Promise.all(
        limitedMatchIds.map(async (matchId) => {
          // タイムラインは詳細表示時に取得するように変更し、初期ロードを高速化
          const match = await getMatchDetails(matchId);
          return { match, puuid: account.puuid };
        })
      );

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
  }, []);

  const handleSelectMatch = useCallback(async (matchId) => {
    // 同じ試合がクリックされたら詳細を閉じる
    if (selectedMatchId === matchId) {
      setSelectedMatchId(null);
      return;
    }

    setSelectedMatchId(matchId);
    // 選択された試合のタイムラインデータをここで取得
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

        {loading && <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400"></div>}
        {error && <p className="bg-red-900/50 text-red-300 border border-red-500 rounded-md px-4 py-2">{error}</p>}

        <MatchHistory
          matches={matchData}
          onSelectMatch={handleSelectMatch}
          selectedMatchId={selectedMatchId}
          puuid={searchedPuuid}
          selectedMatchData={selectedMatchData}
        />
      </main>
      <footer className="text-center text-xs text-slate-500 py-6 px-4 max-w-3xl mx-auto">
        <p>LoL Matchup Stats isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.</p>
      </footer>
    </div>
  );
}

export default App;