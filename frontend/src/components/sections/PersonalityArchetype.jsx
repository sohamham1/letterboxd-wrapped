import React from 'react'
import ArchetypeShareCard from './ArchetypeShareCard'
import { getCinematicArchetype } from './archetypeSystem'
import './PersonalityArchetype.css'

export { getCinematicArchetype } from './archetypeSystem'

function PersonalityArchetype({
    stats = {},
    flavor = {},
    genres = [],
    rewatchData = {},
    dayOfWeek = {},
    topFilms = [],
    topDirectors = [],
    topActors = [],
    year = 2025,
    username = '',
    archetype: archetypeOverride = null,
    shareStats: shareStatsOverride = null,
    isVisible
}) {
    const archetype = archetypeOverride || getCinematicArchetype({
        stats,
        flavor,
        genres,
        rewatchData,
        dayOfWeek,
        topFilms,
        topDirectors
    })

    const shareStats = shareStatsOverride || {
        totalFilms: stats.totalFilms || 0,
        averageRating: stats.averageRating || 0,
        director: topDirectors?.[0]?.name || '',
        actor: topActors?.[0]?.name || '',
        year
    }

    return (
        <div className="archetype">
            <div className={`archetype__content ${isVisible ? 'animate-fade-up' : ''}`}>
                <span className="wrapped__label">Your Cinematic Soul</span>
                <h2 className="archetype__title text-display">{archetype.title}</h2>
                <p className="archetype__desc">{archetype.taglineSection || archetype.taglineCard || archetype.tagline}</p>

                <ArchetypeShareCard
                    archetype={archetype}
                    stats={shareStats}
                    username={username}
                    year={year}
                    showActions={false}
                />
            </div>
        </div>
    )
}

export default PersonalityArchetype
