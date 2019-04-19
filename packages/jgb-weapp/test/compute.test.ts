import { calcComputed, fnContainsComputeKey } from '../src/compute';
import { CallNode, CallTree } from '../src/utils/calltree';

describe('fnContainsComputeKey', () => {
  test('container this.data.key', () => {
    const computed = {
      data: {
        key1: 1
      },
      key() {
        return 2;
      },
      fn() {
        const data = this.data.key;
        const key1 = this.data.key1;
        return data + key1;
      }
    };
    const result = fnContainsComputeKey(computed.fn, computed);
    expect(result.size).toBe(1);
  });
  test(`container this.data['key']`, () => {
    const computed = {
      key() {},
      fn() {
        // tslint:disable-next-line: no-string-literal
        const data = this.data['key'];
        return data;
      }
    };
    const result = fnContainsComputeKey(computed.fn, computed);
    expect(result.size).toBe(1);
  });
  test(`container this.data["key"]`, () => {
    const computed = {
      key() {},
      fn() {
        // tslint:disable-next-line: no-string-literal
        const data = this.data['key'];
        return data;
      }
    };
    const result = fnContainsComputeKey(computed.fn, computed);
    expect(result.size).toBe(1);
  });
});

describe('calltree', () => {
  test('resolveNode', () => {
    const callNode = new CallNode('key', ['dep1']);
    const callDepNode = new CallNode('dep1');
    callNode.resolveNode(callDepNode);
    callDepNode.resolveNode(callNode);

    expect(callNode.callDepNodes[0]).toEqual(callDepNode);
  });

  test('setCallStackNode', () => {
    const callNode = new CallNode('key', ['dep1']);
    const callDepNode = new CallNode('dep1');
    callNode.resolveNode(callDepNode);
    callDepNode.resolveNode(callNode);
    callDepNode.setCallStackNode(callNode);
    // 可以设置调用栈
    expect(callDepNode.callStackNodes.size).toBe(1);
    // 不能设置自调用
    callDepNode.setCallStackNode(callDepNode);
    expect(callDepNode.callStackNodes.size).toBe(1);
    // 不能重复设置调用栈
    callDepNode.setCallStackNode(callNode);
    expect(callDepNode.callStackNodes.size).toBe(1);
  });

  test('getRecursiveCallNodes', () => {
    const callTree = new CallTree();
    const callNode = new CallNode('key', ['dep1']);
    const callDepNode = new CallNode('dep1', ['key']);
    callTree.addCallNode(callNode);
    callTree.addCallNode(callDepNode);

    let recursiveCalls = callTree.getRecursiveCallNodes();

    expect(recursiveCalls.size).toBe(2);

    const callDep2Node = new CallNode('dep2', ['key']);
    callTree.addCallNode(callDep2Node);
    recursiveCalls = callTree.getRecursiveCallNodes();
    expect(recursiveCalls.size).toBe(2);
  });

  test(`getBestCallStackSequence normal`, () => {
    const callTree = new CallTree();
    const key = new CallNode('key', ['dep1', 'dep2']);
    const dep1 = new CallNode('dep1');
    const dep2 = new CallNode('dep2');
    callTree.addCallNode(key);
    callTree.addCallNode(dep1);
    callTree.addCallNode(dep2);

    const nodes = callTree.getBestCallStackSequence();
    expect(nodes[0].key).toBe(dep1.key);
    expect(nodes[0].weight).toBe(1);
    expect(nodes[1].key).toBe(dep2.key);
    expect(nodes[1].weight).toBe(1);
    expect(nodes[2].key).toBe(key.key);
    expect(nodes[2].weight).toBe(nodes[0].weight + nodes[1].weight + 1);
  });

  test(`getBestCallStackSequence complex`, () => {
    const callTree = new CallTree();
    const orign = new CallNode('orign', ['key', 'dep2']);
    const key = new CallNode('key', ['dep1', 'dep2']);
    const dep1 = new CallNode('dep1');
    const dep2 = new CallNode('dep2', ['dep3']);
    const dep3 = new CallNode('dep3');
    callTree.addCallNode(key);
    callTree.addCallNode(dep1);
    callTree.addCallNode(dep2);
    callTree.addCallNode(orign);
    callTree.addCallNode(dep3);

    const nodes = callTree.getBestCallStackSequence();
    expect(nodes[0].key).toBe('dep1');
    expect(nodes[0].weight).toBe(1);
    expect(nodes[1].key).toBe('dep3');
    expect(nodes[2].key).toBe('dep2');
    expect(nodes[3].key).toBe('key');
    expect(nodes[4].key).toBe('orign');
    expect(nodes[2].weight).toBe(1 + 1);
    expect(nodes[3].weight).toBe(2 + 1 + 1);
    expect(nodes[4].weight).toBe(4 + 2 + 1);
  });

  test(`getBestCallStackSequence with recursiveCalls`, () => {
    const callTree = new CallTree();
    const key = new CallNode('key', ['dep1', 'dep2']);
    const dep1 = new CallNode('dep1', ['dep2']);
    const dep2 = new CallNode('dep2', ['key']);
    const dep3 = new CallNode('dep3');
    callTree.addCallNode(key);
    callTree.addCallNode(dep1);
    callTree.addCallNode(dep2);
    callTree.addCallNode(dep3);

    const nodes = callTree.getBestCallStackSequence();
    expect(nodes[0].weight).toBe(1);
    expect(nodes[1].weight).toBe(10000);
  });
});

describe('calcComputed', () => {
  test('calc with data', () => {
    const scope = {
      data: {
        a: 1
      },
      computed: {
        calc() {
          return this.data.a;
        }
      }
    };
    const needUpdate = calcComputed(
      scope,
      scope.computed,
      Object.keys(scope.computed)
    );
    expect(Object.keys(needUpdate).length).toBe(1);
    expect(needUpdate.calc).toBe(scope.data.a);
    // 会缓存
    const needUpdate2 = calcComputed(
      scope,
      scope.computed,
      Object.keys(scope.computed)
    );
    expect(Object.keys(needUpdate2).length).toBe(0);
    // 再次计算
    scope.data.a = 2;
    const needUpdate3 = calcComputed(
      scope,
      scope.computed,
      Object.keys(scope.computed)
    );
    expect(Object.keys(needUpdate3).length).toBe(1);
    expect(needUpdate3.calc).toBe(scope.data.a);
  });

  test(`calc with compute data`, () => {
    const scope = {
      data: {
        a: 1
      },
      computed: {
        calc3() {
          return this.data.calc + this.data.calc2;
        },
        calc2() {
          return this.data.a + this.data.calc;
        },
        calc() {
          return this.data.a;
        }
      }
    };
    const needUpdate = calcComputed(
      scope,
      scope.computed,
      Object.keys(scope.computed)
    );

    expect(Object.keys(needUpdate).length).toBe(3);
    expect(needUpdate.calc).toBe(1);
    expect(needUpdate.calc2).toBe(2);
    expect(needUpdate.calc3).toBe(3);
    // 会缓存
    const needUpdate2 = calcComputed(
      scope,
      scope.computed,
      Object.keys(scope.computed)
    );
    expect(Object.keys(needUpdate2).length).toBe(0);
    // 再次计算
    scope.data.a = 2;
    const needUpdate3 = calcComputed(
      scope,
      scope.computed,
      Object.keys(scope.computed)
    );
    expect(Object.keys(needUpdate3).length).toBe(3);
    expect(needUpdate3.calc).toBe(2);
    expect(needUpdate3.calc2).toBe(4);
    expect(needUpdate3.calc3).toBe(6);
  });

  test(`calc with complex compute data`, () => {
    const scope = {
      properties: {
        b: 2
      },
      data: {
        a: 1
      },
      computed: {
        calc3() {
          return this.data.calc + this.data.calc2;
        },
        calc4() {
          return this.data.calc + this.data.calc3;
        },
        calc2() {
          return this.data.a + this.data.calc;
        },
        calc5() {
          return this.data.calc3 + this.data.calc4 + this.data.calc2;
        },
        calc() {
          return this.data.a;
        }
      }
    };
    const needUpdate = calcComputed(
      scope,
      scope.computed,
      Object.keys(scope.computed)
    );

    expect(Object.keys(needUpdate).length).toBe(5);
    expect(needUpdate.calc).toBe(1);
    expect(needUpdate.calc2).toBe(2);
    expect(needUpdate.calc3).toBe(3);
    expect(needUpdate.calc4).toBe(4);
    expect(needUpdate.calc5).toBe(9);
  });
});
