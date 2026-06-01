<script setup lang="ts">

import { computed } from 'vue'

import { RouterLink, useRoute } from 'vue-router'

import { RcIcon } from '@/components/icons'



defineProps<{

  receivablesCount?: number

  payablesCount?: number

  installmentsCount?: number

}>()



const route = useRoute()



const activeTab = computed<'receivables' | 'payables' | 'installments'>(() => {

  const name = route.name as string | undefined

  if (name === 'installments-dashboard' || name === 'installment-detail') return 'installments'

  if (name === 'payables' || name === 'payable-detail') return 'payables'

  return 'receivables'

})

</script>



<template>

  <div class="rca-finance-tabs">

    <div class="rc-tabs">

      <RouterLink

        :to="{ name: 'receivables' }"

        class="rc-tab"

        :class="{ 'rc-tab--active': activeTab === 'receivables' }"

      >

        <RcIcon

          name="arrowRight"

          :size="14"

          class="rca-finance-tabs__icon-in"

        />

        Alacaklar

        <span v-if="receivablesCount != null" class="rc-chip__count">{{ receivablesCount }}</span>

      </RouterLink>

      <RouterLink

        :to="{ name: 'payables' }"

        class="rc-tab"

        :class="{ 'rc-tab--active': activeTab === 'payables' }"

      >

        <RcIcon name="arrowRight" :size="14" />

        Verecekler

        <span v-if="payablesCount != null" class="rc-chip__count">{{ payablesCount }}</span>

      </RouterLink>

      <RouterLink

        :to="{ name: 'installments-dashboard' }"

        class="rc-tab"

        :class="{ 'rc-tab--active': activeTab === 'installments' }"

      >

        <RcIcon name="card" :size="14" />

        Araç Taksitleri

        <span v-if="installmentsCount != null" class="rc-chip__count">{{ installmentsCount }}</span>

      </RouterLink>

    </div>

  </div>

</template>



<style scoped>

.rca-finance-tabs {

  margin-bottom: 14px;

}



.rca-finance-tabs__icon-in {

  transform: rotate(180deg);

}



.rc-tab {

  text-decoration: none;

  border: none;

  background: transparent;

  cursor: pointer;

  display: inline-flex;

  align-items: center;

  gap: 6px;

}



.rc-tab .rc-chip__count {

  margin-left: 2px;

}

</style>

