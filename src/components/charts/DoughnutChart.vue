<script setup lang="ts">
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions
} from 'chart.js'
import { Doughnut } from 'vue-chartjs'

ChartJS.register(ArcElement, Tooltip, Legend)

defineProps<{
  data: ChartData<'doughnut'>
  options?: ChartOptions<'doughnut'>
}>()
</script>

<template>
  <div class="chart-container">
    <Doughnut :data="data" :options="options" />
  </div>
</template>

<style scoped>
.chart-container {
  position: relative;
  height: 300px;
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>
