import { BehaviourGraphSchema, GRAPH_MIME } from '@forge/graphs';
import { deterministicJSON, type ProjectData } from '@forge/serialization';

export const INTERCHANGE_VERSION = 1;
export type ExportTarget = 'godot' | 'unity' | 'unreal';
export type PortabilityStatus =
  | 'fully-portable'
  | 'approximated'
  | 'manual-work'
  | 'unsupported';
export interface InterchangeAsset {
  readonly id: string;
  readonly path: string;
  readonly kind: string;
  readonly mime: string;
  readonly data: string;
  readonly width: number;
  readonly height: number;
}
export interface InterchangeComponent {
  readonly type: string;
  readonly data: unknown;
}
export interface InterchangeEntity {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly parent: string | null;
  readonly transform: readonly [number, number, number, number, number, number];
  readonly components: readonly InterchangeComponent[];
}
export interface InterchangeScene {
  readonly id: string;
  readonly name: string;
  readonly entities: readonly InterchangeEntity[];
}
export interface ForgeInterchange {
  readonly version: typeof INTERCHANGE_VERSION;
  readonly source: {
    readonly project: string;
    readonly name: string;
    readonly engineVersion: string;
  };
  readonly coordinates: {
    readonly unit: 'pixel';
    readonly x: 'right';
    readonly y: 'down';
    readonly rotation: 'clockwise-radians';
  };
  readonly startupScene: string | null;
  readonly scenes: readonly InterchangeScene[];
  readonly assets: readonly InterchangeAsset[];
  readonly physics: ProjectData['physics'];
  readonly input: ProjectData['input'];
  readonly mixer: ProjectData['mixer'];
  readonly achievements: ProjectData['persistence']['achievements'];
}
export interface Capability {
  readonly status: PortabilityStatus;
  readonly reason: string;
}
export interface PortabilityItem extends Capability {
  readonly feature: string;
  readonly sourceId: string;
  readonly path: string;
}
export interface PortabilityReport {
  readonly target: ExportTarget;
  readonly project: string;
  readonly entities: number;
  readonly summary: Readonly<Record<PortabilityStatus, number>>;
  readonly items: readonly PortabilityItem[];
}
export interface ExportManifest {
  readonly interchangeVersion: number;
  readonly target: ExportTarget;
  readonly sourceProject: string;
  readonly sourceEngineVersion: string;
  readonly sourceHash: string;
  readonly generatedRoot: string;
  readonly ids: Readonly<Record<string, string>>;
  readonly report: PortabilityReport;
}

const full = (reason: string): Capability => ({
    status: 'fully-portable',
    reason,
  }),
  approximate = (reason: string): Capability => ({
    status: 'approximated',
    reason,
  }),
  manual = (reason: string): Capability => ({
    status: 'manual-work',
    reason,
  }),
  unsupported = (reason: string): Capability => ({
    status: 'unsupported',
    reason,
  });

const componentCapabilities: Readonly<
  Record<string, Readonly<Record<ExportTarget, Capability>>>
> = {
  'forge.tags': {
    godot: full('Metadata'),
    unity: full('Tags/metadata'),
    unreal: full('Actor tags'),
  },
  'forge.sprite': {
    godot: full('Sprite2D'),
    unity: full('SpriteRenderer'),
    unreal: approximate('Paper2D sprite'),
  },
  'forge.camera': {
    godot: full('Camera2D'),
    unity: full('Camera'),
    unreal: approximate('Orthographic camera actor'),
  },
  'forge.camera-follow': {
    godot: manual('Follow settings retained for target-side implementation'),
    unity: approximate('Generated follow component'),
    unreal: approximate('Generated component'),
  },
  'forge.camera-zone': {
    godot: manual('Zone settings retained for target-side implementation'),
    unity: approximate('Generated trigger/component'),
    unreal: approximate('Generated volume/component'),
  },
  'forge.rigidbody': {
    godot: full('Body2D type'),
    unity: full('Rigidbody2D'),
    unreal: approximate('Paper2D-compatible physics component'),
  },
  'forge.character-body': {
    godot: full('CharacterBody2D'),
    unity: approximate('Rigidbody2D controller'),
    unreal: approximate('Pawn movement component'),
  },
  'forge.box-collider': {
    godot: full('RectangleShape2D'),
    unity: full('BoxCollider2D'),
    unreal: approximate('Box collision component'),
  },
  'forge.circle-collider': {
    godot: full('CircleShape2D'),
    unity: full('CircleCollider2D'),
    unreal: approximate('Sphere collision component'),
  },
  'forge.capsule-collider': {
    godot: full('CapsuleShape2D'),
    unity: full('CapsuleCollider2D'),
    unreal: approximate('Capsule collision component'),
  },
  'forge.light': {
    godot: approximate('PointLight2D radial-light reconstruction'),
    unity: approximate('URP 2D Light when installed'),
    unreal: approximate('2D/orthographic light approximation'),
  },
  'forge.shadow-caster': {
    godot: manual('Occluder bounds retained for target-side implementation'),
    unity: approximate('URP ShadowCaster2D when installed'),
    unreal: unsupported('No reliable Paper2D shadow equivalent'),
  },
  'forge.animator': {
    godot: manual('Animator metadata retained for target-side implementation'),
    unity: full('AnimatorController via importer'),
    unreal: approximate('Flipbook state component'),
  },
  'forge.audio-source': {
    godot: full('AudioStreamPlayer2D'),
    unity: full('AudioSource'),
    unreal: full('Audio component'),
  },
  'forge.tilemap': {
    godot: manual('Tile map data retained for target-side reconstruction'),
    unity: approximate('Tilemap package importer'),
    unreal: approximate('Paper2D tile map'),
  },
  'forge.particle-emitter': {
    godot: manual('Emitter settings retained for target-side reconstruction'),
    unity: approximate('ParticleSystem'),
    unreal: approximate('Niagara/Paper2D emitter setup'),
  },
  'forge.ui-layout': {
    godot: manual('Layout data retained for target-side reconstruction'),
    unity: full('UGUI hierarchy'),
    unreal: approximate('UMG hierarchy via importer'),
  },
  'forge.ui-root': {
    godot: manual('UI root data retained for target-side reconstruction'),
    unity: full('Canvas root'),
    unreal: approximate('UMG widget root'),
  },
  'forge.ui-panel': {
    godot: manual('Panel data retained for target-side reconstruction'),
    unity: full('UGUI Image panel'),
    unreal: approximate('UMG Border'),
  },
  'forge.ui-text': {
    godot: manual('Text data retained for target-side reconstruction'),
    unity: approximate('UGUI Text'),
    unreal: approximate('UMG TextBlock'),
  },
  'forge.ui-image': {
    godot: manual('Image data retained for target-side reconstruction'),
    unity: full('UGUI Image'),
    unreal: approximate('UMG Image'),
  },
  'forge.ui-button': {
    godot: manual('Button data retained for target-side reconstruction'),
    unity: full('UGUI Button'),
    unreal: approximate('UMG Button'),
  },
  'forge.ui-progress': {
    godot: manual('Progress data retained for target-side reconstruction'),
    unity: full('UGUI Slider/Image'),
    unreal: approximate('UMG ProgressBar'),
  },
  'forge.ui-slider': {
    godot: manual('Slider data retained for target-side reconstruction'),
    unity: full('UGUI Slider'),
    unreal: approximate('UMG Slider'),
  },
  'forge.ui-toggle': {
    godot: manual('Toggle data retained for target-side reconstruction'),
    unity: full('UGUI Toggle'),
    unreal: approximate('UMG CheckBox'),
  },
  'forge.ui-input': {
    godot: manual('Input data retained for target-side reconstruction'),
    unity: approximate('UGUI InputField'),
    unreal: approximate('UMG EditableText'),
  },
  'forge.ui-text-input': {
    godot: manual('Text-input data retained for target-side reconstruction'),
    unity: approximate('UGUI InputField'),
    unreal: approximate('UMG EditableText'),
  },
  'forge.ui-scroll': {
    godot: manual('Scroll data retained for target-side reconstruction'),
    unity: full('UGUI ScrollRect'),
    unreal: approximate('UMG ScrollBox'),
  },
  'forge.perception': {
    godot: manual('Gameplay perception requires target-side behaviour'),
    unity: manual('Gameplay perception requires target-side behaviour'),
    unreal: manual('Gameplay perception requires target-side behaviour'),
  },
  'forge.prefab': {
    godot: manual(
      'Source prefab metadata retained; scene instances are expanded',
    ),
    unity: full('Prefab metadata'),
    unreal: approximate('Blueprint/actor source metadata'),
  },
  'editor.note': {
    godot: manual('Editor note retained in manifest'),
    unity: manual('Editor note retained in manifest'),
    unreal: manual('Editor note retained in manifest'),
  },
};

const portableGraphNodes = new Set([
  'event.start',
  'event.update',
  'event.fixedUpdate',
  'flow.branch',
  'flow.sequence',
  'flow.once',
  'value.constant',
  'variable.get',
  'variable.set',
  'math.add',
  'math.compare',
  'entity.self',
  'transform.position',
  'transform.setPosition',
  'input.axis',
  'input.vector2',
  'physics.velocity',
  'physics.setVelocity',
  'debug.log',
]);

export function graphNodeCapability(
  type: string,
  target: ExportTarget,
): Capability {
  if (!portableGraphNodes.has(type))
    return manual(`Graph node ${type} has no declared target translation`);
  return target === 'unreal'
    ? approximate(`Graph node ${type} uses the generated C++ component runtime`)
    : full(
        `Graph node ${type} maps to generated ${target === 'godot' ? 'GDScript' : 'C#'}`,
      );
}

export const TARGET_COORDINATES = {
  godot: { unitsPerPixel: 1, invertY: false, rotationSign: 1 },
  unity: { unitsPerPixel: 0.01, invertY: true, rotationSign: -1 },
  unreal: { unitsPerPixel: 1, invertY: true, rotationSign: -1 },
} as const;

export function convertPoint(
  point: readonly [number, number],
  target: ExportTarget,
): readonly [number, number] {
  const profile = TARGET_COORDINATES[target];
  return [
    point[0] * profile.unitsPerPixel,
    point[1] * profile.unitsPerPixel * (profile.invertY ? -1 : 1),
  ];
}
export function convertRotation(radians: number, target: ExportTarget): number {
  const degrees = (radians * 180) / Math.PI;
  return degrees * TARGET_COORDINATES[target].rotationSign;
}
export function convertScale(
  scale: readonly [number, number],
): readonly [number, number] {
  return [scale[0], scale[1]];
}

export function lowerProject(project: ProjectData): ForgeInterchange {
  const scenes = [...project.scenes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((scene) => ({
      id: scene.id,
      name: scene.name,
      entities: [...scene.entities]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((entity) => {
          const transform = entity.components['forge.transform'] as unknown as {
            local: readonly [number, number, number, number, number, number];
          };
          return {
            id: entity.id,
            name: entity.name,
            enabled: entity.enabled,
            parent: entity.parent,
            transform: [...transform.local] as InterchangeEntity['transform'],
            components: Object.entries(entity.components)
              .filter(([type]) => type !== 'forge.transform')
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([type, data]) => ({ type, data: structuredClone(data) })),
          };
        }),
    }));
  return {
    version: INTERCHANGE_VERSION,
    source: {
      project: project.id,
      name: project.name,
      engineVersion: project.engineVersion,
    },
    coordinates: {
      unit: 'pixel',
      x: 'right',
      y: 'down',
      rotation: 'clockwise-radians',
    },
    startupScene: project.startupScene,
    scenes,
    assets: [...project.assets]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((asset) => ({ ...structuredClone(asset) })),
    physics: structuredClone(project.physics),
    input: structuredClone(project.input),
    mixer: structuredClone(project.mixer),
    achievements: structuredClone(project.persistence.achievements),
  };
}

function assetCapability(
  asset: InterchangeAsset,
  target: ExportTarget,
): Capability {
  if (asset.kind === 'image' || asset.kind === 'audio')
    return full('Source asset copied with stable Forge identity');
  if (asset.mime === 'text/typescript')
    return manual(
      'Arbitrary Forge TypeScript requires a manual target-engine port',
    );
  if (asset.mime === GRAPH_MIME) {
    const graph = BehaviourGraphSchema.parse(JSON.parse(asset.data)),
      unsupportedNodes = graph.nodes
        .filter(
          (node) =>
            graphNodeCapability(node.type, target).status === 'manual-work',
        )
        .map((node) => node.type);
    return unsupportedNodes.length
      ? manual(
          `Graph nodes need manual translation: ${[...new Set(unsupportedNodes)].sort().join(', ')}`,
        )
      : target === 'unreal'
        ? approximate(
            'Portable graph lowered for generated C++ component runtime',
          )
        : full(
            `Portable graph lowered for generated ${target === 'godot' ? 'GDScript' : 'C#'} runtime`,
          );
  }
  if (asset.mime === 'application/x-forge-animation')
    return target === 'unity'
      ? full('AnimationClip generated through importer')
      : approximate('Sprite animation reconstructed through target runtime');
  if (asset.mime === 'application/x-forge-animator')
    return target === 'unity'
      ? full('AnimatorController generated through importer')
      : approximate(
          'State machine reconstructed through generated target code',
        );
  if (asset.mime === 'application/x-forge-sprite-region')
    return full('Atlas rectangle and pivot retained');
  if (asset.mime === 'application/x-forge-tileset')
    return target === 'godot'
      ? manual('TileSet source retained for target-side reconstruction')
      : approximate('Target tile tooling reconstructs supported cells');
  if (asset.mime === 'application/x-forge-prefab')
    return target === 'unreal'
      ? approximate('Importer reconstructs actor source hierarchy')
      : target === 'godot'
        ? manual(
            'Prefab source retained; exported scenes contain expanded instances',
          )
        : full('Reusable hierarchy reconstructed');
  return unsupported(`No ${target} mapping for asset MIME ${asset.mime}`);
}

function behaviourItems(
  data: unknown,
): readonly { id: string; kind: string; source: string }[] {
  if (!data || typeof data !== 'object' || !('items' in data)) return [];
  const items = data.items;
  if (!items || typeof items !== 'object') return [];
  return Object.values(items).flatMap((item) => {
    if (
      !item ||
      typeof item !== 'object' ||
      !('id' in item) ||
      !('kind' in item)
    )
      return [];
    return [
      {
        id: String(item.id),
        kind: String(item.kind),
        source:
          'script' in item
            ? String(item.script)
            : 'graph' in item
              ? String(item.graph)
              : '',
      },
    ];
  });
}

export function analyzePortability(
  interchange: ForgeInterchange,
  target: ExportTarget,
): PortabilityReport {
  const items: PortabilityItem[] = [];
  items.push({
    ...(target === 'godot'
      ? full(
          'Gravity and collision layer matrix lower through project/body settings',
        )
      : approximate(
          'Physics settings lower through the target importer and require simulation review',
        )),
    feature: 'project:physics',
    sourceId: interchange.source.project,
    path: interchange.source.name,
  });
  for (const action of interchange.input)
    items.push({
      ...(target === 'unreal'
        ? approximate(
            'Input Mapping Context reconstruction requires importer review',
          )
        : full(
            target === 'godot'
              ? 'InputMap actions generated at startup'
              : 'Input actions generated through the editor importer',
          )),
      feature: `input:${action.kind}`,
      sourceId: action.name,
      path: `${interchange.source.name}/Input/${action.map}/${action.name}`,
    });
  items.push({
    ...(target === 'godot'
      ? full('Audio bus layout generated')
      : approximate('Mixer values reconstructed by target importer')),
    feature: 'project:mixer',
    sourceId: interchange.source.project,
    path: `${interchange.source.name}/Audio`,
  });
  for (const achievement of interchange.achievements)
    items.push({
      ...manual(
        'Definition retained; platform achievement integration is target-side work',
      ),
      feature: 'project:achievement',
      sourceId: achievement.id,
      path: `${interchange.source.name}/Achievements/${achievement.id}`,
    });
  for (const asset of interchange.assets) {
    const capability = assetCapability(asset, target);
    items.push({
      ...capability,
      feature: `asset:${asset.mime}`,
      sourceId: asset.id,
      path: asset.path,
    });
  }
  for (const scene of interchange.scenes)
    for (const entity of scene.entities) {
      items.push({
        ...full(
          'Hierarchy and affine transform lowered through the central coordinate profile',
        ),
        feature: 'entity',
        sourceId: entity.id,
        path: `${scene.name}/${entity.name}`,
      });
      for (const component of entity.components) {
        if (component.type === 'forge.behaviours') {
          for (const behaviour of behaviourItems(component.data)) {
            const asset = interchange.assets.find(
                (candidate) => candidate.id === behaviour.source,
              ),
              capability = asset
                ? assetCapability(asset, target)
                : unsupported('Behaviour source asset is missing');
            items.push({
              ...capability,
              feature: `behaviour:${behaviour.kind}`,
              sourceId: `${entity.id}:${behaviour.id}`,
              path: `${scene.name}/${entity.name}/${asset?.path ?? behaviour.source}`,
            });
          }
          continue;
        }
        let capability =
          componentCapabilities[component.type]?.[target] ??
          unsupported(`No declared ${target} component mapping`);
        const data =
          component.data && typeof component.data === 'object'
            ? (component.data as Record<string, unknown>)
            : {};
        if (
          target === 'godot' &&
          component.type === 'forge.sprite' &&
          data.secondaryTexture &&
          data.blend !== 1
        )
          capability = approximate(
            'Primary Sprite2D is generated; active cross-fade needs target-side animation work',
          );
        if (
          target === 'godot' &&
          [
            'forge.box-collider',
            'forge.circle-collider',
            'forge.capsule-collider',
          ].includes(component.type) &&
          (data.sensor === true || data.oneWay === true)
        )
          capability = approximate(
            'Collision shape is generated; sensor/one-way semantics require target-side review',
          );
        items.push({
          ...capability,
          feature: `component:${component.type}`,
          sourceId: entity.id,
          path: `${scene.name}/${entity.name}`,
        });
      }
    }
  items.sort(
    (a, b) =>
      a.status.localeCompare(b.status) ||
      a.path.localeCompare(b.path) ||
      a.feature.localeCompare(b.feature) ||
      a.sourceId.localeCompare(b.sourceId),
  );
  const summary: Record<PortabilityStatus, number> = {
    'fully-portable': 0,
    approximated: 0,
    'manual-work': 0,
    unsupported: 0,
  };
  for (const item of items) summary[item.status]++;
  return {
    target,
    project: interchange.source.project,
    entities: interchange.scenes.reduce(
      (count, scene) => count + scene.entities.length,
      0,
    ),
    summary,
    items,
  };
}

function stableTargetId(id: string, target: ExportTarget): string {
  const hex = id.replaceAll('-', '').toLowerCase();
  if (target === 'unity') return hex;
  return `forge_${hex}`;
}
export function createIdMap(
  interchange: ForgeInterchange,
  target: ExportTarget,
): Readonly<Record<string, string>> {
  const ids = new Set<string>([
    interchange.source.project,
    ...interchange.scenes.map((scene) => scene.id),
    ...interchange.scenes.flatMap((scene) =>
      scene.entities.map((entity) => entity.id),
    ),
    ...interchange.assets.map((asset) => asset.id),
  ]);
  return Object.fromEntries(
    [...ids].sort().map((id) => [id, stableTargetId(id, target)]),
  );
}
function fingerprint(value: string): string {
  let result = 2166136261;
  for (const character of value)
    result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return (result >>> 0).toString(16).padStart(8, '0');
}
export function createExportManifest(
  interchange: ForgeInterchange,
  target: ExportTarget,
): ExportManifest {
  return {
    interchangeVersion: interchange.version,
    target,
    sourceProject: interchange.source.project,
    sourceEngineVersion: interchange.source.engineVersion,
    sourceHash: fingerprint(serializeInterchange(interchange)),
    generatedRoot: 'Generated/Forge',
    ids: createIdMap(interchange, target),
    report: analyzePortability(interchange, target),
  };
}
export function serializeInterchange(interchange: ForgeInterchange): string {
  return deterministicJSON(interchange);
}
export function serializeReport(report: PortabilityReport): string {
  return deterministicJSON(report);
}

export * from './files';
export * from './godot';
