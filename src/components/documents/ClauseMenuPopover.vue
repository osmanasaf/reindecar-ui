<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { contractClausesApi, type ContractClause } from '@/api/contracts.api'
import { useToast } from '@/composables'
import { STANDARD_CLAUSES } from '@/utils/contractSampleData'
import { editorUi, closeAllMenus } from './editorUi'
import { popoverStyle } from './popoverPosition'

const emit = defineEmits<{
  pick: [text: string, blockId: string]
}>()

const toast = useToast()
const loading = ref(false)
const clauses = ref<ContractClause[]>([])
const fallback = ref(false)

const style = computed(() => popoverStyle(editorUi.clauseMenu.anchor, 420, 380))

async function loadClauses() {
  loading.value = true
  fallback.value = false
  try {
    clauses.value = await contractClausesApi.list()
  } catch {
    fallback.value = true
    clauses.value = STANDARD_CLAUSES.map((text, i) => ({ id: -(i + 1), text, sortOrder: i + 1 }))
  } finally {
    loading.value = false
  }
}

watch(
  () => editorUi.clauseMenu.open,
  (open) => {
    if (open) void loadClauses()
  },
)

function pick(clause: ContractClause) {
  if (editorUi.clauseMenu.blockId) {
    emit('pick', clause.text, editorUi.clauseMenu.blockId)
  }
  closeAllMenus()
}

async function removeClause(clause: ContractClause, event: MouseEvent) {
  event.stopPropagation()
  if (clause.id < 0) return
  try {
    await contractClausesApi.remove(clause.id)
    clauses.value = clauses.value.filter((c) => c.id !== clause.id)
    toast.success('Madde kitaplıktan silindi')
  } catch (err) {
    toast.apiError(err, 'Madde silinemedi')
  }
}
</script>

<template>
  <div
    v-if="editorUi.clauseMenu.open"
    v-click-outside="closeAllMenus"
    class="rce-popover rce-clausemenu"
    :style="style"
  >
    <div class="rce-clausemenu__head">Sık kullanılan maddeler</div>
    <div v-if="loading" class="rce-clausemenu__loading">Yükleniyor…</div>
    <template v-else>
      <div v-for="clause in clauses" :key="clause.id" class="rce-clausemenu__row">
        <button type="button" class="rce-clausemenu__item" @click="pick(clause)">
          {{ clause.text }}
        </button>
        <button
          v-if="!fallback"
          type="button"
          class="rce-clausemenu__del"
          aria-label="Kitaplıktan sil"
          title="Kitaplıktan sil"
          @click="removeClause(clause, $event)"
        >
          ×
        </button>
      </div>
      <div v-if="clauses.length === 0" class="rce-clausemenu__loading">
        Kitaplık boş. Bir maddenin yanındaki yer imi ile ekleyebilirsiniz.
      </div>
    </template>
  </div>
</template>
