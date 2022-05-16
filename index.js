/*
 * @Descripttion: 手写个promise
 * @Author: armin
 * @Date: 2022-04-24 13:21:28
 * @LastEditors: armin
 * @LastEditTime: 2022-05-05 13:01:51
 */
class myPromise {
  // 初始化 promise 的三种状态，且互相是不可逆转的
  static PENDING = 'pending'
  static FULFILLED = 'fulfilled'
  static REJECTED = 'rejected'
  constructor(func) {
    // 每一个实例的状态属性，默认为 pending
    this.PromiseState = myPromise.PENDING
    // Promise resolve 或 reject 传递过来的参数
    this.PromiseResult = null
    this.onFulfilledCallbacks = [] // 保存成功回调
    this.onRejectedCallbacks = [] // 保存失败回调
    try {
      func(this.resolve.bind(this), this.reject.bind(this))
    } catch (error) {
      this.reject(error)
    }
  }
  resolve(result) {
    if(this.PromiseState === myPromise.PENDING) {
      setTimeout(() => {
        this.PromiseState = myPromise.FULFILLED
        this.PromiseResult = result
        this.onFulfilledCallbacks.forEach(callback => {
          callback(result)
        })
      })
    }
  }
  reject(reason) {
    if(this.PromiseState === myPromise.PENDING) {
      setTimeout(() => {
        this.PromiseState = myPromise.REJECTED
        this.PromiseResult = reason
        this.onRejectedCallbacks.forEach(callback => {
          callback(reason)
        })
      })
    }
  }
  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
    onRejected = typeof onRejected === 'function' ? onRejected : reason => {
      throw reason
    }
    const promise2 = new myPromise((resolve, reject) => {
      if(this.PromiseState === myPromise.FULFILLED) {
        setTimeout(() => {
          try {
            let x = onFulfilled(this.PromiseResult)
            resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e) // 捕获前面 onFulfilled 中抛出的异常
          }

        })
      } else if(this.PromiseState === myPromise.REJECTED) {
        setTimeout(() => {
          try {
            let x = onRejected(this.PromiseResult)
            resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      } else if(this.PromiseState === myPromise.PENDING) {
        this.onFulfilledCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onFulfilled(this.PromiseResult)
              resolvePromise(promise2, x, resolve, reject)
            } catch (e) {
              reject(e)
            }
          })
        })
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onRejected(this.PromiseResult)
              resolvePromise(promise2, x, resolve, reject)
            } catch (e) {
              reject(e)
            }
          })
        })
      }
    })
    return promise2
  }
}

/**
 * 对resolve()、reject() 进行改造增强 针对resolve()和reject()中不同值情况 进行处理
 * @param  {promise} promise2 promise1.then方法返回的新的promise对象
 * @param  {[type]} x         promise1中onFulfilled或onRejected的返回值
 * @param  {[type]} resolve   promise2的resolve方法
 * @param  {[type]} reject    promise2的reject方法
 */
function resolvePromise(promise2, x, resolve, reject) {
  // 2.3.1 如果从 onFulfilled 或 onRejected 中返回的 x 就是 promise2，会导致循环引用报错
  if(x === promise2) {
    return reject(new TypeError('Chaining cycle detected for promise'))
  }
  // 2.3.2 如果 x 为 Promise，则使 promise2 接受 x 的状态
  if (x instanceof myPromise) {
    if (x.PromiseState === myPromise.PENDING) {
      /**
       * 2.3.2.1 如果 x 处于等待态， promise 需保持为等待态直至 x 被执行或拒绝
       *         注意 “直至 x 被执行或拒绝” 这句话
       *         这句话的意思是：x 被执行，如果执行的时候拿到一个 y，还要继续解析 y
       */
      x.then(y => {
        resolvePromise(promise2, y, resolve, reject)
      }, reject)
    } else if (x.PromiseState === myPromise.FULFILLED) {
      // 2.3.2.2 如果 x 处于执行态，用相同的值执行 promise
      resolve(x.PromiseResult)
    } else if (x.PromiseState === myPromise.REJECTED) {
      // 2.3.2.3 如果 x 处于拒绝态，用相同的据因拒绝 promise
      reject(x.PromiseResult)
    }
  } else if (x !== null && ((typeof x === 'object' || (typeof x === 'function')))) {
    // 2.3.3 如果 x 为对象或函数
    try {
      // 2.3.3.1 把 x.then 赋值给 then
      var then = x.then
    } catch (e) {
      // 2.3.3.2 如果取 x.then 的值时抛出错误 e，则以 e 为据因拒绝 promise
      return reject(e)
    }

    /**
     * 2.3.3.3
     * 如果 then 是函数，将 x 作为函数的作用域 this 调用之。
     * 传递两个回调函数作为参数
     * 第一个参数叫做 'resolvePromise'，第二个参数叫做 'rejectPromise'
     */
    if (typeof then === 'function') {
      // 2.3.3.3.3 如果 resolvePromise 和 rejectPromise 均被调用，或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
      let called = false // 避免多次调用
      try {
        then.call(
          x,
          // 2.3.3.3.1 如果 resolvePromise 以值 y 为参数被调用，则运用 [[Resolve]](promise, y)
          y => {
            if (called) return
            called = true
            resolvePromise(promise2, y, resolve, reject)
          },
          // 2.3.3.3.2 如果 rejectPromise 以据因 r 为参数被调用，则以据因 r 拒绝 promise
          r => {
            if (called) return
            called = true
            reject(r)
          }
        )
      } catch (e) {
        /**
         * 2.3.3.3.4 如果调用 then 方法抛出了异常 e
         * 2.3.3.3.4.1 如果 resolvePromise 或 rejectPromise 已经被调用，则忽略
         */
        if(called) return
        called = true
        /**
         * 2.3.3.3.4.2 否则以 e 为据因拒绝 promise
         */
        reject(e)
      }
    } else {
        // 2.3.3.4 如果 then 不是函数，以 x 为参数执行 promise
        resolve(x)
    }
  } else {
    // 2.3.4 如果 x 不为对象或者函数， 以 x 为参数执行 promise
    return resolve(x)
  }
}

myPromise.deferred = function() {
  let result = {}
  result.promise = new myPromise((resolve, reject) => {
    result.resolve = resolve
    result.reject = reject
  })
  return result
}

module.exports = myPromise