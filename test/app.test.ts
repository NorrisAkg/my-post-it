import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import App from '~/app.vue'
import { useTasksStore } from '~/stores/tasks'

describe('App.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mountApp = async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createTestingPinia({ stubActions: false })]
      }
    })
    await flushPromises()
    return wrapper
  }

  it('renders app title and empty state when no tasks exist', async () => {
    const wrapper = await mountApp()

    expect(wrapper.text()).toContain('Mes post-its')
    expect(wrapper.text()).toContain('Aucune tâche')
  })

  it('renders tasks and toggles completion when checkmark button is clicked', async () => {
    const wrapper = await mountApp()
    const store = useTasksStore()
    store.addTask('Acheter du café', 'Marque recommandee', 'butter')
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(wrapper.text()).toContain('Acheter du café')
    expect(wrapper.text()).toContain('Marque recommandee')

    // Find and click the toggle checkmark button
    const checkBtn = wrapper.find('button[aria-label="Terminer"]')
    expect(checkBtn.exists()).toBe(true)
    await checkBtn.trigger('click')

    expect(store.tasks[0].done).toBe(true)
  })

  it('opens add sheet when + FAB button is clicked', async () => {
    const wrapper = await mountApp()

    const fabBtn = wrapper.find('button[aria-label="Ajouter"]')
    await fabBtn.trigger('click')

    expect(wrapper.text()).toContain('Nouveau post-it')
  })

  it('adds a new task when form is filled and submitted via Enter key', async () => {
    const wrapper = await mountApp()
    const store = useTasksStore()

    // Open add sheet
    await wrapper.find('button[aria-label="Ajouter"]').trigger('click')

    // Fill title
    const input = wrapper.find('input[placeholder="Titre de la tâche"]')
    await input.setValue('Nouvelle tâche test')
    
    // Submit via Enter key
    await input.trigger('keydown.enter')

    expect(store.tasks.length).toBe(1)
    expect(store.tasks[0].title).toBe('Nouvelle tâche test')
  })

  it('edits an existing task', async () => {
    const wrapper = await mountApp()
    const store = useTasksStore()
    store.addTask('Titre initial', 'Note initiale', 'butter')
    await wrapper.vm.$nextTick()
    await flushPromises()

    // Open edit sheet
    ;(wrapper.vm as any).openEdit(store.tasks[0])
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Modifier')

    // Update fields
    const titleInput = wrapper.find('input[placeholder="Titre de la tâche"]')
    await titleInput.setValue('Titre modifié')
    
    const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Enregistrer')
    expect(saveBtn).toBeDefined()
    await saveBtn!.trigger('click')

    expect(store.tasks[0].title).toBe('Titre modifié')
  })

  it('deletes a task from edit sheet and allows undoing deletion', async () => {
    const wrapper = await mountApp()
    const store = useTasksStore()
    store.addTask('À supprimer', '', 'butter')
    await wrapper.vm.$nextTick()
    await flushPromises()

    // Open edit sheet
    ;(wrapper.vm as any).openEdit(store.tasks[0])
    await wrapper.vm.$nextTick()

    // Click delete button
    const deleteBtn = wrapper.find('button[aria-label="Supprimer"]')
    await deleteBtn.trigger('click')

    expect(store.tasks.length).toBe(0)
    expect(wrapper.text()).toContain('Post-it supprimé')

    // Click undo button
    const undoBtn = wrapper.findAll('button').find(b => b.text() === 'Annuler')
    expect(undoBtn).toBeDefined()
    await undoBtn!.trigger('click')

    expect(store.tasks.length).toBe(1)
    expect(store.tasks[0].title).toBe('À supprimer')
  })

  it('closes open sheet when Escape key is pressed', async () => {
    const wrapper = await mountApp()

    await wrapper.find('button[aria-label="Ajouter"]').trigger('click')
    expect(wrapper.text()).toContain('Nouveau post-it')

    // Press Escape globally
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    // Form sheet should close
    expect((wrapper.vm as any).sheetOpen).toBe(false)
  })

  it('filters tasks by project', async () => {
    const wrapper = await mountApp()
    const store = useTasksStore()

    const pId = store.addProject('Travail')
    store.addTask('Tâche boulot', '', 'sky', pId)
    store.addTask('Tâche perso', '', 'butter', null)
    await wrapper.vm.$nextTick()
    await flushPromises()

    // Switch filter to 'Travail' project chip
    const filterBtn = wrapper.findAll('button.tapfx').find(b => b.text() === 'Travail')
    expect(filterBtn).toBeDefined()
    await filterBtn!.trigger('click')

    expect(wrapper.text()).toContain('Tâche boulot')
    expect(wrapper.text()).not.toContain('Tâche perso')
  })

  it('opens menu drawer and clears completed tasks', async () => {
    const wrapper = await mountApp()
    const store = useTasksStore()
    store.addTask('Active', '', 'butter')
    store.addTask('Completed', '', 'butter')
    store.toggleDone(store.tasks[1].id)
    await wrapper.vm.$nextTick()
    await flushPromises()

    // Open menu drawer
    const menuBtn = wrapper.find('button[aria-label="Menu"]')
    await menuBtn.trigger('click')
    expect((wrapper.vm as any).menuOpen).toBe(true)

    // Click clear completed button
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('Effacer les terminées'))
    expect(clearBtn).toBeDefined()
    await clearBtn!.trigger('click')

    expect(store.tasks.length).toBe(1)
    expect(store.tasks[0].title).toBe('Active')
  })
})
