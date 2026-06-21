/**
 * @param {import('zod').ZodSchema<T>} schema
 * @param {unknown} data
 * @returns {{ success: true, data: T } | { success: false, message: string }}
 * @template T
 */
export function safeParse(schema, data) {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const message = result.error.issues
        .map((issue) => issue.message)
        .join("; ");

    return { success: false, message };
}

/**
 * @param {import('zod').ZodSchema<T>} schema
 * @param {unknown} data
 * @returns {T}
 * @template T
 */
export function parseOrThrow(schema, data) {
    return schema.parse(data);
}
