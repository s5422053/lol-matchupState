import axios from 'axios';

// Netlify Functionのエンドポイント
const NETLIFY_FUNCTION_URL = '/.netlify/functions/riotApi';

// Riot APIのリージョン設定
const CONTINENTAL_REGION = 'asia';

// 各APIのベースURL
const ACCOUNT_V1_BASE_URL = `https://${CONTINENTAL_REGION}.api.riotgames.com/riot/account/v1/accounts`;
const MATCH_V5_BASE_URL = `https://${CONTINENTAL_REGION}.api.riotgames.com/lol/match/v5/matches`;

/**
 * Netlify Functionを介してRiot APIにリクエストを送信する共通関数
 * @param {string} requestUrl - 実際にリクエストするRiot APIの完全なURL
 * @returns {Promise<object>} APIからのレスポンスデータ
 */
const fetchFromRiotApi = async (requestUrl) => {
  try {
    const response = await axios.get(NETLIFY_FUNCTION_URL, {
      params: {
        url: requestUrl // クエリパラメータとして実際のURLを渡す
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching from Netlify function:', error.response?.data || error.message);
    // エラーオブジェクトをそのままスローして、呼び出し元で処理できるようにする
    throw error.response?.data || new Error('Netlify Function request failed');
  }
};

export const getAccountByRiotId = async (gameName, tagLine) => {
  const url = `${ACCOUNT_V1_BASE_URL}/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return fetchFromRiotApi(url);
};

export const getMatchIdsByPuuid = async (puuid, params) => {
  const queryString = new URLSearchParams(params).toString();
  const url = `${MATCH_V5_BASE_URL}/by-puuid/${puuid}/ids?${queryString}`;
  return fetchFromRiotApi(url);
};

export const getMatchDetails = async (matchId) => {
  const url = `${MATCH_V5_BASE_URL}/${matchId}`;
  return fetchFromRiotApi(url);
};

export const getMatchTimeline = async (matchId) => {
  const url = `${MATCH_V5_BASE_URL}/${matchId}/timeline`;
  return fetchFromRiotApi(url);
};