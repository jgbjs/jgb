import { IPlugin } from '../../types/plugins';
import nextTick from '../utils/nextTick';

/**
 * 优化setData性能
 * 将同一时间片内的setData合并，类似 vue
 */
const setDataPlugin: IPlugin = {
  install(res) {
    const { JComponent, JPage } = res;

    JComponent.mixin({
      created() {
        setDataPerformance.call(this);
      }
    });

    JPage.mixin({
      onLoad() {
        setDataPerformance.call(this);
      }
    });
  }
};

function setDataPerformance(this: any) {
  const $MERGE_DATA = Symbol('$merge_data');
  const setData = this.setData.bind(this);
  this[$MERGE_DATA] = [];

  Object.defineProperty(this, 'setData', {
    configurable: true,
    get() {
      return (data: any, cb: any) => {
        this[$MERGE_DATA].push({ data, cb });
        nextTick(() => {
          if (this[$MERGE_DATA].length === 0) return;
          const copies = this[$MERGE_DATA].slice(0);
          this[$MERGE_DATA].length = 0;
          const datas = [];
          const cbs = [] as any[];
          const len = copies.length;
          for (let i = 0; i < len; i++) {
            const { data, cb } = copies[i];
            datas.push(data);
            if (typeof cb === 'function') {
              cbs.push(cb);
            }
          }

          const data = Object.assign({}, ...datas);
          setData(data, () => {
            const copies = cbs.slice(0);
            const len = cbs.length;
            cbs.length = 0;
            let i = 0;
            while (i < len) {
              try {
                copies[i]();
              } catch (error) {
                console.error(error);
              }
              i++;
            }
          });
        });
      };
    }
  });
}

export default setDataPlugin;
