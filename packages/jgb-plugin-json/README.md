# jgb-plugin-json

支持 json 编译的插件，会自动查找.json 中符合小程序引用规则的资源，例如 app.js 中的 pages 的相关四个文件、分包、
usingComponents 中的组件等资源


## hook

|     hookName      |                 hooktime                  | emitdata |
| :---------------: | :---------------------------------------: | :------: |
| collect-app-json  |           当收集app.json依赖时            |   表1    |
| collect-page-json | 当收集其他包含usingComponents字段的json时 |   表2    |

|   字段名    |    值    |        描述        |
| :---------: | :------: | :----------------: |
| dependences |          | 依赖项:Set<string> |
|   appJson   | app.json |        json        |
|     ctx     |          |     JsonAsset      |

|   字段名    |    值     |        描述        |
| :---------: | :-------: | :----------------: |
| dependences |           | 依赖项:Set<string> |
|  pageJson   | page.json |        json        |
|     ctx     |           |     JsonAsset      |