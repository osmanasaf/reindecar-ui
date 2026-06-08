import { ref, watch, type Ref } from 'vue'

export type StorageSerializer<T> = {
  read: (raw: string) => T
  write: (value: T) => string
}

const jsonSerializer = <T>(): StorageSerializer<T> => ({
  read: (raw) => JSON.parse(raw) as T,
  write: (value) => JSON.stringify(value),
})

function readValue<T>(key: string, defaultValue: T, serializer: StorageSerializer<T>): T {
  if (typeof localStorage === 'undefined') return defaultValue
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return defaultValue
    return serializer.read(raw)
  } catch {
    return defaultValue
  }
}

function writeValue<T>(key: string, value: T, serializer: StorageSerializer<T>): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, serializer.write(value))
  } catch {
    // depolama kotası veya gizli mod
  }
}

/**
 * Vue ref ile senkronize localStorage tercihi.
 * Değer değişince otomatik yazar; varsayılan serializer JSON'dur.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options?: { serializer?: StorageSerializer<T> },
): Ref<T> {
  const serializer = options?.serializer ?? jsonSerializer<T>()
  const stored = ref(readValue(key, defaultValue, serializer)) as Ref<T>

  watch(
    stored,
    (val) => writeValue(key, val, serializer),
    { deep: typeof defaultValue === 'object' && defaultValue !== null },
  )

  return stored
}

/** Tek seferlik okuma — composable dışı yardımcılar için */
export function readStoredValue<T>(
  key: string,
  defaultValue: T,
  options?: { serializer?: StorageSerializer<T> },
): T {
  const serializer = options?.serializer ?? jsonSerializer<T>()
  return readValue(key, defaultValue, serializer)
}

/** Tek seferlik yazma */
export function writeStoredValue<T>(
  key: string,
  value: T,
  options?: { serializer?: StorageSerializer<T> },
): void {
  const serializer = options?.serializer ?? jsonSerializer<T>()
  writeValue(key, value, serializer)
}
