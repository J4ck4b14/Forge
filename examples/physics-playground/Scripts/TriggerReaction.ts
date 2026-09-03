import type { ScriptContext } from '@forge/scripting';
export const fields = {
  target: { type: 'entity', default: '' },
  color: { type: 'color', default: '#8bffb3' },
} as const;
export default class TriggerReaction {
  target = '';
  color = '#8bffb3';
  onTriggerEnter(ctx: ScriptContext) {
    const id = this.target || ctx.entity;
    const sprite = ctx.get<Record<string, unknown>>('forge.sprite', id);
    if (sprite) ctx.set('forge.sprite', { ...sprite, tint: this.color }, id);
    ctx.log('Trigger entered: target tint changed in runtime only.');
  }
  onTriggerExit(ctx: ScriptContext) {
    ctx.log('Trigger exited.');
  }
}
