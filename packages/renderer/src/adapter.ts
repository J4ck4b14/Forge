import type { World } from '@forge/core';
import type { AssetData } from '@forge/assets';
export interface View {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}
/** Forge-owned boundary. No Pixi object is exposed to components or project code. */
export interface Renderer2D {
  setAssets(assets: readonly AssetData[]): Promise<void>;
  render(world: World, view?: View): void;
  resize(width: number, height: number): void;
  destroy(): void;
}
