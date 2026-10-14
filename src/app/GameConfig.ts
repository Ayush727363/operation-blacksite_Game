export type GameModeType = 'bomb_defusal' | 'team_deathmatch' | 'ffa_deathmatch';

export interface GameConfig {
  mode: GameModeType;
  difficulty: number; // 1 to 10
  botCount: number; // 1 to 12
  roundTimeSeconds: number;
  buyTimeSeconds: number;
  warmupTimeSeconds: number;
  bombFuseSeconds: number;
  bombPlantSeconds: number;
  bombDefuseSeconds: number;
  roundsToWin: number;
  tdmScoreLimit: number;
  ffaScoreLimit: number;
  startingMoney: number;
  maxMoney: number;
  debugMode: boolean;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  mode: 'bomb_defusal',
  difficulty: 5,
  botCount: 7,
  roundTimeSeconds: 105,
  buyTimeSeconds: 12,
  warmupTimeSeconds: 3,
  bombFuseSeconds: 40,
  bombPlantSeconds: 3.2,
  bombDefuseSeconds: 5.0,
  roundsToWin: 7,
  tdmScoreLimit: 35,
  ffaScoreLimit: 20,
  startingMoney: 800,
  maxMoney: 16000,
  debugMode: false
};
