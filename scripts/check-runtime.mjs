// 开发期自检：从 exportGame.ts 抽取内嵌的运行时 JS，并验证其语法是否合法。
// 这个脚本不会被打包进应用，仅用于本地校验。
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import vm from 'node:vm'

const file = 'app/utils/exportGame.ts'
const src = fs.readFileSync(file, 'utf8')

const startMarker = 'const RUNTIME_JS = ['
const start = src.indexOf(startMarker)
if (start < 0) {
  console.error('未找到 RUNTIME_JS 定义')
  process.exit(1)
}
// 找到匹配的 '].join(' 结束位置
const joinMarker = '].join('
const end = src.indexOf(joinMarker, start)
if (end < 0) {
  console.error('未找到 RUNTIME_JS 的 .join 结束')
  process.exit(1)
}
const arrText = src.slice(start + startMarker.length - 'RUNTIME_JS = '.length, end + 1)

// 在沙箱里 eval 出字符串数组
const sandbox = {}
const ctx = vm.createContext(sandbox)
const arr = vm.runInContext('(' + arrText + ')', ctx)
if (!Array.isArray(arr)) {
  console.error('RUNTIME_JS 不是数组')
  process.exit(1)
}
const js = arr.join('\n')

// 1) 语法检查（不执行真实逻辑）
try {
  new vm.Script(js, { filename: 'runtime.js' })
  console.log('OK: runtime JS 语法校验通过,', js.length, '字符,', js.split('\n').length, '行')
} catch (e) {
  console.error('语法错误:', e.message)
  process.exit(1)
}

// 2) 写出一份样例 HTML，把一段最小的假数据 + runtime 拼起来，用 jsdom 之外的方式只能校验语法
//     这里仅写出文件供人工查看。
fs.writeFileSync('runtime-preview.js', js)
console.log('已写出 runtime-preview.js')
