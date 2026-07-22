import { defineStore } from 'pinia'
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'

export type Task = {
  id: string
  title: string
  note?: string
  color: string
  projectId?: string | null
  done: boolean
  createdAt: number
  order: number
}

export type Project = {
  id: string
  name: string
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

export const useTasksStore = defineStore('tasks', () => {
  const { data: rawTasks } = useIDBKeyval<Task[]>('postit.tasks.v1', [])
  const { data: rawProjects } = useIDBKeyval<Project[]>('postit.projects.v1', [])

  const ensureTasks = (): Task[] => {
    if (!Array.isArray(rawTasks.value)) {
      rawTasks.value = []
    }
    return rawTasks.value
  }

  const ensureProjects = (): Project[] => {
    if (!Array.isArray(rawProjects.value)) {
      rawProjects.value = []
    }
    return rawProjects.value
  }

  const addTask = (title: string, note: string, color: string, projectId: string | null = null) => {
    const list = ensureTasks()
    const maxOrder = list.filter(t => !t.done).reduce((m, t) => Math.max(m, t.order), -1)
    list.push({
      id: generateId(),
      title,
      note,
      color,
      projectId,
      done: false,
      createdAt: Date.now(),
      order: maxOrder + 1
    })
  }

  const updateTask = (id: string, updates: Partial<Task>) => {
    const list = ensureTasks()
    const index = list.findIndex(t => t.id === id)
    if (index !== -1) {
      list[index] = { ...list[index], ...updates }
    }
  }

  const toggleDone = (id: string) => {
    const list = ensureTasks()
    const task = list.find(t => t.id === id)
    if (task) {
      task.done = !task.done
    }
  }

  const removeTask = (id: string) => {
    const list = ensureTasks()
    const index = list.findIndex(t => t.id === id)
    let removedTask = null
    if (index !== -1) {
      removedTask = list[index]
      list.splice(index, 1)
    }
    return removedTask
  }

  const restoreTask = (task: Task) => {
    const list = ensureTasks()
    list.push(task)
  }

  const clearDone = () => {
    const list = ensureTasks()
    rawTasks.value = list.filter(t => !t.done)
  }

  const reorder = (dragId: string, overId: string) => {
    const list = ensureTasks()
    const all = [...list].sort((a, b) => a.order - b.order)
    const from = all.findIndex(t => t.id === dragId)
    const to = all.findIndex(t => t.id === overId)
    if (from < 0 || to < 0) return

    const [moved] = all.splice(from, 1)
    all.splice(to, 0, moved)
    
    const orderMap: Record<string, number> = {}
    all.forEach((t, i) => { orderMap[t.id] = i })
    
    rawTasks.value = list.map(t => ({ ...t, order: orderMap[t.id] ?? t.order }))
  }

  // Projects
  const addProject = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    const list = ensureProjects()
    const id = generateId()
    list.push({ id, name: trimmed })
    return id
  }

  const removeProject = (id: string) => {
    const projList = ensureProjects()
    rawProjects.value = projList.filter(p => p.id !== id)
    
    const taskList = ensureTasks()
    rawTasks.value = taskList.map(t => t.projectId === id ? { ...t, projectId: null } : t)
  }

  return {
    tasks: rawTasks,
    projects: rawProjects,
    addTask,
    updateTask,
    toggleDone,
    removeTask,
    restoreTask,
    clearDone,
    reorder,
    addProject,
    removeProject
  }
})
