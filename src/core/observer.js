import Dep from './dep';
import { def } from './util';
//arrayMethods是劫持了数组方法的对象
import { arrayMethods } from './array';

//原型继承
function protoAugment(target, src) {
    target.__proto__ = src;
}
//赋值继承
function copyAugment(target, src, keys) {
    for (let i = 0; i < keys.length; i++) {
        //fixbug
        def(target, keys[i], src[keys[i]]);
    }
}
//注意：obeserver指监听对象。监听对象是data
//每一个被监听的data都会有一个__ob__对象指向该observer
export default function observer(data) {
    if (!data || typeof data !== 'object') {
        return;
    } else if (data.hasOwnProperty("__ob__") && data["__ob__"] instanceof Observer) {
        return;
    }
    return new Observer(data);
}

class Observer {
    constructor(data) {
        //这里的dep作用，一开始也比较困惑，后来觉得应该是给数组用的主题，
        //jim: 我也很困惑,为啥要在这里创建
        //在这里创建了一个主题之后, 可以去看array,js, 里面会调用数组的__ob__, 在那里,
        //如果数组有增加元素, 就会利用这里挂载的dep对所有的观察者进行通知
        //对象元素应该是没有用到这里定义的主题, 因为在defineReactive里面重新定义了一个新的dep
        this.dep = new Dep();
        // 给每个数据一个指向Observer的引用，array.js会用到
        //即data.__ob___ = Observer
        def(data, "__ob__", this);
        this.data = data;
        //vm.data中如果存在数组，会在后面的递归中进入下面if这个流程
        if (Array.isArray(data)) {
            //【？？？】如果data有原型？这里data已经是数组了当然有原型。。不太明白这里什么意思
            const argment = data.__proto__ ? protoAugment : copyAugment;
            // 开始覆盖data数组的原生方法
            argment(data, arrayMethods, Object.keys(arrayMethods));
            // 对数组元素遍历下，有元素可能是对象
            this.observerArray(data);
        } else {
            //开始遍历所有data对象的所有属性
            //第一次observer this.$option.data时, 总是会走这一步
            this.walk(data);
        }
    }

    walk(data) {
        let self = this;
        //遍历对象的所有的属性, 执行defineReactive方法, 该方法作用为劫持属性的setter和getter, 具体可以看下面的定义
        Object.keys(this.data).forEach(function (key) {
            self.defineReactive(data, key, data[key]);
        });
    }
    //用于监听数组的方法
    observerArray(items) {
        for (let i = 0; i < items.length; i++) {
            // 数组的元素是对象就监听
            observer(items[i]);
        }
    }
    //用著名的defineProperty来劫持所有对象的getter和setter, getter定义在compiler阶段
    //setter则是每次对data进行改动时触发
    defineReactive(data, key, value) {
        // dep即我们之前提到的主题对象，它既可以添加观察者Watcher，又可以发布事件让所有Watcher更新视图，每个属性都有一个dep
        let dep = new Dep(),
            descriptor = Object.getOwnPropertyDescriptor(data, key);
        //如果已经存在访问器且访问器接口的configurable属性为false则直接返回
        if (descriptor && !descriptor.configurable) {
            return;
        }
        //递归监听，value是对象会返回一个new Observer(value)，否则childObserver为undifined
        let childObserver = observer(value);
        Object.defineProperty(data, key, {
            enumerable: true,
            configurable: false,
            //关于getter和setter中this的指向, mdn规定this set to the object through which the property is accessed/assigned
            get: function () {
                //get函数会在node编译时初始化赋值时触发，此时Dep.target会指向那个watcher观察者
                //一开始认为mvvvm在执行observer的时候没有target这段会有问题, 但是后来知道,
                //在初始化observer的时候并不需要读取data数据,也不需要挂载observer; 只是定义了getter
                //+1理解: 在编译节点的时候, 定义了getter和setter函数
                //然后在第一次执行compiler函数时, 因为还没有对对应节点挂载watcher, 
                //获取data数据时Dep.target尚未定义, 所以并不会触发getter内部的订阅事件
                //数据劫持的getter和setter; 之后
                if (Dep.target) {
                    // 为这个属性添加观察者watcher
                    //等于Dep.target.addDep(this);
                    //上述Dep.target为一个watcher, 在watcher.get方法内定义
                    dep.depend();
                    //如果存在子数组（这里认为对子对象来说没有作用），则为子数组添加观察者，当数组使用方法时，数组的dep发布事件并更新视图
                    if (childObserver) {
                        childObserver.dep.depend();
                    }
                }
                return value;
            },
            set: function (newValue) {
                if (newValue == value) {
                    return;
                }
                if (typeof newValue === 'object') {
                    //观察新值
                    observer(newValue);
                }
                value = newValue;
                // 告诉所有订阅了这个属性的Watcher，数据更新了！
                dep.notify();
            }
        });
    }
}

//observer做的事情包括首先从data入手, 每一个observer实例被创建时, 都会带有一个订阅管理器,  负责添加订阅者和向订阅者分发消息. 
//每一个观察者都是以对象为单位的, 被观察的往往都是一个对象, 在这个对象上, 会创建一个__ob__指向该对象的observer. 观察者分两种情况, 一种是如果observer处理的是对象时, 
//它会通过defineproperty对于对象的setter和getter进行重写, 一但触发setter, 比如说在模板的input对data某个绑定的属性进行修改的时候,或者是手动重新修改该属性的值得时候, 订阅管理器会向所有的订阅者watcher进行通知,
//watcher是什么时候创建的, 接到通知又会又做什么一会再说. 如果是我们对这个属性进行get操作时, getter会判断当前的订阅管理器是否有指向一个watcher, 如果dep.target的值是一个watcher订阅者, 就将它放到订阅者列表当中.
//对于数组observer有另外一套逻辑, 首先自然也是会在数组上绑定一个__ob__对象指向observer, 再对数组进行遍历, 如果数组中某些元素是对象, 那么就会对这些对象的getter和setter同样进行和监听对象一样的操作, 就是劫持getter和setter, 
//然后数组的所有的修改方法进行重写, 一但数组调用修改值得方法就会触发数组身上的observer对应的订阅管理器的通知方法通知数组的所有的watcher. 如果说这个数组新增了一些值(unshift, splice等), 就会创建一个新的观察者劫持新增的值中间的属性.
//对于watcher的创建, 在watcher里有更加详细的说明