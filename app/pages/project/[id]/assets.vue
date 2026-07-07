<template>
  <div class="h-full min-h-0 px-8 py-8 overflow-y-auto bg-gray-50/30">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h3 class="text-xl font-bold text-gray-900 tracking-tight">素材管理</h3>
      </div>
      <div class="flex gap-3">
        <button class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0" @click="showVideoDialog = true">
          <span class="text-blue-500 text-lg leading-none">🎥</span> 添加视频
        </button>
        <button class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0" @click="showImageDialog = true">
          <span class="text-emerald-500 text-lg leading-none">🖼</span> 添加图片
        </button>
        <button class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0" @click="showAudioDialog = true">
          <span class="text-violet-500 text-lg leading-none">🎵</span> 添加音频
        </button>
        <button class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0" @click="showSubtitleDialog = true">
          <span class="text-amber-500 text-lg leading-none">💬</span> 添加字幕
        </button>
      </div>
    </div>

    <!-- 原生 Tabs -->
    <div>
      <div class="flex border-b border-gray-200/80 mb-6 gap-6">
        <button
          class="px-2 py-3 text-sm font-semibold transition-all border-b-2 -mb-px relative"
          :class="activeTab === 'videos' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-800'"
          @click="activeTab = 'videos'"
        >
          视频素材
          <span v-if="activeTab === 'videos'" class="absolute inset-0 bg-blue-50/50 rounded-t-lg -z-10"></span>
        </button>
        <button
          class="px-2 py-3 text-sm font-semibold transition-all border-b-2 -mb-px relative"
          :class="activeTab === 'images' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-800'"
          @click="activeTab = 'images'"
        >
          图片素材
          <span v-if="activeTab === 'images'" class="absolute inset-0 bg-blue-50/50 rounded-t-lg -z-10"></span>
        </button>
        <button
          class="px-2 py-3 text-sm font-semibold transition-all border-b-2 -mb-px relative"
          :class="activeTab === 'audios' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-800'"
          @click="activeTab = 'audios'"
        >
          音频素材
          <span v-if="activeTab === 'audios'" class="absolute inset-0 bg-blue-50/50 rounded-t-lg -z-10"></span>
        </button>
        <button
          class="px-2 py-3 text-sm font-semibold transition-all border-b-2 -mb-px relative"
          :class="activeTab === 'subtitles' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-800'"
          @click="activeTab = 'subtitles'"
        >
          字幕素材
          <span v-if="activeTab === 'subtitles'" class="absolute inset-0 bg-blue-50/50 rounded-t-lg -z-10"></span>
        </button>
      </div>

      <!-- 视频素材 -->
      <div v-if="activeTab === 'videos'">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div v-for="video in store.currentProject?.assets.videos || []" :key="video.id" class="bg-white border border-gray-200/80 rounded-xl p-4 transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 relative group">
            <div class="h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 mb-4 relative overflow-hidden group-hover:bg-gray-200 transition-colors cursor-pointer" @click="previewVideo(video)">
              <span class="text-4xl transition-transform duration-300 group-hover:scale-110">🎥</span>
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
            </div>
            <div>
              <h4 class="text-base text-gray-900 mb-1.5 font-bold truncate">{{ video.name }}</h4>
              <p class="text-xs text-gray-500 truncate mb-1" :title="video.url">{{ video.url || '未设置路径' }}</p>
              <p v-if="video.duration" class="text-xs font-medium text-gray-600 bg-gray-100 inline-block px-2 py-0.5 rounded-md">时长: {{ video.duration }}s</p>
            </div>
            <div class="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-white/90 backdrop-blur rounded-lg shadow-sm transition-all text-sm" @click="editVideo(video)" title="编辑">✎</button>
              <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-white/90 backdrop-blur rounded-lg shadow-sm transition-all text-sm" title="删除" @click="requestDeleteAsset('video', video.id, video.name)">🗑</button>
            </div>
          </div>
          <div v-if="!store.currentProject?.assets?.videos?.length" class="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white border border-gray-200 border-dashed rounded-xl">
            <span class="text-5xl mb-4 opacity-50">🎥</span>
            <p class="text-base">暂无视频素材，点击右上角按钮添加</p>
          </div>
        </div>
      </div>

      <!-- 图片素材 -->
      <div v-if="activeTab === 'images'">
        <div class="mb-6 flex gap-2 bg-white p-1.5 rounded-lg border border-gray-200/80 shadow-sm">
          <button
            v-for="opt in imageFilterOptions"
            :key="opt.value"
            class="px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200"
            :class="imageFilter === opt.value ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
            @click="imageFilter = opt.value"
          >{{ opt.label }}</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div v-for="img in filteredImages" :key="img.id" class="bg-white border border-gray-200/80 rounded-xl p-4 transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 relative group">
            <div class="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 mb-4 overflow-hidden relative cursor-zoom-in" @click="previewImage(img)">
              <img v-if="img.url" :src="store.getAssetUrl(img.url)" alt="preview" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <span v-else class="text-4xl transition-transform duration-300 group-hover:scale-110">🖼</span>
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
            </div>
            <div>
              <h4 class="text-base text-gray-900 mb-2 font-bold truncate">{{ img.name }}</h4>
              <span class="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-200">{{ categoryLabel(img.category) }}</span>
            </div>
            <div class="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-white/90 backdrop-blur rounded-lg shadow-sm transition-all text-sm" @click="editImage(img)" title="编辑">✎</button>
              <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-white/90 backdrop-blur rounded-lg shadow-sm transition-all text-sm" title="删除" @click="requestDeleteAsset('image', img.id, img.name)">🗑</button>
            </div>
          </div>
          <div v-if="filteredImages.length === 0" class="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white border border-gray-200 border-dashed rounded-xl">
            <span class="text-5xl mb-4 opacity-50">🖼</span>
            <p class="text-base">暂无图片素材，点击右上角按钮添加</p>
          </div>
        </div>
      </div>

      <!-- 音频素材 -->
      <div v-if="activeTab === 'audios'">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div v-for="audio in store.currentProject?.assets.audios || []" :key="audio.id" class="bg-white border border-gray-200/80 rounded-xl p-4 transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 relative group">
            <div class="h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 mb-4 relative overflow-hidden group-hover:bg-gray-200 transition-colors">
              <span class="text-4xl transition-transform duration-300 group-hover:scale-110">🎵</span>
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
            </div>
            <div>
              <h4 class="text-base text-gray-900 mb-1.5 font-bold truncate">{{ audio.name }}</h4>
              <p class="text-xs text-gray-500 truncate mb-1" :title="audio.url">{{ audio.url || '未设置路径' }}</p>
              <p v-if="audio.duration" class="text-xs font-medium text-gray-600 bg-gray-100 inline-block px-2 py-0.5 rounded-md">时长: {{ audio.duration }}s</p>
            </div>
            <div class="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-white/90 backdrop-blur rounded-lg shadow-sm transition-all text-sm" @click="editAudio(audio)" title="编辑">✎</button>
              <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-white/90 backdrop-blur rounded-lg shadow-sm transition-all text-sm" title="删除" @click="requestDeleteAsset('audio', audio.id, audio.name)">🗑</button>
            </div>
          </div>
          <div v-if="!store.currentProject?.assets?.audios?.length" class="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white border border-gray-200 border-dashed rounded-xl">
            <span class="text-5xl mb-4 opacity-50">🎵</span>
            <p class="text-base">暂无音频素材，点击右上角按钮添加</p>
          </div>
        </div>
      </div>

      <!-- 字幕素材 -->
      <div v-if="activeTab === 'subtitles'">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div v-for="subtitle in store.currentProject?.assets.subtitles || []" :key="subtitle.id" class="bg-white border border-gray-200/80 rounded-xl p-4 transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 relative group">
            <div class="h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 mb-4 relative overflow-hidden group-hover:bg-gray-200 transition-colors">
              <span class="text-4xl transition-transform duration-300 group-hover:scale-110">💬</span>
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
            </div>
            <div>
              <h4 class="text-base text-gray-900 mb-1.5 font-bold truncate">{{ subtitle.name }}</h4>
              <p class="text-xs text-gray-500 truncate mb-1" :title="subtitle.url">{{ subtitle.url || '未设置路径' }}</p>
            </div>
            <div class="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-white/90 backdrop-blur rounded-lg shadow-sm transition-all text-sm" @click="editSubtitle(subtitle)" title="编辑">✎</button>
              <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-white/90 backdrop-blur rounded-lg shadow-sm transition-all text-sm" title="删除" @click="requestDeleteAsset('subtitle', subtitle.id, subtitle.name)">🗑</button>
            </div>
          </div>
          <div v-if="!store.currentProject?.assets?.subtitles?.length" class="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white border border-gray-200 border-dashed rounded-xl">
            <span class="text-5xl mb-4 opacity-50">💬</span>
            <p class="text-base">暂无字幕素材，点击右上角按钮添加</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加视频对话框 -->
    <CommonUiDialog v-model="showVideoDialog" :title="isEditingVideo ? '编辑视频' : '添加视频'" width="480px">
      <div class="space-y-5">
        <div class="flex gap-2 bg-gray-100/80 rounded-lg p-1">
          <button
            class="flex-1 px-3 py-1.5 text-sm rounded-md transition"
            :class="videoDialogTab === 'manual' ? 'bg-white text-blue-700 font-medium shadow-sm' : 'text-gray-600 hover:text-gray-900'"
            @click="videoDialogTab = 'manual'"
          >手动上传</button>
          <button
            class="flex-1 px-3 py-1.5 text-sm rounded-md transition"
            :class="videoDialogTab === 'ai' ? 'bg-white text-blue-700 font-medium shadow-sm' : 'text-gray-600 hover:text-gray-900'"
            @click="videoDialogTab = 'ai'"
          >AI 生成</button>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">视频名称</label>
          <input v-model="videoForm.name" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" placeholder="请输入视频名称" />
        </div>

        <!-- 手动上传面板 -->
        <template v-if="videoDialogTab === 'manual'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">视频文件</label>
            <div class="flex gap-2">
              <input v-model="videoForm.url" class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-500" placeholder="请选择视频文件" readonly />
              <button type="button" class="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50" @click="selectVideoFile">选择</button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">时长(秒)</label>
            <input v-model.number="videoForm.duration" type="number" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </template>

        <!-- AI 生成面板 -->
        <template v-else>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">AI 生视频提示词</label>
            <textarea
              v-model="videoAiPrompt"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入提示词，例如：电影感镜头，雨夜街道，人物缓慢回头"
            />
          </div>
          <div class="space-y-2">
            <label class="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
              <input v-model="useFirstFrameImageByAi" type="checkbox" class="accent-blue-500" />
              使用首帧图片生成（图生视频）
            </label>
            <select
              v-if="useFirstFrameImageByAi"
              v-model="selectedFirstFrameImageId"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">请选择首帧图片</option>
              <option v-for="img in availableFirstFrameImages" :key="img.id" :value="img.id">{{ img.name }}</option>
            </select>
            <label class="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
              <input v-model="useLastFrameImageByAi" type="checkbox" class="accent-blue-500" />
              使用尾帧图片约束镜头收束
            </label>
            <select
              v-if="useLastFrameImageByAi"
              v-model="selectedLastFrameImageId"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">请选择尾帧图片</option>
              <option v-for="img in availableFirstFrameImages" :key="`last-${img.id}`" :value="img.id">{{ img.name }}</option>
            </select>
          </div>
          <div class="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-700 leading-5">
            生成完成后会自动回填视频地址并切到「手动上传」面板，确认名称后点击「确定」保存。
          </div>
          <div class="flex justify-end">
            <button
              type="button"
              class="px-3 py-2 text-sm border border-blue-200 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition disabled:opacity-60"
              :disabled="isGeneratingVideoByAi"
              @click="generateVideoByAi"
            >
              {{ isGeneratingVideoByAi ? '生成中...' : 'AI 生视频并回填' }}
            </button>
          </div>
        </template>
      </div>
      <template #footer>
        <button class="px-4 py-1.5 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition" @click="showVideoDialog = false">取消</button>
        <button class="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition" @click="saveVideo">确定</button>
      </template>
    </CommonUiDialog>

    <!-- 添加图片对话框 -->
    <CommonUiDialog v-model="showImageDialog" :title="isEditingImage ? '编辑图片' : '添加图片'" width="480px">
      <div class="space-y-4">
        <div class="flex gap-2 bg-gray-100/80 rounded-lg p-1">
          <button
            class="flex-1 px-3 py-1.5 text-sm rounded-md transition"
            :class="imageDialogTab === 'manual' ? 'bg-white text-blue-700 font-medium shadow-sm' : 'text-gray-600 hover:text-gray-900'"
            @click="imageDialogTab = 'manual'"
          >手动上传</button>
          <button
            class="flex-1 px-3 py-1.5 text-sm rounded-md transition"
            :class="imageDialogTab === 'ai' ? 'bg-white text-blue-700 font-medium shadow-sm' : 'text-gray-600 hover:text-gray-900'"
            @click="imageDialogTab = 'ai'"
          >AI 生成</button>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">图片名称</label>
          <input v-model="imageForm.name" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="请输入图片名称" />
        </div>

        <!-- 手动上传面板 -->
        <template v-if="imageDialogTab === 'manual'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">图片文件</label>
            <div class="flex gap-2">
              <input v-model="imageForm.url" class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-500" placeholder="请选择图片文件" readonly />
              <button type="button" class="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50" @click="selectImageFile">选择</button>
            </div>
            <div v-if="imageForm.url" class="mt-3 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
              <img :src="store.getAssetUrl(imageForm.url)" :alt="imageForm.name || '预览'" class="w-full max-h-64 object-contain bg-white" />
            </div>
          </div>
        </template>

        <!-- AI 生成面板 -->
        <template v-else>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">AI 生图提示词</label>
            <textarea
              v-model="imageAiPrompt"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入提示词，例如：赛博朋克城市夜景，霓虹灯，电影感构图"
            />
          </div>

          <!-- 参考图（可选） -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-sm font-medium text-gray-700">参考图（可选）</label>
              <div class="flex gap-1.5">
                <button type="button" class="px-2.5 py-1 text-xs border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition" @click="openReferenceImagePicker">从素材库选</button>
                <button type="button" class="px-2.5 py-1 text-xs border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition" @click="selectReferenceImageFile">本地上传</button>
              </div>
            </div>
            <div v-if="referenceImageUrl" class="relative rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
              <img :src="referenceImageUrl" alt="参考图" class="w-full max-h-48 object-contain bg-white" />
              <button type="button" class="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white text-xs hover:bg-black/70 transition" @click="clearReferenceImage">✕</button>
            </div>
            <p v-else class="text-xs text-gray-400 leading-5 py-2">不选则纯文生图。可从素材库选择或本地上传一张图作为参考。</p>
          </div>

          <div class="flex justify-end">
            <button
              type="button"
              class="px-3 py-2 text-sm border border-blue-200 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition disabled:opacity-60"
              :disabled="isGeneratingImageByAi"
              @click="generateImageByAi"
            >
              {{ isGeneratingImageByAi ? '生成中...' : '生成图片' }}
            </button>
          </div>

          <!-- 生成结果预览（停留在当前 tab） -->
          <div v-if="imageForm.url" class="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
            <img :src="store.getAssetUrl(imageForm.url)" :alt="imageForm.name || '生成结果'" class="w-full max-h-64 object-contain bg-white" />
          </div>
        </template>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">图片类型</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" v-model="imageForm.category" value="character" class="accent-blue-500" /> 角色</label>
            <label class="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" v-model="imageForm.category" value="ui" class="accent-blue-500" /> UI</label>
            <label class="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" v-model="imageForm.category" value="icon" class="accent-blue-500" /> 图标</label>
            <label class="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" v-model="imageForm.category" value="scene" class="accent-blue-500" /> 场景</label>
            <label class="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" v-model="imageForm.category" value="storyboard" class="accent-blue-500" /> 分镜</label>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-1.5 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition" @click="showImageDialog = false">取消</button>
        <button class="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition" @click="saveImage">确定</button>
      </template>
    </CommonUiDialog>

    <CommonUiDialog v-model="showAudioDialog" :title="isEditingAudio ? '编辑音频' : '添加音频'" width="450px">
      <div class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">音频名称</label>
          <input v-model="audioForm.name" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" placeholder="请输入音频名称" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">音频文件</label>
          <div class="flex gap-2">
            <input v-model="audioForm.url" class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-500" placeholder="请选择音频文件" readonly />
            <button type="button" class="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50" @click="selectAudioFile">选择</button>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">时长(秒)</label>
          <input v-model.number="audioForm.duration" type="number" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-1.5 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition" @click="showAudioDialog = false">取消</button>
        <button class="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition" @click="saveAudio">确定</button>
      </template>
    </CommonUiDialog>

    <CommonUiDialog v-model="showSubtitleDialog" :title="isEditingSubtitle ? '编辑字幕' : '添加字幕'" width="450px">
      <div class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">字幕名称</label>
          <input v-model="subtitleForm.name" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" placeholder="请输入字幕名称" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">字幕文件</label>
          <div class="flex gap-2">
            <input v-model="subtitleForm.url" class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-500" placeholder="请选择字幕文件" readonly />
            <button type="button" class="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50" @click="selectSubtitleFile">选择</button>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-1.5 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition" @click="showSubtitleDialog = false">取消</button>
        <button class="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition" @click="saveSubtitle">确定</button>
      </template>
    </CommonUiDialog>

    <CommonDangerConfirmDialog
      v-model="showDeleteDialog"
      :title="`删除${assetTypeLabel(pendingDeleteType)}`"
      :message="`确定删除${assetTypeLabel(pendingDeleteType)}“${pendingDeleteName || '未命名素材'}”吗？`"
      confirm-text="删除"
      @confirm="confirmDeleteAsset"
      @update:model-value="onDeleteDialogChange"
    />

    <CommonUiDialog v-model="showImagePreviewDialog" :title="previewImageName || '图片预览'" width="820px">
      <div class="w-full h-[60vh] bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center">
        <img
          v-if="previewImageUrl"
          :src="previewImageUrl"
          :alt="previewImageName || 'preview-image'"
          class="max-w-full max-h-full object-contain"
        />
      </div>
    </CommonUiDialog>

    <CommonUiAssetPickerDialog
      v-model="showReferenceImagePicker"
      title="选择参考图"
      asset-type="image"
      :assets="availableReferenceImages"
      :selected-id="selectedReferenceImageId"
      allow-none
      none-label="不使用参考图"
      @select="onPickReferenceImage"
    />

    <CommonUiDialog v-model="showVideoPreviewDialog" :title="previewVideoName || '视频预览'" width="900px">
      <div class="w-full h-[60vh] bg-black rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center">
        <video
          v-if="previewVideoUrl"
          :src="previewVideoUrl"
          controls
          class="max-w-full max-h-full"
        />
      </div>
    </CommonUiDialog>
  </div>
</template>

<script setup lang="ts">
import type { VideoAsset, ImageAsset, AudioAsset, SubtitleAsset, ImageCategory, ProjectAiTokenProvider } from '~/types'
import { useProjectStore } from '~/stores/project'
import { useToast } from '~/composables/useToast'
import { useAiAppSettings } from '~/composables/useAiAppSettings'
import { createId, now } from '~/utils/factory'
import { isTauriRuntime } from '~/utils/runtime'
import { generateSeedreamImage } from '~/utils/seedream'
import { generateSeedanceVideo } from '~/utils/seedance'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { readFile } from '@tauri-apps/plugin-fs'

definePageMeta({ layout: 'editor' })

const store = useProjectStore()
const route = useRoute()
const toast = useToast()
const { getToken } = useAiAppSettings()

const activeTab = ref('videos')
const imageFilter = ref('all')
const imageFilterOptions = [
  { value: 'all', label: '全部' },
  { value: 'character', label: '角色' },
  { value: 'ui', label: 'UI' },
  { value: 'icon', label: '图标' },
  { value: 'scene', label: '场景' },
  { value: 'storyboard', label: '分镜' },
]

const showVideoDialog = ref(false)
const showImageDialog = ref(false)
const showAudioDialog = ref(false)
const showSubtitleDialog = ref(false)
const showDeleteDialog = ref(false)
const showImagePreviewDialog = ref(false)
const showVideoPreviewDialog = ref(false)
const videoDialogTab = ref<'manual' | 'ai'>('manual')
const imageDialogTab = ref<'manual' | 'ai'>('manual')
const isEditingVideo = ref(false)
const isEditingImage = ref(false)
const isEditingAudio = ref(false)
const isEditingSubtitle = ref(false)
const editingVideoId = ref<string | null>(null)
const editingImageId = ref<string | null>(null)
const editingAudioId = ref<string | null>(null)
const editingSubtitleId = ref<string | null>(null)
const pendingDeleteType = ref<'video' | 'image' | 'audio' | 'subtitle'>('video')
const pendingDeleteId = ref<string | null>(null)
const pendingDeleteName = ref('')
const previewImageUrl = ref('')
const previewImageName = ref('')
const previewVideoUrl = ref('')
const previewVideoName = ref('')

const videoForm = reactive({ name: '', url: '', duration: 0 })
const imageForm = reactive({ name: '', url: '', category: 'character' as ImageCategory })
const audioForm = reactive({ name: '', url: '', duration: 0 })
const subtitleForm = reactive({ name: '', url: '' })
const videoAiPrompt = ref('')
const isGeneratingVideoByAi = ref(false)
const useFirstFrameImageByAi = ref(false)
const selectedFirstFrameImageId = ref('')
const useLastFrameImageByAi = ref(false)
const selectedLastFrameImageId = ref('')
const imageAiPrompt = ref('')
const isGeneratingImageByAi = ref(false)
const showReferenceImagePicker = ref(false)
const selectedReferenceImageId = ref<string | null>(null)
const referenceImageUrl = ref('')

function resolveSeedreamApiKey() {
  const providers: ProjectAiTokenProvider[] = []
  const currentTextProvider = store.currentProject?.aiConfig?.text?.provider
  providers.push('seedream')
  if (currentTextProvider) {
    providers.push(currentTextProvider)
  }
  providers.push('custom', 'zhipu', 'deepseek', 'kimi')

  const tried = new Set<ProjectAiTokenProvider>()
  for (const provider of providers) {
    if (tried.has(provider)) continue
    tried.add(provider)
    const token = getToken(provider).trim()
    if (token) return token
  }

  return ''
}

function resolveSeedanceApiKey() {
  const providers: ProjectAiTokenProvider[] = []
  const currentTextProvider = store.currentProject?.aiConfig?.text?.provider
  providers.push('seedance')
  if (currentTextProvider) {
    providers.push(currentTextProvider)
  }
  providers.push('custom', 'zhipu', 'deepseek', 'kimi')

  const tried = new Set<ProjectAiTokenProvider>()
  for (const provider of providers) {
    if (tried.has(provider)) continue
    tried.add(provider)
    const token = getToken(provider).trim()
    if (token) return token
  }

  return ''
}

function inferImageExtension(imageUrl: string, fallbackBase64?: string): 'png' | 'jpg' {
  const normalized = imageUrl.trim().toLowerCase()
  if (normalized.startsWith('data:image/jpeg') || normalized.startsWith('data:image/jpg')) {
    return 'jpg'
  }
  if (normalized.startsWith('data:image/png')) {
    return 'png'
  }

  if (fallbackBase64 && fallbackBase64.startsWith('/9j/')) {
    return 'jpg'
  }

  return 'png'
}

function sanitizeFilenamePart(value: string): string {
  const sanitized = value
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24)

  return sanitized || 'ai_image'
}

function createUniqueImageName(baseName: string): string {
  const name = baseName.trim() || 'AI图片'
  const existingNames = new Set((store.currentProject?.assets.images || []).map(item => item.name.trim()))
  if (!existingNames.has(name)) {
    return name
  }

  let index = 2
  while (existingNames.has(`${name}_${index}`)) {
    index += 1
  }

  return `${name}_${index}`
}

function createUniqueVideoName(baseName: string): string {
  const name = baseName.trim() || 'AI视频'
  const existingNames = new Set((store.currentProject?.assets.videos || []).map(item => item.name.trim()))
  if (!existingNames.has(name)) {
    return name
  }

  let index = 2
  while (existingNames.has(`${name}_${index}`)) {
    index += 1
  }

  return `${name}_${index}`
}

async function generateVideoByAi() {
  if (isGeneratingVideoByAi.value) return

  const prompt = videoAiPrompt.value.trim()
  if (!prompt) {
    toast.warning('请输入生视频提示词')
    return
  }

  const apiKey = resolveSeedanceApiKey()
  if (!apiKey) {
    toast.warning('请先在项目配置中填写可用的 API Token')
    return
  }

  isGeneratingVideoByAi.value = true
  try {
    let firstFrameImageUrl: string | undefined
    let lastFrameImageUrl: string | undefined
    if (useFirstFrameImageByAi.value) {
      if (!selectedFirstFrameImageId.value) {
        toast.warning('请先选择首帧图片')
        return
      }

      const firstFrameImage = availableFirstFrameImages.value.find(item => item.id === selectedFirstFrameImageId.value)
      if (!firstFrameImage) {
        toast.warning('未找到选中的首帧图片')
        return
      }

      firstFrameImageUrl = await toModelAccessibleImageUrl(firstFrameImage.url)
    }

    if (useLastFrameImageByAi.value) {
      if (!selectedLastFrameImageId.value) {
        toast.warning('请先选择尾帧图片')
        return
      }

      const lastFrameImage = availableFirstFrameImages.value.find(item => item.id === selectedLastFrameImageId.value)
      if (!lastFrameImage) {
        toast.warning('未找到选中的尾帧图片')
        return
      }

      lastFrameImageUrl = await toModelAccessibleImageUrl(lastFrameImage.url)
    }

    const configuredDuration = Number(videoForm.duration)
    const duration = Number.isFinite(configuredDuration) && configuredDuration > 0
      ? Math.floor(configuredDuration)
      : 5

    const result = await generateSeedanceVideo(
      {
        apiKey,
        baseURL: store.currentProject?.aiConfig?.video?.baseURL || undefined,
      },
      {
        prompt,
        model: store.currentProject?.aiConfig?.video?.model || undefined,
        firstFrameImageUrl,
        lastFrameImageUrl,
        duration,
      },
    )

    let finalVideoUrl = result.videoUrl
    if (isTauriRuntime()) {
      try {
        finalVideoUrl = await downloadGeneratedVideoToProject(result.videoUrl, prompt)
      } catch (downloadError: any) {
        toast.warning(downloadError?.message || '视频下载到项目失败，已保留在线链接')
      }
    }

    videoForm.url = finalVideoUrl
    if (!videoForm.name.trim()) {
      videoForm.name = createUniqueVideoName(`AI_${prompt.slice(0, 16)}`)
    }
    if (!videoForm.duration || videoForm.duration <= 0) {
      videoForm.duration = duration
    }
    videoDialogTab.value = 'manual'
    toast.success('生视频完成，已回填视频地址')
  } catch (error: any) {
    toast.error(error?.message || 'AI 生视频失败')
  } finally {
    isGeneratingVideoByAi.value = false
  }
}

function toBase64Payload(imageUrl: string, b64Json?: string): string {
  if (b64Json && b64Json.trim()) {
    return b64Json.trim()
  }

  const normalized = imageUrl.trim()
  const marker = 'base64,'
  const markerIndex = normalized.indexOf(marker)
  if (markerIndex >= 0) {
    return normalized.slice(markerIndex + marker.length).trim()
  }

  return normalized
}

function inferVideoExtension(videoUrl: string): string {
  try {
    const parsed = new URL(videoUrl)
    const pathname = parsed.pathname.toLowerCase()
    const match = pathname.match(/\.([a-z0-9]{2,5})$/)
    if (match?.[1]) {
      return match[1]
    }
  } catch {
  }

  const fallbackMatch = videoUrl.toLowerCase().match(/\.([a-z0-9]{2,5})(?:\?|#|$)/)
  return fallbackMatch?.[1] || 'mp4'
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function inferImageMimeTypeFromAssetUrl(assetUrl: string): string {
  const lower = assetUrl.toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.bmp')) return 'image/bmp'
  return 'image/png'
}

function isLikelyLocalHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    return host === '127.0.0.1' || host === 'localhost' || host === '::1'
  } catch {
    return false
  }
}

async function toModelAccessibleImageUrl(assetPathOrUrl: string): Promise<string> {
  const resolved = store.getAssetUrl(assetPathOrUrl)
  if (resolved.startsWith('data:')) {
    return resolved
  }

  if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    if (!isLikelyLocalHttpUrl(resolved)) {
      return resolved
    }
  }

  if (!isTauriRuntime()) {
    throw new Error('当前首尾帧图片为本地资源，浏览器环境无法转换为模型可访问地址')
  }

  const projectPath = store.currentProject?.path
  if (!projectPath) {
    throw new Error('项目路径不存在，无法读取首尾帧图片文件')
  }

  const normalizedAssetPath = assetPathOrUrl.replace(/^\/+/, '')
  const fullPath = `${projectPath}/assets/${normalizedAssetPath}`
  const bytes = await readFile(fullPath)
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const base64 = arrayBufferToBase64(buffer)
  const mimeType = inferImageMimeTypeFromAssetUrl(assetPathOrUrl)
  return `data:${mimeType};base64,${base64}`
}

async function downloadGeneratedVideoToProject(videoUrl: string, prompt: string): Promise<string> {
  const projectPath = store.currentProject?.path
  if (!projectPath || !isTauriRuntime()) {
    return videoUrl
  }

  const response = await tauriFetch(videoUrl, { method: 'GET' })
  if (!response.ok) {
    throw new Error('下载生成视频失败')
  }

  const videoBuffer = await response.arrayBuffer()
  if (!videoBuffer.byteLength) {
    throw new Error('下载的视频内容为空')
  }

  const ext = inferVideoExtension(videoUrl)
  const safePrompt = sanitizeFilenamePart(prompt)
  const filename = `ai_video_${safePrompt}_${Date.now()}.${ext}`
  const { invoke } = await import('@tauri-apps/api/core')
  return await invoke<string>('save_base64_asset', {
    projectPath,
    base64Data: arrayBufferToBase64(videoBuffer),
    filename,
  })
}

async function generateImageByAi() {
  if (isGeneratingImageByAi.value) return

  const prompt = imageAiPrompt.value.trim()
  if (!prompt) {
    toast.warning('请输入生图提示词')
    return
  }

  const apiKey = resolveSeedreamApiKey()
  if (!apiKey) {
    toast.warning('请先在项目配置中填写可用的 API Token')
    return
  }

  isGeneratingImageByAi.value = true
  try {
    let referenceImage: string | undefined
    if (referenceImageUrl.value.trim()) {
      try {
        // 本地素材文件会被解析为 data URL，网络图片保持原样
        referenceImage = await toModelAccessibleImageUrl(referenceImageUrl.value.trim())
      } catch (e: any) {
        toast.warning(e?.message || '参考图无法被模型访问，已改为纯文生图')
        referenceImage = undefined
      }
    }

    const result = await generateSeedreamImage(
      {
        apiKey,
        baseURL: store.currentProject?.aiConfig?.image?.baseURL || undefined,
      },
      {
        prompt,
        image: referenceImage,
        model: store.currentProject?.aiConfig?.image?.model || undefined,
      },
    )

    const firstImage = result.images[0]
    if (!firstImage) {
      toast.warning('模型未返回图片')
      return
    }

    let imageUrl = firstImage.url || ''
    if (!imageUrl && firstImage.b64Json) {
      imageUrl = `data:image/png;base64,${firstImage.b64Json}`
    }

    if (!imageUrl) {
      toast.warning('模型返回结果不可用')
      return
    }

    let finalImageUrl = imageUrl
    if (isTauriRuntime()) {
      const projectPath = store.currentProject?.path
      if (projectPath) {
        const base64Payload = toBase64Payload(imageUrl, firstImage.b64Json)
        const ext = inferImageExtension(imageUrl, firstImage.b64Json)
        const safePrompt = sanitizeFilenamePart(prompt)
        const filename = `ai_${safePrompt}_${Date.now()}.${ext}`
        const { invoke } = await import('@tauri-apps/api/core')
        const savedFilename = await invoke<string>('save_base64_asset', {
          projectPath,
          base64Data: base64Payload,
          filename,
        })
        finalImageUrl = savedFilename
      }
    }

    imageForm.url = finalImageUrl
    if (!imageForm.name.trim()) {
      imageForm.name = createUniqueImageName(`AI_${prompt.slice(0, 16)}`)
    }
    toast.success('图片生成完成')
  } catch (error: any) {
    toast.error(error?.message || 'AI 生图失败')
  } finally {
    isGeneratingImageByAi.value = false
  }
}

async function selectVideoFile() {
  if (isTauriRuntime()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Video', extensions: ['mp4', 'webm', 'ogg'] }]
      })
      if (selected) {
        const sourcePath = selected as string
        const filename = sourcePath.split(/[/\\]/).pop() || `video_${Date.now()}.mp4`
        const { invoke } = await import('@tauri-apps/api/core')
        try {
          const savedFilename = await invoke<string>('copy_asset', {
            projectPath: store.currentProject?.path,
            sourcePath,
            filename
          })
          videoForm.url = savedFilename
          if (!videoForm.name) {
            videoForm.name = filename.split('.')[0] || filename
          }
        } catch (e: any) {
          toast.error('复制文件失败: ' + e.message)
        }
      }
    } catch (e: any) {
      toast.error(e?.message || '文件选择失败，请检查 Tauri 插件配置')
    }
  } else {
    toast.error('浏览器环境不支持选择本地文件')
  }
}

async function selectImageFile() {
  if (isTauriRuntime()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
      })
      if (selected) {
        const sourcePath = selected as string
        const filename = sourcePath.split(/[/\\]/).pop() || `image_${Date.now()}.png`
        const { invoke } = await import('@tauri-apps/api/core')
        try {
          const savedFilename = await invoke<string>('copy_asset', {
            projectPath: store.currentProject?.path,
            sourcePath,
            filename
          })
          imageForm.url = savedFilename
          if (!imageForm.name) {
            imageForm.name = filename.split('.')[0] || filename
          }
        } catch (e: any) {
          toast.error('复制文件失败: ' + e.message)
        }
      }
    } catch (e: any) {
      toast.error(e?.message || '文件选择失败，请检查 Tauri 插件配置')
    }
  } else {
    toast.error('浏览器环境不支持选择本地文件')
  }
}

// ===== AI 生图：参考图选择 =====
function openReferenceImagePicker() {
  if (!availableReferenceImages.value.length) {
    toast.warning('素材库中暂无图片，可先用本地上传选择参考图')
    return
  }
  showReferenceImagePicker.value = true
}

function onPickReferenceImage(id: string | null) {
  if (!id) {
    clearReferenceImage()
    showReferenceImagePicker.value = false
    return
  }
  const img = availableReferenceImages.value.find(item => item.id === id)
  if (img) {
    selectedReferenceImageId.value = id
    referenceImageUrl.value = img.url
  }
  showReferenceImagePicker.value = false
}

function clearReferenceImage() {
  selectedReferenceImageId.value = null
  referenceImageUrl.value = ''
}

async function selectReferenceImageFile() {
  if (isTauriRuntime()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
      })
      if (selected) {
        const sourcePath = selected as string
        const bytes = await readFile(sourcePath)
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
        const base64 = arrayBufferToBase64(buffer)
        const mimeType = inferImageMimeTypeFromAssetUrl(sourcePath)
        const dataUrl = `data:${mimeType};base64,${base64}`
        selectedReferenceImageId.value = null
        referenceImageUrl.value = dataUrl
      }
    } catch (e: any) {
      toast.error(e?.message || '参考图读取失败')
    }
  } else {
    toast.error('浏览器环境不支持选择本地文件')
  }
}

async function selectAudioFile() {
  if (isTauriRuntime()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'] }]
      })
      if (selected) {
        const sourcePath = selected as string
        const filename = sourcePath.split(/[/\\]/).pop() || `audio_${Date.now()}.mp3`
        const { invoke } = await import('@tauri-apps/api/core')
        try {
          const savedFilename = await invoke<string>('copy_asset', {
            projectPath: store.currentProject?.path,
            sourcePath,
            filename
          })
          audioForm.url = savedFilename
          if (!audioForm.name) {
            audioForm.name = filename.split('.')[0] || filename
          }
        } catch (e: any) {
          toast.error('复制文件失败: ' + e.message)
        }
      }
    } catch (e: any) {
      toast.error(e?.message || '文件选择失败，请检查 Tauri 插件配置')
    }
  } else {
    toast.error('浏览器环境不支持选择本地文件')
  }
}

async function selectSubtitleFile() {
  if (isTauriRuntime()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Subtitle', extensions: ['srt', 'vtt', 'ass', 'ssa'] }]
      })
      if (selected) {
        const sourcePath = selected as string
        const filename = sourcePath.split(/[/\\]/).pop() || `subtitle_${Date.now()}.srt`
        const { invoke } = await import('@tauri-apps/api/core')
        try {
          const savedFilename = await invoke<string>('copy_asset', {
            projectPath: store.currentProject?.path,
            sourcePath,
            filename
          })
          subtitleForm.url = savedFilename
          if (!subtitleForm.name) {
            subtitleForm.name = filename.split('.')[0] || filename
          }
        } catch (e: any) {
          toast.error('复制文件失败: ' + e.message)
        }
      }
    } catch (e: any) {
      toast.error(e?.message || '文件选择失败，请检查 Tauri 插件配置')
    }
  } else {
    toast.error('浏览器环境不支持选择本地文件')
  }
}

onMounted(async () => {
  const projectId = route.params.id as string
  if (!store.currentProject || store.currentProject.id !== projectId) {
    await store.openProject(projectId)
  }
})

const filteredImages = computed(() => {
  const images = store.currentProject?.assets.images || []
  if (imageFilter.value === 'all') return images
  return images.filter(i => i.category === imageFilter.value)
})

const availableFirstFrameImages = computed(() => {
  return store.currentProject?.assets.images || []
})

// AI 生图参考图候选：素材库中的所有图片（本地文件会在生图时转为 data URL 供模型访问）
const availableReferenceImages = computed(() => {
  return (store.currentProject?.assets.images || []).filter(img => !!img.url)
})

function categoryLabel(cat: ImageCategory) {
  const labels: Record<ImageCategory, string> = {
    character: '角色',
    ui: 'UI',
    icon: '图标',
    scene: '场景',
    storyboard: '分镜',
  }
  return labels[cat] || cat
}

function assetTypeLabel(type: 'video' | 'image' | 'audio' | 'subtitle') {
  const labels = {
    video: '视频',
    image: '图片',
    audio: '音频',
    subtitle: '字幕',
  }
  return labels[type]
}

function editVideo(video: VideoAsset) {
  isEditingVideo.value = true
  editingVideoId.value = video.id
  videoForm.name = video.name
  videoForm.url = video.url
  videoForm.duration = video.duration || 0
  videoDialogTab.value = 'manual'
  showVideoDialog.value = true
}

async function saveVideo() {
  if (!videoForm.name.trim()) {
    toast.warning('请输入视频名称')
    return
  }
  if (isEditingVideo.value && editingVideoId.value) {
    const videos = store.currentProject?.assets.videos || []
    const v = videos.find(v => v.id === editingVideoId.value)
    if (v) Object.assign(v, { ...videoForm, updatedAt: now() })
  } else {
    const timestamp = now()
    store.addVideoAsset({
      id: createId(),
      name: videoForm.name,
      url: videoForm.url,
      duration: videoForm.duration,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }
  try {
    await store.saveProject()
    showVideoDialog.value = false
    resetVideoForm()
  } catch (error: any) {
    toast.error(error?.message || '自动保存失败')
  }
}

function editImage(img: ImageAsset) {
  isEditingImage.value = true
  editingImageId.value = img.id
  imageForm.name = img.name
  imageForm.url = img.url
  imageForm.category = img.category
  imageDialogTab.value = 'manual'
  showImageDialog.value = true
}

function previewImage(img: ImageAsset) {
  if (!img.url) {
    toast.warning('该图片暂无可预览地址')
    return
  }

  previewImageUrl.value = store.getAssetUrl(img.url)
  previewImageName.value = img.name
  showImagePreviewDialog.value = true
}

function previewVideo(video: VideoAsset) {
  if (!video.url) {
    toast.warning('该视频暂无可预览地址')
    return
  }

  previewVideoUrl.value = store.getAssetUrl(video.url)
  previewVideoName.value = video.name
  showVideoPreviewDialog.value = true
}

function editAudio(audio: AudioAsset) {
  isEditingAudio.value = true
  editingAudioId.value = audio.id
  audioForm.name = audio.name
  audioForm.url = audio.url
  audioForm.duration = audio.duration || 0
  showAudioDialog.value = true
}

function editSubtitle(subtitle: SubtitleAsset) {
  isEditingSubtitle.value = true
  editingSubtitleId.value = subtitle.id
  subtitleForm.name = subtitle.name
  subtitleForm.url = subtitle.url
  showSubtitleDialog.value = true
}

function requestDeleteAsset(type: 'video' | 'image' | 'audio' | 'subtitle', id: string, name: string) {
  pendingDeleteType.value = type
  pendingDeleteId.value = id
  pendingDeleteName.value = name
  showDeleteDialog.value = true
}

function onDeleteDialogChange(value: boolean) {
  if (!value) {
    cancelDeleteAsset()
  }
}

function cancelDeleteAsset() {
  showDeleteDialog.value = false
  pendingDeleteId.value = null
  pendingDeleteName.value = ''
}

function confirmDeleteAsset() {
  if (!pendingDeleteId.value) return
  if (pendingDeleteType.value === 'video') {
    store.removeVideoAsset(pendingDeleteId.value)
    toast.success('视频已删除')
  } else if (pendingDeleteType.value === 'image') {
    store.removeImageAsset(pendingDeleteId.value)
    toast.success('图片已删除')
  } else if (pendingDeleteType.value === 'audio') {
    store.removeAudioAsset(pendingDeleteId.value)
    toast.success('音频已删除')
  } else {
    store.removeSubtitleAsset(pendingDeleteId.value)
    toast.success('字幕已删除')
  }
  cancelDeleteAsset()
}

async function saveImage() {
  if (!imageForm.name.trim()) {
    toast.warning('请输入图片名称')
    return
  }
  if (isEditingImage.value && editingImageId.value) {
    const images = store.currentProject?.assets.images || []
    const i = images.find(i => i.id === editingImageId.value)
    if (i) Object.assign(i, { ...imageForm, updatedAt: now() })
  } else {
    const timestamp = now()
    store.addImageAsset({
      id: createId(),
      name: imageForm.name,
      url: imageForm.url,
      category: imageForm.category,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }
  try {
    await store.saveProject()
    showImageDialog.value = false
    resetImageForm()
  } catch (error: any) {
    toast.error(error?.message || '自动保存失败')
  }
}

async function saveAudio() {
  if (!audioForm.name.trim()) {
    toast.warning('请输入音频名称')
    return
  }
  if (isEditingAudio.value && editingAudioId.value) {
    const audios = store.currentProject?.assets.audios || []
    const a = audios.find(a => a.id === editingAudioId.value)
    if (a) Object.assign(a, { ...audioForm, updatedAt: now() })
  } else {
    const timestamp = now()
    store.addAudioAsset({
      id: createId(),
      name: audioForm.name,
      url: audioForm.url,
      duration: audioForm.duration,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }
  try {
    await store.saveProject()
    showAudioDialog.value = false
    resetAudioForm()
  } catch (error: any) {
    toast.error(error?.message || '自动保存失败')
  }
}

async function saveSubtitle() {
  if (!subtitleForm.name.trim()) {
    toast.warning('请输入字幕名称')
    return
  }
  if (isEditingSubtitle.value && editingSubtitleId.value) {
    const subtitles = store.currentProject?.assets.subtitles || []
    const s = subtitles.find(s => s.id === editingSubtitleId.value)
    if (s) Object.assign(s, { ...subtitleForm, updatedAt: now() })
  } else {
    const timestamp = now()
    store.addSubtitleAsset({
      id: createId(),
      name: subtitleForm.name,
      url: subtitleForm.url,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }
  try {
    await store.saveProject()
    showSubtitleDialog.value = false
    resetSubtitleForm()
  } catch (error: any) {
    toast.error(error?.message || '自动保存失败')
  }
}

function resetVideoForm() {
  isEditingVideo.value = false
  editingVideoId.value = null
  videoForm.name = ''
  videoForm.url = ''
  videoForm.duration = 0
  videoAiPrompt.value = ''
  useFirstFrameImageByAi.value = false
  selectedFirstFrameImageId.value = ''
  useLastFrameImageByAi.value = false
  selectedLastFrameImageId.value = ''
  videoDialogTab.value = 'manual'
}

function resetImageForm() {
  isEditingImage.value = false
  editingImageId.value = null
  imageForm.name = ''
  imageForm.url = ''
  imageForm.category = 'character'
  imageAiPrompt.value = ''
  showReferenceImagePicker.value = false
  selectedReferenceImageId.value = null
  referenceImageUrl.value = ''
  imageDialogTab.value = 'manual'
}

function resetAudioForm() {
  isEditingAudio.value = false
  editingAudioId.value = null
  audioForm.name = ''
  audioForm.url = ''
  audioForm.duration = 0
}

function resetSubtitleForm() {
  isEditingSubtitle.value = false
  editingSubtitleId.value = null
  subtitleForm.name = ''
  subtitleForm.url = ''
}
</script>
