import React from 'react'

function DayOfWeekSection({ userData }) {
    const { dayOfWeek } = userData || {}

    if (!dayOfWeek || !dayOfWeek.breakdown) return null

    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const sortedBreakdown = [...dayOfWeek.breakdown].sort(
        (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
    )
    const maxCount = Math.max(...sortedBreakdown.map((d) => Number(d.count) || 0))

    const getBarWidth = (count) => {
        if (maxCount === 0) return '0%'
        return `${(count / maxCount) * 100}%`
    }

    const dayPersonalityCopy = {
        Monday: 'Either healing from the weekend or avoiding responsibilities. Probably both.',
        Tuesday: "The most unhinged day to watch movies, lowkey unemployed behavior. We're impressed!",
        Wednesday: "Hump day cinema. You're either very organized or completely lost in the week.",
        Thursday: 'Close enough to the weekend to pretend it counts. We respect the optimism.',
        Friday: 'The classic. You know how to start a weekend properly.',
        Saturday: `Peak "Netflix and Chill" day. You're doing this right!`,
        Sunday: 'The last stand before Monday ruins everything. Sunday scaries done right!'
    }
    const personality = dayPersonalityCopy[dayOfWeek.favoriteDay] || 'you picked your ritual day and stuck with it.'

    return (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <div className="wrapped__stat-card wrapped__day-card" style={{ maxWidth: '620px', width: '100%' }}>
                <span className="wrapped__stat-label wrapped__day-label">
                    Most Watched Day of 2025
                </span>

                <div className="wrapped__day-hero">
                    <h3 className="text-display wrapped__day-title">
                        {dayOfWeek.favoriteDay}
                    </h3>
                    <p className="wrapped__day-count">
                        {dayOfWeek.favoriteDayCount} films
                    </p>
                </div>

                <p className="wrapped__stat-punchline">{personality}</p>

                <div className="wrapped__day-breakdown">
                    {sortedBreakdown.map((item) => {
                        const isFavorite = item.day === dayOfWeek.favoriteDay
                        const count = Number(item.count) || 0
                        return (
                            <div key={item.day} className={`wrapped__day-row ${isFavorite ? 'is-favorite' : ''}`}>
                                <div className={`wrapped__day-name ${isFavorite ? 'is-favorite' : ''}`}>
                                    <span>{item.day}</span>
                                </div>
                                <div className="wrapped__day-track">
                                    <div
                                        className={`wrapped__day-fill ${isFavorite ? 'is-favorite' : ''}`}
                                        style={{ width: getBarWidth(count) }}
                                    >
                                        {isFavorite && (
                                            <span className="wrapped__day-fill-label">
                                                {count} Films
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {!isFavorite && (
                                    <div className="wrapped__day-value">
                                        <span className="wrapped__day-value-text">{count}</span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default DayOfWeekSection
