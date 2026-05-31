import React, { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { getCinematicArchetype } from './PersonalityArchetype'
import './ShareCard.css'

function ShareCard({ userData }) {
    const cardRef = useRef(null)
    const [isExporting, setIsExporting] = useState(false)
    const activeYear = userData?.year || 2025
    const archetype = getCinematicArchetype({
        stats: userData.stats,
        flavor: userData.flavorProfile,
        genres: userData.genres,
        rewatchData: userData.rewatchData,
        dayOfWeek: userData.dayOfWeek,
        topFilms: userData.topFilms,
        topDirectors: userData.topDirectors
    })

    const handleDownload = async () => {
        if (isExporting) return
        if (!cardRef.current) return

        try {
            setIsExporting(true)
            // Clone the card for manipulation
            const cardClone = cardRef.current.cloneNode(true)
            cardClone.style.position = 'absolute'
            cardClone.style.left = '-9999px'
            cardClone.style.filter = 'brightness(1.1) saturate(1.08)'
            document.body.appendChild(cardClone)

            // html2canvas can render text-gradients as rectangles in some browsers.
            // Force solid text colors in the off-screen clone used for export.
            const heroNumberEl = cardClone.querySelector('.hero-number')
            if (heroNumberEl) {
                heroNumberEl.style.background = 'none'
                heroNumberEl.style.webkitTextFillColor = '#93c5fd'
                heroNumberEl.style.color = '#93c5fd'
            }
            const archetypeTitleEl = cardClone.querySelector('.archetype-title-text')
            if (archetypeTitleEl) {
                archetypeTitleEl.style.background = 'none'
                archetypeTitleEl.style.webkitTextFillColor = '#60a5fa'
                archetypeTitleEl.style.color = '#60a5fa'
            }

            // Get all poster images
            const posterImages = cardClone.querySelectorAll('.poster-item img')

            // Convert each image to a properly cropped canvas
            const imagePromises = Array.from(posterImages).map(async (img) => {
                const parent = img.parentElement
                const rect = parent.getBoundingClientRect()

                // Create canvas with exact poster dimensions
                const canvas = document.createElement('canvas')
                const targetWidth = rect.width
                const targetHeight = rect.height

                canvas.width = targetWidth
                canvas.height = targetHeight
                canvas.style.width = '100%'
                canvas.style.height = '100%'
                canvas.style.position = 'absolute'
                canvas.style.top = '0'
                canvas.style.left = '0'

                // Wait for image to load
                if (!img.complete) {
                    await new Promise((resolve) => {
                        img.onload = resolve
                    })
                }

                // Draw image cropped
                const ctx = canvas.getContext('2d')
                const imgAspect = img.naturalWidth / img.naturalHeight
                const targetAspect = rect.width / rect.height

                let sourceX = 0
                let sourceY = 0
                let sourceWidth = img.naturalWidth
                let sourceHeight = img.naturalHeight

                if (imgAspect > targetAspect) {
                    // Image is wider - crop sides
                    sourceWidth = img.naturalHeight * targetAspect
                    sourceX = (img.naturalWidth - sourceWidth) / 2
                } else {
                    // Image is taller - crop top/bottom, slightly favor upper area
                    sourceHeight = img.naturalWidth / targetAspect
                    sourceY = (img.naturalHeight - sourceHeight) * 0.42
                    sourceY = Math.max(0, Math.min(sourceY, img.naturalHeight - sourceHeight))
                }

                ctx.drawImage(
                    img,
                    sourceX, sourceY, sourceWidth, sourceHeight,
                    0, 0, canvas.width, canvas.height
                )

                // Replace img with canvas
                parent.replaceChild(canvas, img)
            })

            await Promise.all(imagePromises)

            // Wait a bit for render
            await new Promise(resolve => setTimeout(resolve, 200))

            // Capture the clone
            const finalCanvas = await html2canvas(cardClone, {
                useCORS: true,
                backgroundColor: '#0a0a0a',
                scale: 2.25,
                logging: false,
                allowTaint: false
            })

            // Clean up clone
            document.body.removeChild(cardClone)

            const link = document.createElement('a')
            link.download = `wrapped-${activeYear}-${userData.username}.jpg`
            link.href = finalCanvas.toDataURL('image/jpeg', 0.92)
            link.click()
        } catch (err) {
            console.error('Failed to generate image:', err)
        } finally {
            setIsExporting(false)
        }
    }

    const tasteAxes = [
        { label: 'MN', value: userData.flavorProfile.mainstream },
        { label: 'MD', value: userData.flavorProfile.modern },
        { label: 'CM', value: userData.flavorProfile.light },
        { label: 'AH', value: userData.flavorProfile.arthouse },
        { label: 'SB', value: userData.flavorProfile.slow }
    ]

    // Use proxy for canvas capture to avoid CORS issues
    const getPosterUrl = (url) => {
        if (!url) return ''
        return `/api/proxy?url=${encodeURIComponent(url)}`
    }

    return (
        <div className="share-container">
            <div className="share-controls">
                <button
                    className="btn-primary share-download-btn share-download-btn-large animate-fade-up"
                    onClick={handleDownload}
                    disabled={isExporting}
                    aria-busy={isExporting}
                >
                    {isExporting ? (
                        <>
                            <span className="share-download-spinner" aria-hidden="true"></span>
                            <span>Generating image...</span>
                        </>
                    ) : (
                        <span>Download {activeYear} Wrapped 📸</span>
                    )}
                </button>
            </div>

            <div className="share-card-canvas-wrapper">
                <div className="share-poster-card" ref={cardRef}>
                    <div className="poster-grain"></div>
                    <div className="poster-vignette"></div>

                    <div className="corner corner-tl"></div>
                    <div className="corner corner-tr"></div>
                    <div className="corner corner-bl"></div>
                    <div className="corner corner-br"></div>

                    <header className="poster-header">
                        <div className="poster-logo">
                            <span className="wrapped-text">LETTERBOXD WRAPPED</span>
                            <div className="year-badge">{activeYear}</div>
                        </div>
                    </header>

                    <div className="poster-main-content">
                        <div className="hero-stat-block">
                            <h1 className="hero-number">{userData.stats.totalFilms}</h1>
                            <span className="hero-label">FILMS WATCHED</span>
                            <div className="username-tag">@{userData.username.toLowerCase()}</div>
                        </div>

                        <div className="poster-grid-container">
                            <div className="top-rated-label">TOP RATED FILMS</div>
                            <div className="poster-grid">
                                {userData.topFilms.slice(0, 4).map((film, i) => (
                                    <div key={i} className={`poster-item p-${i}`}>
                                        {film.posterUrl ? (
                                            <>
                                                <img src={getPosterUrl(film.posterUrl)} alt={film.title} />
                                                <div className="poster-title-overlay">
                                                    <span className="poster-title">{film.title}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="poster-placeholder">
                                                <span className="poster-placeholder-title">{film.title}</span>
                                                <span className="poster-placeholder-copy">Poster unavailable</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="archetype-section">
                            <h2 className="archetype-title">
                                <span className="archetype-label">Type of Cinephile: </span>
                                <span className="archetype-title-text">{archetype.title.toUpperCase()}</span>{' '}
                                <span className="archetype-emoji">{archetype.icon}</span>
                            </h2>
                        </div>
                    </div>

                    <footer className="poster-footer">
                        <div className="cta-block">
                            <span className="cta-url">MOVIES-WRAPPED-2025.VERCEL.APP</span>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    )
}

export default ShareCard
