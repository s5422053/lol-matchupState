import { DDRAGON_VERSION as FALLBACK_VERSION } from './constants';

let currentVersion = FALLBACK_VERSION;
let fetchPromise = null;

/**
 * DataDragonの最新バージョンをAPIから取得
 * @returns {Promise<string>} 最新バージョン文字列 (例: "15.15.1")
 */
export const fetchLatestDdragonVersion = async () => {
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
      if (!response.ok) {
        throw new Error(`DataDragon API status: ${response.status}`);
      }
      const versions = await response.json();
      if (Array.isArray(versions) && versions.length > 0) {
        currentVersion = versions[0];
      }
    } catch (error) {
      console.warn('DataDragonの最新バージョン取得に失敗したためフォールバックを使用します:', error);
    }
    return currentVersion;
  })();

  return fetchPromise;
};

// モジュール読み込み時に非同期取得を開始
fetchLatestDdragonVersion();

export const getChampionImage = (championName, version) => {
  if (!championName) return '';
  if (championName === 'FiddleSticks') {
    championName = 'Fiddlesticks';
  }
  const ver = version || currentVersion;
  return `https://ddragon.leagueoflegends.com/cdn/${ver}/img/champion/${championName}.png`;
};

