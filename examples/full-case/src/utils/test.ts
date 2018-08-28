import cloneDeep from 'lodash/cloneDeep'

export default function(input: string) {
  
  return input + 'test' + cloneDeep({});
}
