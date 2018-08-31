# jgb-plugin-less

处理less

## 默认支持的文件类型

- .less

## 注意事项

因为less编译css时

```less
@import 'xxx.css' 
/**
    默认是将xxx.css直接编译到当前文件中
    所以要显示指定 @import (css) 'xxx.css'
    详见 http://lesscss.cn/features/#import-options
    这里我做了优化默认将 @import 'xxx.css' =>  @import (css) 'xxx.css'
    以达到资源复用的目的
*/
```



