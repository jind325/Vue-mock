const parser = require('@babel/parser')
const options = require('./webpack.config')
const fs = require('fs')
const traverse = require('@babel/traverse').default
const { transformFromAst } = require('@babel/core')
//首先明确需要哪些步骤, 第一步, 从入口开始, 读取文件并且将文件内容转化为ast
//第二步: 将节点为importDeclaration的ast节点
const Parser = {
  getAst: path => {
    //读取入口文件
    const content = fs.readFileSync(path, 'utf-8');
    // 将文件内容转为AST抽象语法树
    return parser.parse(content, {
      sourceType: 'module'
    })
  },
  getDependecies: (ast, filename) => {
    const dependecies = {}
    traverse(ast, {
      // 类型为 ImportDeclaration 的 AST 节点 (即为import 语句)
      ImportDeclaration: function({ node }) {
        const dirname = path.dirname(filename)
        // 保存依赖模块路径,之后生成依赖关系图需要用到
        const filepath = './' + path.join(dirname, node.source.value)
        dependecies[node.source.value] = filepath
      }
    });
    return dependecies
  },
  getCode: ast => {
    //ast => code
    const { code } = transformFromAst(ast, null, {
      presets: ['@babel/preset-env']
    })
    return code
  }
}
class Compiler {
  constructor(options) {
    // webpack 配置
    const { entry, output } = options;
    // 入口
    this.entry = entry;
    // 出口
    this.output = output;
    // 模块
    this.modules = [];
  }
  // 启动构建函数
  run() {
    const info = this.build(this.entry)
    this.modules.push(info)
    this.modules.forEach(({dependecies}) => {
      // 判断有依赖对象,递归解析所有依赖项
      if (dependecies) {
        for (const dependency in dependecies) {
          this.modules.push(this.build(dependecies[dependency]))
        }
      }
    })
    // 生成依赖关系图
    const dependencyGraph = this.modules.reduce(
      (graph, item) => ({
        ...graph,
        // 使用文件路径作为每个模块的唯一标识符,保存对应模块的依赖对象和文件内容
        [item.filename]: {
          dependecies: item.dependecies,
          code: item.code
        }
      }),
      {}
    )
    this.build(dependencyGraph);
  }
  build(filename) {
    const {getAst, getDependecies} = Parser
    const ast = Parser.getAst(this.entry)
    const dependecies = getDependecies(ast, this.entry)
    const code = getCode(ast)
    return {
      filename, 
      dependecies,
      code
    }
  }
  // 重写 require函数,输出bundle
 // 重写 require函数 (浏览器不能识别commonjs语法),输出bundle
 generate(code) {
  // 输出文件路径
  const filePath = path.join(this.output.path, this.output.filename)
  // 懵逼了吗? 没事,下一节我们捋一捋
  const bundle = `(function(graph){
    function require(module){
      function localRequire(relativePath){
        return require(graph[module].dependecies[relativePath])
      }
      var exports = {};
      (function(require,exports,code){
        eval(code)
      })(localRequire,exports,graph[module].code);
      return exports;
    }
    require('${this.entry}')
  })(${JSON.stringify(code)})`

  // 把文件内容写入到文件系统
  fs.writeFileSync(filePath, bundle, 'utf-8')
}
}

new Compiler(options).run()

// (function (graph) {
//   function require(moduleId) {
//     function localRequire(relativePath) {
//       require(graph[moduleId].dependecies[relativePath])
//     }
//     let exports = {}
//     (function(require, exports, code) {
//       eval(code)
//     })(localRequire, exports, graph[moduleId].code)
//     return exports
//   }
//   require(this.entry)
// })(graph)
// (function(graph) {
//   function require(moduleId) {
//     function dependecyRequire(relativePath) {
//       return require(graph[moduleId].dependecies[relativePath]);
//     }
//     let exports = [];
//     (function(require, exports, code) {
//       eval(code);
//     })(dependecyRequire, exports, graph[moduleId].code)
//     return exports
//   }
//   require('./src/index.js')
// })({
//   './src/index.js': {
//     dependecies: { './hello.js': './src/hello.js' },
//     code: '"use strict";\n\nvar _hello = require("./hello.js");\n\ndocument.write((0, _hello.say)("webpack"));'
//   },
//   './src/hello.js': {
//     dependecies: {},
//     code:
//       '"use strict";\n\nObject.defineProperty(exports, "__esModule", {\n  value: true\n});\nexports.say = say;\n\nfunction say(name) {\n  return "hello ".concat(name);\n}'
//   }
// })

// 1. 我们要在一个文件里面写入一个自执行的jsfunction, 才能在script应用的时候传入boudle信息
// 1.1 boudle信息应该包括什么, 应该要包括所有的模块依赖
// 2. 一个文件在commonjs模式下要能跑起来, 需要知道什么?
// 2.1 需要定义一个require, 并且require能获取到code并且执行, 无法获取输出因为打包代码的时候并不执行代码

// ok , 开始定义一个编译器

// Compiler:

// entry
// output
// modules=[]

// run:
// 调用build和generate, 先获取所有模块[{filePath, dependecies, code},...]
// 再获取依赖关系图{filePath: {dependecies, code}, ...}

// build:
// 输入: filePath
// 作用: 获取所有的依赖, 并且转化code
// 实现: 
// babel.getAst获取ast树, 
// 然后可以读取ast树中所有import_declaration_node, 根据filepath获取文件夹路径, 
// 在根据文件夹路径和依赖的相对路径转化为绝对路径
// 获取依赖{node.value.source: filePath}
// transformFromAst可以根据ast重新转化为code

// 输出: {filePath, dependecies, code}

// generate:
// function(code) {
//   boundle = '
//   function(code){
//     function require (filePath) {
//       function relaRequire(realFilePath) {
//         require(code[filePath].dependecies[realFilePath])
//       }
//       export = []
//       (function(require, export, code) {
//         eval(code)
//       })(relaRequire, export, code[filePath].code)
//       return export
//     }
//     require(entry)
//   }${code}
//   '
//   fs.writeFile(output, boundle)
// }(code)

