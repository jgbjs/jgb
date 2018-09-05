# jgb-weapp

对小程序内置对象封装方便扩展



## 扩展

以下方法会默认扩展静态方法 **[mixin](#Mixin)**, **[intercept](#Intercept)** . 并继承 **[EventBus](#EventBus)**

- **JPage** 扩展 Page
- **JApp** 扩展 App
- **JComponent** 扩展 Component

## Mixin

类似Vue.mixin,会优先执行mixin中的方法。

```js
import { JPage } from 'jgb-weapp'

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
import { JPage } from 'jgb-weapp'

JPage.intercept('onShareAppMessage' , (res) => {
     // todo
     return res
})
```

## EventBus

- $on(event: string, fn: Function)
- $off(event?: string, fn?: Function)
- $emit(...data:any[])
- $emitAsync(...data:any[]) : Promise<any>
- $once(event: string, fn: Function)



## roadmap

- [ ] 扩展原生wx方法实现 **intercept**等功能