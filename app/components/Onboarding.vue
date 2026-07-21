<template>
  <div class="onboarding-overlay">
    <div class="onboarding-content">
      <div v-if="step === 0" class="slide">
        <h2>Bienvenue !</h2>
        <p>Post‑It est votre tableau de bord pour organiser vos idées.</p>
        <button @click="next" class="next-btn">Suivant</button>
      </div>
      <div v-else-if="step === 1" class="slide">
        <h2>Créer des post‑its</h2>
        <p>Appuyez sur le bouton + pour ajouter un nouveau post‑it.</p>
        <button @click="next" class="next-btn">Suivant</button>
      </div>
      <div v-else-if="step === 2" class="slide">
        <h2>Profitez‑en !</h2>
        <p>Glissez, organisez et supprimez vos tâches en un clin d’œil.</p>
        <button @click="finish" class="finish-btn">Commencer</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const step = ref(0)
const next = () => { step.value = step.value + 1 }
const finish = () => {
  emit('finished')
}

const emit = defineEmits<{ (e: 'finished'): void }>()
</script>

<style scoped>
.onboarding-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.onboarding-content {
  background: #FFF;
  border-radius: 16px;
  padding: 24px;
  max-width: 320px;
  width: 90%;
  text-align: center;
  box-shadow: 0 8px 24px rgba(0,0,0,.2);
}
.slide h2 {
  font-family: 'Caveat', cursive;
  font-size: 28px;
  margin-bottom: 12px;
  color: #2B2924;
}
.slide p {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 15px;
  color: #5C5545;
  margin-bottom: 24px;
}
.next-btn, .finish-btn {
  background: #2B2924;
  color: #F1EBDD;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
  cursor: pointer;
  transition: transform .12s;
}
.next-btn:hover, .finish-btn:hover { transform: scale(1.04); }
</style>
