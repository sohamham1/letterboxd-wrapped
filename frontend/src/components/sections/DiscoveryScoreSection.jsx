import React from 'react'

function DiscoveryScoreSection({ userData }) {
    const { rewatchData } = userData || {}

    if (!rewatchData) return null

    const discoveryScore = Math.round(rewatchData.discoveryScore)

    const getLabel = (score) => {
        if (score >= 90) return { label: "Explorer", emoji: "🚀", message: "Always seeking new horizons" }
        if (score >= 75) return { label: "Adventurer", emoji: "🗺️", message: "You love discovering new films" }
        if (score >= 50) return { label: "Balanced", emoji: "⚖️", message: "Perfect mix of old and new" }
        if (score >= 25) return { label: "Revisitor", emoji: "🔄", message: "You appreciate the classics" }
        return { label: "Comfort Seeker", emoji: "🏡", message: "Favorites on repeat" }
    }

    const { label, emoji, message } = getLabel(discoveryScore)

    return (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <div className="wrapped__stat-card" style={{ textAlign: 'center', maxWidth: '620px', width: '100%' }}>
                <span className="wrapped__stat-label">Discovery Score {emoji}</span>

                <div className="score-display" style={{ margin: '1rem 0 2rem 0' }}>
                    <h3 className="wrapped__stat-number text-gradient-blue" style={{ margin: '0.5rem 0' }}>
                        {discoveryScore}%
                    </h3>
                    <p className="text-secondary" style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>
                        first-time watches
                    </p>
                </div>

                <div className="progress-bar" style={{
                    width: '100%',
                    height: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        width: `${discoveryScore}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
                        transition: 'width 1s ease'
                    }}></div>
                </div>

                <div className="label-container" style={{
                    padding: '1.5rem',
                    background: 'rgba(251, 191, 36, 0.15)',
                    borderRadius: '1rem',
                    border: '2px solid #fbbf24'
                }}>
                    <h4 style={{
                        fontSize: '1.8rem',
                        marginBottom: '0.5rem',
                        color: '#fbbf24',
                        fontWeight: 700
                    }}>
                        {label}
                    </h4>
                    <p className="text-primary" style={{ margin: 0 }}>
                        {message}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default DiscoveryScoreSection
