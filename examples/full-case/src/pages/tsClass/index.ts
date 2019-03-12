import { JPage } from 'jgb-weapp';

interface TsClass extends JPage {}

interface IPageData extends IAnyObject {
  carInfo: any;
  ProductInfo?: any;
}

@testable
class TsClass implements JPage {
  data: IPageData = {
    filterProducts: Array(200),
    scrollTop: 0,
    carInfo: null,
    showFixedFilter: false,
    isShowFilter: false,
    isShowRule: false,
    isFilterMode: false,
    hiddenGotop: true,
    tabFilters: [
      {
        name: '综合排序',
        className: 'current'
      },
      {
        name: '适配轮胎',
        className: ''
      },
      {
        name: '',
        className: ''
      },
      {
        name: '筛选',
        className: ''
      }
    ],
    filterOpts: {
      isMatchedTire: false,
      rangePrice: [0, 0],
      minPrice: 0,
      maxPrice: 0,
      brands: [],
      tireSizes: []
    },
    currentArrangeStyle: 0 // 0：综合，1：1行1列，2：1行2列，3：1行3列
  };
  productList: any[];
  showFixedFilter: boolean;
  // tslint:disable-next-line:variable-name
  FilterTabTopPromise: Promise<any>;
  onLoad(opts: any) {
    console.log(opts);
    console.log(this);
    console.log(this.name());
    setTimeout(() => {
      this.$scrollIntoView('#item-100')
    }, 1000);
  }

  @readonly
  name() {
    return 'asdfiasdf';
  }
}

function testable(target: any) {
  target.isTestable = true;
}

function readonly(target: any, name: any, descriptor: any) {
  // descriptor对象原来的值如下
  // {
  //   value: specifiedFunction,
  //   enumerable: false,
  //   configurable: true,
  //   writable: true
  // };
  descriptor.writable = false;
  return descriptor;
}

JPage(new TsClass());
