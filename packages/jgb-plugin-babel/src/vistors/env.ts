import * as types from 'babel-types';
import BabelAsset from '../BabelAsset';
import matchesPattern from './matchesPattern';

export default {
  MemberExpression(node: any, asset: BabelAsset) {
    // Inline environment variables accessed on process.env
    if (matchesPattern(node.object, 'process.env')) {
      const key = types.toComputedKey(node);
      if (types.isStringLiteral(key)) {
        const val = types.valueToNode(process.env[key.value]);
        morph(node, val);
        asset.isAstDirty = true;
        // asset.cacheData.env[key.value] = process.env[key.value];
      }
    }
  }
};

// replace object properties
function morph(object: any, newProperties: any) {
  // tslint:disable-next-line:forin
  for (const key in object) {
    delete object[key];
  }

  // tslint:disable-next-line:forin
  for (const key in newProperties) {
    object[key] = newProperties[key];
  }
}
