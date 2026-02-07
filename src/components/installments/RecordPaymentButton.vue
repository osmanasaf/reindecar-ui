<script setup lang="ts">
import { ref } from 'vue'
import { useInstallmentStore } from '@/stores/installment.store'

interface Props {
  installmentId: number
  paymentId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  success: []
}>()

const installmentStore = useInstallmentStore()
const showConfirmDialog = ref(false)
const processing = ref(false)

async function handleConfirm(): Promise<void> {
  processing.value = true
  try {
    const result = await installmentStore.recordPayment(props.installmentId, props.paymentId)
    if (result) {
      showConfirmDialog.value = false
      emit('success')
    }
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <div class="record-payment-button">
    <button class="btn btn-sm btn-success" @click="showConfirmDialog = true" :disabled="processing">
      Ödeme Kaydet
    </button>

    <div v-if="showConfirmDialog" class="modal-overlay" @click.self="showConfirmDialog = false">
      <div class="modal-content">
        <h3>Ödeme Kaydı</h3>
        <p>Bu ödemeyi ödendi olarak işaretlemek istediğinizden emin misiniz?</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showConfirmDialog = false" :disabled="processing">
            İptal
          </button>
          <button class="btn btn-primary" @click="handleConfirm" :disabled="processing">
            {{ processing ? 'Kaydediliyor...' : 'Onayla' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 13px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-success {
  background: var(--color-success);
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: var(--color-success-dark);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
}

.modal-content h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
}

.modal-content p {
  margin: 0 0 20px 0;
  color: var(--color-text-secondary);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}
</style>
