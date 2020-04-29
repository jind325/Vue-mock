import Watcher from './watcher';

let uid = 0;

//主题对象
export default class Dep {
    //每一个watcher都会订阅一个主题, 订阅的主题就是data中的一个属性, 这里这个对象就是订阅管理器,
    //每创建一个oberserver会对应一个主题管理器dep, 并且在劫持的对象属性的getter内触发
    //订阅者wactcher的addDep方法, 就会在该dep的订阅者名单中添加一个新的订阅者即watcher对象
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
    //想当于触发当前target(就是watcher对象的实例)的addDep方法, 即通过dep.addSub方法将watcher添加到
    //订阅者名单之列
    depend () {
        // Dep.target目标是一个watcher, 调用watcher.addDep(depThis), 
        //相当于depThis.addSub(watcher)
        Dep.target.addDep(this);
    }

    notify () {
        // 订阅者收到更新，然后通知订阅者watcher去更新视图
        this.subs.forEach(sub => sub.update());
    }
}