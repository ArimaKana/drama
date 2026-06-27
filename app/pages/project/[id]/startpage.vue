<template>
  <div class="h-full min-h-0 px-8 py-8 overflow-y-auto bg-gray-50/30">
    <div class="mb-8">
      <h3 class="text-xl font-bold text-gray-900 tracking-tight">起始页面配置</h3>
      <p class="text-sm text-gray-500 mt-1">配置背景、标题和菜单按钮样式，可在预览拖动菜单位置</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
        <h2 class="text-lg font-bold text-gray-900 mb-6">基本配置</h2>
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">背景类型</label>
            <div class="inline-flex p-1 rounded-lg bg-gray-100 border border-gray-200">
              <button
                type="button"
                class="px-4 py-1.5 text-sm rounded-md transition-colors"
                :class="form.backgroundType === 'image' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                @click="setBackgroundType('image')"
              >图片</button>
              <button
                type="button"
                class="px-4 py-1.5 text-sm rounded-md transition-colors"
                :class="form.backgroundType === 'video' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                @click="setBackgroundType('video')"
              >视频</button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">背景资源</label>
            <div class="flex gap-2">
              <input
                v-model="form.backgroundMedia"
                type="text"
                :placeholder="form.backgroundType === 'image' ? '选择或输入背景图片路径' : '选择或输入背景视频路径'"
                class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                @change="save"
              />
              <button
                @click="selectBackgroundMedia"
                class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200"
              >
                选择素材
              </button>
            </div>
            <p class="mt-2 text-xs text-gray-500">
              {{ form.backgroundType === 'image' ? '支持 .jpg、.png、.webp' : '支持 .mp4、.webm、.mov' }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">起始页 BGM</label>
            <div class="flex gap-2">
              <input
                v-model="form.bgm"
                type="text"
                placeholder="选择或输入背景音乐路径"
                class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                @change="save"
              />
              <button
                @click="selectBgm"
                class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200"
              >
                选择素材
              </button>
            </div>
            <p class="mt-2 text-xs text-gray-500">支持 .mp3、.wav、.ogg</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">标题显示</label>
            <select
              v-model="form.titleMode"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all shadow-sm"
              @change="save"
            >
              <option value="text">文字</option>
              <option value="image">图片</option>
              <option value="none">不展示</option>
            </select>
          </div>

          <div v-if="form.titleMode === 'text'">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">标题文字</label>
            <input
              v-model="form.titleText"
              type="text"
              maxlength="50"
              placeholder="输入游戏标题"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              @change="save"
            />
            <p class="mt-1.5 text-xs text-gray-400 text-right">{{ form.titleText.length }}/50</p>
          </div>

          <div v-if="form.titleMode === 'image'">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">标题图片</label>
            <div class="flex gap-2">
              <input
                v-model="form.titleImage"
                type="text"
                placeholder="选择或输入标题图片路径"
                class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                @change="save"
              />
              <button
                @click="selectTitleImage"
                class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200"
              >
                选择文件
              </button>
            </div>
          </div>

          <div class="pt-2 border-t border-gray-100">
            <h3 class="text-sm font-semibold text-gray-900 mb-3">按钮样式配置</h3>
            <div class="space-y-3">
              <div
                v-for="cfg in mainButtonStyleConfigs"
                :key="cfg.key"
                class="border border-gray-100 rounded-xl p-3 space-y-3"
              >
                <div class="flex items-center justify-between gap-3">
                  <label class="text-sm text-gray-700 font-medium">{{ cfg.label }}</label>
                  <div class="inline-flex p-1 rounded-lg bg-gray-100 border border-gray-200">
                    <button
                      type="button"
                      class="px-2.5 py-1 text-xs rounded-md transition-colors"
                      :class="form.buttonStyles[cfg.key].mode === 'normal' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                      @click="setButtonMode(cfg.key, 'normal')"
                    >普通</button>
                    <button
                      type="button"
                      class="px-2.5 py-1 text-xs rounded-md transition-colors"
                      :class="form.buttonStyles[cfg.key].mode === 'image' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                      @click="setButtonMode(cfg.key, 'image')"
                    >图片</button>
                  </div>
                </div>

                <div v-if="form.buttonStyles[cfg.key].mode === 'normal'" class="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    v-model="form.buttonStyles[cfg.key].text"
                    type="text"
                    placeholder="按钮文字"
                    class="px-2.5 py-2 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    @change="save"
                  />
                  <label class="flex items-center gap-2 px-2.5 py-2 border border-gray-200 rounded-md bg-white text-xs text-gray-600">
                    字色
                    <input
                      v-model="form.buttonStyles[cfg.key].textColor"
                      type="color"
                      class="ml-auto w-7 h-7 border border-gray-200 rounded cursor-pointer bg-white"
                      @change="save"
                    />
                  </label>
                  <label class="flex items-center gap-2 px-2.5 py-2 border border-gray-200 rounded-md bg-white text-xs text-gray-600">
                    背景
                    <input
                      v-model="form.buttonStyles[cfg.key].backgroundColor"
                      type="color"
                      class="ml-auto w-7 h-7 border border-gray-200 rounded cursor-pointer bg-white"
                      @change="save"
                    />
                  </label>
                </div>

                <div v-else class="flex gap-2">
                  <input
                    v-model="form.buttonStyles[cfg.key].image"
                    type="text"
                    placeholder="按钮图片路径"
                    class="flex-1 px-2.5 py-2 border border-gray-200 rounded-md text-xs bg-gray-50 text-gray-500"
                    readonly
                  />
                  <button
                    class="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-md border border-gray-200"
                    @click="openButtonImagePicker(cfg.key)"
                  >
                    按钮图
                  </button>
                </div>
              </div>

              <div class="border border-gray-100 rounded-xl p-3 space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <label class="text-sm text-gray-700 font-medium">设置按钮</label>
                  <div class="inline-flex p-1 rounded-lg bg-gray-100 border border-gray-200">
                    <button
                      type="button"
                      class="px-2.5 py-1 text-xs rounded-md transition-colors"
                      :class="form.buttonStyles.settings.mode === 'normal' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                      @click="setButtonMode('settings', 'normal')"
                    >普通</button>
                    <button
                      type="button"
                      class="px-2.5 py-1 text-xs rounded-md transition-colors"
                      :class="form.buttonStyles.settings.mode === 'image' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                      @click="setButtonMode('settings', 'image')"
                    >图片</button>
                  </div>
                </div>

                <div v-if="form.buttonStyles.settings.mode === 'normal'" class="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    v-model="form.buttonStyles.settings.text"
                    type="text"
                    placeholder="按钮文字"
                    class="px-2.5 py-2 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    @change="save"
                  />
                  <label class="flex items-center gap-2 px-2.5 py-2 border border-gray-200 rounded-md bg-white text-xs text-gray-600">
                    字色
                    <input
                      v-model="form.buttonStyles.settings.textColor"
                      type="color"
                      class="ml-auto w-7 h-7 border border-gray-200 rounded cursor-pointer bg-white"
                      @change="save"
                    />
                  </label>
                  <label class="flex items-center gap-2 px-2.5 py-2 border border-gray-200 rounded-md bg-white text-xs text-gray-600">
                    背景
                    <input
                      v-model="form.buttonStyles.settings.backgroundColor"
                      type="color"
                      class="ml-auto w-7 h-7 border border-gray-200 rounded cursor-pointer bg-white"
                      @change="save"
                    />
                  </label>
                </div>

                <div v-else class="flex gap-2">
                  <input
                    v-model="form.buttonStyles.settings.image"
                    type="text"
                    placeholder="按钮图片路径"
                    class="flex-1 px-2.5 py-2 border border-gray-200 rounded-md text-xs bg-gray-50 text-gray-500"
                    readonly
                  />
                  <button
                    class="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-md border border-gray-200"
                    @click="openButtonImagePicker('settings')"
                  >
                    按钮图
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sticky top-6 h-fit">
        <h2 class="text-lg font-bold text-gray-900 mb-6">实时预览</h2>
        <div
          ref="previewRef"
          class="relative w-full rounded-xl overflow-hidden shadow-md border border-gray-200/80 bg-gray-900 bg-cover bg-center transition-all duration-300"
          :class="previewAspectClass"
          :style="previewStyle"
        >
          <video
            v-if="isVideoBackground && displayBackgroundMedia"
            :src="displayBackgroundMedia"
            class="absolute inset-0 w-full h-full object-cover"
            autoplay
            muted
            loop
            playsinline
          ></video>

          <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>

          <div
            ref="titleRef"
            class="absolute px-4 cursor-move select-none"
            :style="{ left: `${form.titlePosition.x}px`, top: `${form.titlePosition.y}px` }"
            @mousedown="startDragTitle"
          >
            <h1 class="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg tracking-tight">
              <template v-if="form.titleMode === 'text'">{{ form.titleText || '游戏标题' }}</template>
            </h1>

            <img
              v-if="form.titleMode === 'image' && displayTitleImage"
              :src="displayTitleImage"
              alt="title"
              class="max-h-20 md:max-h-24 object-contain drop-shadow-lg"
            />
          </div>

          <button
            ref="settingsRef"
            class="absolute cursor-move"
            :style="{
              left: `${form.settingsPosition.x}px`,
              top: `${form.settingsPosition.y}px`,
              ...resolveButtonStyle(form.buttonStyles.settings, true),
            }"
            :class="resolveButtonClass(false)"
            @mousedown.prevent.stop="startDragSettings"
            @dragstart.prevent
          >
            {{ resolveButtonText('settings') }}
          </button>

          <div
            ref="menuRef"
            class="absolute p-3 bg-black/25 backdrop-blur-sm border border-white/20 rounded-xl cursor-move select-none"
            :style="{ left: `${form.menuPosition.x}px`, top: `${form.menuPosition.y}px` }"
            @mousedown="startDragMenu"
          >
            <div class="flex flex-col gap-2 w-44">
              <button :class="resolveButtonClass()" :style="resolveButtonStyle(form.buttonStyles.start)">{{ resolveButtonText('start') }}</button>
              <button :class="resolveButtonClass()" :style="resolveButtonStyle(form.buttonStyles.continue)">{{ resolveButtonText('continue') }}</button>
              <button :class="resolveButtonClass()" :style="resolveButtonStyle(form.buttonStyles.achievements)">{{ resolveButtonText('achievements') }}</button>
              <button :class="resolveButtonClass()" :style="resolveButtonStyle(form.buttonStyles.collection)">{{ resolveButtonText('collection') }}</button>
            </div>
          </div>
        </div>

        <audio v-if="displayBgm" :src="displayBgm" class="mt-4 w-full" controls></audio>
      </div>
    </div>

    <CommonUiAssetPickerDialog
      v-model="showBackgroundPicker"
      :title="form.backgroundType === 'image' ? '选择背景图片' : '选择背景视频'"
      :asset-type="form.backgroundType"
      :assets="backgroundPickerAssets"
      :selected-id="selectedBackgroundAssetId"
      :allow-none="true"
      none-label="清空背景资源"
      @select="handleSelectBackgroundAsset"
    />

    <CommonUiAssetPickerDialog
      v-model="showBgmPicker"
      title="选择背景音乐"
      asset-type="audio"
      :assets="store.currentProject?.assets.audios || []"
      :selected-id="selectedBgmAssetId"
      :allow-none="true"
      none-label="不使用背景音乐"
      @select="handleSelectBgmAsset"
    />

    <CommonUiAssetPickerDialog
      v-model="showButtonImagePicker"
      title="选择按钮图片"
      asset-type="image"
      :assets="store.currentProject?.assets.images || []"
      :selected-id="selectedButtonImageAssetId"
      :allow-none="true"
      none-label="清空按钮图片"
      @select="handleSelectButtonImage"
    />
  </div>
</template>

<script setup lang="ts">
import type { StartPageButtonStyle, StartPageButtonStyles } from '~/types'

definePageMeta({ layout: 'editor' })

const store = useProjectStore()
const route = useRoute()
const toast = useToast()
const previewRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const settingsRef = ref<HTMLElement | null>(null)
const showBackgroundPicker = ref(false)
const showBgmPicker = ref(false)
const showButtonImagePicker = ref(false)
const editingButtonKey = ref<keyof StartPageButtonStyles | null>(null)
const draggingMenu = ref(false)
const draggingTitle = ref(false)
const draggingSettings = ref(false)
const dragOffset = reactive({ x: 0, y: 0 })

const form = reactive({
  backgroundType: 'image' as 'image' | 'video',
  backgroundMedia: '',
  bgm: '',
  titleMode: 'text' as 'text' | 'image' | 'none',
  titleText: '',
  titleImage: '',
  menuPosition: {
    x: 24,
    y: 220,
  },
  titlePosition: {
    x: 180,
    y: 48,
  },
  settingsPosition: {
    x: 560,
    y: 16,
  },
  buttonStyles: createDefaultButtonStyles(),
})

const mainButtonStyleConfigs: { key: keyof Omit<StartPageButtonStyles, 'settings'>; label: string }[] = [
  { key: 'start', label: '开始游戏' },
  { key: 'continue', label: '继续游戏' },
  { key: 'achievements', label: '游戏成就' },
  { key: 'collection', label: '图鉴' },
]

const displayBackgroundMedia = computed(() => resolveAssetUrl(form.backgroundMedia))
const displayTitleImage = computed(() => resolveAssetUrl(form.titleImage))
const displayBgm = computed(() => resolveAssetUrl(form.bgm))
const backgroundPickerAssets = computed(() => {
  if (form.backgroundType === 'video') {
    return store.currentProject?.assets.videos || []
  }
  return store.currentProject?.assets.images || []
})
const selectedBackgroundAssetId = computed(() => {
  if (!form.backgroundMedia) return null
  const found = backgroundPickerAssets.value.find(asset => asset.url === form.backgroundMedia)
  return found?.id || null
})
const selectedBgmAssetId = computed(() => {
  if (!form.bgm) return null
  const found = (store.currentProject?.assets.audios || []).find(asset => asset.url === form.bgm)
  return found?.id || null
})
const selectedButtonImageAssetId = computed(() => {
  if (!editingButtonKey.value) return null
  const imagePath = form.buttonStyles[editingButtonKey.value].image
  if (!imagePath) return null
  const assets = store.currentProject?.assets.images || []
  const found = assets.find(asset => asset.url === imagePath)
  return found?.id || null
})

const isVideoBackground = computed(() => {
  return form.backgroundType === 'video'
})

const previewAspectClass = computed(() => {
  return store.currentProject?.orientation === 'portrait' ? 'aspect-[9/16] max-w-[320px] mx-auto' : 'aspect-video'
})

const previewStyle = computed(() => {
  if (isVideoBackground.value) {
    return {
      backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }
  }

  return {
    backgroundImage: displayBackgroundMedia.value
      ? `url('${displayBackgroundMedia.value}')`
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  }
})

const buttonLabelMap: Record<keyof StartPageButtonStyles, string> = {
  start: '开始游戏',
  continue: '继续游戏',
  achievements: '游戏成就',
  collection: '图鉴',
  settings: '设置',
}

function resolveButtonClass(withMotion = true) {
  return [
    withMotion
      ? 'font-semibold select-none transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0'
      : 'font-semibold select-none transition-none',
    'px-4 py-2 rounded-xl border border-transparent text-sm',
  ]
}

function createDefaultButtonStyles(): StartPageButtonStyles {
  return {
    start: { mode: 'normal', text: '开始游戏', textColor: '#ffffff', backgroundColor: '#2563eb', image: '' },
    continue: { mode: 'normal', text: '继续游戏', textColor: '#111827', backgroundColor: '#f3f4f6', image: '' },
    achievements: { mode: 'normal', text: '游戏成就', textColor: '#ffffff', backgroundColor: '#111827', image: '' },
    collection: { mode: 'normal', text: '图鉴', textColor: '#ffffff', backgroundColor: '#111827', image: '' },
    settings: { mode: 'normal', text: '设置', textColor: '#ffffff', backgroundColor: '#374151', image: '' },
  }
}

function resolveButtonStyle(style: StartPageButtonStyle, isSettings = false) {
  if (style.mode === 'image') {
    const imageUrl = resolveAssetUrl(style.image)
    return {
      minHeight: isSettings ? '32px' : '40px',
      minWidth: isSettings ? '64px' : '100%',
      backgroundImage: imageUrl ? `url('${imageUrl}')` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundColor: imageUrl ? 'transparent' : '#111827',
      color: imageUrl ? 'transparent' : '#ffffff',
    }
  }

  return {
    minHeight: isSettings ? '32px' : '40px',
    backgroundColor: style.backgroundColor || '#1f2937',
    color: style.textColor || '#ffffff',
  }
}

function resolveButtonText(key: keyof StartPageButtonStyles) {
  const style = form.buttonStyles[key]
  if (style.mode === 'image') {
    return style.image ? '' : buttonLabelMap[key]
  }
  return style.text || buttonLabelMap[key]
}

function resolveAssetUrl(value: string) {
  if (!value) return ''
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }
  return store.getAssetUrl(value)
}

function detectBackgroundMediaType(value: string): 'image' | 'video' | null {
  if (!value) return null

  const imageAsset = (store.currentProject?.assets.images || []).find(asset => asset.url === value)
  if (imageAsset) return 'image'

  const videoAsset = (store.currentProject?.assets.videos || []).find(asset => asset.url === value)
  if (videoAsset) return 'video'

  if (/\.(mp4|webm|mov)$/i.test(value)) return 'video'
  if (/\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(value)) return 'image'
  return null
}

function setBackgroundType(type: 'image' | 'video') {
  if (form.backgroundType === type) return
  form.backgroundType = type

  const mediaType = detectBackgroundMediaType(form.backgroundMedia)
  if (form.backgroundMedia && mediaType && mediaType !== type) {
    toast.warning(type === 'image' ? '当前背景资源是视频素材，请重新选择图片背景。' : '当前背景资源是图片素材，请重新选择视频背景。')
  }

  save()
}

async function selectBackgroundMedia() {
  showBackgroundPicker.value = true
}

async function selectTitleImage() {
  const value = await selectAssetFileAndReturn(['png', 'jpg', 'jpeg', 'webp'])
  if (!value) return
  form.titleImage = value
  save()
}

async function selectBgm() {
  showBgmPicker.value = true
}

function handleSelectBackgroundAsset(id: string | null) {
  if (!id) {
    form.backgroundMedia = ''
    showBackgroundPicker.value = false
    save()
    return
  }

  const asset = backgroundPickerAssets.value.find(item => item.id === id)
  if (asset) {
    form.backgroundMedia = asset.url
    save()
  }
  showBackgroundPicker.value = false
}

function handleSelectBgmAsset(id: string | null) {
  if (!id) {
    form.bgm = ''
    showBgmPicker.value = false
    save()
    return
  }

  const asset = (store.currentProject?.assets.audios || []).find(item => item.id === id)
  if (asset) {
    form.bgm = asset.url
    save()
  }
  showBgmPicker.value = false
}

function setButtonMode(key: keyof StartPageButtonStyles, mode: StartPageButtonStyle['mode']) {
  const button = form.buttonStyles[key]
  button.mode = mode
  if (button.mode === 'normal' && !button.text) {
    button.text = buttonLabelMap[key]
  }
  save()
}

function openButtonImagePicker(key: keyof StartPageButtonStyles) {
  editingButtonKey.value = key
  showButtonImagePicker.value = true
}

function handleSelectButtonImage(id: string | null) {
  if (!editingButtonKey.value) {
    showButtonImagePicker.value = false
    return
  }
  const key = editingButtonKey.value
  if (!id) {
    form.buttonStyles[key].image = ''
    showButtonImagePicker.value = false
    save()
    return
  }

  const asset = (store.currentProject?.assets.images || []).find(item => item.id === id)
  if (asset) {
    form.buttonStyles[key].image = asset.url
    save()
  }
  showButtonImagePicker.value = false
}

async function selectAssetFileAndReturn(extensions: string[]) {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Asset',
        extensions,
      }],
    })

    if (selected && typeof selected === 'string') {
      const sourcePath = selected
      const ext = sourcePath.split('.').pop() || extensions[0] || 'dat'
      const filename = sourcePath.split(/[/\\]/).pop() || `asset_${Date.now()}.${ext}`
      const { invoke } = await import('@tauri-apps/api/core')
      try {
        const savedFilename = await invoke<string>('copy_asset', {
          projectPath: store.currentProject?.path,
          sourcePath,
          filename,
        })
        return savedFilename
      } catch (e: any) {
        console.error('复制文件失败:', e)
      }
    }
  } catch (e) {
    console.error('Failed to select asset via Tauri, falling back to web input:', e)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = extensions.map(ext => `.${ext}`).join(',')
    return await new Promise<string>((resolve) => {
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (fileEvent) => {
            if (fileEvent.target?.result) {
              resolve(fileEvent.target.result as string)
            }
          }
          reader.readAsDataURL(file)
          return
        }
        resolve('')
      }
      input.click()
    })
  }

  return ''
}

onMounted(async () => {
  const projectId = route.params.id as string
  if (!store.currentProject || store.currentProject.id !== projectId) {
    await store.openProject(projectId)
  }

  if (store.currentProject?.startPage) {
    const sp = store.currentProject.startPage as any
    form.backgroundType = sp.backgroundType || 'image'
    form.backgroundMedia = sp.backgroundMedia || sp.backgroundImage || ''
    form.bgm = sp.bgm || ''
    form.titleMode = sp.titleMode || 'text'
    form.titleText = sp.titleText || sp.title || store.currentProject.name
    form.titleImage = sp.titleImage || ''
    form.menuPosition = {
      x: Number(sp.menuPosition?.x ?? 24),
      y: Number(sp.menuPosition?.y ?? 220),
    }
    form.titlePosition = {
      x: Number(sp.titlePosition?.x ?? 180),
      y: Number(sp.titlePosition?.y ?? 48),
    }
    form.settingsPosition = {
      x: Number(sp.settingsPosition?.x ?? 560),
      y: Number(sp.settingsPosition?.y ?? 16),
    }
    const defaults = createDefaultButtonStyles()
    const rawButtons = sp.buttonStyles || {}
    form.buttonStyles = {
      ...defaults,
      start: normalizeButtonStyle(rawButtons.start, defaults.start),
      continue: normalizeButtonStyle(rawButtons.continue, defaults.continue),
      achievements: normalizeButtonStyle(rawButtons.achievements, defaults.achievements),
      collection: normalizeButtonStyle(rawButtons.collection, defaults.collection),
      settings: normalizeButtonStyle(rawButtons.settings, defaults.settings),
    }
  }

  await nextTick()
  clampAllElementsPosition()
})

watch(
  () => store.currentProject?.orientation,
  async () => {
    await nextTick()
    clampAllElementsPosition()
  }
)

function save() {
  if (!store.currentProject) return
  store.currentProject.startPage = {
    backgroundType: form.backgroundType,
    backgroundMedia: form.backgroundMedia,
    bgm: form.bgm,
    titleMode: form.titleMode,
    titleText: form.titleText,
    titleImage: form.titleImage,
    menuPosition: {
      x: form.menuPosition.x,
      y: form.menuPosition.y,
    },
    titlePosition: {
      x: form.titlePosition.x,
      y: form.titlePosition.y,
    },
    settingsPosition: {
      x: form.settingsPosition.x,
      y: form.settingsPosition.y,
    },
    buttonStyles: {
      start: { ...form.buttonStyles.start },
      continue: { ...form.buttonStyles.continue },
      achievements: { ...form.buttonStyles.achievements },
      collection: { ...form.buttonStyles.collection },
      settings: { ...form.buttonStyles.settings },
    },
  }
}

function startDragMenu(event: MouseEvent) {
  if (!previewRef.value || !menuRef.value) return
  draggingMenu.value = true
  const previewRect = previewRef.value.getBoundingClientRect()
  dragOffset.x = event.clientX - previewRect.left - form.menuPosition.x
  dragOffset.y = event.clientY - previewRect.top - form.menuPosition.y
  window.addEventListener('mousemove', onDragMenu)
  window.addEventListener('mouseup', stopDragMenu)
}

function startDragTitle(event: MouseEvent) {
  if (!previewRef.value || !titleRef.value || form.titleMode === 'none') return
  draggingTitle.value = true
  const previewRect = previewRef.value.getBoundingClientRect()
  dragOffset.x = event.clientX - previewRect.left - form.titlePosition.x
  dragOffset.y = event.clientY - previewRect.top - form.titlePosition.y
  window.addEventListener('mousemove', onDragTitle)
  window.addEventListener('mouseup', stopDragTitle)
}

function startDragSettings(event: MouseEvent) {
  if (!previewRef.value || !settingsRef.value) return
  event.preventDefault()
  draggingSettings.value = true
  const previewRect = previewRef.value.getBoundingClientRect()
  dragOffset.x = event.clientX - previewRect.left - form.settingsPosition.x
  dragOffset.y = event.clientY - previewRect.top - form.settingsPosition.y
  window.addEventListener('mousemove', onDragSettings)
  window.addEventListener('mouseup', stopDragSettings)
}

function onDragMenu(event: MouseEvent) {
  if (!draggingMenu.value || !previewRef.value || !menuRef.value) return
  const previewRect = previewRef.value.getBoundingClientRect()
  const menuRect = menuRef.value.getBoundingClientRect()
  const maxX = Math.max(0, previewRect.width - menuRect.width)
  const maxY = Math.max(0, previewRect.height - menuRect.height)
  const nextX = event.clientX - previewRect.left - dragOffset.x
  const nextY = event.clientY - previewRect.top - dragOffset.y
  form.menuPosition.x = Math.min(Math.max(0, nextX), maxX)
  form.menuPosition.y = Math.min(Math.max(0, nextY), maxY)
}

function onDragTitle(event: MouseEvent) {
  if (!draggingTitle.value || !previewRef.value || !titleRef.value) return
  const previewRect = previewRef.value.getBoundingClientRect()
  const titleRect = titleRef.value.getBoundingClientRect()
  const maxX = Math.max(0, previewRect.width - titleRect.width)
  const maxY = Math.max(0, previewRect.height - titleRect.height)
  const nextX = event.clientX - previewRect.left - dragOffset.x
  const nextY = event.clientY - previewRect.top - dragOffset.y
  form.titlePosition.x = Math.min(Math.max(0, nextX), maxX)
  form.titlePosition.y = Math.min(Math.max(0, nextY), maxY)
}

function onDragSettings(event: MouseEvent) {
  if (!draggingSettings.value || !previewRef.value || !settingsRef.value) return
  const previewRect = previewRef.value.getBoundingClientRect()
  const settingsRect = settingsRef.value.getBoundingClientRect()
  const maxX = Math.max(0, previewRect.width - settingsRect.width)
  const maxY = Math.max(0, previewRect.height - settingsRect.height)
  const nextX = event.clientX - previewRect.left - dragOffset.x
  const nextY = event.clientY - previewRect.top - dragOffset.y
  form.settingsPosition.x = Math.min(Math.max(0, nextX), maxX)
  form.settingsPosition.y = Math.min(Math.max(0, nextY), maxY)
}

function clampElementPosition(target: 'settings' | 'title' | 'menu') {
  if (!previewRef.value) return
  const previewRect = previewRef.value.getBoundingClientRect()
  const elementMap = {
    settings: settingsRef.value,
    title: titleRef.value,
    menu: menuRef.value,
  }
  const element = elementMap[target]
  if (!element) return
  const elementRect = element.getBoundingClientRect()
  const maxX = Math.max(0, previewRect.width - elementRect.width)
  const maxY = Math.max(0, previewRect.height - elementRect.height)

  if (target === 'settings') {
    form.settingsPosition.x = Math.min(Math.max(0, form.settingsPosition.x), maxX)
    form.settingsPosition.y = Math.min(Math.max(0, form.settingsPosition.y), maxY)
    return
  }

  if (target === 'title') {
    form.titlePosition.x = Math.min(Math.max(0, form.titlePosition.x), maxX)
    form.titlePosition.y = Math.min(Math.max(0, form.titlePosition.y), maxY)
    return
  }

  form.menuPosition.x = Math.min(Math.max(0, form.menuPosition.x), maxX)
  form.menuPosition.y = Math.min(Math.max(0, form.menuPosition.y), maxY)
}

function clampAllElementsPosition() {
  clampElementPosition('settings')
  if (form.titleMode !== 'none') {
    clampElementPosition('title')
  }
  clampElementPosition('menu')
}

function stopDragMenu() {
  if (!draggingMenu.value) return
  draggingMenu.value = false
  window.removeEventListener('mousemove', onDragMenu)
  window.removeEventListener('mouseup', stopDragMenu)
  save()
}

function stopDragTitle() {
  if (!draggingTitle.value) return
  draggingTitle.value = false
  window.removeEventListener('mousemove', onDragTitle)
  window.removeEventListener('mouseup', stopDragTitle)
  save()
}

function stopDragSettings() {
  if (!draggingSettings.value) return
  draggingSettings.value = false
  window.removeEventListener('mousemove', onDragSettings)
  window.removeEventListener('mouseup', stopDragSettings)
  save()
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDragMenu)
  window.removeEventListener('mouseup', stopDragMenu)
  window.removeEventListener('mousemove', onDragTitle)
  window.removeEventListener('mouseup', stopDragTitle)
  window.removeEventListener('mousemove', onDragSettings)
  window.removeEventListener('mouseup', stopDragSettings)
})

function normalizeButtonStyle(raw: any, fallback: StartPageButtonStyle): StartPageButtonStyle {
  if (!raw) return { ...fallback }

  if (raw.mode === 'normal' || raw.mode === 'image') {
    return {
      mode: raw.mode,
      text: raw.text || fallback.text,
      textColor: raw.textColor || fallback.textColor,
      backgroundColor: raw.backgroundColor || fallback.backgroundColor,
      image: raw.image || '',
    }
  }

  const legacyVariantColor: Record<string, string> = {
    primary: '#2563eb',
    secondary: '#f3f4f6',
    outline: '#1f2937',
    ghost: '#374151',
  }

  return {
    mode: raw.image ? 'image' : 'normal',
    text: fallback.text,
    textColor: raw.variant === 'secondary' ? '#111827' : '#ffffff',
    backgroundColor: legacyVariantColor[raw.variant] || fallback.backgroundColor,
    image: raw.image || '',
  }
}
</script>
