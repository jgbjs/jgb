import cloneDeep from 'lodash/cloneDeep'

export default function testUtil(u) {
  console.log(u + 3)
}

export function deepCopy(obj) {
  return cloneDeep(obj)
}