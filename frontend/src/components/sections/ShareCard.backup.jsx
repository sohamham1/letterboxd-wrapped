import React, { useRef } from 'react'
import html2canvas from 'html2canvas'
import { getCinematicArchetype } from './PersonalityArchetype'
import './ShareCard.css'

function ShareCard({ userData }) {
    const cardRef = useRef(null)
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
        if (!cardRef.current) return

        try {
            // Clone the card for manipulation
            const cardClone = cardRef.current.cloneNode(true)
            cardClone.style.position = 'absolute'
            cardClone.style.left = '-9999px'
            cardClone.style.filter = 'brightness(1.1) saturate(1.08)'
            document.body.appendChild(cardClone)

            // Get all poster images
            const posterImages = cardClone.querySelectorAll('.poster-item img')

            // Convert each image to a properly cropped canvas
            const imagePromises = Array.from(posterImages).map(async (img) => {
                const parent = img.parentElement
                const rect = parent.getBoundingClientRect()

                // Create canvas with exact poster dimensions
                const canvas = document.createElement('canvas')
                const targetWidth = rect.width
                const targetHeight = rect.width * 1.5 // 2:3 ratio

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
                const targetAspect = 2 / 3

                let sourceX = 0
                let sourceY = 0
                let sourceWidth = img.naturalWidth
                let sourceHeight = img.naturalHeight

                if (imgAspect > targetAspect) {
                    // Image is wider - crop sides
                    sourceWidth = img.naturalHeight * targetAspect
                    sourceX = (img.naturalWidth - sourceWidth) / 2
                } else {
                    // Image is taller - crop top/bottom, favor top 30%
                    sourceHeight = img.naturalWidth / targetAspect
                    sourceY = img.naturalHeight * 0.15 // Start at 15% to show upper portion
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
                <button className="btn-primary share-download-btn share-download-btn-large animate-fade-up" onClick={handleDownload}>
                    <span>Download {activeYear} Wrapped 📸</span>
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
                                            <div className="poster-placeholder"></div>
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
                            <span className="cta-text">GET YOUR WRAPPED AT</span>
                            <span className="cta-url">LETTERBOXD-WRAPPED.COM</span>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    )
}

export default ShareCard
