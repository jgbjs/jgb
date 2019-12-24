import JsonAsset from 'jgb-plugin-json/lib/JsonAsset';
import { Utils } from 'jgb-shared';
import * as path from 'path';
import { findComponent, usingNpmComponents } from '../src';

describe('find component', () => {
  const examplePath = path.resolve('example');
  const pagePath = path.resolve(examplePath, 'page.json');
  const jsonAsset = new JsonAsset(pagePath, {
    outDir: path.resolve('dist'),
    rootDir: process.cwd(),
    sourceDir: examplePath,
    extensions: new Set(['.json']),
    alias: {}
  });
  const jsonAliasAsset = new JsonAsset(pagePath, {
    outDir: path.resolve('dist'),
    rootDir: process.cwd(),
    sourceDir: examplePath,
    extensions: new Set(['.json']),
    alias: {
      '@example': examplePath,
      '@tuhu': path.resolve('node_modules/@tuhu'),
      '@miniprogram-recycle-view': path.resolve(
        'node_modules/@tuhu/miniprogram-recycle-view/miniprogram_dist'
      )
    }
  });

  test('resolve localcomponent', async () => {
    const componentPath = await findComponent('./localcomponent', jsonAsset);
    const ucomponentPath = Utils.pathToUnixType(componentPath);
    expect(ucomponentPath).toBe(
      Utils.pathToUnixType(
        path.resolve(path.dirname(jsonAsset.name), './localcomponent')
      )
    );
  });

  test('resolve npm component', async () => {
    const componentPath = await findComponent(
      'tw-component/dist/count-down/index',
      jsonAsset
    );
    const ucomponentPath = Utils.pathToUnixType(componentPath);
    expect(ucomponentPath).toBe(
      Utils.pathToUnixType(
        path.resolve(
          process.cwd(),
          'node_modules/tw-component/dist/count-down/index'
        )
      )
    );
  });

  test('resolve npm component use pkg.miniprogram', async () => {
    const componentPath = await findComponent(
      'miniprogram-recycle-view/recycle-view',
      jsonAsset
    );
    const ucomponentPath = Utils.pathToUnixType(componentPath);
    expect(ucomponentPath).toBe(
      Utils.pathToUnixType(
        path.resolve(
          process.cwd(),
          'node_modules/miniprogram-recycle-view/miniprogram_dist/recycle-view'
        )
      )
    );
  });

  test('resolve npm scope component', async () => {
    const componentPath = await findComponent(
      '@tuhu/miniprogram-recycle-view/recycle-view',
      jsonAsset
    );
    const ucomponentPath = Utils.pathToUnixType(componentPath);
    expect(ucomponentPath).toBe(
      Utils.pathToUnixType(
        path.resolve(
          process.cwd(),
          'node_modules/@tuhu/miniprogram-recycle-view/miniprogram_dist/recycle-view'
        )
      )
    );
  });

  test(`resolve alias component`, async () => {
    const componentPath = await findComponent(
      '@miniprogram-recycle-view/recycle-view',
      jsonAliasAsset
    );
    const ucomponentPath = Utils.pathToUnixType(componentPath);
    expect(ucomponentPath).toBe(
      Utils.pathToUnixType(
        path.resolve(
          process.cwd(),
          'node_modules/@tuhu/miniprogram-recycle-view/miniprogram_dist/recycle-view'
        )
      )
    );
  });
});

describe('usingComponent', () => {
  const examplePath = path.resolve('example');
  const pagePath = path.resolve(examplePath, 'page.json');
  const jsonAsset = new JsonAsset(pagePath, {
    outDir: path.resolve('dist'),
    rootDir: process.cwd(),
    sourceDir: examplePath,
    extensions: new Set(['.json']),
    alias: {}
  });
  const jsonAliasAsset = new JsonAsset(pagePath, {
    outDir: path.resolve('dist'),
    rootDir: process.cwd(),
    sourceDir: examplePath,
    extensions: new Set(['.json']),
    alias: {
      '@example': examplePath,
      '@tuhu': path.resolve('node_modules/@tuhu'),
      '@miniprogram-recycle-view': path.resolve(
        'node_modules/@tuhu/miniprogram-recycle-view/miniprogram_dist'
      )
    }
  });

  test('localcomponent', async () => {
    const pageJson = {
      usingComponents: {
        component: './localcomponent'
      }
    };
    const dependences = new Set<string>();
    const components = [] as string[];
    await usingNpmComponents.call(
      jsonAsset,
      'component',
      await findComponent(pageJson.usingComponents.component, jsonAsset),
      pageJson,
      dependences,
      components
    );
    const ucomponentPath = Utils.pathToUnixType(
      pageJson.usingComponents.component
    );
    expect(ucomponentPath).toBe('./localcomponent');
    expect(components.length).toBe(1);
    expect(components[0]).toBe(
      Utils.pathToUnixType(path.resolve(examplePath, './localcomponent'))
    );
  });

  test('absolute component', async () => {
    const pageJson = {
      usingComponents: {
        component: '/localcomponent'
      }
    };
    const dependences = new Set<string>();
    const components = [] as string[];
    await usingNpmComponents.call(
      jsonAsset,
      'component',
      await findComponent(pageJson.usingComponents.component, jsonAsset),
      pageJson,
      dependences,
      components
    );
    const ucomponentPath = Utils.pathToUnixType(
      pageJson.usingComponents.component
    );
    expect(ucomponentPath).toBe('./localcomponent');
    expect(components.length).toBe(1);
    expect(components[0]).toBe(
      Utils.pathToUnixType(path.resolve(examplePath, './localcomponent'))
    );
  });

  test('npm component use pkg.miniprogram', async () => {
    const pageJson = {
      usingComponents: {
        component: 'miniprogram-recycle-view/recycle-view'
      }
    };
    const dependences = new Set<string>();
    const components = [] as string[];
    await usingNpmComponents.call(
      jsonAsset,
      'component',
      await findComponent(pageJson.usingComponents.component, jsonAsset),
      pageJson,
      dependences,
      components
    );
    const ucomponentPath = Utils.pathToUnixType(
      pageJson.usingComponents.component
    );
    expect(ucomponentPath).toBe(
      './npm/miniprogram-recycle-view/miniprogram_dist/recycle-view'
    );
    expect(components.length).toBe(1);
    expect(dependences.size).toBeGreaterThan(8);
  });

  test('npm scope component', async () => {
    const pageJson = {
      usingComponents: {
        component: '@tuhu/miniprogram-recycle-view/recycle-view'
      }
    };
    const dependences = new Set<string>();
    const components = [] as string[];
    await usingNpmComponents.call(
      jsonAsset,
      'component',
      await findComponent(pageJson.usingComponents.component, jsonAsset),
      pageJson,
      dependences,
      components
    );
    const ucomponentPath = Utils.pathToUnixType(
      pageJson.usingComponents.component
    );
    expect(ucomponentPath).toBe(
      './npm/@tuhu/miniprogram-recycle-view/miniprogram_dist/recycle-view'
    );
    expect(components.length).toBe(1);
    expect(dependences.size).toBeGreaterThan(8);
  });

  test('alias localcomponent', async () => {
    const pageJson = {
      usingComponents: {
        component: '@example/localcomponent'
      }
    };

    const dependences = new Set<string>();
    const components = [] as string[];
    const targetComponent = await findComponent(
      pageJson.usingComponents.component,
      jsonAliasAsset
    );
    await usingNpmComponents.call(
      jsonAliasAsset,
      'component',
      targetComponent,
      pageJson,
      dependences,
      components
    );
    const ucomponentPath = Utils.pathToUnixType(
      pageJson.usingComponents.component
    );
    expect(ucomponentPath).toBe('./localcomponent');
    expect(components.length).toBe(1);
    expect(components[0]).toBe(
      Utils.pathToUnixType(path.resolve(examplePath, './localcomponent'))
    );
  });

  test(`alias npm scope component`, async () => {
    const pageJson = {
      usingComponents: {
        component:
          '@tuhu/miniprogram-recycle-view/miniprogram_dist/recycle-view'
      }
    };

    const dependences = new Set<string>();
    const components = [] as string[];
    const componentPath = await findComponent(
      pageJson.usingComponents.component,
      jsonAliasAsset
    );
    await usingNpmComponents.call(
      jsonAliasAsset,
      'component',
      componentPath,
      pageJson,
      dependences,
      components
    );
    const ucomponentPath = Utils.pathToUnixType(
      pageJson.usingComponents.component
    );
    expect(ucomponentPath).toBe(
      './npm/@tuhu/miniprogram-recycle-view/miniprogram_dist/recycle-view'
    );
    expect(components.length).toBe(1);
    expect(dependences.size).toBeGreaterThan(8);
  });
  test(`alias npm component`, async () => {
    const pageJson = {
      usingComponents: {
        component: '@miniprogram-recycle-view/recycle-view'
      }
    };

    const dependences = new Set<string>();
    const components = [] as string[];
    const componentPath = await findComponent(
      pageJson.usingComponents.component,
      jsonAliasAsset
    );
    await usingNpmComponents.call(
      jsonAliasAsset,
      'component',
      componentPath,
      pageJson,
      dependences,
      components
    );
    const ucomponentPath = Utils.pathToUnixType(
      pageJson.usingComponents.component
    );
    expect(ucomponentPath).toBe(
      './npm/@tuhu/miniprogram-recycle-view/miniprogram_dist/recycle-view'
    );
    expect(components.length).toBe(1);
    expect(dependences.size).toBeGreaterThan(8);
  });
});
