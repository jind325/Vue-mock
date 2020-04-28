import Watcher from './watcher';

let uid = 0;

//TODO 主题对象
export default class Dep {
    //这个属性是干嘛用的?(不能被继承只能直接调用)
    //暂时发现的是target内部都是在observer中出创建的new Dep()
    static target;

    constructor () {
        //所有订阅者的编号
        this.id = uid++;
        //所有的订阅者的名单
        this.subs = [];
    }
    //增加一个订阅者
    addSub (sub) {
        this.subs.push(sub);
    }
    //移除某个订阅者
    removeSub (sub) {
        let index = this.subs.indexOf(sub);
        if (index != -1) {
            this.subs.splice(index, 1);
        }
    }
    //没看懂, 暂时认为是在订阅者名单中间添加this， 新的观察者
    // 这个方法可以理解为, 主题对象, 
    depend () {
        // Dep.target目标是一个watcher, 调用watcher.addDep(depThis), 相当于depThis.addSub(watcher)
        Dep.target.addDep(this);
    }

    notify () {
        // 订阅者收到更新，然后通知订阅者watcher去更新视图
        this.subs.forEach(sub => sub.update());
    }
}