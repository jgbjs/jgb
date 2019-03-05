import * as path from 'path';
const JGB_PLUGIN_PREFIX_RE = /^(?!@|module:|[^/]+\/|jgb-plugin-)/;
const JGB_PRESET_PREFIX_RE = /^(?!@|module:|[^/]+\/|jgb-preset-)/;
const JGB_PLUGIN_ORG_RE = /^(@jgbjs\/)(?!plugin-|[^/]+\/)/;
const JGB_PRESET_ORG_RE = /^(@jgbjs\/)(?!preset-|[^/]+\/)/;
const OTHER_PLUGIN_ORG_RE = /^(@(?!jgbjs\/)[^/]+\/)(?![^/]*jgb-plugin(?:-|\/|$)|[^/]+\/)/;
const OTHER_PRESET_ORG_RE = /^(@(?!jgbjs\/)[^/]+\/)(?![^/]*jgb-preset(?:-|\/|$)|[^/]+\/)/;
const OTHER_ORG_DEFAULT_RE = /^(@(?!jgbjs$)[^/]+)$/;

export default function standardizeName(type: "plugin" | "preset", name: string) {
  // Let absolute and relative paths through.
  if (path.isAbsolute(name)) return name;

  const isPreset = type === "preset";

  return (
    name
      // foo -> jgb-preset-foo
      .replace(
        isPreset ? JGB_PRESET_PREFIX_RE : JGB_PLUGIN_PREFIX_RE,
        `jgb-${type}-`,
      )
      // @jgbjs/es2015 -> @jgbjs/preset-es2015
      .replace(
        isPreset ? JGB_PRESET_ORG_RE : JGB_PLUGIN_ORG_RE,
        `$1${type}-`,
      )
      // @foo/mypreset -> @foo/jgb-preset-mypreset
      .replace(
        isPreset ? OTHER_PRESET_ORG_RE : OTHER_PLUGIN_ORG_RE,
        `$1jgb-${type}-`,
      )
      // @foo -> @foo/jgb-preset
      .replace(OTHER_ORG_DEFAULT_RE, `$1/jgb-${type}`)
  );
}
