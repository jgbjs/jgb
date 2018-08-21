import * as types from 'babel-types';

export default function matchesPattern(
  member: any,
  match: any,
  allowPartial?: any
) {
  // not a member expression
  if (!types.isMemberExpression(member)) {
    return false;
  }

  const parts = Array.isArray(match) ? match : match.split('.');
  const nodes = [];

  let node;
  for (node = member; types.isMemberExpression(node); node = node.object) {
    nodes.push(node.property);
  }
  nodes.push(node);

  if (nodes.length < parts.length) {
    return false;
  }
  if (!allowPartial && nodes.length > parts.length) {
    return false;
  }

  for (let i = 0, j = nodes.length - 1; i < parts.length; i++, j--) {
    // tslint:disable-next-line:no-shadowed-variable
    const node = nodes[j];
    let value;
    if (types.isIdentifier(node)) {
      value = node.name;
    } else if (types.isStringLiteral(node)) {
      value = node.value;
    } else {
      return false;
    }

    if (parts[i] !== value) {
      return false;
    }
  }

  return true;
}
