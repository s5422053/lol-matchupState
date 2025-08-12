import axios from 'axios';

const isDevelopment = process.env.NODE_ENV === 'development';

// Riot APIのリージョン設定
const CONTINENTAL_REGION = 'asia';
const ACCOUNT_V1_RIOT_URL = `https://${CONTINENTAL_REGION}.api.riotgames.com/riot/account/v1/accounts`;
const MATCH_V5_RIOT_URL = `https://${CONTINENTAL_REGION}.api.riotgames.com/lol/match/v5/matches`;

/**
 * 環境に応じたAPIリクエストを送信する共通関数
 * @param {string} requestUrl - 実際にリクエストする完全なURL（本番環境）またはプロキシ用のパス（開発環境）
 * @returns {Promise<object>} APIからのレスポンスデータ
 */
const fetchFromApi = async (requestUrl) => {
  try {
    let response;
    if (isDevelopment) {
      // 開発環境：Viteプロキシを介してリクエスト
      // requestUrlは /riot/... や /lol/... で始まるパス
      response = await axios.get(`/api${requestUrl}`);
    } else {
      // 本番環境：Netlify Functionに完全なURLを渡す
      response = await axios.get('/.netlify/functions/riotApi', {
        params: { url: requestUrl }
      });
    }
    return response.data;
  } catch (error) {
    console.error(`Error fetching from ${requestUrl}:`, error.response?.data || error.message);
    throw error.response?.data || new Error('API request failed');
  }
};

const apiCache = new Map(); // Global cache object

export const getAccountByRiotId = async (gameName, tagLine) => {
  const endpoint = isDevelopment
    ? `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    : `${ACCOUNT_V1_RIOT_URL}/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return fetchFromApi(endpoint);
};

export const getMatchIdsByPuuid = async (puuid, params) => {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = isDevelopment
    ? `/lol/match/v5/matches/by-puuid/${puuid}/ids?${queryString}`
    : `${MATCH_V5_RIOT_URL}/by-puuid/${puuid}/ids?${queryString}`;
  return fetchFromApi(endpoint);
};

export const getMatchDetails = async (matchId) => {
  const cacheKey = `matchDetails-${matchId}`;
  if (apiCache.has(cacheKey)) {
    console.log(`Cache hit for ${cacheKey}`);
    return apiCache.get(cacheKey);
  }

  const endpoint = isDevelopment 
    ? `/lol/match/v5/matches/${matchId}`
    : `${MATCH_V5_RIOT_URL}/${matchId}`;
  const data = await fetchFromApi(endpoint);
  apiCache.set(cacheKey, data);
  console.log(`Cache set for ${cacheKey}`);
  return data;
};

export const getMatchTimeline = async (matchId) => {
  const cacheKey = `matchTimeline-${matchId}`;
  if (apiCache.has(cacheKey)) {
    console.log(`Cache hit for ${cacheKey}`);
    return apiCache.get(cacheKey);
  }

  const endpoint = isDevelopment
    ? `/lol/match/v5/matches/${matchId}/timeline`
    : `${MATCH_V5_RIOT_URL}/${matchId}/timeline`;
  const data = await fetchFromApi(endpoint);
  apiCache.set(cacheKey, data);
  console.log(`Cache set for ${cacheKey}`);
  return data;
};