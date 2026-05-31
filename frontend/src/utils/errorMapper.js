export function parseApiError(text, fallbackMessage) {
    let parsed = null
    try {
        parsed = JSON.parse(text)
    } catch {
        return { message: text || fallbackMessage, errorCode: null, raw: null }
    }

    const detail = parsed?.detail
    if (typeof detail === 'string') {
        return { message: detail || fallbackMessage, errorCode: null, raw: parsed }
    }
    if (detail && typeof detail === 'object') {
        return {
            message: detail.message || fallbackMessage,
            errorCode: detail.errorCode || null,
            raw: parsed,
        }
    }
    return { message: fallbackMessage, errorCode: null, raw: parsed }
}

export function mapErrorToUserMessage(errorCode, fallbackMessage, context = '') {
    const key = String(errorCode || '').toUpperCase()
    const map = {
        SESSION_EXPIRED: 'Your session expired. Please re-upload your ZIP and try again.',
        NO_YEAR_DATA: context ? `No logs were found for ${context}.` : 'No logs were found for that year.',
        POSTER_FETCH_PARTIAL: 'Some posters could not be fetched. Try reloading and re-uploading your ZIP.',
        RATE_LIMITED: 'Too many requests right now. Please wait a moment and retry.',
        PROCESSING_FAILED: 'Could not process your ZIP this time. Please try again.',
    }
    return map[key] || fallbackMessage
}
