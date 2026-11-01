import { hero } from './hero.js';
import { type } from './type.js';
import { portal } from './portal.js';
import { stars } from './stars.js';
import { moon } from './moon.js';

/* name -> scene definition. A definition is { fs, w, ratio, maxDpr, fit, init(S, ctx), fill(S, t) }. */
export const scenes = { hero, type, portal, stars, moon };
