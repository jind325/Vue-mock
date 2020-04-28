//目测是观察者
import Watcher from './watcher'
//也是观察者?
import observer from './observer'
//编译器
import Compiler from './compiler'

//相当于Vue的实例
class MVVM {
    constructor (options) {
        //vue的options
        this.$options = options;
        //定义私有属性data
        this._data = this.$options.data;
        var self = this;
        // 数据劫持(代理) vm.data.属性名称 => vm.属性名称 方便访问, 对每一个vm.option.data之下的数据进行代理
        Object.keys(this.$options.data).forEach(key => {
            this._proxy(key);
        });
        //监听数据，给数据添加dep主题对象，在数据改变时通知订阅了该属性的watcher
        observer(this._data);
        //编译结点，解析各种指令，并且将每个node节点对应一个watcher身份，在收到通知时改变自身view视图
        this.$compiler = new Compiler(options.el || document.body, this);
    }

    $watch (expression, callback) {
        new Watcher(this, expression, callback);
    }
    //代理this.[key]到this._data[key]上
    _proxy (key) {
        let self = this;
        //在这里this就是vm, 将data中的每一个key都重新在vm上挂载一遍, 获取vm[key]的时候返回vm.options.data[key]
        Object.defineProperty(this, key, {
            configurable: false,
            enumerable: true,
            get() {
                return self._data[key];
            },
            set(value) {
                self._data[key] = value;
            }
        });
    }
}

window.MVVM = MVVM;