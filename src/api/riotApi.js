import axios from 'axios';

const API_KEY = import.meta.env.VITE_RIOT_API_KEY;

// Riot APIのリージョン設定
// account-v1とmatch-v5は大陸毎にエンドポイントが異なる (例: asia)
const CONTINENTAL_REGION = 'asia';

// account-v1 API用のaxiosインスタンス
const apiAccountV1 = axios.create({
  baseURL: `https://${CONTINENTAL_REGION}.api.riotgames.com/riot/account/v1/accounts`,
});

const apiV5 = axios.create({
  baseURL: `https://${CONTINENTAL_REGION}.api.riotgames.com/lol/match/v5/matches`,
});

// リクエストインターセプターで、すべてのリクエストにAPIキーをヘッダーとして追加
const addApiKeyInterceptor = (config) => {
  if (!API_KEY) {
    // APIキーが設定されていない場合はエラーを投げる
    const errorMsg = "Riot Games APIキーが設定されていません。.env.localファイルを確認してください。";
    console.error(errorMsg);
    return Promise.reject(new Error(errorMsg));
  }
  config.headers['X-Riot-Token'] = API_KEY;
  return config;
};

apiAccountV1.interceptors.request.use(addApiKeyInterceptor);
apiV5.interceptors.request.use(addApiKeyInterceptor);


/**
 * Riot IDからアカウント情報（PUUIDなど）を取得します。
 * @param {string} gameName - プレイヤーのゲーム名
 * @param {string} tagLine - プレイヤーのタグライン
 * @returns {Promise<object>} アカウント情報
 */
export const getAccountByRiotId = async (gameName, tagLine) => {
  const response = await apiAccountV1.get(`/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
  return response.data;
};

/**
 * PUUIDから直近の試合IDリストを取得します。
 * @param {string} puuid - プレイヤーのPUUID
 * @param {object} [params={ count: 10 }] - クエリパラメータ (例: { count: 10, start: 0 })
 * @returns {Promise<string[]>} 試合IDの配列
 */
export const getMatchIdsByPuuid = async (puuid, params = { count: 10 }) => {
  const response = await apiV5.get(`/by-puuid/${puuid}/ids`, { params });
  return response.data;
};

/**
 * 試合IDから試合の詳細情報を取得します。
 * @param {string} matchId - 試合ID
 * @returns {Promise<object>} 試合詳細情報
 */
export const getMatchDetails = async (matchId) => {
  const response = await apiV5.get(`/${matchId}`);
  return response.data;
};

/**
 * 試合IDから試合のタイムライン情報を取得します。
 * @param {string} matchId - 試合ID
 * @returns {Promise<object>} 試合のタイムライン情報
 */
export const getMatchTimeline = async (matchId) => {
  const response = await apiV5.get(`/${matchId}/timeline`);
  return response.data;
};
