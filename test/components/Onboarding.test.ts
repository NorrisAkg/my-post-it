import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Onboarding from '~/components/Onboarding.vue'

describe('Onboarding.vue', () => {
  it('renders initial welcome slide', () => {
    const wrapper = mount(Onboarding)
    expect(wrapper.text()).toContain('Bienvenue')
    expect(wrapper.text()).toContain('Suivant')
  })

  it('advances through slides when clicking Suivant', async () => {
    const wrapper = mount(Onboarding)

    // Step 0 -> Step 1
    await wrapper.find('.next-btn').trigger('click')
    expect(wrapper.text()).toContain('Créer des post‑its')

    // Step 1 -> Step 2
    await wrapper.find('.next-btn').trigger('click')
    expect(wrapper.text()).toContain('Profitez‑en')
    expect(wrapper.find('.finish-btn').exists()).toBe(true)
  })

  it('emits finished event on final step button click', async () => {
    const wrapper = mount(Onboarding)

    await wrapper.find('.next-btn').trigger('click')
    await wrapper.find('.next-btn').trigger('click')

    await wrapper.find('.finish-btn').trigger('click')
    expect(wrapper.emitted('finished')).toBeTruthy()
  })
})
