import React, { useEffect, useState } from 'react'
import ArchetypeShareCard from './ArchetypeShareCard'
import { getCinematicArchetype } from './archetypeSystem'

function EndSection({
    userData,
    archetype: archetypeOverride = null,
    shareStats: shareStatsOverride = null,
    currentYear = 2025,
    availableYears = [],
    onSelectYear,
    isYearLoading = false,
    yearFallbackNotice = '',
    isVisible = false
}) {
    const [yearLoadingMsgIndex, setYearLoadingMsgIndex] = useState(0)
    const yearLoadingMessages = [
        'Consulting the IMDb oracle',
        'Rebuilding your cinematic timeline',
        'Mapping your films to the right year',
        'Projecting your watch data',
        'Cutting your new wrapped reel'
    ]

    const sortedYears = [...availableYears].sort((a, b) => b - a)
    const archetype = archetypeOverride || getCinematicArchetype({
        stats: userData?.stats,
        flavor: userData?.flavorProfile,
        genres: userData?.genres,
        rewatchData: userData?.rewatchData,
        dayOfWeek: userData?.dayOfWeek,
        topFilms: userData?.topFilms,
        topDirectors: userData?.topDirectors
    })
    const shareStats = shareStatsOverride || {
        totalFilms: userData?.stats?.totalFilms || 0,
        averageRating: userData?.stats?.averageRating || 0,
        director: userData?.topDirectors?.[0]?.name || '',
        actor: userData?.topActors?.[0]?.name || '',
        year: currentYear
    }
    useEffect(() => {
        if (!isYearLoading) {
            setYearLoadingMsgIndex(0)
            return
        }
        const timer = setInterval(() => {
            setYearLoadingMsgIndex((prev) => (prev + 1) % yearLoadingMessages.length)
        }, 2200)
        return () => clearInterval(timer)
    }, [isYearLoading])

    return (
        <div className={`wrapped__end-content ${isVisible ? 'wrapped__end-content--cinematic' : ''}`}>
            <span className="wrapped__label wrapped__end-label">That's a wrap! 🎬</span>
            <h2 className="text-display wrapped__end-heading">Your Cinematic Year {currentYear}</h2>
            <p className="text-secondary wrapped__end-copy">
                Share your archetype card, then challenge friends to generate their own wrapped.
            </p>
            {yearFallbackNotice && (
                <p className="wrapped__year-fallback-note wrapped__end-lockin">
                    {yearFallbackNotice}
                </p>
            )}

            <div className="wrapped__share-panel wrapped__share-panel--cinematic">
                <h3 className="wrapped__share-title">Share Your Archetype</h3>
                <ArchetypeShareCard
                    archetype={archetype}
                    stats={shareStats}
                    username={userData?.username || ''}
                    year={currentYear}
                    shareUrl="https://movies-wrapped-2025.vercel.app"
                    showActions={true}
                />
            </div>

            {sortedYears.length > 1 && (
                <div className="wrapped__years-panel wrapped__years-panel--cinematic">
                    <h3 className="wrapped__years-title">Explore Your Other Years</h3>
                    <p className="wrapped__years-copy text-secondary">Pick a year to load a full wrapped experience!</p>
                    <div className="wrapped__years-carousel">
                        {sortedYears.map((year) => (
                            <button
                                key={year}
                                type="button"
                                className={`wrapped__year-chip ${year === currentYear ? 'active' : ''}`}
                                onClick={() => onSelectYear && onSelectYear(year)}
                                disabled={isYearLoading && year !== currentYear}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                    {isYearLoading && (
                        <p className="wrapped__years-loading text-secondary">
                            {yearLoadingMessages[yearLoadingMsgIndex]}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

export default EndSection
