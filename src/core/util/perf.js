import { inBrowser } from './env'

// 到处简单封装之后的mark函数，以及修改过后的measure函数
export let mark
export let measure

if (process.env.NODE_ENV !== 'production') {
  // 若是浏览器环境，则把perf设置为performance对象
  const perf = inBrowser && window.performance
  /* istanbul ignore if */
  if (
    perf &&
    perf.mark &&
    perf.measure &&
    perf.clearMarks &&
    perf.clearMeasures
  ) {
    // 简单重新封装performance.mark()，以及measuer函数
    mark = tag => perf.mark(tag)
    measure = (name, startTag, endTag) => {
      // 记录2个mark之间的时间差，并清除marks
      perf.measure(name, startTag, endTag)
      perf.clearMarks(startTag)
      perf.clearMarks(endTag)
      // perf.clearMeasures(name)
    }
  }
}
