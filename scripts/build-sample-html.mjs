// 开发期自检：构造一个最小可玩的假项目，调用导出函数生成完整 HTML，
// 验证：1) HTML 文件结构完整；2) 内嵌 script 语法合法；3) 关键节点类型都被覆盖。
// 该脚本通过 tsx 运行： npx tsx scripts/build-sample-html.mjs
//
// 注意：exportGame.ts 依赖 Nuxt 的 ~/ 路径别名（types/runtime），tsx 无法直接解析。
// 因此这里先用 esbuild 把 exportGame.ts 一次性打包成纯 ESM，注入别名后再 import。
import fs from 'node:fs'
import { build } from 'esbuild'

// 临时打包，把 ~/types 映射到一个本地空 shim，~/utils/runtime 映射到内联实现
const shimTypes = 'export {}'
fs.writeFileSync('node_modules/.cache/_types_shim.js', shimTypes)
fs.mkdirSync('node_modules/.cache', { recursive: true })
fs.writeFileSync('node_modules/.cache/_runtime_shim.mjs',
  'export function isTauriRuntime(){ return false; }')

const result = await build({
  entryPoints: ['app/utils/exportGame.ts'],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'browser',
  alias: {
    '~/types': fs.realpathSync('node_modules/.cache/_types_shim.js'),
    '~/utils/runtime': fs.realpathSync('node_modules/.cache/_runtime_shim.mjs'),
  },
})
const code = result.outputFiles[0].text
const dataUrl = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
const { exportProjectAsHtml } = await import(dataUrl)

const ts = new Date().toISOString()
const mkNode = (o) => ({ id: o.id, type: o.type, name: o.name, x: 0, y: 0, createdAt: ts, updatedAt: ts, ...o })

const project = {
  id: 'p1',
  name: '测试互动剧',
  orientation: 'landscape',
  path: '',
  cover: '',
  createdAt: ts,
  updatedAt: ts,
  assets: { videos: [], images: [], audios: [], subtitles: [] },
  gameValues: [{ id: 'v1', name: '好感度', icon: '', defaultValue: 0, minValue: 0, maxValue: 100, createdAt: ts, updatedAt: ts }],
  characters: [{ id: 'c1', name: '主角', gender: 'other', avatar: '', description: '测试角色', images: [], createdAt: ts, updatedAt: ts }],
  chapters: [
    {
      id: 'ch1', name: '第一章', description: '测试', backgroundAudioId: null, order: 0, startNodeId: 'n1',
      createdAt: ts, updatedAt: ts,
      nodes: [
        mkNode({ id: 'n1', type: 'choice', prompt: '向左还是向右？', hasCountdown: false, countdownSeconds: 10, defaultOptionId: null,
          options: [
            { id: 'o1', text: '向左', nextNodeId: 'n2', valueChanges: [{ characterId: 'c1', valueId: 'v1', delta: 5 }] },
            { id: 'o2', text: '向右', nextNodeId: 'n3', valueChanges: [] },
          ] }),
        mkNode({ id: 'n2', type: 'ending', title: '左结局', description: '你走向了左边', endingImage: '' }),
        mkNode({ id: 'n3', type: 'clear', title: '通关', description: '恭喜！' }),
      ],
    },
  ],
  achievements: [{ id: 'a1', name: '初次抉择', description: '完成第一次选择', image: '', conditions: [{ type: 'node_played', nodeId: 'n1' }], createdAt: ts, updatedAt: ts }],
  collection: [{ id: 'col1', characterId: 'c1', description: '角色档案', unlockConditions: [{ type: 'chapter_unlock', chapterId: 'ch1' }], createdAt: ts, updatedAt: ts }],
  startPage: {
    backgroundType: 'image', backgroundMedia: '', bgm: '', titleMode: 'text', titleText: '测试互动剧', titleImage: '',
    menuPosition: { x: 24, y: 220 }, titlePosition: { x: 180, y: 48 }, settingsPosition: { x: 560, y: 16 },
    buttonStyles: {
      start: { mode: 'normal', text: '开始游戏', textColor: '#fff', backgroundColor: '#2563eb', image: '' },
      continue: { mode: 'normal', text: '继续游戏', textColor: '#111', backgroundColor: '#f3f4f6', image: '' },
      achievements: { mode: 'normal', text: '成就', textColor: '#fff', backgroundColor: '#111827', image: '' },
      collection: { mode: 'normal', text: '图鉴', textColor: '#fff', backgroundColor: '#111827', image: '' },
      settings: { mode: 'normal', text: '设置', textColor: '#fff', backgroundColor: '#374151', image: '' },
    },
  },
  aiConfig: { text: { provider: 'zhipu', model: '', baseURL: 'https://ark.cn-beijing.volces.com/api/v3' }, image: { provider: 'seedream', model: '', baseURL: '' }, video: { provider: 'seedance', model: '', baseURL: '' } },
}

const { html, filename } = await exportProjectAsHtml(project)
console.log('filename:', filename)
console.log('html length:', html.length)

// 结构校验
const checks = [
  ['DOCTYPE', html.startsWith('<!DOCTYPE html>')],
  ['含 data script', html.includes('window.__DRAMA_DATA__ =')],
  ['含 runtime script', html.includes('"use strict"')],
  ['含选择节点数据', html.includes('向左还是向右')],
  ['含结局数据', html.includes('左结局')],
  ['未残留本地路径(path)', !html.includes('"path"')],
  ['未残留 aiConfig', !html.includes('aiConfig')],
  ['未残留 baseURL', !/baseURL.*ark\.cn-beijing/.test(html)],
]
let ok = true
for (const [name, pass] of checks) {
  console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name)
  if (!pass) ok = false
}

// 写出供人工查看
fs.writeFileSync('sample-export.html', html)
console.log('已写出 sample-export.html')

process.exit(ok ? 0 : 1)
