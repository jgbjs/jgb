# weapp

对小程序内置对象封装方便扩展



## 快速开始

安装weapp

```shell
npm i -S weapp 
npm i -g jgb-cli #参考jgb-cli文档

# 开始编译
jgb build

```

使用

``` js
// app.js
import { JApp } from 'weapp'
import 'init.js'
JApp({
    
});

// pages/index/index.js
import { JPage } from 'weapp'

JPage({
    
})

// components/index/index.js
import { JComponent } from 'weapp'
JComponent({
    
})

// init.js
import { JApp, JPage, JComponent } from 'weapp'

JPage.mixin({
    onLoad() {
        // 可以做些初始化统计
    }
})
```





## 扩展

以下方法会默认扩展静态方法 **[mixin](#Mixin)**, **[intercept](#Intercept)** . 并继承 **[EventBus](#EventBus)**

- **JPage** 扩展 Page
- **JApp** 扩展 App
- **JComponent** 扩展 Component



## Mixin

类似Vue.mixin,**会优先执行mixin中的方法**。

```js
import { JPage } from 'weapp'

JPage.mixin({
    onLoad() {
        // todo
    }
})
```



## Intercept

拦截方法并返回值，如果调用intercept方法多次拦截，会按照先后顺序执行并返回值，

**注意：res的值是上一次的返回值**

```js
import { JPage } from 'weapp'

JPage.intercept('onShareAppMessage' , (res) => {
     // todo
     return res
})
```

## EventBus

JPage,JComponent,JApp 中都有扩展

- $on(event: string, fn: Function)

监听事件

- $off(event?: string, fn?: Function)

解除监听事件

- $emit(...data:any[])

触发监听

- $emitAsync(...data:any[]) : Promise<any>

异步触发监听，可等待

- $once(event: string, fn: Function)

只监听一次事件



```js
// pages
import { JPage } from 'weapp'

JPage({
    onLoad() {
        this.$on('something', () => {
            console.log('something done.')
        })
    }
})
```



## 插件

内置了两个插件

- RouterPlugin

类vue-router的路由

- NativeApiPlugin

扩展原生wx方法

### 使用插件

```js
import { jgb , use} from 'weapp'
import Plugin from 'xxx/Plugin'

use(Plugin);
```

### 编写插件

```js
export default {
    install({
        JApp,
        JPage,
        JComponent,
        jgb
    }) {
        // todo: 实现plugin
    }
}
```





## JGB

对wx的原生方法封装，对于异步返回方法支持Promise，可以统一拦截返回值和请求参数等功能。

```js
import 'miniapp-regenerator-runtime' // babel regenerator-runtime
import { jgb } from 'weapp'

/**
	result: 返回值
	status: 拦截状态
		begin: 开始调用前, 此时可以拦截 options并返回
		success: 成功, 同步和异步方法成功时
		fail: 失败, 异步方法失败时
		complete: 完成, 异步方法完成时
	options: 请求的参数
*/
jgb.intercept('getStorageInfo', (result, status , options) => {
    switch(status) {
        case 'begin':
            // 主要 result 和 options 参数都是一样
            return options
            break;
        case 'success':
            result.currentSize = 2;
            return result;
            break;
    }
  console.log('intercept success', result, status)
  return result
});


jgb.getStorageInfo({
    success(res) {
        console.log(res)
    }
})

const result = await jgb.getStorageInfo()


```





## roadmap

- [x] 扩展原生wx方法实现 **intercept**等功能
