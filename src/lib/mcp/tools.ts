/**
 * What the `/mcp` tools answer, as plain functions split by domain:
 * - `public-tools.ts`: palates, recommendations, comparisons, drinks, drafts
 * - `venue-tools.ts`: menu ranking and claimed bar menus
 * - `member-tools.ts`: authenticated `/mcp/me` pours, bars, follows, and logging
 */
export { matchDrink } from '../drinks/search';
export type {
  Bearing,
  DrinkSummary,
  MemberTools,
  PalateSummary,
  ReadPalate,
  ReadVenue,
  ToolContext,
  ToolResult,
} from './tool-helpers';
export {
  comparePalates,
  draftPour,
  getDrink,
  getPalate,
  recommendDrinks,
  recommendForGroup,
  searchDrinks,
  type DraftResult,
  type DrinkDetail,
  type GroupDrink,
} from './public-tools';
export { getBarMenu, rankMenu, type MenuEntry, type RankedItem, type UnplacedItem } from './venue-tools';
export {
  logMemberPour,
  myBars,
  myFollows,
  myPours,
  type BarSummary,
  type LogPourInput,
  type PourSummary,
} from './member-tools';
