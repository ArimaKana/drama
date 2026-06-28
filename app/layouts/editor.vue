<template>
  <div class="h-screen flex flex-col overflow-hidden bg-white">
    <CommonToastContainer />
    <header class="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200/80 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40 shadow-sm">
      <div class="flex items-center gap-4 min-w-max">
        <button class="inline-flex items-center justify-center w-9 h-9 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors" @click="handleBack" title="返回项目列表">
          <span class="text-lg">←</span>
        </button>
        <div class="h-6 w-px bg-gray-200"></div>
        <h2 class="text-lg text-gray-900 font-semibold tracking-tight flex items-center gap-2">
          <span class="text-xl">🎬</span>
          {{ store.currentProject?.name || '加载中...' }}
        </h2>
      </div>
      <nav class="flex-1 flex justify-center px-8">
        <div class="flex gap-1 p-1 bg-gray-100/80 rounded-xl overflow-x-auto hide-scrollbar">
          <button
            v-for="item in menuItems"
            :key="item.key"
            class="px-4 py-2 text-sm rounded-lg transition-all duration-200 whitespace-nowrap relative"
            :class="activeMenu === item.key ? 'text-blue-700 font-semibold bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'"
            @click="handleMenuSelect(item.key)"
          >
            {{ item.label }}
          </button>
        </div>
      </nav>
      <div class="min-w-max flex justify-end gap-2">
        <button
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          @click="openCreativeAssistant"
        >
          创作助手
        </button>
        <button
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          @click="openProjectSettings"
        >
          项目配置
        </button>
        <button
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          @click="openProjectConfig"
        >
          大模型配置
        </button>
        <button
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
          :disabled="isExporting"
          @click="handleExport"
          title="将当前项目导出为可玩的 H5 游戏（单文件 HTML）"
        >
          <span v-if="isExporting" class="w-4 h-4 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin"></span>
          <span v-else class="text-base leading-none">📦</span>
          {{ isExporting ? '导出中...' : '导出' }}
        </button>
        <button
          class="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
          :disabled="store.isSaving"
          @click="handleSave"
        >
          <span v-if="store.isSaving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          {{ store.isSaving ? '保存中...' : '保存' }}
        </button>
      </div>
    </header>
    <main class="flex-1 overflow-hidden">
      <slot />
    </main>

    <CommonUiDialog v-model="showProjectSettingsDialog" title="项目配置" width="520px">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">项目名称</label>
          <input
            v-model="projectName"
            type="text"
            maxlength="100"
            placeholder="请输入项目名称"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">屏幕方向</label>
          <div class="flex gap-2 bg-gray-100/80 rounded-lg p-1">
            <button
              class="flex-1 px-3 py-1.5 text-sm rounded-md transition"
              :class="projectOrientation === 'landscape' ? 'bg-white text-blue-700 font-medium shadow-sm' : 'text-gray-600 hover:text-gray-900'"
              @click="projectOrientation = 'landscape'"
            >横屏</button>
            <button
              class="flex-1 px-3 py-1.5 text-sm rounded-md transition"
              :class="projectOrientation === 'portrait' ? 'bg-white text-blue-700 font-medium shadow-sm' : 'text-gray-600 hover:text-gray-900'"
              @click="projectOrientation = 'portrait'"
            >竖屏</button>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-1.5 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition" @click="showProjectSettingsDialog = false">取消</button>
        <button class="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition" @click="saveProjectSettings">保存配置</button>
      </template>
    </CommonUiDialog>

    <CommonUiDialog v-model="showProjectConfigDialog" title="大模型配置" width="560px">
      <div class="space-y-4">
        <div class="flex gap-2 bg-gray-100/80 rounded-lg p-1">
          <button
            class="flex-1 px-3 py-1.5 text-sm rounded-md transition"
            :class="configTab === 'text' ? 'bg-white text-blue-700 font-medium shadow-sm' : 'text-gray-600 hover:text-gray-900'"
            @click="configTab = 'text'"
          >文字模型</button>
          <button
            class="flex-1 px-3 py-1.5 text-sm rounded-md transition"
            :class="configTab === 'image' ? 'bg-white text-blue-700 font-medium shadow-sm' : 'text-gray-600 hover:text-gray-900'"
            @click="configTab = 'image'"
          >生图模型</button>
          <button
            class="flex-1 px-3 py-1.5 text-sm rounded-md transition"
            :class="configTab === 'video' ? 'bg-white text-blue-700 font-medium shadow-sm' : 'text-gray-600 hover:text-gray-900'"
            @click="configTab = 'video'"
          >视频模型</button>
        </div>

        <template v-if="configTab === 'text'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">模型提供方</label>
            <select v-model="projectConfig.text.provider" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all">
              <option v-for="provider in textProviders" :key="provider" :value="provider">{{ llmProviderLabel(provider) }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">模型名称</label>
            <input
              v-model="projectConfig.text.model"
              type="text"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
              :placeholder="projectConfig.text.provider === 'ollama' ? '必填，例如：qwen2.5:7b' : '留空使用默认模型'"
            />
          </div>

          <div v-if="showTextBaseUrlInput">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Base URL</label>
            <input
              v-model="projectConfig.text.baseURL"
              type="text"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
              :placeholder="projectConfig.text.provider === 'custom' ? '自定义模型服务地址（建议必填）' : '留空使用 Ollama 默认地址'"
            />
          </div>

          <div class="border-t border-gray-100 pt-4">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">API Token</label>
            <input
              v-model="textToken"
              type="password"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
              :placeholder="projectConfig.text.provider === 'ollama' ? 'Ollama 可留空' : '仅保存在当前应用本地，不写入项目文件'"
            />
            <p class="text-xs text-gray-500 mt-1.5">Token 仅存储在本机应用，不会写入项目 JSON。</p>
          </div>
        </template>

        <template v-else-if="configTab === 'image'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">模型提供方</label>
            <select v-model="projectConfig.image.provider" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all">
              <option v-for="provider in imageProviders" :key="provider" :value="provider">{{ imageProviderLabel(provider) }}</option>
            </select>
            <div v-if="projectConfig.image.provider === 'seedream'" class="mt-2 flex justify-end">
              <button
                class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-md hover:bg-blue-100 transition-colors"
                @click="openArkPage"
              >
                前往火山方舟
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">模型名称</label>
            <input
              v-model="projectConfig.image.model"
              type="text"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
              placeholder="留空使用默认模型 doubao-seedream-5-0-260128"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Base URL</label>
            <input
              v-model="projectConfig.image.baseURL"
              type="text"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
              placeholder="留空使用默认地址 https://ark.cn-beijing.volces.com/api/v3"
            />
          </div>

          <div class="border-t border-gray-100 pt-4">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">API Token</label>
            <input
              v-model="imageToken"
              type="password"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
              placeholder="Seedream API Token（仅保存在当前应用本地）"
            />
            <p class="text-xs text-gray-500 mt-1.5">Token 仅存储在本机应用，不会写入项目 JSON。</p>
          </div>
        </template>

        <template v-else>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">模型提供方</label>
            <select v-model="projectConfig.video.provider" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all">
              <option v-for="provider in videoProviders" :key="provider" :value="provider">{{ videoProviderLabel(provider) }}</option>
            </select>
            <div v-if="projectConfig.video.provider === 'seedance'" class="mt-2 flex justify-end">
              <button
                class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-md hover:bg-blue-100 transition-colors"
                @click="openArkPage"
              >
                前往火山方舟
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">模型名称</label>
            <input
              v-model="projectConfig.video.model"
              type="text"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
              placeholder="留空使用默认模型 doubao-seedance-1-5-pro-251215"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Base URL</label>
            <input
              v-model="projectConfig.video.baseURL"
              type="text"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
              placeholder="留空使用默认地址 https://ark.cn-beijing.volces.com/api/v3"
            />
          </div>

          <div class="border-t border-gray-100 pt-4">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">API Token</label>
            <input
              v-model="videoToken"
              type="password"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
              placeholder="Seedance API Token（仅保存在当前应用本地）"
            />
            <p class="text-xs text-gray-500 mt-1.5">Token 仅存储在本机应用，不会写入项目 JSON。</p>
          </div>
        </template>
      </div>
      <template #footer>
        <button class="px-4 py-1.5 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition" @click="showProjectConfigDialog = false">取消</button>
        <button class="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition" @click="saveProjectConfig">保存配置</button>
      </template>
    </CommonUiDialog>

    <CommonUiDialog v-model="showCreativeAssistantDialog" title="创作助手" width="680px">
      <div class="space-y-5">
        <div class="rounded-lg border border-gray-200 bg-gray-50/70 p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-gray-800">上传 txt 小说到资源库</p>
              <p class="text-xs text-gray-500 mt-1">上传后会存入素材库字幕资源，可在此选择并解析</p>
            </div>
            <button
              class="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition"
              @click="uploadNovelTxtToAssets"
            >
              上传 TXT
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">选择资源库中的小说</label>
          <select
            v-model="selectedNovelAssetId"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
          >
            <option value="">请选择 TXT 小说资源</option>
            <option v-for="novel in novelAssets" :key="novel.id" :value="novel.id">{{ novel.name }}</option>
          </select>
          <p class="text-xs text-gray-500 mt-1.5">当前仅显示资源库中扩展名为 .txt 的条目。</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">创作补充要求（可选）</label>
          <textarea
            v-model="assistantExtraPrompt"
            rows="3"
            placeholder="例如：章节节奏偏快，角色设定偏现实主义"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all resize-none"
          />
        </div>

        <div class="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-700 leading-5">
          一键解析会自动生成：完整可玩的故事线（每章多个节点串成的剧情分支）、角色设定与头像、核心数值、成就、图鉴，以及场景/结局/起始页配图。<br />
          <span class="text-blue-500">提示：剧情播放用的视频需稍后在「素材管理」中用 AI 生成并挂到播片节点。</span>
        </div>

        <div v-if="assistantBusy && assistantStage" class="rounded-lg border border-amber-100 bg-amber-50/70 p-3 text-xs text-amber-700 leading-5 flex items-center gap-2">
          <span class="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin shrink-0"></span>
          <span>{{ assistantStage }}</span>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-1.5 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition" @click="showCreativeAssistantDialog = false">取消</button>
        <button
          class="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="assistantBusy"
          @click="generateFromNovel"
        >
          <span v-if="assistantBusy" class="inline-flex items-center gap-2">
            <span class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
            {{ assistantStage || '生成中...' }}
          </span>
          <span v-else>一键解析并生成</span>
        </button>
      </template>
    </CommonUiDialog>
  </div>
</template>

<script setup lang="ts">
import type { ProjectLlmProvider, ProjectImageProvider, ProjectVideoProvider, ProjectOrientation, SubtitleAsset } from '~/types'
import { useProjectStore } from '~/stores/project'
import { useToast } from '~/composables/useToast'
import { useAiAppSettings } from '~/composables/useAiAppSettings'
import { isTauriRuntime } from '~/utils/runtime'
import { resolveProjectLlmRuntime } from '~/utils/ai'
import { createId, now } from '~/utils/factory'
import { useExportGame } from '~/composables/useExportGame'
import {
  parseNovelStory,
  buildProjectDataFromBlueprint,
  generateBlueprintImages,
  applyGeneratedImages,
} from '~/utils/creativeAssistant'
import { resolveSeedreamApiKey } from '~/utils/generateAsset'

const router = useRouter()
const route = useRoute()
const store = useProjectStore()
const toast = useToast()
const { getToken, setToken } = useAiAppSettings()
const { isExporting, exportGame } = useExportGame()

const textProviders: ProjectLlmProvider[] = ['zhipu', 'deepseek', 'kimi', 'ollama', 'custom']
const imageProviders: ProjectImageProvider[] = ['seedream']
const videoProviders: ProjectVideoProvider[] = ['seedance']
const showProjectSettingsDialog = ref(false)
const projectName = ref('')
const projectOrientation = ref<ProjectOrientation>('landscape')
const showProjectConfigDialog = ref(false)
const configTab = ref<'text' | 'image' | 'video'>('text')
const textToken = ref('')
const imageToken = ref('')
const videoToken = ref('')
const showCreativeAssistantDialog = ref(false)
const selectedNovelAssetId = ref('')
const assistantExtraPrompt = ref('')
const assistantBusy = ref(false)
const assistantStage = ref('')
const projectConfig = reactive({
  text: {
    provider: 'zhipu' as ProjectLlmProvider,
    model: '',
    baseURL: '',
  },
  image: {
    provider: 'seedream' as ProjectImageProvider,
    model: 'doubao-seedream-5-0-260128',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  },
  video: {
    provider: 'seedance' as ProjectVideoProvider,
    model: 'doubao-seedance-1-5-pro-251215',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  },
})
const showTextBaseUrlInput = computed(() => projectConfig.text.provider === 'custom' || projectConfig.text.provider === 'ollama')
const novelAssets = computed(() => {
  return (store.currentProject?.assets.subtitles || []).filter(asset => isTxtNovelAsset(asset))
})

const menuItems = [
  { key: 'chapters', label: '章节管理' },
  { key: 'characters', label: '角色管理' },
  { key: 'values', label: '数值管理' },
  { key: 'assets', label: '素材管理' },
  { key: 'achievements', label: '成就管理' },
  { key: 'collection', label: '图鉴管理' },
  { key: 'startpage', label: '起始页面' },
]

const activeMenu = computed(() => {
  const path = route.path
  if (path.includes('/characters')) return 'characters'
  if (path.includes('/values')) return 'values'
  if (path.includes('/assets')) return 'assets'
  if (path.includes('/achievements')) return 'achievements'
  if (path.includes('/collection')) return 'collection'
  if (path.includes('/startpage')) return 'startpage'
  return 'chapters'
})

function handleMenuSelect(key: string) {
  const projectId = route.params.id as string
  router.push(`/project/${projectId}/${key}`)
}

watch(
  () => route.params.id,
  async (projectId) => {
    if (!projectId || typeof projectId !== 'string') return
    if (!store.currentProject || store.currentProject.id !== projectId) {
      await store.openProject(projectId)
    }
  },
  { immediate: true }
)

function handleBack() {
  store.closeProject()
  router.push('/')
}

function llmProviderLabel(provider: ProjectLlmProvider) {
  if (provider === 'zhipu') return '智谱'
  if (provider === 'deepseek') return 'DeepSeek'
  if (provider === 'kimi') return 'Kimi'
  if (provider === 'ollama') return 'Ollama'
  if (provider === 'custom') return '自定义'
  return provider
}

function imageProviderLabel(provider: ProjectImageProvider) {
  if (provider === 'seedream') return 'Seedream'
  return provider
}

function videoProviderLabel(provider: ProjectVideoProvider) {
  if (provider === 'seedance') return 'Seedance'
  return provider
}

function isTxtNovelAsset(asset: SubtitleAsset) {
  const target = `${asset.name || ''} ${asset.url || ''}`.toLowerCase()
  return target.includes('.txt')
}

function openCreativeAssistant() {
  if (!store.currentProject) {
    toast.warning('请先打开项目')
    return
  }
  selectedNovelAssetId.value = novelAssets.value[0]?.id || ''
  assistantExtraPrompt.value = ''
  showCreativeAssistantDialog.value = true
}

async function openArkPage() {
  const url = 'https://www.volcengine.com/product/ark'
  if (isTauriRuntime()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener')
      await openUrl(url)
      return
    } catch {
      toast.warning('打开浏览器失败，请手动访问火山方舟官网')
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

function openProjectConfig() {
  if (!store.currentProject) {
    toast.warning('请先打开项目')
    return
  }
  const config = store.currentProject.aiConfig
  configTab.value = 'text'
  projectConfig.text.provider = config.text?.provider || 'zhipu'
  projectConfig.text.model = config.text?.model || ''
  projectConfig.text.baseURL = config.text?.baseURL || ''
  projectConfig.image.provider = config.image?.provider || 'seedream'
  projectConfig.image.model = config.image?.model || 'doubao-seedream-5-0-260128'
  projectConfig.image.baseURL = config.image?.baseURL || 'https://ark.cn-beijing.volces.com/api/v3'
  projectConfig.video.provider = config.video?.provider || 'seedance'
  projectConfig.video.model = config.video?.model || 'doubao-seedance-1-5-pro-251215'
  projectConfig.video.baseURL = config.video?.baseURL || 'https://ark.cn-beijing.volces.com/api/v3'
  textToken.value = getToken(projectConfig.text.provider)
  imageToken.value = getToken(projectConfig.image.provider)
  videoToken.value = getToken(projectConfig.video.provider)
  showProjectConfigDialog.value = true
}

async function uploadNovelTxtToAssets() {
  if (!store.currentProject) return
  if (!isTauriRuntime()) {
    toast.warning('仅桌面端支持选择本地 TXT 文件')
    return
  }

  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Text', extensions: ['txt'] }],
    })
    if (!selected) return

    const sourcePath = selected as string
    const filename = sourcePath.split(/[/\\]/).pop() || `novel_${Date.now()}.txt`
    const { invoke } = await import('@tauri-apps/api/core')
    const savedFilename = await invoke<string>('copy_asset', {
      projectPath: store.currentProject.path,
      sourcePath,
      filename,
    })

    const timestamp = now()
    const novelName = filename.replace(/\.txt$/i, '') || filename
    store.addSubtitleAsset({
      id: createId(),
      name: novelName,
      url: savedFilename,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await store.saveProject()

    const addedNovel = (store.currentProject.assets.subtitles || [])
      .slice()
      .reverse()
      .find(asset => asset.url === savedFilename)
    selectedNovelAssetId.value = addedNovel?.id || ''
    toast.success('TXT 小说已上传到资源库')
  } catch (error: any) {
    toast.error(error?.message || '上传 TXT 失败')
  }
}

async function generateFromNovel() {
  if (assistantBusy.value) return
  if (!store.currentProject) return
  if (!selectedNovelAssetId.value) {
    toast.warning('请先选择一个 TXT 小说资源')
    return
  }

  const selectedNovel = novelAssets.value.find(asset => asset.id === selectedNovelAssetId.value)
  if (!selectedNovel) {
    toast.warning('未找到选中的小说资源')
    return
  }

  const textProvider = store.currentProject.aiConfig?.text?.provider || 'zhipu'
  const runtime = resolveProjectLlmRuntime(store.currentProject.aiConfig?.text, getToken(textProvider))
  if (!runtime.ok) {
    toast.warning(runtime.error)
    return
  }

  assistantBusy.value = true
  assistantStage.value = '正在读取小说…'
  try {
    const novelUrl = store.getAssetUrl(selectedNovel.url)
    const response = await fetch(novelUrl)
    if (!response.ok) {
      throw new Error('读取小说文件失败')
    }
    const novelContent = (await response.text()).trim()
    if (!novelContent) {
      toast.warning('小说内容为空，无法解析')
      return
    }

    // 1) 解析剧情蓝图
    assistantStage.value = '正在解析剧情并生成完整故事线…'
    const blueprint = await parseNovelStory({
      clientOptions: runtime.clientOptions,
      model: runtime.model,
      novelContent,
      extraPrompt: assistantExtraPrompt.value,
    })

    if (!blueprint.chapters.length) {
      throw new Error('未解析到有效章节，请调整模型配置后重试')
    }

    // 统计节点数，用于确认提示
    const totalNodes = blueprint.chapters.reduce((sum, ch) => sum + (ch.nodes?.length || 0), 0)

    const hasExisting = (store.currentProject.chapters.length > 0
      || store.currentProject.characters.length > 0
      || store.currentProject.gameValues.length > 0
      || store.currentProject.achievements.length > 0
      || store.currentProject.collection.length > 0
      || store.currentProject.assets.images.length > 0)

    const confirmMsg = [
      `将生成 ${blueprint.chapters.length} 章、共 ${totalNodes} 个节点、${blueprint.characters.length} 个角色、`,
      `${blueprint.gameValues.length} 个数值、${blueprint.achievements.length} 个成就、${blueprint.collection.length} 条图鉴。`,
      '将覆盖当前项目的章节/角色/数值/成就/图鉴/图片素材（保留视频、音频、字幕），是否继续？',
    ].join('')

    if (hasExisting && !window.confirm(confirmMsg)) {
      return
    }

    // 2) 构建项目数据（章节 DAG / 数值 / 成就 / 图鉴 / 角色）
    const { data, refs } = buildProjectDataFromBlueprint(blueprint)

    // 3) 批量生成图片（角色头像 / 场景 / 结局 / 起始页）
    const imageApiKey = resolveSeedreamApiKey(getToken, textProvider)
    let generatedImages: Awaited<ReturnType<typeof generateBlueprintImages>> = []
    if (imageApiKey && blueprint.images.length > 0) {
      assistantStage.value = `正在生成图片 0/${blueprint.images.length}…`
      generatedImages = await generateBlueprintImages(
        blueprint,
        {
          apiKey: imageApiKey,
          baseURL: store.currentProject.aiConfig?.image?.baseURL || undefined,
          model: store.currentProject.aiConfig?.image?.model || undefined,
          projectPath: store.currentProject.path,
        },
        (p) => {
          assistantStage.value = `正在生成图片 ${p.done}/${p.total}：${p.name}`
        },
      )
    } else if (!imageApiKey && blueprint.images.length > 0) {
      toast.warning('未配置 Seedream API Token，已跳过图片生成（角色头像等可稍后补充）')
    }

    // 4) 回填图片到角色头像 / 结局图 / 起始页
    const { images: finalImages, startPageBackground } = applyGeneratedImages(data, refs, generatedImages)

    // 5) 覆盖写入项目（保留视频/音频/字幕素材）
    const project = store.currentProject
    project.chapters = data.chapters
    project.characters = data.characters
    project.gameValues = data.gameValues
    project.achievements = data.achievements
    project.collection = data.collection
    project.assets.images = finalImages
    if (startPageBackground) {
      project.startPage = { ...project.startPage, backgroundMedia: startPageBackground }
    }

    await store.saveProject()
    showCreativeAssistantDialog.value = false
    assistantStage.value = ''
    const imgNote = generatedImages.length > 0 ? `、${generatedImages.length} 张图片` : ''
    toast.success(
      `已生成 ${data.chapters.length} 章（${totalNodes} 个节点）、${data.characters.length} 个角色${imgNote}`,
    )
  } catch (error: any) {
    toast.error(error?.message || '小说解析失败')
  } finally {
    assistantBusy.value = false
    assistantStage.value = ''
  }
}

function openProjectSettings() {
  if (!store.currentProject) {
    toast.warning('请先打开项目')
    return
  }
  projectName.value = store.currentProject.name
  projectOrientation.value = store.currentProject.orientation || 'landscape'
  showProjectSettingsDialog.value = true
}

async function saveProjectSettings() {
  if (!store.currentProject) return
  const name = projectName.value.trim()
  if (!name) {
    toast.warning('项目名称不能为空')
    return
  }

  store.currentProject.name = name
  store.currentProject.orientation = projectOrientation.value
  await store.saveProject()
  showProjectSettingsDialog.value = false
  toast.success('项目配置已保存')
}

watch(
  () => projectConfig.text.provider,
  (provider) => {
    textToken.value = getToken(provider)
  }
)

watch(
  () => projectConfig.image.provider,
  (provider) => {
    imageToken.value = getToken(provider)
  }
)

watch(
  () => projectConfig.video.provider,
  (provider) => {
    videoToken.value = getToken(provider)
  }
)

async function saveProjectConfig() {
  if (!store.currentProject) return
  if (projectConfig.text.provider === 'ollama' && !projectConfig.text.model.trim()) {
    toast.warning('Ollama 需要填写模型名称')
    return
  }
  if (projectConfig.text.provider === 'custom' && !projectConfig.text.baseURL.trim()) {
    toast.warning('自定义模型提供方需要填写 Base URL')
    return
  }

  store.currentProject.aiConfig = {
    text: {
      provider: projectConfig.text.provider,
      model: projectConfig.text.model.trim(),
      baseURL: projectConfig.text.baseURL.trim(),
    },
    image: {
      provider: projectConfig.image.provider,
      model: projectConfig.image.model.trim(),
      baseURL: projectConfig.image.baseURL.trim(),
    },
    video: {
      provider: projectConfig.video.provider,
      model: projectConfig.video.model.trim(),
      baseURL: projectConfig.video.baseURL.trim(),
    },
  }
  setToken(projectConfig.text.provider, textToken.value)
  setToken(projectConfig.image.provider, imageToken.value)
  setToken(projectConfig.video.provider, videoToken.value)

  await store.saveProject()
  showProjectConfigDialog.value = false
  toast.success('大模型配置已保存')
}

async function handleSave() {
  await store.saveProject()
  toast.success('保存成功')
}

async function handleExport() {
  if (!store.currentProject) {
    toast.warning('请先打开项目')
    return
  }
  // 导出前先保存，确保最新数据落盘，资源文件就位
  try {
    await store.saveProject()
  } catch (error: any) {
    toast.error(error?.message || '保存项目失败，无法导出')
    return
  }

  const result = await exportGame(store.currentProject)
  if (!result.ok) {
    if (result.error) toast.error(result.error)
    return
  }
  if (result.path) {
    toast.success('已导出为 H5 游戏：' + result.path)
  } else {
    toast.success('已导出为 H5 游戏，浏览器已开始下载')
  }
}
</script>

