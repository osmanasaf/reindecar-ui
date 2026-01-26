import { ref, reactive, computed } from 'vue'

interface UseFormOptions<T extends Record<string, unknown>> {
    initialValues: T
    onSubmit?: (values: T) => Promise<void>
    validate?: (values: T) => Partial<Record<keyof T, string>>
}

export function useForm<T extends Record<string, unknown>>(options: UseFormOptions<T>) {
    const { initialValues, onSubmit, validate } = options

    const values = reactive({ ...initialValues }) as T
    const errors = ref<Record<string, string>>({})
    const touched = ref<Record<string, boolean>>({})
    const isSubmitting = ref(false)
    const submitError = ref<string | null>(null)

    const isDirty = computed(() => {
        return Object.keys(initialValues).some(
            key => values[key as keyof T] !== initialValues[key as keyof T]
        )
    })

    const isValid = computed(() => {
        return Object.keys(errors.value).length === 0
    })

    function setFieldValue<K extends keyof T>(field: K, value: T[K]) {
        values[field] = value
        touched.value[field as string] = true
        validateField(field)
    }

    function setFieldError(field: keyof T, message: string) {
        errors.value[field as string] = message
    }

    function validateField(field: keyof T) {
        if (validate) {
            const validationErrors = validate(values)
            if (validationErrors[field]) {
                errors.value[field as string] = validationErrors[field] as string
            } else {
                delete errors.value[field as string]
            }
        }
    }

    function validateAll() {
        if (validate) {
            const validationErrors = validate(values)
            errors.value = {}
            Object.entries(validationErrors).forEach(([key, value]) => {
                if (value) errors.value[key] = value
            })
        }
        return Object.keys(errors.value).length === 0
    }

    async function handleSubmit() {
        if (!validateAll()) return

        isSubmitting.value = true
        submitError.value = null

        try {
            if (onSubmit) {
                await onSubmit(values)
            }
        } catch (e) {
            submitError.value = (e as Error).message
        } finally {
            isSubmitting.value = false
        }
    }

    function reset() {
        Object.assign(values, initialValues)
        errors.value = {}
        touched.value = {}
        submitError.value = null
    }

    return {
        values,
        errors,
        touched,
        isSubmitting,
        submitError,
        isDirty,
        isValid,
        setFieldValue,
        setFieldError,
        validateField,
        validateAll,
        handleSubmit,
        reset
    }
}
