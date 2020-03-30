import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}
// 初始化vue实例
initMixin(Vue)
// 初始化实例的data, props, watch等属性
stateMixin(Vue)
// 初始化实例的 $on, $once, $off, $emit等事件
eventsMixin(Vue)
// 初始化vue实例的$forceUpdate, $destroy等属性
lifecycleMixin(Vue)
// 
renderMixin(Vue)

export default Vue
