<script setup lang="ts">
import { ref } from 'vue'
import { useTokenStatus } from '@/composables'
import { useRouter } from 'vue-router'

const router = useRouter()
const { isExpiringSoon, formattedTimeToExpiry, extendSession, timeToExpiry } = useTokenStatus()

const extending = ref(false)
const dismissed = ref(false)

async function handleExtend() {
    extending.value = true
    const success = await extendSession()
    extending.value = false
    
    if (success) {
        dismissed.value = true
        setTimeout(() => {
            dismissed.value = false
        }, 60000)
    }
}

function handleLogout() {
    router.push('/login')
}
</script>

<template>
    <Transition name="slide-down">
        <div 
            v-if="isExpiringSoon && !dismissed && timeToExpiry > 0" 
            class="session-warning"
        >
            <div class="warning-content">
                <div class="warning-icon">⏱️</div>
                <div class="warning-text">
                    <strong>Oturum Süresi Doluyor</strong>
                    <span>Kalan süre: {{ formattedTimeToExpiry }}</span>
                </div>
            </div>
            <div class="warning-actions">
                <button 
                    class="btn btn-outline" 
                    @click="handleLogout"
                >
                    Çıkış Yap
                </button>
                <button 
                    class="btn btn-primary" 
                    :disabled="extending"
                    @click="handleExtend"
                >
                    {{ extending ? 'Uzatılıyor...' : 'Oturumu Uzat' }}
                </button>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.session-warning {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    padding: 12px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.warning-content {
    display: flex;
    align-items: center;
    gap: 16px;
}

.warning-icon {
    font-size: 24px;
}

.warning-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.warning-text strong {
    font-size: 14px;
    font-weight: 600;
}

.warning-text span {
    font-size: 13px;
    opacity: 0.9;
}

.warning-actions {
    display: flex;
    gap: 12px;
}

.btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
}

.btn-outline {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.5);
    color: white;
}

.btn-outline:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: white;
}

.btn-primary {
    background: white;
    color: #d97706;
}

.btn-primary:hover:not(:disabled) {
    background: #fef3c7;
}

.btn-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}


.slide-down-enter-active,
.slide-down-leave-active {
    transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
    transform: translateY(-100%);
    opacity: 0;
}

@media (max-width: 640px) {
    .session-warning {
        flex-direction: column;
        gap: 12px;
        text-align: center;
    }
    
    .warning-content {
        flex-direction: column;
        gap: 8px;
    }
}
</style>
