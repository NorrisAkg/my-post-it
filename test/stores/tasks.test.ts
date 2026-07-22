import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTasksStore } from '~/stores/tasks'

describe('useTasksStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with empty tasks and projects', () => {
    const store = useTasksStore()
    expect(store.tasks).toEqual([])
    expect(store.projects).toEqual([])
  })

  it('adds a task with auto-generated id and order', () => {
    const store = useTasksStore()
    store.addTask('Faire les courses', 'Acheter du pain et du lait', 'butter')

    expect(store.tasks.length).toBe(1)
    expect(store.tasks[0].title).toBe('Faire les courses')
    expect(store.tasks[0].note).toBe('Acheter du pain et du lait')
    expect(store.tasks[0].color).toBe('butter')
    expect(store.tasks[0].done).toBe(false)
    expect(store.tasks[0].order).toBe(0)
    expect(store.tasks[0].id).toBeTruthy()
  })

  it('updates an existing task', () => {
    const store = useTasksStore()
    store.addTask('Old Title', 'Old Note', 'butter')
    const taskId = store.tasks[0].id

    store.updateTask(taskId, { title: 'New Title', note: 'New Note', color: 'rose' })

    expect(store.tasks[0].title).toBe('New Title')
    expect(store.tasks[0].note).toBe('New Note')
    expect(store.tasks[0].color).toBe('rose')
  })

  it('toggles task done status', () => {
    const store = useTasksStore()
    store.addTask('Tâche à faire', '', 'sky')
    const taskId = store.tasks[0].id

    expect(store.tasks[0].done).toBe(false)
    store.toggleDone(taskId)
    expect(store.tasks[0].done).toBe(true)
    store.toggleDone(taskId)
    expect(store.tasks[0].done).toBe(false)
  })

  it('removes a task and allows restoring it', () => {
    const store = useTasksStore()
    store.addTask('Tâche à supprimer', '', 'mint')
    const task = store.tasks[0]

    const removed = store.removeTask(task.id)
    expect(removed).toEqual(task)
    expect(store.tasks.length).toBe(0)

    store.restoreTask(removed!)
    expect(store.tasks.length).toBe(1)
    expect(store.tasks[0].title).toBe('Tâche à supprimer')
  })

  it('clears all completed tasks', () => {
    const store = useTasksStore()
    store.addTask('Active 1', '', 'butter')
    store.addTask('Done 1', '', 'butter')
    store.addTask('Active 2', '', 'butter')
    
    store.toggleDone(store.tasks[1].id)
    expect(store.tasks.length).toBe(3)

    store.clearDone()
    expect(store.tasks.length).toBe(2)
    expect(store.tasks.every(t => !t.done)).toBe(true)
  })

  it('reorders tasks correctly', () => {
    const store = useTasksStore()
    store.addTask('Task 1', '', 'butter')
    store.addTask('Task 2', '', 'butter')
    store.addTask('Task 3', '', 'butter')

    const id1 = store.tasks[0].id
    const id2 = store.tasks[1].id
    const id3 = store.tasks[2].id

    store.reorder(id1, id3)

    const sorted = [...store.tasks].sort((a, b) => a.order - b.order)
    expect(sorted.map(t => t.id)).toEqual([id2, id3, id1])
  })

  it('adds and removes projects, unassigning tasks from deleted projects', () => {
    const store = useTasksStore()
    const projectId = store.addProject('Projet Perso')
    expect(projectId).toBeTruthy()
    expect(store.projects.length).toBe(1)
    expect(store.projects[0].name).toBe('Projet Perso')

    store.addTask('Tâche projet', '', 'lilac', projectId)
    expect(store.tasks[0].projectId).toBe(projectId)

    store.removeProject(projectId!)
    expect(store.projects.length).toBe(0)
    expect(store.tasks[0].projectId).toBeNull()
  })

  it('ignores empty project names', () => {
    const store = useTasksStore()
    const res = store.addProject('   ')
    expect(res).toBeNull()
    expect(store.projects.length).toBe(0)
  })
})
