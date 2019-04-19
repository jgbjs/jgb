export class CallNode {
  /**
   * 调用栈节点
   * 被谁调用
   */
  public callStackNodes = new Set<CallNode>();
  private _weight: number;
  private _recursiveCallNode: CallNode | false;

  constructor(
    public key: string,
    /**
     * 调用依赖
     * 调用谁
     */
    public callDepNodes: Array<string | CallNode> = []
  ) {}

  /**
   * 判断是否是当前 node
   * @param key
   */
  isCurrentNode(key: string) {
    return this.key === key;
  }

  /**
   * 遍历 allDepNodes将callDepNodes中匹配字符替换为node
   * @param node
   */
  resolveNode(node: CallNode) {
    const key = node.key;
    this.callDepNodes.forEach((nodeKey, idx) => {
      if (nodeKey === key) {
        this.callDepNodes[idx] = node;
        node.setCallStackNode(this);
      }
    });
  }

  /**
   * 设置调用栈节点
   * @param node
   */
  setCallStackNode(node: CallNode) {
    if (node.key === this.key) {
      console.error('不能自调用');
      return;
    }

    if (this.callStackNodes.has(node)) {
      return;
    }

    this.callStackNodes.add(node);
    node.resolveNode(this);
  }

  // 向上回溯调用栈是否包含自身
  backCallStack(targetNode: CallNode = this): any {
    const callStackNodes = [...this.callStackNodes];
    let node: CallNode = callStackNodes.pop();
    while (node) {
      if (node.key === targetNode.key || node.backCallStack(targetNode)) {
        return targetNode;
      }

      node = callStackNodes.pop();
    }
  }

  /**
   * 判断是否存在循环调用
   * 如果有循环节点 则抛出
   * @param node
   */
  isContainsRecursiveCall(callStack = new Set()) {
    if(typeof this._recursiveCallNode !== 'undefined') {
      return this._recursiveCallNode
    }

    if (callStack.has(this) && this.backCallStack()) {
      this._recursiveCallNode = this;
      return this;
    }

    const callDepNodes = this.callDepNodes;
    // 没有调用栈 对于判断循环调用无用 所以过滤
    if (callDepNodes.length > 0) {
      callStack.add(this);
    }

    for (const node of callDepNodes) {
      if (node instanceof CallNode) {
        if (node.isContainsRecursiveCall(callStack)) {
          this._recursiveCallNode = node;
          return node;
        }
      }
    }

    this._recursiveCallNode = false;
    return false;
  }

  private getWeight(): number {
    if (this.callDepNodes.length === 0) {
      return 1;
    }

    const recursiveCallNode = this.isContainsRecursiveCall();
    if (recursiveCallNode) {
      return 10000;
    }

    return (this.callDepNodes as CallNode[]).reduce((acc, node) => {
      return acc + node.weight;
    }, 1);
  }

  /**
   * 获取在所在调用栈的权重
   * 权重越大越晚调用
   */
  get weight(): number {
    if (!this._weight) {
      this._weight = this.getWeight();
    }

    return this._weight;
  }
}

// tslint:disable-next-line: max-classes-per-file
export class CallTree {
  nodes: CallNode[] = [];

  addCallNode(node: CallNode) {
    const lastNodes: CallNode[] = [].concat(this.nodes);
    this.nodes.push(node);

    for (const n of lastNodes) {
      n.resolveNode(node);
      node.resolveNode(n);
    }

    for (const n of node.callDepNodes) {
      if (n instanceof CallNode) {
        n.setCallStackNode(node);
      }
    }
  }

  getRecursiveCallNodes() {
    const recursiveCalls = new Set<CallNode>();
    for (const node of this.nodes) {
      const nodes = node.isContainsRecursiveCall();
      if (nodes) {
        recursiveCalls.add(nodes);
      }
    }

    return recursiveCalls;
  }

  /**
   * 获取最优调用栈顺序
   */
  getBestCallStackSequence() {
    const recursiveCalls = this.getRecursiveCallNodes();
    const nodes = this.nodes.slice(0);
    if (recursiveCalls.size > 0) {
      console.error(
        `存在循环调用 ${[...recursiveCalls].map(node => node.key).join(',')}`
      );
    }

    return nodes.sort((n1, n2) => n1.weight - n2.weight);
  }
}
