import React, { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { ARCHETYPES } from './archetypeSystem'
import './ArchetypeShareCard.css'

const DEFAULT_SHARE_URL = 'https://movies-wrapped-2025.vercel.app'

const F = {
    chrome: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    statLabel: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    statValue: "'Outfit', 'Playfair Display', Georgia, sans-serif",
    tagline: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
}

const svgStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none'
}

function brightenHex(color, amount = 0.2) {
    if (typeof color !== 'string') return color
    const hex = color.trim()
    if (!/^#([0-9a-fA-F]{6})$/.test(hex)) return color
    const to255 = (v) => Math.max(0, Math.min(255, Math.round(v)))
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const mix = (channel) => to255(channel + (255 - channel) * amount)
    const rr = mix(r).toString(16).padStart(2, '0')
    const gg = mix(g).toString(16).padStart(2, '0')
    const bb = mix(b).toString(16).padStart(2, '0')
    return `#${rr}${gg}${bb}`
}

function hexToRgba(color, alpha = 1) {
    if (typeof color !== 'string') return color
    const hex = color.trim()
    if (!/^#([0-9a-fA-F]{6})$/.test(hex)) return color
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function getReadableTextColor(background, dark = '#0b1020', light = '#f8fbff') {
    if (typeof background !== 'string') return dark
    const hex = background.trim()
    if (!/^#([0-9a-fA-F]{6})$/.test(hex)) return dark
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    return luminance > 0.54 ? dark : light
}

function MotifSVG({ motif, accent, accent2 }) {
    const op = 0.12
    switch (motif) {
    case 'grid':
        return (
            <svg style={svgStyle} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                {Array.from({ length: 9 }).map((_, i) => (
                    <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="400" stroke={accent} strokeWidth="0.5" opacity={op} />
                ))}
                {Array.from({ length: 9 }).map((_, i) => (
                    <line key={`h${i}`} x1="0" y1={i * 50} x2="400" y2={i * 50} stroke={accent} strokeWidth="0.5" opacity={op} />
                ))}
                <rect x="160" y="160" width="80" height="80" stroke={accent} strokeWidth="1" fill="none" opacity="0.2" />
                <rect x="140" y="140" width="120" height="120" stroke={accent2} strokeWidth="0.5" fill="none" opacity="0.1" />
            </svg>
        )
    case 'diagonal':
        return (
            <svg style={svgStyle} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                {Array.from({ length: 14 }).map((_, i) => (
                    <line key={i} x1={i * 30 - 20} y1="0" x2={i * 30 + 180} y2="400" stroke={accent} strokeWidth="1" opacity={op * 1.5} />
                ))}
                <line x1="0" y1="400" x2="400" y2="0" stroke={accent2} strokeWidth="2" opacity="0.15" />
                <line x1="0" y1="350" x2="400" y2="-50" stroke={accent2} strokeWidth="1" opacity="0.08" />
            </svg>
        )
    case 'arc':
        return (
            <svg style={svgStyle} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                {[80, 130, 180, 230, 280].map((r, i) => (
                    <circle key={i} cx="200" cy="480" r={r} stroke={accent} strokeWidth="0.8" fill="none" opacity={op * 1.2} />
                ))}
                <circle cx="200" cy="480" r="350" stroke={accent2} strokeWidth="1.5" fill="none" opacity="0.08" />
            </svg>
        )
    case 'minimal':
        return (
            <svg style={svgStyle} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                <line x1="0" y1="200" x2="400" y2="200" stroke={accent} strokeWidth="0.5" opacity="0.2" />
                <line x1="200" y1="0" x2="200" y2="400" stroke={accent} strokeWidth="0.5" opacity="0.2" />
                <rect x="100" y="100" width="200" height="200" stroke={accent2} strokeWidth="0.5" fill="none" opacity="0.1" />
                <rect x="170" y="170" width="60" height="60" fill={accent} opacity="0.06" />
            </svg>
        )
    case 'burst':
        return (
            <svg style={svgStyle} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                {Array.from({ length: 16 }).map((_, i) => {
                    const rad = (i * 360 / 16) * Math.PI / 180
                    return (
                        <line
                            key={i}
                            x1="200"
                            y1="200"
                            x2={200 + Math.cos(rad) * 250}
                            y2={200 + Math.sin(rad) * 250}
                            stroke={accent}
                            strokeWidth="0.8"
                            opacity={op * 1.3}
                        />
                    )
                })}
                <circle cx="200" cy="200" r="30" fill={accent} opacity="0.07" />
            </svg>
        )
    case 'scatter':
        return (
            <svg style={svgStyle} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                {[[40, 80], [180, 50], [320, 120], [80, 200], [300, 180], [150, 310], [260, 340], [50, 340], [370, 280], [200, 200]].map(([cx, cy], i) => (
                    <circle key={i} cx={cx} cy={cy} r={4 + (i % 3) * 3} fill={i % 2 === 0 ? accent : accent2} opacity={op * 1.5} />
                ))}
                {[[40, 80], [320, 120], [150, 310]].map(([cx, cy], i) => (
                    <circle key={`r${i}`} cx={cx} cy={cy} r={16 + i * 8} stroke={accent} strokeWidth="0.5" fill="none" opacity="0.08" />
                ))}
            </svg>
        )
    case 'loop':
        return (
            <svg style={svgStyle} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                {[60, 100, 140, 180].map((r, i) => (
                    <circle key={i} cx="200" cy="200" r={r} stroke={accent} strokeWidth="0.7" fill="none" opacity={op + i * 0.02} />
                ))}
                <circle cx="200" cy="200" r="8" fill={accent} opacity="0.3" />
                <circle cx="200" cy="200" r="220" stroke={accent2} strokeWidth="0.5" fill="none" opacity="0.06" />
            </svg>
        )
    case 'bars':
        return (
            <svg style={svgStyle} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                {[0.15, 0.35, 0.55, 0.72, 0.85].map((pct, i) => (
                    <rect key={i} x="0" y={400 * pct - 1} width="400" height="1" fill={accent} opacity={op * 1.5} />
                ))}
                <rect x="0" y="0" width="400" height="400" stroke={accent} strokeWidth="1.5" fill="none" opacity="0.1" />
                <rect x="8" y="8" width="384" height="384" stroke={accent2} strokeWidth="0.5" fill="none" opacity="0.06" />
            </svg>
        )
    case 'overflow':
        return (
            <svg style={svgStyle} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                {Array.from({ length: 20 }).map((_, i) => {
                    const x = (i * 22) % 400
                    const h = 60 + (i * 37) % 200
                    return <rect key={i} x={x} y={400 - h} width="16" height={h} fill={i % 3 === 0 ? accent : accent2} opacity={op} rx="2" />
                })}
                <line x1="0" y1="380" x2="400" y2="380" stroke={accent2} strokeWidth="1" opacity="0.2" />
            </svg>
        )
    case 'soft':
        return (
            <svg style={svgStyle} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="200" cy="200" rx="180" ry="120" stroke={accent} strokeWidth="0.8" fill="none" opacity={op * 1.2} />
                <ellipse cx="200" cy="200" rx="140" ry="90" stroke={accent2} strokeWidth="0.5" fill="none" opacity={op} />
                <circle cx="130" cy="140" r="40" fill={accent} opacity="0.05" />
                <circle cx="270" cy="260" r="50" fill={accent2} opacity="0.05" />
            </svg>
        )
    default:
        return null
    }
}

const NAME_SUFFIXES = new Set(['jr.', 'sr.', 'ii', 'iii', 'iv', 'v'])

function getSafeLastName(value, fallback = 'n/a') {
    if (!value || typeof value !== 'string') return fallback
    const parts = value.trim().split(/\s+/)
    if (parts.length < 2) return parts[0] || fallback
    const last = parts[parts.length - 1].toLowerCase()
    if (NAME_SUFFIXES.has(last) && parts.length >= 2) {
        return `${parts[parts.length - 2]} ${parts[parts.length - 1]}`
    }
    return parts[parts.length - 1] || fallback
}

function getStats(stats = {}) {
    const films = Number(stats.totalFilms ?? stats.films ?? 0)
    const rating = Number(stats.averageRating ?? stats.rating ?? 0)
    const year = Number(stats.year ?? 2025)
    return {
        films,
        rating: Number.isFinite(rating) ? rating.toFixed(1) : '0.0',
        director: getSafeLastName(stats.director, 'n/a'),
        actor: getSafeLastName(stats.actor, 'n/a'),
        year
    }
}

function CardCanvas({ archetype, stats, shareUrl, cardRef, exportMode = false }) {
    const p = archetype.palette
    const cardIcon = typeof archetype.icon === 'string' && archetype.icon.trim()
        ? archetype.icon.trim()
        : '✦'
    const textPrimary = brightenHex(p.text, 0.08)
    const textSecondaryStrong = brightenHex(p.sub, 0.52)
    const yearTextColor = brightenHex(p.sub, 0.68)
    const taglineTextColor = brightenHex(p.sub, 0.62)
    const urlTextColor = brightenHex(p.sub, 0.76)
    const pillTextColor = getReadableTextColor(p.accent)
    const accentSoft = brightenHex(p.accent, 0.24)
    const cardStats = getStats(stats)
    const cardTagline = archetype.taglineCard || archetype.taglineSection || archetype.tagline || ''
    const baseTitleStyle = archetype.titleStyle || {}
    const titleLength = (archetype.title || '').length
    const titleWordCount = (archetype.title || '').trim().split(/\s+/).filter(Boolean).length
    const taglineLength = cardTagline.length
    const adaptiveTitleSize = (() => {
        let size = 10.6
        if (titleLength >= 22) size = 7.8
        else if (titleLength >= 19) size = 8.4
        else if (titleLength >= 16) size = 9.0
        else if (titleLength >= 13) size = 9.8
        if (titleWordCount >= 4) size -= 0.35
        return Math.max(7.2, size)
    })()
    const taglineLineClamp = taglineLength > 92 ? 3 : 2
    const renderTagline = (text) => {
        const token = 'half-watched'
        if (!text || !text.includes(token)) return text
        const parts = text.split(token)
        return parts.map((part, index) => (
            <React.Fragment key={`tagline-part-${index}`}>
                {part}
                {index < parts.length - 1 ? <span style={{ whiteSpace: 'nowrap' }}>{token}</span> : null}
            </React.Fragment>
        ))
    }

    return (
        <div
            ref={cardRef}
            className="archetype-share-card__canvas"
            style={{
                '--asc-bg': p.bg,
                '--asc-accent': p.accent,
                '--asc-accent-soft': accentSoft,
                '--asc-accent-ghost': hexToRgba(p.accent, 0.18),
                '--asc-grid': hexToRgba(p.accent, 0.22),
                '--asc-grid-soft': hexToRgba(p.accent2, 0.2),
                '--asc-grid-faint': hexToRgba(p.accent, 0.08),
                '--asc-text': textPrimary,
                '--asc-text-sub': taglineTextColor,
                '--asc-text-muted': textSecondaryStrong,
                '--asc-year': yearTextColor,
                '--asc-url': urlTextColor,
                '--asc-glow': p.glow
            }}
        >
            <div className={`archetype-share-card__glow ${exportMode ? 'is-export' : ''}`} aria-hidden="true"></div>

            <MotifSVG motif={archetype.motif} accent={p.accent} accent2={p.accent2} />

            {p.grain && (
                <div className="archetype-share-card__grain" aria-hidden="true"></div>
            )}

            <div className="archetype-share-card__guide-line is-vertical" aria-hidden="true"></div>
            <div className="archetype-share-card__guide-line is-horizontal" aria-hidden="true"></div>
            <div className="archetype-share-card__focus-square" aria-hidden="true"></div>

            <div className="archetype-share-card__content">
                <div className="archetype-share-card__header">
                    <span className="archetype-share-card__header-text" style={{ fontFamily: F.chrome, color: p.accent }}>
                        letterboxd wrapped
                    </span>
                    <span className="archetype-share-card__year" style={{ fontFamily: F.chrome, color: yearTextColor }}>
                        {cardStats.year}
                    </span>
                </div>

                <div className="archetype-share-card__main">
                    <span className="archetype-share-card__icon" aria-hidden="true">{cardIcon}</span>
                    <span
                        className="archetype-share-card__pill"
                        style={{ fontFamily: F.chrome, color: pillTextColor, backgroundColor: p.accent }}
                    >
                        {archetype.label}
                    </span>

                    <h1
                        className="archetype-share-card__title"
                        style={{
                            fontFamily: archetype.titleFont,
                            ...baseTitleStyle,
                            fontSize: `${adaptiveTitleSize}cqw`,
                            color: textPrimary
                        }}
                    >
                        {archetype.title}
                    </h1>

                    <p
                        className="archetype-share-card__tagline"
                        style={{
                            fontFamily: F.tagline,
                            color: taglineTextColor,
                            WebkitLineClamp: taglineLineClamp
                        }}
                    >
                        {renderTagline(cardTagline)}
                    </p>
                </div>

                <div className="archetype-share-card__stats">
                    {[
                        { label: 'films', value: cardStats.films },
                        { label: 'avg rating', value: `${cardStats.rating}★` },
                        { label: 'director', value: cardStats.director },
                        { label: 'actor', value: cardStats.actor }
                    ].map((s, i) => (
                        <div key={`${s.label}-${i}`} className="archetype-share-card__stat">
                            <span className="archetype-share-card__stat-label" style={{ fontFamily: F.statLabel, color: textSecondaryStrong }}>
                                {s.label}
                            </span>
                            <span className="archetype-share-card__stat-value" style={{ fontFamily: F.statValue, color: textPrimary }}>
                                {s.value}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="archetype-share-card__url" style={{ fontFamily: F.chrome, color: urlTextColor }}>
                    {shareUrl.replace('https://', '')}
                </div>
            </div>
        </div>
    )
}

function ArchetypeShareCard({
    archetype,
    stats = {},
    username = 'cinephile',
    year = 2025,
    shareUrl = DEFAULT_SHARE_URL,
    showActions = false
}) {
    const cardRef = useRef(null)
    const exportCardRef = useRef(null)
    const [feedback, setFeedback] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const safeArchetype = ARCHETYPES[archetype?.id] || archetype || ARCHETYPES.completionist

    useEffect(() => {
        setFeedback('')
        setIsProcessing(false)
    }, [year, shareUrl, username, safeArchetype.id])

    const resolvedStats = useMemo(
        () => ({
            ...stats,
            year
        }),
        [stats, year]
    )

    const shareText = useMemo(
        () => `I got '${safeArchetype.title}' in Letterboxd Wrapped ${year}. What did you get?\n\n${shareUrl}`,
        [safeArchetype.title, year, shareUrl]
    )

    const fileName = useMemo(
        () => {
            const base = String(username || 'user')
                .toLowerCase()
                .replace(/[^a-z0-9_-]+/g, '-')
                .replace(/^-+|-+$/g, '')
            return `wrapped-${year}-${base || 'user'}-archetype.png`
        },
        [username, year]
    )

    const captureCardCanvas = async () => {
        const captureTarget = exportCardRef.current || cardRef.current
        if (!captureTarget) {
            throw new Error('capture-target-missing')
        }
        if (document?.fonts?.ready) {
            await document.fonts.ready
        }
        await new Promise((resolve) => requestAnimationFrame(() => resolve()))
        return html2canvas(captureTarget, {
            backgroundColor: safeArchetype.palette.bg,
            scale: 2,
            logging: false,
            useCORS: true
        })
    }

    const downloadFromCanvas = (canvas) => {
        const link = document.createElement('a')
        link.download = fileName
        link.href = canvas.toDataURL('image/png')
        link.click()
    }

    const getCanvasFile = async (canvas) => {
        if (typeof File === 'undefined') return null
        const blob = await new Promise((resolve) => {
            canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/png')
        })
        if (!blob) return null
        return new File([blob], fileName, { type: 'image/png' })
    }

    const tryCopyShareUrl = async () => {
        if (typeof navigator === 'undefined') return false

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(shareUrl)
                return true
            }
        } catch {
            // Fallback below
        }

        try {
            if (typeof document === 'undefined') return false
            const input = document.createElement('textarea')
            input.value = shareUrl
            input.setAttribute('readonly', '')
            input.style.position = 'fixed'
            input.style.opacity = '0'
            input.style.left = '-9999px'
            document.body.appendChild(input)
            input.focus()
            input.select()
            const copied = document.execCommand('copy')
            document.body.removeChild(input)
            return copied
        } catch {
            return false
        }
    }

    const handleDownloadAndShare = async () => {
        if (isProcessing) return
        try {
            setIsProcessing(true)
            const canvas = await captureCardCanvas()
            downloadFromCanvas(canvas)

            if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
                const copied = await tryCopyShareUrl()
                setFeedback(
                    copied
                        ? 'Card downloaded! Share on your socials. Link copied to clipboard.'
                        : `Card downloaded! Share on your socials using this link: ${shareUrl}`
                )
                return
            }

            const basePayload = {
                title: `Letterboxd Wrapped ${year}`,
                text: shareText
            }
            let payload = basePayload
            const file = await getCanvasFile(canvas)
            if (file) {
                const filePayload = { ...basePayload, files: [file] }
                const canShareFile = typeof navigator.canShare !== 'function' || navigator.canShare(filePayload)
                if (canShareFile) {
                    payload = filePayload
                }
            }

            try {
                await navigator.share(payload)
                setFeedback('Downloaded and opened share options.')
            } catch (shareError) {
                if (shareError?.name === 'AbortError') {
                    setFeedback('Downloaded. Share canceled.')
                    return
                }
                const gestureBlocked = typeof shareError?.message === 'string'
                    && shareError.message.toLowerCase().includes('gesture')
                const copied = await tryCopyShareUrl()
                if (gestureBlocked) {
                    setFeedback(
                        copied
                            ? 'Card downloaded! Share sheet was blocked this time. Link copied to clipboard.'
                            : `Card downloaded! Share sheet was blocked this time. Share using this link: ${shareUrl}`
                    )
                    return
                }
                setFeedback(
                    copied
                        ? 'Card downloaded! Could not open share sheet here. Link copied to clipboard.'
                        : `Card downloaded! Could not open share sheet here. Share using this link: ${shareUrl}`
                )
            }
        } catch (error) {
            setFeedback('Could not generate image. Please try again.')
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="archetype-share-card">
            <CardCanvas
                archetype={safeArchetype}
                stats={resolvedStats}
                shareUrl={shareUrl}
                cardRef={cardRef}
                exportMode={false}
            />

            {showActions && (
                <div className="archetype-share-card__actions">
                    <button type="button" className="archetype-share-card__btn is-primary" onClick={handleDownloadAndShare} disabled={isProcessing} aria-busy={isProcessing}>
                        {isProcessing ? (
                            <>
                                <span className="archetype-share-card__btn-spinner" aria-hidden="true"></span>
                                <span>Preparing...</span>
                            </>
                        ) : (
                            'Download & Share Your Wrapped Card'
                        )}
                    </button>
                </div>
            )}

            {showActions && feedback && (
                <p className="archetype-share-card__feedback">{feedback}</p>
            )}

            <div className="archetype-share-card__export-surface" aria-hidden="true">
                <CardCanvas
                    archetype={safeArchetype}
                    stats={resolvedStats}
                    shareUrl={shareUrl}
                    cardRef={exportCardRef}
                    exportMode={true}
                />
            </div>
        </div>
    )
}

export default ArchetypeShareCard
