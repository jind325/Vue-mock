import { def } from './util';
//获取数组原型
const arrayProto = Array.prototype;
//劫持所有的数组方法
export const arrayMethods = Object.create(arrayProto);
//这里的目的， 大致就是劫持所有的数组方法， 一方面让所有的数组方法依旧能够返回应该返回的值，另一方面在执行添加元素的操作时， 也会通知所有的订阅者更新数组
[
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
].forEach(function(method) {
    // 缓存一份原始方法
    const original = arrayProto[method];
    // 开始覆盖原始方法
    def(arrayMethods, method, function() {
        let i = arguments.length;
        // 下面四段代码可以用这个代替, const args = [].slice.call(arguments)
        //其实就是把之后数组方法调用时传入的参数转化为数组
        const args = new Array(i);
        while(i--) {
            args[i] = arguments[i];
        }
        //这里的this指向的是要被覆盖的数组方法的数组, 
        //目的是使用原来的数组方法时, 不影响到最后的返回结果, 其实最后被覆盖的也只有增加元素的三个方法
        //但是这里的this为什么会指向被覆盖的数组方法的数组呢？
        //原因是def(arrayMethods, method, function() {})方法本质上时Object.defineProperty, 
        //第三个参数value如果为function时， function内部this指向就是arrayMethods
        const result = original.apply(this, args);
        //ob是每个数组对象对应的obeserver对象
        const ob = this.__ob__;
        let inserted;
        switch(method) {
            case 'push':
                inserted = args;
                break;
            case 'unshift':
                inserted = args;
                break;
            case 'splice':
                inserted = args.slice(2);
                break;
        }
        //如果监听的data中的对象有push,unshift,splice等添加新值的方法，就监听新值
        //在这里调用的是observer的observerArray方法，监听插入的值的item如果是对象，就监听该item
        if (inserted) ob.observerArray(inserted);
        //每次使用数组方法，都触发数组对象的dep发布事件，触发watcher的updater
        ob.dep.notify();
        //为了防止影响到数组本身的方法，还是要返回该返回的结果
        return result;
    });
});

//vue如何监听的数组：
//vue通过对Array.prototype的所有修改数组的方法进行重写， 
//第一步会保存一个数组的原有方法，并且执行使用原有的方法获取该方法正确的值， 然后在最后会返回这个值保证方法返回结果的正确性；
//第二步：如果数组方法为新增值得方法例如unshift，push，splice，就会调用oberver方法，去观察添加的新值。依旧是如果新值中有对象就会对
//对它进行监听操作,
//第三步: 每一个对象依旧会有一个监听器属性__ob__, 监听器的主题管理属性为dep, 一但调用了数组的方法之后, 就需要向数组
//对象所有的订阅者watcher进行通知并且触发订阅者watcher中间传入的updater
//oberver在便历所有对象的时候, 会在data中所有为对象的子属性上添加一个__ob__指向侦听器, 并且保存dep对象