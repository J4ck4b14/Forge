import { GRAPH_MIME } from '@forge/graphs';
import {
  createExportManifest,
  serializeInterchange,
  serializeReport,
  TARGET_COORDINATES,
  type ForgeInterchange,
} from './index';
import {
  decodeAssetData,
  encodeText,
  generatedAssetPath,
  safeFileName,
  sortedFiles,
  type ExportFile,
} from './files';
import {
  UNREAL_EDITOR_BUILD,
  UNREAL_EDITOR_CPP,
  UNREAL_EDITOR_HEADER,
  UNREAL_GRAPH_CPP,
  UNREAL_GRAPH_HEADER,
  UNREAL_IDENTITY_CPP,
  UNREAL_IDENTITY_HEADER,
  UNREAL_RUNTIME_BUILD,
  UNREAL_RUNTIME_MODULE,
} from './unreal-code';

const json = (value: unknown): string => JSON.stringify(value, null, 2);

function projectFile(interchange: ForgeInterchange): string {
  return json({
    FileVersion: 3,
    EngineAssociation: '5.4',
    Category: 'Games',
    Description: `${interchange.source.name}, exported from Forge ${interchange.source.engineVersion}`,
    Plugins: [
      { Name: 'Paper2D', Enabled: true },
      { Name: 'EnhancedInput', Enabled: true },
      { Name: 'ForgePortability', Enabled: true },
    ],
  });
}

function pluginFile(): string {
  return json({
    FileVersion: 3,
    Version: 1,
    VersionName: '0.16.3',
    FriendlyName: 'Forge Portability',
    Description:
      'Imports Forge Interchange IR through supported Unreal Editor APIs and provides the portable graph runtime.',
    Category: 'Importers',
    CanContainContent: true,
    Installed: false,
    Modules: [
      { Name: 'ForgeRuntime', Type: 'Runtime', LoadingPhase: 'Default' },
      { Name: 'ForgeImporter', Type: 'Editor', LoadingPhase: 'PostEngineInit' },
    ],
  });
}

function coordinateHeader(): string {
  const profile = TARGET_COORDINATES.unreal;
  return `#pragma once

#include "CoreMinimal.h"

namespace ForgeCoordinates
{
    constexpr double UnitsPerPixel = ${profile.unitsPerPixel};
    constexpr double YSign = ${profile.invertY ? -1 : 1};
    constexpr double RotationSign = ${profile.rotationSign};
    inline FVector Position(double X, double Y) { return FVector(X * UnitsPerPixel, 0.0, Y * UnitsPerPixel * YSign); }
    inline FVector Velocity(double X, double Y) { return Position(X, Y); }
    inline double PixelsX(double Units) { return Units / UnitsPerPixel; }
    inline double PixelsY(double Units) { return Units / UnitsPerPixel * YSign; }
    inline double Degrees(double Radians) { return FMath::RadiansToDegrees(Radians) * RotationSign; }
}
`;
}

function readme(interchange: ForgeInterchange): string {
  const report = createExportManifest(interchange, 'unreal').report;
  return `# ${interchange.source.name} — Unreal Engine 5 export

Open \`${safeFileName(interchange.source.name)}.uproject\` in Unreal Engine 5.4 or newer. Build/enable the included Forge Portability plugin when prompted. The Editor module imports the source bundle through AssetTools, world/actor/component APIs, Paper2D factories and Enhanced Input assets. Run **Tools → Forge → Reimport** to repeat the import.

No \`.uasset\` file is synthesized by Forge. Unreal creates and owns all binary assets under \`/Game/Generated/Forge\`. The portable Behaviour Graph runtime is a C++ ActorComponent; Unreal Python is not used for gameplay.

Keep custom project work outside \`/Game/Generated/Forge\`. Forge remains the source of truth and export is one-way. Review \`ForgeSource/Data/portability-report.json\`:

- Fully portable: ${report.summary['fully-portable']}
- Approximated: ${report.summary.approximated}
- Manual work: ${report.summary['manual-work']}
- Unsupported: ${report.summary.unsupported}
`;
}

export function exportUnreal(interchange: ForgeInterchange): ExportFile[] {
  const manifest = createExportManifest(interchange, 'unreal'),
    projectName = safeFileName(interchange.source.name),
    plugin = 'Plugins/ForgePortability',
    files: ExportFile[] = [
      {
        path: `${projectName}.uproject`,
        data: encodeText(projectFile(interchange)),
      },
      { path: 'README_IMPORT.md', data: encodeText(readme(interchange)) },
      {
        path: 'Config/DefaultEngine.ini',
        data: encodeText(
          '[/Script/Engine.Engine]\n+EditorEngine=/Script/UnrealEd.UnrealEdEngine\n+\n[/Script/Engine.InputSettings]\n+DefaultPlayerInputClass=/Script/EnhancedInput.EnhancedPlayerInput\n+DefaultInputComponentClass=/Script/EnhancedInput.EnhancedInputComponent\n+',
        ),
      },
      {
        path: `${plugin}/ForgePortability.uplugin`,
        data: encodeText(pluginFile()),
      },
      {
        path: `${plugin}/Source/ForgeRuntime/ForgeRuntime.Build.cs`,
        data: encodeText(UNREAL_RUNTIME_BUILD),
      },
      {
        path: `${plugin}/Source/ForgeRuntime/Public/ForgeCoordinates.h`,
        data: encodeText(coordinateHeader()),
      },
      {
        path: `${plugin}/Source/ForgeRuntime/Public/ForgeIdentityComponent.h`,
        data: encodeText(UNREAL_IDENTITY_HEADER),
      },
      {
        path: `${plugin}/Source/ForgeRuntime/Private/ForgeIdentityComponent.cpp`,
        data: encodeText(UNREAL_IDENTITY_CPP),
      },
      {
        path: `${plugin}/Source/ForgeRuntime/Public/ForgeGraphComponent.h`,
        data: encodeText(UNREAL_GRAPH_HEADER),
      },
      {
        path: `${plugin}/Source/ForgeRuntime/Private/ForgeGraphComponent.cpp`,
        data: encodeText(UNREAL_GRAPH_CPP),
      },
      {
        path: `${plugin}/Source/ForgeRuntime/Private/ForgeRuntimeModule.cpp`,
        data: encodeText(UNREAL_RUNTIME_MODULE),
      },
      {
        path: `${plugin}/Source/ForgeImporter/ForgeImporter.Build.cs`,
        data: encodeText(UNREAL_EDITOR_BUILD),
      },
      {
        path: `${plugin}/Source/ForgeImporter/Public/ForgeImporterModule.h`,
        data: encodeText(UNREAL_EDITOR_HEADER),
      },
      {
        path: `${plugin}/Source/ForgeImporter/Private/ForgeImporterModule.cpp`,
        data: encodeText(UNREAL_EDITOR_CPP),
      },
      {
        path: 'ForgeSource/Data/forge-ir.json',
        data: encodeText(serializeInterchange(interchange)),
      },
      {
        path: 'ForgeSource/Data/export-manifest.json',
        data: encodeText(json(manifest)),
      },
      {
        path: 'ForgeSource/Data/portability-report.json',
        data: encodeText(serializeReport(manifest.report)),
      },
    ];
  for (const asset of interchange.assets) {
    if (asset.kind === 'image' || asset.kind === 'audio')
      files.push({
        path: `ForgeSource/${generatedAssetPath(asset).replace('Generated/Forge/', '')}`,
        data: decodeAssetData(asset),
      });
    if (asset.mime === GRAPH_MIME)
      files.push({
        path: `ForgeSource/Data/graphs/${asset.id}.json`,
        data: encodeText(asset.data),
      });
  }
  return sortedFiles(files);
}
