import { study } from './level01-the-study';
import { createStudy } from './level01-the-study/logic';
import type { Game, LevelController } from '../engine/Game';
import type { LevelDefinition } from '../engine/Level';
export const levels: { definition:LevelDefinition; controller:(game:Game)=>LevelController }[] = [
  {definition:study,controller:createStudy},
];
