/* not type checking this file because flow doesn't play well with Proxy */

import config from 'core/config'
import { warn, makeMap, isNative } from '../util/index'

let initProxy

if (process.env.NODE_ENV !== 'production') {
  const allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
    'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
    'require' // for Webpack/Browserify
  )
  // 不存在响应式变量警告：不能通过target.$data的方式访问，则说明不存在key值对应的响应式属性值
  const warnNonPresent = (target, key) => {
    warn(
      `Property or method "${key}" is not defined on the instance but ` +
      'referenced during render. Make sure that this property is reactive, ' +
      'either in the data option, or for class-based components, by ' +
      'initializing the property. ' +
      'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.',
      target
    )
  }
  // 变量命名警告：属性名为 _ 或 $ 开头的变量，只能通过vm.$data而不能通过vm直接拿到
  const warnReservedPrefix = (target, key) => {
    warn(
      `Property "${key}" must be accessed with "$data.${key}" because ` +
      'properties starting with "$" or "_" are not proxied in the Vue instance to ' +
      'prevent conflicts with Vue internals. ' +
      'See: https://vuejs.org/v2/api/#data',
      target
    )
  }

  const hasProxy =
    typeof Proxy !== 'undefined' && isNative(Proxy)

  if (hasProxy) {
    const isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta,exact')
    // 通过代理的方式修改内置keycode修饰器
    config.keyCodes = new Proxy(config.keyCodes, {
      set (target, key, value) {
        if (isBuiltInModifier(key)) {
          warn(`Avoid overwriting built-in modifier in config.keyCodes: .${key}`)
          return false
        } else {
          target[key] = value
          return true
        }
      }
    })
  }

  const hasHandler = {
    has (target, key) {
      const has = key in target
      const isAllowed = allowedGlobals(key) ||
        (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data))
        // 若key值不能通过in关键字在vm访问到，或（key值是全局变量或（是以_开头的字符串，并且无法通过in关键字在vm.$data拿到）
      if (!has && !isAllowed) {
        // 若key值对应变量能在vm.$data中通过in关键字访问到，则发出变量命名规则警告
        if (key in target.$data) warnReservedPrefix(target, key)
        // 否则发出不存在警告
        else warnNonPresent(target, key)
      }
      return has || !isAllowed
    }
  }

  const getHandler = {
    get (target, key) {
      // 若key是字符串，并且target没办法通过in关键字获取key值对应的属性
      if (typeof key === 'string' && !(key in target)) {
        // 若能通过target.$data访问得到（也就是，不能通过vm，但是能通过vm.$data访问到）,则说明属性命名方式存在问题
        // 根据文档https://vuejs.org/v2/api/#data，可知，若属性名为 _ 或 $ 开头的变量，只能通过vm.$data而不能通过vm直接拿到
        if (key in target.$data) warnReservedPrefix(target, key)
        // 若也不能通过target.$data的方式访问，则说明不存在key值对应的响应式属性值，发出警告
        else warnNonPresent(target, key)
      }
      return target[key]
    }
  }

  initProxy = function initProxy (vm) {
    // 是否存在Proxy内置构造函数
    if (hasProxy) {
      // determine which proxy handler to use
      const options = vm.$options
      const handlers = options.render && options.render._withStripped
        ? getHandler
        : hasHandler
      // 若存在Proxy，则将vm的渲染代理使用proxy的方式
      vm._renderProxy = new Proxy(vm, handlers)
    } else {
      // 否则直接将vm自身赋值给渲染代理
      vm._renderProxy = vm
    }
  }
}

export { initProxy }
