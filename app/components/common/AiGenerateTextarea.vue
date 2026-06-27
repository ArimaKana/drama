<template>
  <div class="relative">
    <textarea
      v-model="textModel"
      :rows="rows"
      :placeholder="placeholder"
      class="block w-full p-2 pr-28 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all shadow-sm"
    />
    <button
      class="absolute right-2 bottom-2 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
      :disabled="disabled || aiBusy"
      @click="generateByAi"
    >
      {{ aiPhase === 'requesting' ? '生成中...' : aiPhase === 'streaming' ? '输出中...' : 'AI' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ProjectLlmProvider } from '~/types'
import { resolveProjectLlmRuntime, streamLlmModel } from '~/utils/ai'
import { useAiAppSettings } from '~/composables/useAiAppSettings'

const props = withDefaults(defineProps<{
  modelValue: string
  prompt: string
  rows?: number
  placeholder?: string
  promptRequiredMessage?: string
  generatedSuccessMessage?: string
  clearBeforeGenerate?: boolean
  disabled?: boolean
}>(), {
  rows: 3,
  placeholder: '',
  promptRequiredMessage: '请先完善关键信息',
  generatedSuccessMessage: '已生成文本',
  clearBeforeGenerate: true,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const store = useProjectStore()
const toast = useToast()
const { getToken } = useAiAppSettings()

const aiPhase = ref<'idle' | 'requesting' | 'streaming'>('idle')
const aiBusy = computed(() => aiPhase.value !== 'idle')

const textModel = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

async function generateByAi() {
  if (props.disabled || aiBusy.value) return

  const prompt = props.prompt.trim()
  if (!prompt) {
    toast.warning(props.promptRequiredMessage)
    return
  }

  const aiConfig = store.currentProject?.aiConfig?.text
  const provider = (aiConfig?.provider || 'zhipu') as ProjectLlmProvider
  const runtime = resolveProjectLlmRuntime(aiConfig, getToken(provider))
  if (!runtime.ok) {
    toast.warning(runtime.error)
    return
  }

  aiPhase.value = 'requesting'
  if (props.clearBeforeGenerate) {
    emit('update:modelValue', '')
  }

  try {
    const result = await streamLlmModel(
      runtime.clientOptions,
      {
        kind: 'llm',
        model: runtime.model,
        prompt,
      },
      {
        onChunk: (_, fullText) => {
          aiPhase.value = 'streaming'
          emit('update:modelValue', fullText)
        },
      },
    )

    if (!result.text.trim()) {
      toast.warning('模型未返回可用内容')
      return
    }

    toast.success(props.generatedSuccessMessage)
  } catch (error: any) {
    toast.error(error?.message || 'AI 生成失败')
  } finally {
    aiPhase.value = 'idle'
  }
}
</script>
