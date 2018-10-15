import * as _ from 'lodash';

export function throttle(wait = 0, options = {}) {
  return (target: any, name: string, descriptor: PropertyDescriptor) => {
    const fn = descriptor.value;

    descriptor.value = _.throttle(fn, wait, options);

    return descriptor;
  };
}

export function debounce(wait = 0, options = {}) {
  return (target: any, name: string, descriptor: PropertyDescriptor) => {
    const fn = descriptor.value;

    descriptor.value = _.debounce(fn, wait, options);

    return descriptor;
  };
}
