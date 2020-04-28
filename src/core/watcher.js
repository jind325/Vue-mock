import Dep from './dep'
//watcher观察者对象, 观察对象是node, 或者说是node中的expression
export default class Watcher {

    constructor(vm, expression, callback) {
        this.callback = callback;
        this.vm = vm;
        // watch的数据属性, 例如info.uid之类的
        this.expression = expression;
        //触发更新时的回调函数
        this.callback = callback;
        // watcher监听的属性的Id
        // 就是本watcher监听了哪些主题
        this.depIds = {};
        // 备份当前的值，以便缓冲变化
        //首次初始化watcher的时候, 这一步会储存当前的data中的expression的值, 在获取值之前, 先把主题对象的target
        //指向该watcher, 意味着当前watcherzhu, 然后在data中劫持的getter中
        this.oldValue = this.get();
    }
    //更新本node的视图
    update () {
        let newValue = this.get();
        let oldValue = this.oldValue;
        if (newValue !== this.oldValue) {
            // 更新备份，准备下次对比
            this.oldValue = newValue;
            // 执行回调更新视图
            this.callback.call(this.vm, newValue, oldValue);
        }
    }
    //观察某个属性(主题?)
    //用主题来描述, 就是在主题的订阅者列表里面,加入这个观察者
    addDep (dep) {
        //
        if (!this.depIds.hasOwnProperty(dep.id)) {
            // 添加订阅者
            dep.addSub(this);
            // 该属性的依赖列表
            this.depIds[dep.id] = dep;
        }
    }
    //取得node的expresstion在vm中的值
    get () {
        Dep.target = this;
        // 求值的过程会触发vm属性值的getter
        let value = this.getVMVal();
        // 访问完了，置空
        Dep.target = null;
        return value;
    }

    getVMVal () {
        let expression = this.expression.split('.');
        let value = this.vm;
        expression.forEach(function (curVal) {
            // 这里取值的过程，会调用到每一个数据的getter，根据getter里面的闭包
            // 从而访问到数据的dep(主题),调用dep.depend(等于dep.addSub(watcher))
            // 属性dep.depend, 进一步调用到Watch的addDep，让watcher添加进去
            value = value[curVal];
        });
        return value;
    }
}