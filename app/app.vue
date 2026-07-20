<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTasksStore } from '~/stores/tasks'

const store = useTasksStore()

const PALETTE: Record<string, { bg: string; edge: string }> = {
  butter: { bg: '#FFE79A', edge: '#F2CE5E' },
  rose:   { bg: '#FBC3D2', edge: '#EE9DB2' },
  sky:    { bg: '#B7DCF4', edge: '#8FC2E6' },
  mint:   { bg: '#C4E9CF', edge: '#9AD3AB' },
  lilac:  { bg: '#DBCDF3', edge: '#BCA6E5' },
}
const ORDER = ['butter', 'rose', 'sky', 'mint', 'lilac']
const PDOTS = ['#C25A4A', '#4A8FB0', '#5C9A6B', '#B98B34', '#8E6EB5', '#B0587F']

// UI State
const filter = ref<string | null>('all')
const sheetOpen = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ title: '', note: '', color: 'butter', projectId: null as string | null })
const showDone = ref(false)
const undoTask = ref<any>(null)
let undoTimer: any = null
const draggingId = ref<string | null>(null)
let _dragId: string | null = null
const menuOpen = ref(false)
const creatingProject = ref(false)
const projectDraft = ref('')
const menuDraft = ref('')

// Swipe state
const swipeOffsets = ref<Record<string, number>>({})
let _swipeStartX = 0
let _swipeStartY = 0
let _swipeTaskId: string | null = null
let _swipeLocked = false
const SWIPE_THRESHOLD = 120

// Computed values
const activeTasks = computed(() => store.tasks.filter(t => !t.done))
const doneTasks = computed(() => store.tasks.filter(t => t.done))
const doneTotal = computed(() => doneTasks.value.length)
const hasProjects = computed(() => store.projects.length > 0)
const noProjects = computed(() => store.projects.length === 0)

const filteredActiveRaw = computed(() => {
  const allSorted = [...store.tasks].sort((a, b) => a.order - b.order)
  return allSorted.filter(t => filter.value === 'all' || (t.projectId || 'all-none') === filter.value)
})

const isEmpty = computed(() => filteredActiveRaw.value.length === 0)
const emptyTitle = computed(() => filter.value === 'all' ? 'Aucune tâche' : 'Projet vide')
const emptyHint = computed(() => {
  if (filter.value === 'all') return 'Appuie sur le bouton + pour coller ton premier post-it.'
  const p = store.projects.find(p => p.id === filter.value)
  return `Aucune tâche dans « ${p ? p.name : ''} ». Appuie sur +.`
})

// Groups
const projDot = (id: string) => {
  const i = store.projects.findIndex(p => p.id === id)
  return PDOTS[((i % PDOTS.length) + PDOTS.length) % PDOTS.length] || PDOTS[0]
}

const groups = computed(() => {
  let grps = []
  if (filter.value === 'all' && store.projects.length > 0) {
    store.projects.forEach(p => {
      const ts = filteredActiveRaw.value.filter(t => t.projectId === p.id)
      if (ts.length) grps.push({ key: p.id, name: p.name, count: ts.length, showHeader: true, dotStyle: `width:9px;height:9px;border-radius:50%;background:${projDot(p.id)}`, tasks: ts })
    })
    const none = filteredActiveRaw.value.filter(t => !t.projectId)
    if (none.length) grps.push({ key: 'none', name: 'Sans projet', count: none.length, showHeader: true, dotStyle: 'width:9px;height:9px;border-radius:50%;background:#C6BB9C', tasks: none })
  } else {
    grps = [{ key: 'flat', name: '', count: filteredActiveRaw.value.length, showHeader: false, dotStyle: '', tasks: filteredActiveRaw.value }]
  }
  return grps
})

const menuProjects = computed(() => store.projects.map(p => ({
  ...p,
  count: store.tasks.filter(t => t.projectId === p.id).length,
  dotStyle: `width:11px;height:11px;border-radius:50%;flex:0 0 auto;background:${projDot(p.id)}`
})))

const canSave = computed(() => form.value.title.trim().length > 0)
const isEditing = computed(() => !!editingId.value)
const sheetTitle = computed(() => isEditing.value ? 'Modifier' : 'Nouveau post-it')
const saveLabel = computed(() => isEditing.value ? 'Enregistrer' : 'Coller le post-it')

// Actions
const openAdd = () => {
  sheetOpen.value = true
  editingId.value = null
  creatingProject.value = false
  projectDraft.value = ''
  form.value = { title: '', note: '', color: 'butter', projectId: filter.value === 'all' ? null : filter.value }
}

const openEdit = (t: any) => {
  sheetOpen.value = true
  editingId.value = t.id
  creatingProject.value = false
  projectDraft.value = ''
  form.value = { title: t.title, note: t.note || '', color: t.color, projectId: t.projectId || null }
}

const closeSheet = () => {
  sheetOpen.value = false
  editingId.value = null
  creatingProject.value = false
}

const save = () => {
  const title = form.value.title.trim()
  if (!title) return
  if (editingId.value) {
    store.updateTask(editingId.value, { title, note: form.value.note.trim(), color: form.value.color, projectId: form.value.projectId })
  } else {
    store.addTask(title, form.value.note.trim(), form.value.color, form.value.projectId)
  }
  sheetOpen.value = false
  editingId.value = null
  creatingProject.value = false
}

const deleteCurrent = () => {
  if (!editingId.value) return
  const removed = store.removeTask(editingId.value)
  sheetOpen.value = false
  editingId.value = null
  if (removed) {
    undoTask.value = removed
    if (undoTimer) clearTimeout(undoTimer)
    undoTimer = setTimeout(() => { undoTask.value = null }, 4200)
  }
}

const undoDelete = () => {
  if (!undoTask.value) return
  store.restoreTask(undoTask.value)
  undoTask.value = null
  if (undoTimer) clearTimeout(undoTimer)
}

const confirmCreateProject = () => {
  const id = store.addProject(projectDraft.value)
  if (id) {
    form.value.projectId = id
    creatingProject.value = false
    projectDraft.value = ''
  }
}

const addMenuProject = () => {
  if (store.addProject(menuDraft.value)) {
    menuDraft.value = ''
  }
}

const deleteProject = (id: string) => {
  store.removeProject(id)
  if (filter.value === id) filter.value = 'all'
}

// Menu
const closeMenu = () => {
  menuOpen.value = false
}

// Swipe to delete
const onSwipeStart = (taskId: string, e: TouchEvent) => {
  _swipeTaskId = taskId
  _swipeStartX = e.touches[0].clientX
  _swipeStartY = e.touches[0].clientY
  _swipeLocked = false
}

const onSwipeMove = (e: TouchEvent) => {
  if (!_swipeTaskId) return
  const dx = e.touches[0].clientX - _swipeStartX
  const dy = e.touches[0].clientY - _swipeStartY

  // Lock direction on first significant move
  if (!_swipeLocked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
    _swipeLocked = true
    if (Math.abs(dy) > Math.abs(dx)) {
      // Vertical scroll, cancel swipe
      _swipeTaskId = null
      return
    }
  }

  if (!_swipeLocked) return

  // Only allow swipe right
  const offset = Math.max(0, dx)
  swipeOffsets.value = { ...swipeOffsets.value, [_swipeTaskId]: offset }

  if (offset > 0) {
    e.preventDefault()
  }
}

const onSwipeEnd = () => {
  if (!_swipeTaskId) return
  const taskId = _swipeTaskId
  const offset = swipeOffsets.value[taskId] || 0
  _swipeTaskId = null

  if (offset >= SWIPE_THRESHOLD) {
    // Animate off screen then delete
    swipeOffsets.value = { ...swipeOffsets.value, [taskId]: 500 }
    setTimeout(() => {
      const removed = store.removeTask(taskId)
      const newOffsets = { ...swipeOffsets.value }
      delete newOffsets[taskId]
      swipeOffsets.value = newOffsets
      if (removed) {
        undoTask.value = removed
        if (undoTimer) clearTimeout(undoTimer)
        undoTimer = setTimeout(() => { undoTask.value = null }, 4200)
      }
    }, 200)
  } else {
    // Snap back
    swipeOffsets.value = { ...swipeOffsets.value, [taskId]: 0 }
  }
}

// Drag & Drop
const onDragMove = (e: PointerEvent) => {
  if (!_dragId) return
  e.preventDefault()
  const el = document.elementFromPoint(e.clientX, e.clientY)
  const card = el?.closest('[data-task]')
  if (!card) return
  const overId = card.getAttribute('data-task')
  if (overId && overId !== _dragId) {
    store.reorder(_dragId, overId)
  }
}

const onDragEnd = () => {
  if (_dragId) {
    _dragId = null
    draggingId.value = null
  }
}

const startDrag = (id: string, e: PointerEvent) => {
  e.preventDefault()
  _dragId = id
  draggingId.value = id
}

onMounted(() => {
  window.addEventListener('pointermove', onDragMove, { passive: false })
  window.addEventListener('pointerup', onDragEnd)
  window.addEventListener('touchmove', onSwipeMove, { passive: false })
  window.addEventListener('touchend', onSwipeEnd)
})

onUnmounted(() => {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('touchmove', onSwipeMove)
  window.removeEventListener('touchend', onSwipeEnd)
  if (undoTimer) clearTimeout(undoTimer)
})

// Styling helpers
const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const getTaskStyles = (t: any) => {
  const p = PALETTE[t.color] || PALETTE.butter
  const dragging = draggingId.value === t.id
  const vd = t.done
  const rot = vd ? 0 : ((hash(t.id) % 5) - 2) * 0.9
  return {
    cardStyle: `position:relative;background:${p.bg};border-radius:5px;padding:15px 14px 18px;margin:14px 4px;display:flex;align-items:flex-start;gap:13px;box-shadow:${dragging ? '0 18px 34px rgba(43,41,36,.30)' : '0 6px 14px rgba(43,41,36,.14)'};transform:rotate(${rot}deg)${dragging ? ' scale(1.03)' : ''};transition:transform .28s, box-shadow .18s;z-index:${dragging ? 15 : 1};opacity:1`,,
    titleStyle: `font-family:'Caveat',cursive;font-weight:600;font-size:${vd ? '21px' : '24px'};line-height:1.12;color:#3A362C;word-break:break-word;transition:font-size .2s;${vd ? 'text-decoration:line-through; text-decoration-color:rgba(58,54,44,.5)' : ''}`,
    noteStyle: `font-family:'Caveat',cursive;font-size:18px;line-height:1.2;color:rgba(58,54,44,.72);margin-top:4px;word-break:break-word`,
    checkStyle: `flex:0 0 auto;width:44px;height:44px;margin:-2px -2px 0 -4px;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;transition:transform .12s`,
    checkInner: `width:30px;height:30px;border-radius:50%;border:3px solid ${vd ? '#3A362C' : p.edge};background:${vd ? '#3A362C' : 'rgba(255,255,255,.6)'};box-shadow:0 1px 2px rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;transition:background .15s, border-color .15s`,
    checkStroke: vd ? '#FFE79A' : 'transparent',
    tapeStyle: `position:absolute;top:-11px;left:50%;transform:translateX(-50%) rotate(${((hash(t.id) % 7) - 3)}deg);width:66px;height:22px;background:rgba(255,255,255,.5);box-shadow:0 1px 3px rgba(0,0,0,.08)`
  }
}

const chipBase = (sel: boolean) => `flex:0 0 auto;padding:9px 15px;border-radius:11px;font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;transition:transform .12s;${sel ? 'background:#2B2924; color:#F1EBDD; border:1.5px solid #2B2924' : 'background:rgba(255,255,255,.5); color:#6E664F; border:1.5px solid rgba(120,105,80,.2)'}`

</script>

<template>
  <div style="position:relative; width:100%; height:100vh; min-height:640px; margin:0 auto; max-width:440px; background:#F1EBDD; background-image:radial-gradient(rgba(120,105,80,.10) 1px, transparent 1px); background-size:22px 22px; font-family:'Space Grotesk',system-ui,sans-serif; color:#2B2924; overflow:hidden; display:flex; flex-direction:column;">
    
    <header style="flex:0 0 auto; padding:22px 22px 10px; display:flex; align-items:flex-end; justify-content:space-between; background:linear-gradient(#F1EBDD 78%, rgba(241,235,221,0)); z-index:5;">
      <div>
        <div style="font-family:'Caveat',cursive; font-weight:700; font-size:34px; line-height:.9; color:#2B2924; white-space:nowrap;">Mes post-its</div>
        <div style="font-size:13px; letter-spacing:.02em; color:#8A8065; margin-top:6px;">{{ activeTasks.length }} à faire · {{ doneTotal }} terminé{{ doneTotal > 1 ? 's' : '' }}</div>
      </div>
      <button @click="menuOpen = true; menuDraft = ''" aria-label="Menu" class="tapfx" style="width:44px; height:44px; border-radius:13px; border:none; background:#E4DBC5; display:flex; align-items:center; justify-content:center; box-shadow:inset 0 0 0 1px rgba(120,105,80,.18); cursor:pointer; transition:transform .12s;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6E664F" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
    </header>

    <div v-if="hasProjects" class="rowsc" style="flex:0 0 auto; display:flex; gap:8px; padding:4px 18px 10px; overflow-x:auto; z-index:4;">
      <button @click="filter = 'all'" class="tapfx" :style="chipBase(filter === 'all')">Tous</button>
      <button v-for="p in store.projects" :key="p.id" @click="filter = p.id" class="tapfx" :style="chipBase(filter === p.id)">{{ p.name }}</button>
    </div>

    <div style="flex:1 1 auto; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:4px 18px 130px;">
      
      <div v-if="isEmpty" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:64px 24px 40px; gap:20px;">
        <div style="width:120px; height:120px; border-radius:6px; border:2px dashed #C6BB9C; background:rgba(255,255,255,.35); transform:rotate(-4deg); display:flex; align-items:center; justify-content:center;">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#C6BB9C" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        </div>
        <div>
          <div style="font-family:'Caveat',cursive; font-size:28px; font-weight:700; color:#5C5545;">{{ emptyTitle }}</div>
          <div style="font-size:14px; color:#9A9078; margin-top:4px; max-width:230px;">{{ emptyHint }}</div>
        </div>
      </div>

      <div v-for="grp in groups" :key="grp.key" style="margin-top:6px;">
        <div v-if="grp.showHeader" style="display:flex; align-items:center; gap:8px; padding:14px 6px 2px;">
          <span :style="grp.dotStyle"></span>
          <span style="font-size:12px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:#8A8065;">{{ grp.name }}</span>
          <span style="font-size:12px; color:#B4AA8E;">{{ grp.count }}</span>
        </div>
        <div v-for="task in grp.tasks" :key="task.id" style="position:relative; overflow:hidden; margin:14px 4px; border-radius:5px;">
          <!-- Delete background revealed on swipe -->
          <div style="position:absolute; inset:0; background:#C25A4A; border-radius:5px; display:flex; align-items:center; padding-left:20px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
            <span style="color:white; font-weight:600; font-size:14px; margin-left:10px;">Supprimer</span>
          </div>
          <!-- Swipeable card -->
          <div :data-task="task.id" @touchstart="(e) => onSwipeStart(task.id, e)" :style="`${getTaskStyles(task).cardStyle};margin:0;transform:translateX(${swipeOffsets[task.id] || 0}px) rotate(${task.done ? 0 : ((hash(task.id) % 5) - 2) * 0.9}deg);transition:${_swipeTaskId === task.id ? 'none' : 'transform .28s, box-shadow .18s, opacity .28s'};`">
            <div :style="getTaskStyles(task).tapeStyle"></div>
            <button @click="store.toggleDone(task.id)" aria-label="Terminer" class="tapfx" :style="getTaskStyles(task).checkStyle">
              <span :style="getTaskStyles(task).checkInner">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" :stroke="getTaskStyles(task).checkStroke" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </span>
            </button>
            <div @click="openEdit(task)" style="cursor:pointer; flex:1; min-width:0; padding:2px 30px 2px 0; min-height:30px;">
              <div :style="getTaskStyles(task).titleStyle">{{ task.title }}</div>
              <div v-if="task.note" :style="getTaskStyles(task).noteStyle">{{ task.note }}</div>
            </div>
            <div @pointerdown="(e) => startDrag(task.id, e)" aria-label="Réordonner" style="position:absolute; right:8px; bottom:8px; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:grab; touch-action:none; color:rgba(43,41,36,.26);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button @click="openAdd" class="tapfx" aria-label="Ajouter" style="position:absolute; right:20px; bottom:26px; width:62px; height:62px; border-radius:22px; border:none; background:#2B2924; color:#F1EBDD; box-shadow:0 12px 26px rgba(43,41,36,.34); cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:20; animation:fabIn .5s cubic-bezier(.2,1.3,.4,1) both; transition:transform .12s;">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
    </button>

    <div v-if="undoTask" style="position:absolute; left:50%; bottom:100px; transform:translateX(-50%); z-index:30; display:flex; align-items:center; gap:14px; background:#2B2924; color:#F1EBDD; padding:12px 12px 12px 18px; border-radius:16px; box-shadow:0 10px 24px rgba(0,0,0,.28); font-size:14px; white-space:nowrap; animation:snackIn .28s cubic-bezier(.2,1,.3,1) both;">
      <span>Post-it supprimé</span>
      <button @click="undoDelete" style="background:rgba(255,255,255,.14); border:none; color:#FFDf9b; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:14px; padding:8px 14px; border-radius:10px; cursor:pointer;">Annuler</button>
    </div>

    <!-- Add / edit bottom sheet -->
    <div @click="closeSheet" :style="`position:absolute; inset:0; z-index:35; background:rgba(43,41,36,.34); transition:opacity .28s; ${sheetOpen ? 'opacity:1; pointer-events:auto' : 'opacity:0; pointer-events:none'}`"></div>
    <div :style="`position:absolute; left:0; right:0; bottom:0; z-index:40; background:#FBF7EC; border-radius:26px 26px 0 0; padding:14px 22px 30px; box-shadow:0 -12px 34px rgba(43,41,36,.22); transition:transform .32s cubic-bezier(.2,1,.3,1); ${sheetOpen ? 'transform:translateY(0)' : 'transform:translateY(115%)'}`">
      <div style="width:44px; height:5px; border-radius:3px; background:#D8CEB5; margin:0 auto 18px;"></div>
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <div style="font-family:'Caveat',cursive; font-size:30px; font-weight:700; color:#2B2924;">{{ sheetTitle }}</div>
        <button v-if="isEditing" @click="deleteCurrent" aria-label="Supprimer" class="tapfx" style="width:44px; height:44px; border-radius:12px; border:none; background:#F4E2DE; color:#C25A4A; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:transform .12s;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
        </button>
      </div>

      <input v-model="form.title" placeholder="Titre de la tâche" style="width:100%; border:none; outline:none; background:#F6F1E5; border-radius:14px; padding:15px 16px; font-family:'Space Grotesk',sans-serif; font-size:17px; font-weight:600; color:#2B2924; box-shadow:inset 0 0 0 1.5px rgba(120,105,80,.16);">
      <textarea v-model="form.note" placeholder="Note (optionnel)" rows="2" style="width:100%; margin-top:12px; border:none; outline:none; resize:none; background:#F6F1E5; border-radius:14px; padding:15px 16px; font-family:'Space Grotesk',sans-serif; font-size:15px; color:#4A463B; box-shadow:inset 0 0 0 1.5px rgba(120,105,80,.16);"></textarea>

      <div style="font-size:12px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:#8A8065; margin:18px 2px 8px;">Couleur</div>
      <div style="display:flex; align-items:center; gap:12px;">
        <button v-for="c in ORDER" :key="c" @click="form.color = c" aria-label="Couleur" :style="`width:44px; height:44px; border-radius:12px; background:${PALETTE[c].bg}; cursor:pointer; padding:0; transition:transform .12s; box-shadow:0 2px 6px rgba(43,41,36,.14); ${form.color === c ? 'border:3px solid #2B2924; transform:scale(1.08)' : 'border:3px solid rgba(0,0,0,.06)'}`"></button>
      </div>

      <div style="font-size:12px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:#8A8065; margin:18px 2px 8px;">Projet</div>
      <div class="rowsc" style="display:flex; gap:8px; overflow-x:auto; padding-bottom:2px;">
        <button @click="form.projectId = null" class="tapfx" :style="chipBase(!form.projectId)">Aucun</button>
        <button v-for="p in store.projects" :key="p.id" @click="form.projectId = p.id" class="tapfx" :style="chipBase(form.projectId === p.id)">{{ p.name }}</button>
        <button @click="creatingProject = !creatingProject; projectDraft = ''" class="tapfx" style="flex:0 0 auto; padding:9px 14px; border-radius:11px; border:1.5px dashed #C6BB9C; background:transparent; color:#8A8065; font-family:'Space Grotesk',sans-serif; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap;">＋ Projet</button>
      </div>
      <div v-if="creatingProject" style="display:flex; gap:8px; margin-top:10px;">
        <input v-model="projectDraft" placeholder="Nom du projet" style="flex:1; border:none; outline:none; background:#F6F1E5; border-radius:12px; padding:12px 14px; font-family:'Space Grotesk',sans-serif; font-size:14px; color:#2B2924; box-shadow:inset 0 0 0 1.5px rgba(120,105,80,.16);">
        <button @click="confirmCreateProject" class="tapfx" style="flex:0 0 auto; padding:0 18px; border:none; border-radius:12px; background:#2B2924; color:#F1EBDD; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:14px; cursor:pointer;">OK</button>
      </div>

      <button @click="save" class="tapfx" :style="`width:100%; margin-top:22px; padding:16px; border:none; border-radius:16px; font-family:'Space Grotesk',sans-serif; font-size:16px; font-weight:700; cursor:pointer; transition:transform .12s, opacity .15s; ${canSave ? 'background:#2B2924; color:#F1EBDD' : 'background:#DED5BF; color:#A79E85; cursor:default'}`">{{ saveLabel }}</button>
    </div>

    <!-- Burger drawer -->
    <div @click="closeMenu" :style="`position:absolute; inset:0; z-index:45; background:rgba(43,41,36,.34); transition:opacity .28s; ${menuOpen ? 'opacity:1; pointer-events:auto' : 'opacity:0; pointer-events:none'}`"></div>
    <div :style="`position:absolute; top:0; right:0; bottom:0; width:82%; max-width:340px; z-index:50; background:#FBF7EC; padding:22px 22px 30px; box-shadow:-12px 0 34px rgba(43,41,36,.22); overflow-y:auto; transition:transform .3s cubic-bezier(.2,1,.3,1); ${menuOpen ? 'transform:translateX(0)' : 'transform:translateX(105%)'}`">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
        <div style="font-family:'Caveat',cursive; font-size:30px; font-weight:700; color:#2B2924;">Menu</div>
        <button @click="closeMenu" aria-label="Fermer" class="tapfx" style="width:40px; height:40px; border-radius:11px; border:none; background:#EFE7D3; color:#6E664F; display:flex; align-items:center; justify-content:center; cursor:pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>

      <div style="font-size:12px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:#8A8065; margin:20px 2px 10px;">Projets</div>
      <div v-if="hasProjects" style="display:flex; flex-direction:column; gap:8px;">
        <div v-for="mp in menuProjects" :key="mp.id" style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:#F6F1E5; border-radius:13px; padding:12px 12px 12px 14px;">
          <span style="display:flex; align-items:center; gap:10px; min-width:0;">
            <span :style="mp.dotStyle"></span>
            <span style="font-size:15px; font-weight:600; color:#3A362C; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ mp.name }}</span>
            <span style="font-size:13px; color:#B4AA8E;">{{ mp.count }}</span>
          </span>
          <button @click="deleteProject(mp.id)" aria-label="Supprimer projet" class="tapfx" style="flex:0 0 auto; width:36px; height:36px; border-radius:10px; border:none; background:transparent; color:#B4AA8E; display:flex; align-items:center; justify-content:center; cursor:pointer;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
          </button>
        </div>
      </div>
      <div v-if="noProjects" style="font-size:14px; color:#9A9078; padding:2px 2px 4px;">Aucun projet pour l'instant.</div>

      <div style="display:flex; gap:8px; margin-top:12px;">
        <input v-model="menuDraft" placeholder="Nouveau projet" style="flex:1; border:none; outline:none; background:#F6F1E5; border-radius:12px; padding:12px 14px; font-family:'Space Grotesk',sans-serif; font-size:14px; color:#2B2924; box-shadow:inset 0 0 0 1.5px rgba(120,105,80,.16);">
        <button @click="addMenuProject" class="tapfx" style="flex:0 0 auto; padding:0 18px; border:none; border-radius:12px; background:#2B2924; color:#F1EBDD; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:14px; cursor:pointer;">Ajouter</button>
      </div>

      <div style="height:1px; background:rgba(120,105,80,.16); margin:22px 0;"></div>
      <button @click="store.clearDone()" class="tapfx" :style="`width:100%; display:flex; align-items:center; justify-content:center; gap:10px; padding:14px; border-radius:14px; font-family:'Space Grotesk',sans-serif; font-size:14px; font-weight:600; cursor:pointer; ${doneTotal > 0 ? 'background:#F4E2DE; color:#C25A4A; border:none' : 'background:#EFE7D3; color:#B4AA8E; border:none; cursor:default'}`">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
        Effacer les terminées{{ doneTotal > 0 ? ' · ' + doneTotal : '' }}
      </button>
    </div>

  </div>
  
  <NuxtPwaManifest />
</template>

<style>
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { margin: 0; padding: 0; }
a { color: #C25A4A; }
a:hover { color: #a8412f; }
@keyframes sheetIn { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes snackIn { from { transform: translate(-50%, 120%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
@keyframes fabIn { from { transform: scale(0) rotate(-90deg); } to { transform: scale(1) rotate(0); } }
.tapfx:active { transform: scale(.94); }
.rowsc::-webkit-scrollbar { display: none; }
</style>
