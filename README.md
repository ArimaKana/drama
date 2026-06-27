# 🎬 互动影游编辑器 (Drama Editor)

一个可视化的互动影游(FMV / 互动影视)创作工具，让你无需写代码即可设计分支剧情、多结局故事与互动玩法。内置可视化节点编辑器、素材管理、AI 辅助生成，并可将作品导出为跨平台桌面应用。

> 项目基于 **Nuxt 4 + Vue 3 + Tauri 2** 构建，前端采用 TailwindCSS，状态管理使用 Pinia，节点画布基于 Vue Flow。

---

## ✨ 核心功能

### 📚 项目与章节管理
- 多项目管理，每个项目以本地文件夹形式独立存储（`project.json` + `assets/`）
- 章节划分，支持章节排序、背景音乐与起始节点配置
- 支持横屏 (`landscape`) / 竖屏 (`portrait`) 两种作品方向

### 🎨 可视化节点编辑器
基于 Vue Flow 的拖拽式剧情画布，内置 7 种节点类型：

| 节点类型 | 说明 |
| --- | --- |
| `video` 播片节点 | 播放视频片段，可挂载字幕与数值变更 |
| `choice` 选择节点 | 分支选项，可设置倒计时与超时默认项 |
| `qte` QTE 节点 | 限时互动，区分成功/失败两条走向 |
| `condition` 条件分支 | 基于数值条件 (`> < =` 等 + `and/or` 逻辑) 自动分流 |
| `explore` 探索节点 | 场景热点点击探索，每个热点可触发独立剧情 |
| `ending` 结局节点 | 定义故事结局画面 |
| `clear` 通关节点 | 标记通关结算 |

### 🧩 游戏要素系统
- **角色系统**：性别、头像、描述、关联图集
- **数值系统**：自定义游戏数值（好感度、属性等），带默认/上下限
- **数值变更**：可绑定到播片、选择选项、QTE 成败、热点点击等任意时机
- **成就系统**：基于数值 / 章节解锁 / 节点播放的多条件解锁
- **图鉴系统**：角色图鉴条目，按条件解锁
- **起始页定制**：背景（图/视频）、标题、菜单位置、按钮样式全可调

### 🎞 素材库
统一管理视频、图片（角色/UI/图标/场景/分镜）、音频、字幕四类素材；通过内置静态资源服务器提供访问。

### 🤖 AI 辅助创作
内置多模型集成，支持 AI 生成文案、对话、剧情等内容：
- **文本 LLM**：智谱 GLM、Kimi、Ollama 本地模型、自定义 OpenAI 兼容接口
- **图像生成**：Seedream
- **视频生成**：Seedance

---

## 🛠 技术栈

| 层 | 技术 |
| --- | --- |
| 桌面框架 | [Tauri 2](https://tauri.app/) (Rust) |
| 前端框架 | [Nuxt 4](https://nuxt.com/) + [Vue 3](https://vuejs.org/) |
| 状态管理 | [Pinia](https://pinia.vuejs.org/) |
| 样式 | [TailwindCSS 4](https://tailwindcss.com/) + Sass |
| 节点画布 | [Vue Flow](https://vueflow.dev/) |
| AI SDK | [OpenAI SDK](https://www.npmjs.com/package/openai) + [Vercel AI SDK](https://sdk.vercel.ai/) |
| 工具库 | VueUse、Nanoid、Zod |

---

## 📦 项目结构

```
drama/
├── app/                      # Nuxt 前端源码
│   ├── components/
│   │   ├── common/           # 通用组件（对话框、Toast、AI 输入框等）
│   │   └── editor/           # 节点编辑器组件（画布、节点卡片、属性面板）
│   ├── composables/          # 组合式函数（AI 设置、Toast）
│   ├── layouts/              # 布局（默认、编辑器）
│   ├── pages/                # 页面
│   │   ├── index.vue         # 项目列表（首页）
│   │   └── project/[id]/     # 项目编辑各功能页
│   │       ├── chapters.vue characters.vue assets.vue values.vue
│   │       ├── achievements.vue collection.vue startpage.vue
│   ├── stores/               # Pinia store（project）
│   ├── types/                # TypeScript 类型定义（核心数据模型）
│   └── utils/                # 工具（ai / seedream / seedance / factory / runtime）
├── src-tauri/                # Tauri / Rust 后端
│   ├── src/
│   │   ├── lib.rs            # 插件注册与命令分发
│   │   └── project.rs        # 项目 CRUD、静态资源服务器(warp)、素材写入
│   ├── capabilities/         # Tauri 权限配置
│   └── tauri.conf.json       # Tauri 应用配置
├── nuxt.config.ts
├── package.json
└── README.md
```

---

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 20
- **pnpm**（推荐，项目使用 `pnpm-lock.yaml`）
- **Rust** 工具链（用于 Tauri 构建）
- **Tauri 2 系统依赖**：详见 [Tauri 前置条件](https://v2.tauri.app/start/prerequisites/)

### 安装依赖

```bash
pnpm install
```

### 开发模式

以 Web 方式开发（仅前端，运行在 `http://localhost:3000`）：

```bash
pnpm dev
```

以桌面应用方式开发（启动 Tauri 窗口，自动拉起前端）：

```bash
pnpm tauri:dev
```

### 构建生产包

构建 Web 静态产物：

```bash
pnpm build        # Nuxt 构建
pnpm generate     # Nuxt 静态生成（输出到 .output/public）
```

打包桌面安装程序（Windows/macOS/Linux）：

```bash
pnpm tauri:build
```

> Tauri 构建前会自动执行 `pnpm generate` 生成前端产物到 `.output/public`，详见 `src-tauri/tauri.conf.json`。

---

## ⚙️ 配置说明

- **端口**：开发服务器固定为 `3000`（见 `nuxt.config.ts` 中 `devServer.port` 与 `strictPort`），Tauri 期望前端运行于此端口。
- **环境变量**：支持 `VITE_` 与 `TAURI_` 前缀（见 `nuxt.config.ts` 的 `vite.envPrefix`）。
- **AI 配置**：在应用内的「项目设置」中按项目配置 LLM / 图像 / 视频服务提供商、模型与 API Token，配置存储于各项目的 `project.json`。
- **数据存储位置**：项目工作区索引保存在系统 AppData 目录下的 `workspace.json`，各项目内容保存在用户选择的项目文件夹中。

### Tauri 权限

后端启用了以下插件（见 `src-tauri/src/lib.rs`）：
`dialog`、`fs`、`http`、`opener` —— 分别用于文件选择、读写项目、AI 网络请求、打开外部链接。

---

## 📖 数据模型

核心数据结构定义于 [`app/types/index.ts`](./app/types/index.ts)，主要实体包括：

- `Project` — 项目根对象，含素材、章节、角色、数值、起始页、AI 配置、成就、图鉴
- `Chapter` — 章节，包含一组 `StoryNode`
- `StoryNode` — 节点联合类型（video / choice / qte / condition / explore / ending / clear）
- `Character` / `GameValue` / `Achievement` / `CollectionEntry` — 游戏要素实体
- `AssetLibrary` — 视频/图片/音频/字幕素材集合

项目以 JSON 形式持久化，易于版本管理与迁移。

---

## 📝 许可证

本项目当前为私有项目，未声明开源许可证。

---

## 🙏 致谢

本项目的诞生离不开以下出色的开源项目：

[Nuxt](https://nuxt.com/) · [Vue](https://vuejs.org/) · [Tauri](https://tauri.app/) ·
[Vue Flow](https://vueflow.dev/) · [Pinia](https://pinia.vuejs.org/) · [TailwindCSS](https://tailwindcss.com/)
