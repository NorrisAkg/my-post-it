import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// Mock Capacitor Preferences
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined)
  }
}))

// Mock @vueuse/integrations/useIDBKeyval to use in-memory reactive ref
vi.mock('@vueuse/integrations/useIDBKeyval', () => {
  const { ref } = require('vue')
  return {
    useIDBKeyval: vi.fn((key: string, initialValue: any) => {
      const data = ref(initialValue)
      return {
        data,
        isFinished: ref(true),
        set: async (val: any) => { data.value = val }
      }
    })
  }
})

// Stubs for Nuxt components
config.global.stubs = {
  NuxtPwaManifest: true
}
