import React, { useEffect, useState } from 'react'

function WatchStreakSection({ userData, isVisible = true }) {
    const { watchStreaks } = userData || {}
    const [animatedStreak, setAnimatedStreak] = useState(0)

    if (!watchStreaks || watchStreaks.longestStreak === 0) return null
    const longestStreak = watchStreaks.longestStreak || 0

    useEffect(() => {
        if (!isVisible) {
            setAnimatedStreak(0)
            return undefined
        }

        const magnitude = Math.log10(Math.max(longestStreak, 1))
        const duration = Math.min(900, Math.max(600, 640 + magnitude * 80))
        const startTime = performance.now()
        let frameId = null

        const tick = (timestamp) => {
            const elapsed = timestamp - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            const value = Math.round(longestStreak * eased)

            setAnimatedStreak(value)

            if (progress < 1) {
                frameId = requestAnimationFrame(tick)
            }
        }

        frameId = requestAnimationFrame(tick)
        return () => {
            if (frameId) cancelAnimationFrame(frameId)
        }
    }, [longestStreak, isVisible])

    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const hashString = (value) => {
        const text = String(value || '')
        let hash = 0
        for (let i = 0; i < text.length; i += 1) {
            hash = (hash * 31 + text.charCodeAt(i)) >>> 0
        }
        return hash
    }

    const formatTemplate = (line, streak) => line.replace(/\[X\]/g, String(streak))

    const getStreakOptions = (streak) => {
        if (streak === 1) {
            return [
                'One day. It\'s a start.',
                'Day one. We all start somewhere.',
                'Technically a streak.'
            ]
        }
        if (streak === 2) {
            return [
                'Two days. Back to back. Commitment emerging.',
                'Two in a row. We\'re watching this.',
                'Day two. This could become something.'
            ]
        }
        if (streak === 3) {
            return [
                'Three days straight. This is deliberate now.',
                'Day three. You\'re building a habit.',
                'Three days. Officially more than a coincidence.'
            ]
        }
        if (streak === 4) {
            return [
                'Four days. This is a routine.',
                'Day four. You\'re locked in.',
                'Four consecutive days. Respect.'
            ]
        }
        if (streak === 5) {
            return [
                'Five days. A full work week of cinema.',
                'Day five. You\'re in the zone now.',
                'Five days straight. Genuinely impressive.'
            ]
        }
        if (streak === 6) {
            return [
                'Six days. You haven\'t stopped all week.',
                'Day six. One day away from a full week.',
                'Six consecutive days. This is commitment.'
            ]
        }
        if (streak === 7) {
            return [
                'A full week. Seven days without missing.',
                'Day seven. One week streak. Iconic.',
                'Seven days straight. You\'ve made this a thing.'
            ]
        }
        if (streak === 8) {
            return [
                'Eight days. You\'re into week two now.',
                'Day eight. Most people quit by now.',
                'Eight days. This stopped being casual.'
            ]
        }
        if (streak === 9) {
            return [
                'Nine days. Over a week. Still going.',
                'Day nine. You\'re not stopping, are you?',
                'Nine consecutive days. We\'re monitoring this.'
            ]
        }
        if (streak === 10) {
            return [
                'Ten days. Double digits. Concerning.',
                'Day ten. This is a lifestyle now.',
                'Ten days straight. Touch grass maybe.'
            ]
        }
        if (streak >= 11 && streak <= 13) {
            return [
                'Day [X]. Nearly two weeks without a break.',
                '[X] days. This is getting serious.',
                '[X] consecutive days. We\'re worried.'
            ]
        }
        if (streak === 14) {
            return [
                'Two full weeks. Fourteen days straight.',
                'Day fourteen. Two weeks without missing. Unhinged.',
                'Fourteen days. This is your life now.'
            ]
        }
        if (streak >= 15 && streak <= 20) {
            return [
                'Day [X]. Over two weeks. Go outside.',
                '[X] days. This isn\'t normal anymore.',
                '[X] consecutive days. Seek help.'
            ]
        }
        if (streak === 21) {
            return [
                'Three weeks. Twenty-one days straight.',
                'Day twenty-one. Three full weeks. Are you okay?',
                'Twenty-one days. This is addiction.'
            ]
        }
        if (streak >= 22 && streak <= 29) {
            return [
                'Day [X]. Nearly a month. Seriously concerning.',
                '[X] days. You\'ve built your life around this.',
                '[X] consecutive days. This is unwell.'
            ]
        }
        if (streak === 30) {
            return [
                'Thirty days. A full month without missing.',
                'Day thirty. One month straight. Congratulations on never resting.',
                'Thirty days. This stopped being a hobby weeks ago.'
            ]
        }
        if (streak >= 31 && streak <= 59) {
            return [
                'Day [X]. Over a month. This is your entire personality.',
                '[X] days. You\'re in too deep to stop now.',
                '[X] consecutive days. Genuinely unhinged.'
            ]
        }
        if (streak === 60) {
            return [
                'Sixty days. Two full months. Touch grass.',
                'Day sixty. Two months without a break. Seek therapy.',
                'Sixty days straight. This is a cry for help.'
            ]
        }
        if (streak >= 61 && streak <= 89) {
            return [
                'Day [X]. Over two months. We\'re staging an intervention.',
                '[X] days. You\'ve forgotten what rest feels like.',
                '[X] consecutive days. This is concerning.'
            ]
        }
        if (streak === 90) {
            return [
                'Ninety days. Three full months. Are you okay?',
                'Day ninety. A full quarter of the year. Unhinged.',
                'Ninety days straight. Congratulations on forgetting sunlight exists.'
            ]
        }
        if (streak >= 91 && streak <= 179) {
            return [
                'Day [X]. Over three months. This isn\'t healthy.',
                '[X] days. You need help. Genuinely.',
                '[X] consecutive days. We\'re worried about you.'
            ]
        }
        if (streak === 180) {
            return [
                'One hundred eighty days. Half a year. Go outside.',
                'Day 180. Six months without missing. Seek help immediately.',
                'Half a year. Every single day. This is unwell.'
            ]
        }
        if (streak >= 181 && streak <= 364) {
            return [
                'Day [X]. Over half a year. This is your whole life.',
                '[X] days. You\'ve made cinema your entire existence.',
                '[X] consecutive days. Genuinely concerning behaviour.'
            ]
        }
        return [
            'Three hundred sixty-five days. Every single day this year.',
            'Day 365. You didn\'t miss once. Are you okay? Seriously.',
            'A full year. Every day. This is genuinely unhinged.'
        ]
    }

    const getStreakPunchline = (streak) => {
        const options = getStreakOptions(streak).map((line) => formatTemplate(line, streak))
        const seed = `${userData?.username || 'user'}:${streak}`
        const index = hashString(seed) % options.length
        return options[index]
    }

    const maxVisibleDays = 30
    const litDays = Math.min(animatedStreak, maxVisibleDays)
    const overflowDays = Math.max(0, animatedStreak - maxVisibleDays)

    return (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <div className="wrapped__stat-card wrapped__streak-card">
                <span className="wrapped__stat-label">Watch Streak</span>

                <div className="wrapped__streak-headline">
                    <h3 className="wrapped__stat-number text-gradient-blue">{animatedStreak}</h3>
                    <p className="text-secondary wrapped__streak-subtitle">Consecutive Days</p>
                </div>

                <p className="wrapped__stat-punchline">{getStreakPunchline(longestStreak)}</p>

                <p className="text-primary wrapped__streak-dates">
                    {formatDate(watchStreaks.streakStart)} - {formatDate(watchStreaks.streakEnd)}
                </p>

                <div className="wrapped__streak-strip" aria-label={`Watch streak visual: ${longestStreak} days`}>
                    {Array.from({ length: maxVisibleDays }).map((_, index) => (
                        <span
                            key={index}
                            className={`wrapped__streak-day ${index < litDays ? 'is-lit' : ''}`}
                            aria-hidden="true"
                        />
                    ))}
                    {overflowDays > 0 && (
                        <span className="wrapped__streak-overflow">+{overflowDays}</span>
                    )}
                </div>
            </div>
        </div>
    )
}

export default WatchStreakSection
