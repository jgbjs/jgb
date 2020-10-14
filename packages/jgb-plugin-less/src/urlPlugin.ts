import CssAsset from "jgb-plugin-css/lib/CssAsset";

export default function urlPlugin(asset: CssAsset) {
  return {
    install: (less: any, pluginManager: any) => {
      const visitor = new less.visitors.Visitor({
        // visitUrl: (node: any) => {
        //   if (!ignoreDependency(node.value.value)) {
        //     node.value.value = asset.addURLDependency(
        //       node.value.value,
        //       node.currentFileInfo.filename
        //     );
        //   }
        //   return node;
        // },
        visitImport: (node: any) => {
          // asset.addDependency(node.path.value);
          return node;
        },
      });

      visitor.run = visitor.visit;
      pluginManager.addVisitor(visitor);
    },
  };
}
