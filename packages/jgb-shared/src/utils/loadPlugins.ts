import localRequire from './localRequire';

export default async function loadPlugins(plugins: any, relative: any) {
  if (Array.isArray(plugins)) {
    return await Promise.all(
      plugins.map(async p => await loadPlugin(p, relative)).filter(Boolean)
    );
  } else if (typeof plugins === 'object') {
    const mapPlugins = await Promise.all(
      Object.keys(plugins).map(
        async p => await loadPlugin(p, relative, plugins[p])
      )
    );
    return mapPlugins.filter(Boolean);
  } else {
    return [];
  }
}

async function loadPlugin(
  plugin: string | [string, any] | Function,
  relative: string,
  options?: any
) {
  if (typeof plugin === 'function') {
    return plugin;
  }
  let loadedPlugin: any;
  let pluginName: string;
  if (typeof plugin === 'string') {
    pluginName = plugin;
  } else {
    [pluginName, options] = plugin;
  }
  loadedPlugin = await localRequire(pluginName, relative);
  loadedPlugin = loadedPlugin.default || loadedPlugin;
  if (typeof options !== 'object') {
    options = {};
  }

  if (Object.keys(options).length > 0) {
    loadedPlugin = loadedPlugin(options);
  }

  loadedPlugin = loadedPlugin.default || loadedPlugin;

  return loadedPlugin;
}
