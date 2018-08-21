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

async function loadPlugin(plugin: any, relative: string, options?: any) {
  if (typeof plugin === 'string') {
    plugin = await localRequire(plugin, relative);
    plugin = plugin.default || plugin;

    if (typeof options !== 'object') {
      options = {};
    }

    if (Object.keys(options).length > 0) {
      plugin = plugin(options);
    }

    plugin = plugin.default || plugin;
  }

  return plugin;
}
