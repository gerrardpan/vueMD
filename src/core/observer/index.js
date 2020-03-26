/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

// 生成一个新的空数组，用来保存会被监听的数组操作方法
const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
export class Observer {
  // 需要观察的对象
  value: any;
  // 与观察对象相关联的依赖观察者队列
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data
  
  // 生成一个观察者对象
  constructor (value: any) {
    // 观察者对象实例的value值指向传入构造函数的对象
    this.value = value
    // 生成的观察者对象关联依赖数组
    this.dep = new Dep()
    this.vmCount = 0
    // 传入构造函数的对象设置一个名为ob的属性值指向观察者对象实例
    def(value, '__ob__', this)
    // 判断传入对象类型，是否为数组
    if (Array.isArray(value)) {
      // 判断是否支持 __proto——__，若支持，则直接通过设置传入构造函数的值的__proto__为arrayMethod
      // ，否则就通过defineProperty的方式逐个设置监听数组的函数
      if (hasProto) {
        // 设置传入构造函数的值的上一层原型为对应的值
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 最后设置观察数组的每一项
      this.observeArray(value)
    } else {
      // 若不是数组则动态设置对象的每一个属性为响应式
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  // 循环遍历传入对象的属性，然后通过调用defineReactive函数将每一项设置成响应式的
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  // 遍历并观察数组对象的每一项
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
// 通过__proto__属性直接将目标对象的上一层原型设置为传入对象
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
// 在不支持__proto__的情况下，通过调用defineProperty函数逐项设置传入对象属性的特性
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
// 观察一个对象
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 若传入参数不是对象或是一个虚拟节点，直接返回
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // 若传入对象已经有__ob__这个属性并且是一个Observer对象，则将这个属性的值赋值给临时参数ob
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
    // 否则是（数组或基本类型并且可扩展），则直接用传入参数生成一个新的观察者对象
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  // 如果传入参数将其设置为rootData，则ob的vmCOunt +1，最后返回ob
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
// 定义一个动态属性
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep()
  // 获取传入对象对应属性的特性值
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  // 如果没有getter或者已经有了setter，并且只传入了obj以及key参数（参数长度为2），那就直接赋值
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  // 如果传入shallow为false，也就是选择深度观察，直接再次调用observe生成一个新的子观察者
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 若getter已经存在，就直接调用，否则就拿val给value赋值
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      // 若新值等于旧值则直接返回
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      // 若setter存在则直接通过call调用，否则直接赋值
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 最后判断是否深度监听，然后通知相关依赖数据已修改
      childOb = !shallow && observe(newVal)
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  // 先判断是否是生产环境，否传入对象已经定义过或是否是对象（非基本类型）----否则报出警告
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 是否是数组，并且数组下标是否合法，然后调用splice方法替换数组对应的值（splice是被监听的数组方法里的一个）
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
   // key值是否已经在传入对象中，并且不是原型链上的，然后赋值
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  // 最后设置这个新传入的值为响应式的，然后通知相关依赖
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
// 删除一个响应式属性
export function del (target: Array<any> | Object, key: any) {
  // 若不是生成环境并且（传入参数未定义或者是基本类型），则发出警告
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 若传入参数是数组并且key值是合法index，则直接调用splice删除对应数组项
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  // 若传入参数对象没有对应的key值，直接返回
  if (!hasOwn(target, key)) {
    return
  }
  // 删除key值对应的属性，若传入对象的__ob__不存在，就直接返回
  delete target[key]
  if (!ob) {
    return
  }
  // 否则最后通知到各个依赖
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
// 遍历数组并逐个执行数组项的依赖（深度）
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
