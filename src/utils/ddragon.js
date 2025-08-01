import { DDRAGON_VERSION } from './constants';

export const CHAMPION_IMAGE_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/`;

export const getChampionImage = (championName) => {
  if (championName === 'FiddleSticks') {
    championName = 'Fiddlesticks';
  }
  return `${CHAMPION_IMAGE_URL}${championName}.png`;
};
