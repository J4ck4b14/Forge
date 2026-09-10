import type { ScriptContext } from '@forge/scripting';
import type { SpriteData } from '@forge/renderer';
export function sprite(
  c: ScriptContext,
  id: string,
  changes: Partial<SpriteData>,
): void {
  c.set(
    'forge.sprite',
    { ...c.get<SpriteData>('forge.sprite', id)!, ...changes },
    id,
  );
}
export function show(c: ScriptContext, name: string, visible: boolean): void {
  sprite(c, c.find(name)!, { visible });
}
export function bar(
  c: ScriptContext,
  name: string,
  value: number,
  maximum: number,
): void {
  sprite(c, c.find(name)!, {
    width: Math.max(1, (160 * value) / maximum),
    visible: value > 0,
  });
}
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
