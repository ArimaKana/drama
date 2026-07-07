import { defineStore } from 'pinia'
import type {
  Project,
  ProjectAiConfig,
  ProjectListItem,
  Chapter,
  Character,
  GameValue,
  StoryNode,
  Achievement,
  CollectionEntry,
  VideoAsset,
  ImageAsset,
  AudioAsset,
  SubtitleAsset,
} from '~/types'
import {
  createProject,
  createChapter,
  createCharacter,
  createGameValue,
  createAchievement,
  createCollectionEntry,
  createNodeByType,
  createId,
  now,
} from '~/utils/factory'
import { isTauriRuntime } from '~/utils/runtime'
import { sanitizeBaseURL } from '~/utils/url'

export const useProjectStore = defineStore('project', () => {
  // 状态
  const projects = ref<ProjectListItem[]>([])
  const currentProject = ref<Project | null>(null)
  const currentChapterId = ref<string | null>(null)
  const selectedNodeId = ref<string | null>(null)
  const isSaving = ref(false)
  const isLoading = ref(false)

  // 计算属性
  const currentChapter = computed(() => {
    if (!currentProject.value || !currentChapterId.value) return null
    return currentProject.value.chapters.find(c => c.id === currentChapterId.value) || null
  })

  const currentNodes = computed(() => {
    return currentChapter.value?.nodes || []
  })

  const selectedNode = computed(() => {
    if (!selectedNodeId.value || !currentChapter.value) return null
    return currentChapter.value.nodes.find(n => n.id === selectedNodeId.value) || null
  })

  function getAssetUrl(urlOrId: string) {
    if (!urlOrId) return ''
    if (urlOrId.startsWith('http') || urlOrId.startsWith('data:')) return urlOrId
    
    // 如果是素材ID，尝试查找对应的素材
    const imageAsset = currentProject.value?.assets.images.find(i => i.id === urlOrId)
    const filename = imageAsset ? imageAsset.url : urlOrId
    
    if (filename.startsWith('http') || filename.startsWith('data:')) return filename

    const encodedFilename = filename
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/')
    
    if (currentProject.value?.assetServerUrl) {
      return `${currentProject.value.assetServerUrl}/${encodedFilename}`
    }
    return encodedFilename
  }

  function resolveProjectPath(pathOrId: string) {
    const matched = projects.value.find(p => p.id === pathOrId || p.path === pathOrId)
    return matched?.path || pathOrId
  }

  function ensureAssetCollections(project: Project) {
    project.assets = {
      videos: project.assets?.videos || [],
      images: project.assets?.images || [],
      audios: project.assets?.audios || [],
      subtitles: project.assets?.subtitles || [],
    }
  }

  function ensureChapterAndNodeFields(project: Project) {
    project.chapters = (project.chapters || []).map(chapter => {
      const nodes = (chapter.nodes || []).map(node => {
        if (node.type === 'video') {
          return {
            ...node,
            subtitleEnabled: node.subtitleEnabled ?? false,
            subtitleId: node.subtitleId ?? null,
          }
        }
        return node
      })
      return {
        ...chapter,
        backgroundAudioId: chapter.backgroundAudioId ?? null,
        nodes,
      }
    })
  }

  function ensureProjectAiConfig(project: Project) {
    const defaultConfig: ProjectAiConfig = {
      text: {
        provider: 'zhipu',
        model: '',
        baseURL: '',
      },
      image: {
        provider: 'seedream',
        model: 'doubao-seedream-5-0-260128',
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
      },
      video: {
        provider: 'seedance',
        model: 'doubao-seedance-1-5-pro-251215',
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
      },
    }

    const aiConfigValue = (project as { aiConfig?: unknown }).aiConfig
    const aiConfig = (aiConfigValue && typeof aiConfigValue === 'object'
      ? aiConfigValue
      : {}) as Record<string, unknown>
    const legacyProvider = aiConfig.provider as string | undefined
    const provider = legacyProvider === 'glm-5'
      ? 'zhipu'
      : legacyProvider === 'kimi-2.5'
        ? 'kimi'
        : legacyProvider === 'custom'
          ? 'custom'
          : (legacyProvider as ProjectAiConfig['text']['provider'] | undefined)

    const textConfig = (aiConfig.text && typeof aiConfig.text === 'object'
      ? aiConfig.text
      : {}) as Record<string, unknown>
    const imageConfig = (aiConfig.image && typeof aiConfig.image === 'object'
      ? aiConfig.image
      : {}) as Record<string, unknown>
    const videoConfig = (aiConfig.video && typeof aiConfig.video === 'object'
      ? aiConfig.video
      : {}) as Record<string, unknown>

    const textProvider = textConfig.provider as ProjectAiConfig['text']['provider'] | undefined
    const textModel = textConfig.model as string | undefined
    const textBaseURL = textConfig.baseURL as string | undefined

    const imageProvider = imageConfig.provider as ProjectAiConfig['image']['provider'] | undefined
    const imageModel = imageConfig.model as string | undefined
    const imageBaseURL = imageConfig.baseURL as string | undefined

    const videoProvider = videoConfig.provider as ProjectAiConfig['video']['provider'] | undefined
    const videoModel = videoConfig.model as string | undefined
    const videoBaseURL = videoConfig.baseURL as string | undefined

    const legacyModel = aiConfig.model as string | undefined
    const legacyBaseURL = aiConfig.baseURL as string | undefined

    project.aiConfig = {
      text: {
        provider: textProvider || provider || defaultConfig.text.provider,
        model: textModel || legacyModel || defaultConfig.text.model,
        // 清洗非法/空 baseURL：text 默认为空，运行时由各 provider 默认值兜底
        baseURL: sanitizeBaseURL(textBaseURL || legacyBaseURL, defaultConfig.text.baseURL),
      },
      image: {
        provider: imageProvider || defaultConfig.image.provider,
        model: imageModel || defaultConfig.image.model,
        baseURL: sanitizeBaseURL(imageBaseURL, defaultConfig.image.baseURL),
      },
      video: {
        provider: videoProvider || defaultConfig.video.provider,
        model: videoModel || defaultConfig.video.model,
        baseURL: sanitizeBaseURL(videoBaseURL, defaultConfig.video.baseURL),
      },
    }
  }

  // ============ 项目操作 ============
  async function loadProjects() {
    try {
      isLoading.value = true
      if (isTauriRuntime()) {
        const { invoke } = await import('@tauri-apps/api/core')
        const results = await invoke<string[]>('list_projects')
        projects.value = results.map((json: string) => {
          const p = JSON.parse(json) as Project
          return { id: p.id, name: p.name, path: p.path, cover: p.cover, createdAt: p.createdAt, updatedAt: p.updatedAt }
        })
      } else {
        // 浏览器 fallback - localStorage
        const stored = localStorage.getItem('drama_projects')
        if (stored) {
          const allProjects = JSON.parse(stored) as Project[]
          projects.value = allProjects.map(p => ({
            id: p.id, name: p.name, path: p.path, cover: p.cover, createdAt: p.createdAt, updatedAt: p.updatedAt,
          }))
        }
      }
    } finally {
      isLoading.value = false
    }
  }

  async function saveProject() {
    if (!currentProject.value) return
    try {
      isSaving.value = true
      currentProject.value.updatedAt = now()
      const data = JSON.stringify(currentProject.value, null, 2)
      if (isTauriRuntime()) {
        const projectPath = currentProject.value.path || resolveProjectPath(currentProject.value.id)
        if (!projectPath) throw new Error('项目路径不存在，无法保存')
        currentProject.value.path = projectPath
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('save_project', { path: projectPath, data })
      } else {
        // 浏览器 fallback
        const stored = localStorage.getItem('drama_projects')
        const allProjects: Project[] = stored ? JSON.parse(stored) : []
        const idx = allProjects.findIndex(p => p.id === currentProject.value!.id)
        if (idx >= 0) allProjects[idx] = currentProject.value
        else allProjects.push(currentProject.value)
        localStorage.setItem('drama_projects', JSON.stringify(allProjects))
      }
      // 刷新项目列表
      await loadProjects()
    } finally {
      isSaving.value = false
    }
  }

  async function openProject(pathOrId: string) {
    try {
      isLoading.value = true
      if (isTauriRuntime()) {
        let projectPath = resolveProjectPath(pathOrId)
        if (projectPath === pathOrId && !pathOrId.includes('/') && !pathOrId.includes('\\')) {
          await loadProjects()
          projectPath = resolveProjectPath(pathOrId)
        }
        if (!projectPath || projectPath === pathOrId && !pathOrId.includes('/') && !pathOrId.includes('\\')) {
          throw new Error('未找到项目目录')
        }
        const { invoke } = await import('@tauri-apps/api/core')
        const json = await invoke<string>('load_project', { path: projectPath })
        currentProject.value = JSON.parse(json) as Project
        ensureAssetCollections(currentProject.value)
        ensureChapterAndNodeFields(currentProject.value)
        ensureProjectAiConfig(currentProject.value)
        currentProject.value.path = projectPath
        
        // 启动静态资源服务
        const assetServerUrl = await invoke<string>('start_asset_server', { path: projectPath })
        console.log('Asset server started at:', assetServerUrl)
        // 可以将 assetServerUrl 存入 store 供后续使用
        currentProject.value.assetServerUrl = assetServerUrl
      } else {
        const stored = localStorage.getItem('drama_projects')
        if (stored) {
          const allProjects = JSON.parse(stored) as Project[]
          currentProject.value = allProjects.find(p => p.id === pathOrId) || null
          if (currentProject.value) {
            ensureAssetCollections(currentProject.value)
            ensureChapterAndNodeFields(currentProject.value)
            ensureProjectAiConfig(currentProject.value)
          }
        }
      }
      currentChapterId.value = currentProject.value?.chapters[0]?.id || null
      selectedNodeId.value = null
    } finally {
      isLoading.value = false
    }
  }

  async function newProject(name: string, parentDir?: string) {
    const project = createProject(name)
    
    if (isTauriRuntime() && parentDir) {
      const { invoke } = await import('@tauri-apps/api/core')
      const projectPath = await invoke<string>('create_project', { name, parentDir })
      project.path = projectPath
    }
    
    currentProject.value = project
    currentChapterId.value = null
    selectedNodeId.value = null
    await saveProject()
    return project
  }

  async function deleteProject(pathOrId: string, removeDirectory = false) {
    if (isTauriRuntime()) {
      let projectPath = resolveProjectPath(pathOrId)
      if (projectPath === pathOrId && !pathOrId.includes('/') && !pathOrId.includes('\\')) {
        await loadProjects()
        projectPath = resolveProjectPath(pathOrId)
      }
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('delete_project', { path: projectPath, removeDir: removeDirectory })
    } else {
      const stored = localStorage.getItem('drama_projects')
      if (stored) {
        const allProjects = JSON.parse(stored) as Project[]
        const filtered = allProjects.filter(p => p.id !== pathOrId)
        localStorage.setItem('drama_projects', JSON.stringify(filtered))
      }
    }
    if (currentProject.value?.path === pathOrId || currentProject.value?.id === pathOrId) {
      currentProject.value = null
    }
    await loadProjects()
  }

  function closeProject() {
    if (isTauriRuntime()) {
      import('@tauri-apps/api/core')
        .then(({ invoke }) => invoke('stop_asset_server'))
        .catch((error) => {
          console.warn('停止素材服务失败:', error)
        })
    }
    currentProject.value = null
    currentChapterId.value = null
    selectedNodeId.value = null
  }

  // ============ 章节操作 ============
  function addChapter(name: string) {
    if (!currentProject.value) return
    const chapter = createChapter(name, currentProject.value.chapters.length)
    currentProject.value.chapters.push(chapter)
    currentChapterId.value = chapter.id
    return chapter
  }

  function updateChapter(id: string, data: Partial<Chapter>) {
    if (!currentProject.value) return
    const chapter = currentProject.value.chapters.find(c => c.id === id)
    if (chapter) Object.assign(chapter, data, { updatedAt: now() })
  }

  function deleteChapter(id: string) {
    if (!currentProject.value) return
    currentProject.value.chapters = currentProject.value.chapters.filter(c => c.id !== id)
    if (currentChapterId.value === id) {
      currentChapterId.value = currentProject.value.chapters[0]?.id || null
    }
  }

  function selectChapter(id: string) {
    currentChapterId.value = id
    selectedNodeId.value = null
  }

  // ============ 节点操作 ============
  function addNode(type: string, x = 200, y = 200) {
    if (!currentChapter.value) return null
    const node = createNodeByType(type, x, y)
    currentChapter.value.nodes.push(node)
    // 如果是章节中的第一个节点，自动设为起始节点
    if (currentChapter.value.nodes.length === 1) {
      currentChapter.value.startNodeId = node.id
    }
    selectedNodeId.value = node.id
    return node
  }

  function updateNode(nodeId: string, data: Partial<StoryNode>) {
    if (!currentChapter.value) return
    const node = currentChapter.value.nodes.find(n => n.id === nodeId)
    if (node) {
      Object.assign(node, data, { updatedAt: now() })
    }
  }

  function deleteNode(nodeId: string) {
    if (!currentChapter.value) return
    currentChapter.value.nodes = currentChapter.value.nodes.filter(n => n.id !== nodeId)
    if (selectedNodeId.value === nodeId) selectedNodeId.value = null
    // 如果删除的是起始节点，清除 startNodeId
    if (currentChapter.value.startNodeId === nodeId) {
      currentChapter.value.startNodeId = currentChapter.value.nodes.length > 0
        ? currentChapter.value.nodes[0]!.id
        : null
    }
  }

  function clearCurrentChapterNodes() {
    if (!currentChapter.value) return
    currentChapter.value.nodes = []
    currentChapter.value.startNodeId = null
    selectedNodeId.value = null
  }

  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId
  }

  // ============ 角色操作 ============
  function addCharacter(name: string) {
    if (!currentProject.value) return
    const character = createCharacter(name)
    currentProject.value.characters.push(character)
    return character
  }

  function updateCharacter(id: string, data: Partial<Character>) {
    if (!currentProject.value) return
    const char = currentProject.value.characters.find(c => c.id === id)
    if (char) Object.assign(char, data, { updatedAt: now() })
  }

  function deleteCharacter(id: string) {
    if (!currentProject.value) return
    currentProject.value.characters = currentProject.value.characters.filter(c => c.id !== id)
  }

  // ============ 数值操作 ============
  function addGameValue(name: string) {
    if (!currentProject.value) return
    const val = createGameValue(name)
    currentProject.value.gameValues.push(val)
    return val
  }

  function updateGameValue(id: string, data: Partial<GameValue>) {
    if (!currentProject.value) return
    const val = currentProject.value.gameValues.find(v => v.id === id)
    if (val) Object.assign(val, data, { updatedAt: now() })
  }

  function deleteGameValue(id: string) {
    if (!currentProject.value) return
    currentProject.value.gameValues = currentProject.value.gameValues.filter(v => v.id !== id)
  }

  // ============ 素材操作 ============
  function addVideoAsset(video: VideoAsset) {
    if (!currentProject.value) return
    currentProject.value.assets.videos.push(video)
  }

  function removeVideoAsset(id: string) {
    if (!currentProject.value) return
    currentProject.value.assets.videos = currentProject.value.assets.videos.filter(v => v.id !== id)
  }

  function addImageAsset(image: ImageAsset) {
    if (!currentProject.value) return
    currentProject.value.assets.images.push(image)
  }

  function removeImageAsset(id: string) {
    if (!currentProject.value) return
    currentProject.value.assets.images = currentProject.value.assets.images.filter(i => i.id !== id)
  }

  function addAudioAsset(audio: AudioAsset) {
    if (!currentProject.value) return
    currentProject.value.assets.audios.push(audio)
  }

  function removeAudioAsset(id: string) {
    if (!currentProject.value) return
    currentProject.value.assets.audios = currentProject.value.assets.audios.filter(a => a.id !== id)
  }

  function addSubtitleAsset(subtitle: SubtitleAsset) {
    if (!currentProject.value) return
    currentProject.value.assets.subtitles.push(subtitle)
  }

  function removeSubtitleAsset(id: string) {
    if (!currentProject.value) return
    currentProject.value.assets.subtitles = currentProject.value.assets.subtitles.filter(s => s.id !== id)
  }

  // ============ 成就操作 ============
  function addAchievement(name: string) {
    if (!currentProject.value) return
    const achievement = createAchievement(name)
    currentProject.value.achievements.push(achievement)
    return achievement
  }

  function updateAchievement(id: string, data: Partial<Achievement>) {
    if (!currentProject.value) return
    const item = currentProject.value.achievements.find(a => a.id === id)
    if (item) Object.assign(item, data, { updatedAt: now() })
  }

  function deleteAchievement(id: string) {
    if (!currentProject.value) return
    currentProject.value.achievements = currentProject.value.achievements.filter(a => a.id !== id)
  }

  // ============ 图鉴操作 ============
  function addCollectionEntry(characterId: string) {
    if (!currentProject.value) return
    const entry = createCollectionEntry(characterId)
    currentProject.value.collection.push(entry)
    return entry
  }

  function updateCollectionEntry(id: string, data: Partial<CollectionEntry>) {
    if (!currentProject.value) return
    const item = currentProject.value.collection.find(c => c.id === id)
    if (item) Object.assign(item, data, { updatedAt: now() })
  }

  function deleteCollectionEntry(id: string) {
    if (!currentProject.value) return
    currentProject.value.collection = currentProject.value.collection.filter(c => c.id !== id)
  }

  return {
    // 状态
    projects,
    currentProject,
    currentChapterId,
    selectedNodeId,
    isSaving,
    isLoading,
    // 计算属性
    currentChapter,
    currentNodes,
    selectedNode,
    getAssetUrl,
    // 项目
    loadProjects,
    saveProject,
    openProject,
    newProject,
    deleteProject,
    closeProject,
    // 章节
    addChapter,
    updateChapter,
    deleteChapter,
    selectChapter,
    // 节点
    addNode,
    updateNode,
    deleteNode,
    clearCurrentChapterNodes,
    selectNode,
    // 角色
    addCharacter,
    updateCharacter,
    deleteCharacter,
    // 数值
    addGameValue,
    updateGameValue,
    deleteGameValue,
    // 素材
    addVideoAsset,
    removeVideoAsset,
    addImageAsset,
    removeImageAsset,
    addAudioAsset,
    removeAudioAsset,
    addSubtitleAsset,
    removeSubtitleAsset,
    // 成就
    addAchievement,
    updateAchievement,
    deleteAchievement,
    // 图鉴
    addCollectionEntry,
    updateCollectionEntry,
    deleteCollectionEntry,
  }
})
