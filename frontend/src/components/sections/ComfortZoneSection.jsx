import React from 'react'

function ComfortZoneSection({ userData }) {
    const { rewatchData } = userData || {}

    if (!rewatchData || rewatchData.totalRewatches === 0) return null
    const highlightSource = Array.isArray(rewatchData.rewatchHighlights)
        ? rewatchData.rewatchHighlights.slice(0, 3)
        : []
    const highlights = highlightSource.length > 0
        ? highlightSource
        : (rewatchData.mostRewatched
            ? [{ title: rewatchData.mostRewatched, count: Math.max(1, rewatchData.mostRewatchCount || 1) }]
            : [])
    const highlightColumns = highlights.length >= 3 ? 3 : Math.max(1, highlights.length)

    const getQuote = () => {
        const rewatchPct = Number(rewatchData.rewatchPercentage || 0)
        const repeatCount = rewatchData.mostRewatchCount || 0

        if (rewatchPct >= 50) {
            return "Half your year was rewatches. Are you okay? Do you need new friends?"
        }
        if (rewatchPct >= 35) {
            return "You're rewatching more than discovering. Avoidant, much?"
        }
        if (repeatCount >= 5) {
            return `You watched that movie ${repeatCount} times. That's not comfort. That's obsession.`
        }
        if (repeatCount >= 3) {
            return "You rewatched that movie three times. Commitment issues or taste? Both valid."
        }
        if (rewatchPct >= 20) {
            return "You revisit the good stuff when reality gets too real. We get it."
        }
        if (rewatchPct >= 10) {
            return "Minimal rewatches. You're either brave or you have the memory of a goldfish."
        }
        return "You barely rewatch anything. Either you have taste or terrible taste. Hard to tell."
    }

    return (
        <div className="wrapped__comfort-shell">
            <div className="wrapped__stat-card wrapped__comfort-card">
                <span className="wrapped__stat-label">Comfort Zone 🔁</span>

                <div className="wrapped__comfort-top">
                    <p className="text-secondary wrapped__comfort-subtitle">
                        Your most rewatched:
                    </p>
                    <div className={`wrapped__comfort-grid wrapped__comfort-grid--${highlightColumns}`}>
                        {highlights.map((item, index) => (
                            <div key={`${item.title}-${index}`} className="wrapped__comfort-item">
                                <div className="text-display wrapped__comfort-item-title">
                                    {item.title}
                                </div>
                                <div className="wrapped__comfort-item-count">
                                    {item.count === 1 ? 'rewatched once' : `${item.count} rewatches`}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="wrapped__comfort-divider"></div>

                <div style={{ marginBottom: '2rem' }}>
                    <h4 className="wrapped__stat-number text-gradient-blue" style={{ margin: '0.5rem 0' }}>
                        {Math.round(rewatchData.rewatchPercentage)}%
                    </h4>
                    <p className="text-secondary" style={{ fontSize: '1rem' }}>
                        of your films were rewatches
                    </p>
                </div>

                <div className="quote-container wrapped__comfort-quote">
                    <p className="wrapped__comfort-quote-text">
                        {getQuote()}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default ComfortZoneSection
