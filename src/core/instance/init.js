/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  // 设置vue实例的原型方法_init，初始化vue实例。
  Vue.prototype._init = function (options?: Object) {
    // 将生成的vue实例赋值为vm变量，并且设置其_uid
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      // 标记vue实例初始化开始时间，方便后面使用
      mark(startTag)
    }

    // a flag to avoid this being observed
    // 防止当前vue实例对象被当做观察对象
    vm._isVue = true
    // merge options
    // 若传入参数是个组件
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      // 初始化内置组件，并进行优化
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    // 初始化lifecycle，初始化$parent,$root,$refs,isMounted,isDestroyed之类的
    initLifecycle(vm)
    // 初始化事件，触发子级组件attach到父级的事件，调用监听函数
    initEvents(vm)
    // 初始化渲染器，渲染组件内slot，并设置$listener,$attr为响应式的（值为父级的listener，attr）
    initRender(vm)
    // 调用钩子函数beforeCreate，到这里vue实例初始化的准备工作完成
    callHook(vm, 'beforeCreate')
    // 拿到注入数组与其对应的值，然后将注入数组的每一项设置成响应式的数据,inject数据来自祖先级的_provide
    initInjections(vm) // resolve injections before data/props
    // 接下来，总的来说就是初始化组件的props, methods, data, watch, computed这些属性
    initState(vm)
    // 初始化当前vm的_provide属性，方便给子组件调用
    initProvide(vm) // resolve provide after data/props
    // 调用vm的created钩子函数
    callHook(vm, 'created')

    /* istanbul ignore if */
    // 输出vue实例初始化花了多少时间
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    // 若传入了el属性，则调用$mount函数开始渲染模板
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
