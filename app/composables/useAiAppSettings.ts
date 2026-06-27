import { useLocalStorage } from '@vueuse/core'
import type { ProjectAiTokenProvider } from '~/types'

type AiTokenMap = Record<ProjectAiTokenProvider, string>

function createDefaultTokenMap(): AiTokenMap {
  return {
    zhipu: '',
    kimi: '',
    ollama: '',
    custom: '',
    seedream: '',
    seedance: '',
  }
}

export function useAiAppSettings() {
  const tokens = useLocalStorage<AiTokenMap>('drama_ai_app_tokens', createDefaultTokenMap(), {
    mergeDefaults: true,
  })

  function getToken(provider: ProjectAiTokenProvider): string {
    return tokens.value[provider] || ''
  }

  function setToken(provider: ProjectAiTokenProvider, token: string) {
    tokens.value = {
      ...tokens.value,
      [provider]: token.trim(),
    }
  }

  return {
    tokens,
    getToken,
    setToken,
  }
}
