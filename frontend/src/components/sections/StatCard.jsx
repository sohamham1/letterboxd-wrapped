import React, { useEffect, useState } from 'react'

function StatCard({
    label,
    number,
    unit,
    context,
    contextClassName = '',
    colorClass = "text-gradient",
    className = "",
    hideLabel = false,
    reactiveCopy = '',
    isActive = true
}) {
    const [count, setCount] = useState(0)

    useEffect(() => {
        if (!isActive) {
            setCount(0)
            return undefined
        }

        const parsedNumber = typeof number === 'string'
            ? parseFloat(number.replace(/[^0-9.-]/g, ''))
            : Number(number)
        const end = Number.isFinite(parsedNumber) ? parsedNumber : 0
        if (isNaN(end)) return undefined

        const magnitude = Math.log10(Math.max(Math.abs(end), 1))
        const duration = Math.min(900, Math.max(600, 620 + magnitude * 90))
        const decimalPlaces = Number.isInteger(end) ? 0 : 1
        const startValue = 0
        const startTime = performance.now()
        let frameId = null

        const tick = (timestamp) => {
            const elapsed = timestamp - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            const value = startValue + (end - startValue) * eased

            if (progress >= 1) {
                setCount(end)
            } else {
                const next = decimalPlaces ? Number(value.toFixed(decimalPlaces)) : Math.round(value)
                setCount(next)
                frameId = requestAnimationFrame(tick)
            }
        }

        frameId = requestAnimationFrame(tick)
        return () => {
            if (frameId) cancelAnimationFrame(frameId)
        }
    }, [number, isActive])

    return (
        <div className={`wrapped__stat-card ${className}`}>
            {!hideLabel && <span className="wrapped__stat-label">{label}</span>}
            <div className={`wrapped__stat-number ${colorClass} ${hideLabel ? 'wrapped__stat-number--hero' : ''}`}>
                {count}
            </div>
            {unit && <span className="wrapped__stat-unit">{unit}</span>}
            {reactiveCopy ? <p className="wrapped__stat-punchline">{reactiveCopy}</p> : null}
            {context ? <p className={`wrapped__stat-context ${contextClassName}`.trim()}>{context}</p> : null}
        </div>
    )
}

export default StatCard
