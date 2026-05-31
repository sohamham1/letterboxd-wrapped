import React, { useMemo, useState } from 'react'
import './NarrativeTimeline.css'

function NarrativeTimeline({ narrative, isVisible }) {
    const [brokenPosters, setBrokenPosters] = useState({})

    if (!narrative) return null

    const getPosterUrl = (url) => (url ? `/api/proxy?url=${encodeURIComponent(url)}` : '')
    const items = useMemo(() => (Array.isArray(narrative) ? narrative : []), [narrative])

    const markPosterBroken = (index) => {
        setBrokenPosters((prev) => {
            if (prev[index]) return prev
            return { ...prev, [index]: true }
        })
    }

    return (
        <div className="narrative-container">
            <div className="narrative-header">
                <h2 className="narrative-main-title text-display animate-fade-up delay-1">Your Cinematic <span className="text-gradient-blue">Journey</span></h2>
            </div>

            <div className="narrative-track">
                <div className="narrative-line"></div>

                {items.length > 0 ? (
                    items.map((item, index) => (
                        <div key={index} className={`narrative-item ${index % 2 !== 0 ? 'reverse' : ''} ${isVisible ? 'animate-slide-in' : ''}`} style={{ '--delay': `${index * 200}ms` }}>
                            <div className="narrative-side narrative-side--poster">
                                {item.poster && !brokenPosters[index] ? (
                                    <>
                                        <div className="narrative-poster">
                                            <img
                                                src={getPosterUrl(item.poster)}
                                                alt={item.movieTitle || item.title}
                                                loading="lazy"
                                                onError={() => markPosterBroken(index)}
                                            />
                                        </div>
                                        {item.movieTitle && (
                                            <span className="narrative-poster-title">{item.movieTitle}</span>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="narrative-poster narrative-poster--placeholder">
                                            <div className="narrative-poster-fallback">
                                                <span className="narrative-poster-fallback-title">{item.movieTitle || item.title}</span>
                                                <span className="narrative-poster-fallback-copy">Poster unavailable for this title right now.</span>
                                            </div>
                                        </div>
                                        {item.movieTitle && (
                                            <span className="narrative-poster-title">{item.movieTitle}</span>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="narrative-marker-container">
                                <div className={`narrative-marker ${index === 0 ? 'start' : index === narrative.length - 1 ? 'end' : ''}`}></div>
                            </div>

                            <div className="narrative-side narrative-side--content">
                                <div className="narrative-content">
                                    <span className="narrative-date">{item.month}</span>
                                    <div className="narrative-text">
                                        <span className="narrative-label">{item.title}</span>
                                        <h3 className="narrative-description text-gradient-blue">{item.description}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="narrative-placeholder">Your story is still being written...</div>
                )}
            </div>
        </div>
    )
}

export default NarrativeTimeline
