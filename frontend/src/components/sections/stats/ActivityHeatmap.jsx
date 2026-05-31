import React, { useEffect, useMemo, useRef, useState } from 'react'
import './ActivityHeatmap.css'

function ActivityHeatmap({ data, isVisible, year = 2025 }) {
    const [selectedDay, setSelectedDay] = useState(null)
    const [hasHorizontalInteracted, setHasHorizontalInteracted] = useState(false)
    const [canScrollHorizontally, setCanScrollHorizontally] = useState(false)
    const [isMobileViewport, setIsMobileViewport] = useState(false)
    const scrollContainerRef = useRef(null)

    const toDateKey = (dateObj) => {
        const y = dateObj.getFullYear()
        const m = String(dateObj.getMonth() + 1).padStart(2, '0')
        const d = String(dateObj.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
    }

    const parseDateKey = (dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number)
        return new Date(y, m - 1, d)
    }

    useEffect(() => {
        setSelectedDay(null)
        setHasHorizontalInteracted(false)
    }, [year, data])

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
        const media = window.matchMedia('(max-width: 768px)')
        const sync = () => setIsMobileViewport(media.matches)
        sync()
        if (typeof media.addEventListener === 'function') {
            media.addEventListener('change', sync)
            return () => media.removeEventListener('change', sync)
        }
        media.addListener(sync)
        return () => media.removeListener(sync)
    }, [])

    // Process data into weeks for the grid
    const weeks = useMemo(() => {
        // Create full calendar map for the selected year
        const dateMap = {}
        if (data) {
            data.forEach(item => {
                dateMap[item.date] = {
                    count: item.count || 0,
                    movies: item.movies || []
                }
            })
        }

        const weeksArray = []
        let currentWeek = []

        const startDate = new Date(year, 0, 1)
        const endDate = new Date(year, 11, 31)
        const startingDay = startDate.getDay() // 0=Sunday

        for (let i = 0; i < startingDay; i++) currentWeek.push(null)

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = toDateKey(d)
            const dayData = dateMap[dateStr] || { count: 0, movies: [] }
            currentWeek.push({
                date: dateStr,
                count: dayData.count,
                movies: dayData.movies
            })

            if (currentWeek.length === 7) {
                weeksArray.push(currentWeek)
                currentWeek = []
            }
        }

        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) currentWeek.push(null)
            weeksArray.push(currentWeek)
        }

        return weeksArray
    }, [data, year])

    const maxDailyCount = useMemo(() => {
        if (!data || data.length === 0) return 0
        return data.reduce((max, item) => Math.max(max, item.count || 0), 0)
    }, [data])

    useEffect(() => {
        const el = scrollContainerRef.current
        if (!el) return undefined

        const measureOverflow = () => {
            const hasOverflow = (el.scrollWidth - el.clientWidth) > 10
            setCanScrollHorizontally(hasOverflow)
        }

        const raf = requestAnimationFrame(measureOverflow)
        window.addEventListener('resize', measureOverflow)
        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener('resize', measureOverflow)
        }
    }, [weeks, isVisible, isMobileViewport])

    const getColorClass = (count) => {
        if (count === 0) return 'level-0'
        if (maxDailyCount <= 1) return 'level-4'
        const ratio = count / maxDailyCount
        if (ratio <= 0.25) return 'level-1'
        if (ratio <= 0.5) return 'level-2'
        if (ratio <= 0.75) return 'level-3'
        return 'level-4'
    }

    const formatDate = (dateStr) => {
        const date = parseDateKey(dateStr)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    const handleHorizontalScroll = () => {
        const el = scrollContainerRef.current
        if (!el || hasHorizontalInteracted) return
        if (Math.abs(el.scrollLeft) > 8) {
            setHasHorizontalInteracted(true)
        }
    }

    return (
        <div className={`activity-heatmap ${isVisible ? 'animate-fade-up' : ''}`}>
            <div className="heatmap-header">
                <h3 className="heatmap-title text-display">Year in Pixels</h3>
                <p className="heatmap-subtitle text-secondary">Every day you watched a film in {year}</p>
            </div>

            {isMobileViewport && canScrollHorizontally && (
                <p className={`heatmap-swipe-hint ${hasHorizontalInteracted ? 'is-dismissed' : ''}`}>
                    <span aria-hidden="true">↔</span>
                    <span>Swipe left or right to explore your year</span>
                </p>
            )}

            <div
                ref={scrollContainerRef}
                className={`heatmap-scroll-container ${canScrollHorizontally ? 'has-overflow' : ''} ${hasHorizontalInteracted ? 'has-interacted' : ''}`}
                onScroll={handleHorizontalScroll}
            >
                {isMobileViewport && canScrollHorizontally && !hasHorizontalInteracted && (
                    <>
                        <span className="heatmap-scroll-cue heatmap-scroll-cue--left" aria-hidden="true">‹</span>
                        <span className="heatmap-scroll-cue heatmap-scroll-cue--right" aria-hidden="true">›</span>
                    </>
                )}
                <div className="heatmap-grid">
                    {/* Weeks columns */}
                    {weeks.map((week, wIndex) => (
                        <div key={wIndex} className="heatmap-week">
                            {week.map((day, dIndex) => (
                                <div
                                    key={day ? day.date : `empty-${wIndex}-${dIndex}`}
                                    className={`heatmap-cell ${day ? getColorClass(day.count) : 'empty'}`}
                                    title={day ? `${day.date}: ${day.count} films` : ''}
                                    tabIndex={day ? 0 : -1}
                                    role={day ? 'button' : undefined}
                                    aria-label={day ? `${formatDate(day.date)}: ${day.count} films watched` : undefined}
                                    onMouseEnter={day ? () => setSelectedDay(day) : undefined}
                                    onFocus={day ? () => setSelectedDay(day) : undefined}
                                    onClick={day ? () => setSelectedDay(day) : undefined}
                                    onKeyDown={day ? (e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            setSelectedDay(day)
                                        }
                                    } : undefined}
                                ></div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div className="heatmap-selected-info" aria-live="polite">
                {selectedDay ? (
                    <div className="heatmap-selected-details">
                        <div className="heatmap-selected-row">
                            <span className="heatmap-selected-date">{formatDate(selectedDay.date)}</span>
                            <span className="heatmap-selected-count">
                                {selectedDay.count} {selectedDay.count === 1 ? 'film' : 'films'}
                            </span>
                        </div>
                        {selectedDay.movies && selectedDay.movies.length > 0 && (
                            selectedDay.movies.length > 3 ? (
                                <p className="heatmap-selected-movies heatmap-selected-movies--compact">
                                    {selectedDay.movies.join(', ')}
                                </p>
                            ) : (
                                <ul className="heatmap-selected-movies">
                                    {selectedDay.movies.map((movie, index) => (
                                        <li key={`${selectedDay.date}-${index}`}>{movie}</li>
                                    ))}
                                </ul>
                            )
                        )}
                    </div>
                ) : (
                    <span className="heatmap-selected-placeholder">
                        {isMobileViewport
                            ? 'Tap a day to see date, film count, and titles watched'
                            : 'Hover or click a day to see date, film count, and titles watched'}
                    </span>
                )}
            </div>

            <div className="heatmap-legend">
                <span>Less</span>
                <div className="legend-items">
                    <div className="heatmap-cell level-0"></div>
                    <div className="heatmap-cell level-1"></div>
                    <div className="heatmap-cell level-2"></div>
                    <div className="heatmap-cell level-3"></div>
                    <div className="heatmap-cell level-4"></div>
                </div>
                <span>More</span>
            </div>
        </div>
    )
}

export default ActivityHeatmap
