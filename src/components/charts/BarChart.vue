<script setup lang="ts">
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  type ChartData,
  type ChartOptions
} from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

defineProps<{
  data: ChartData<'bar'>
  options?: ChartOptions<'bar'>
}>()
</script>

<template>
  <div class="chart-container">
    <Bar :data="data" :options="options" />
  </div>
</template>

<style scoped>
.chart-container {
  position: relative;
  height: 300px;
  width: 100%;
}
</style>
