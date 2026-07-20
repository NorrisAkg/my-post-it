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

export const useTasksStore = defineStore('tasks', () => {
  const tasks = useIDBKeyval<Task[]>('postit.tasks.v1', [])
  const projects = useIDBKeyval<Project[]>('postit.projects.v1', [])

  const addTask = (title: string, note: string, color: string, projectId: string | null = null) => {
    const maxOrder = tasks.value.filter(t => !t.done).reduce((m, t) => Math.max(m, t.order), -1)
    tasks.value.push({
      id: crypto.randomUUID(),
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
    const index = tasks.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...updates }
    }
  }

  const toggleDone = (id: string) => {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      task.done = !task.done
    }
  }

  const removeTask = (id: string) => {
    const index = tasks.value.findIndex(t => t.id === id)
    let removedTask = null
    if (index !== -1) {
      removedTask = tasks.value[index]
      tasks.value.splice(index, 1)
    }
    return removedTask
  }

  const restoreTask = (task: Task) => {
    tasks.value.push(task)
  }

  const clearDone = () => {
    tasks.value = tasks.value.filter(t => !t.done)
  }

  const reorder = (dragId: string, overId: string) => {
    const all = [...tasks.value].sort((a, b) => a.order - b.order)
    const from = all.findIndex(t => t.id === dragId)
    const to = all.findIndex(t => t.id === overId)
    if (from < 0 || to < 0) return

    const [moved] = all.splice(from, 1)
    all.splice(to, 0, moved)
    
    const orderMap: Record<string, number> = {}
    all.forEach((t, i) => { orderMap[t.id] = i })
    
    tasks.value = tasks.value.map(t => ({ ...t, order: orderMap[t.id] }))
  }

  // Projects
  const addProject = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    const id = crypto.randomUUID()
    projects.value.push({ id, name: trimmed })
    return id
  }

  const removeProject = (id: string) => {
    projects.value = projects.value.filter(p => p.id !== id)
    tasks.value = tasks.value.map(t => t.projectId === id ? { ...t, projectId: null } : t)
  }

  return {
    tasks,
    projects,
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
