import { useState, useEffect, useRef } from 'react'
import Footer from './Footer'
import UploadModal from './UploadModal'
import './Landing.css'

const filmQuotes = [
    "Here's looking at you, kid.",
    "May the Force be with you.",
    "I'll be back.",
    "After all, tomorrow is another day.",
    "You're gonna need a bigger boat.",
    "Life is like a box of chocolates.",
    "To infinity and beyond!",
    "I'm going to make him an offer he can't refuse.",
    "Toto, I've a feeling we're not in Kansas anymore.",
    "Bond. James Bond.",
    "There's no place like home.",
    "Show me the money!",
    "Keep your friends close, but your enemies closer.",
    "Kitne aadmi the?",
    "Mere paas maa hai.",
    "Mogambo khush hua.",
    "Rishte mein toh hum tumhare baap lagte hain, naam hai Shahenshah.",
    "Bade bade deshon mein aisi chhoti chhoti baatein hoti rehti hain, Senorita.",
    "Don ko pakadna mushkil hi nahi, namumkin hai.",
    "Pushpa, I hate tears...",
    "Babumoshai, zindagi badi honi chahiye, lambi nahi.",
    "Rahul, naam toh suna hoga?",
    "All Izz Well.",
    "Main apni favorite hoon!",
    "Thappad se darr nahi lagta sahab, pyaar se lagta hai.",
    "Picture abhi baaki hai mere dost!",
]

const loadingMessages = [
    "Parsing your data export...",
    "Analyzing your cinematic taste...",
    "Consulting the IMDb oracle...",
    "Counting your popcorn bags...",
    "Arranging your top posters...",
    "Reviewing your hottest takes...",
    "Calculating your cinephile status...",
]

const progressMilestones = [
    { id: 'unzipping', label: 'Unpacking your ZIP' },
    { id: 'parsing', label: 'Reading your logs' },
    { id: 'uploading', label: 'Uploading securely' },
    { id: 'analyzing', label: 'Generating your wrapped' },
    { id: 'finalizing', label: 'Finalizing visuals' },
]

function Landing({
    onFileUpload,
    onLoadSample,
    isLoading,
    loadingProgress = { phase: 'idle', percent: 0 },
    showLoadingMilestones = false
}) {
    const landingRef = useRef(null)
    const titleBrandRef = useRef(null)
    const yearBadgeRef = useRef(null)
    const ctaButtonRef = useRef(null)
    const quoteTimerRef = useRef(null)
    const activeQuoteRef = useRef(filmQuotes[0])
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [msgIndex, setMsgIndex] = useState(0)
    const [quoteIndex, setQuoteIndex] = useState(0)
    const [activeQuote, setActiveQuote] = useState(filmQuotes[0])
    const [previousQuote, setPreviousQuote] = useState('')
    const [isQuoteTransitioning, setIsQuoteTransitioning] = useState(false)

    // Cycle messages (loading only)
    useEffect(() => {
        if (!isLoading) return
        const interval = setInterval(() => {
            setMsgIndex(prev => (prev + 1) % loadingMessages.length)
        }, 5000)
        return () => clearInterval(interval)
    }, [isLoading])

    // Cycle quotes every 3s (idle + loading)
    useEffect(() => {
        const interval = setInterval(() => {
            setQuoteIndex(prev => {
                if (filmQuotes.length <= 1) return prev
                let next = Math.floor(Math.random() * filmQuotes.length)
                if (next === prev) next = (prev + 1) % filmQuotes.length
                return next
            })
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const nextQuote = filmQuotes[quoteIndex]
        if (nextQuote === activeQuoteRef.current) return

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reducedMotion) {
            activeQuoteRef.current = nextQuote
            setActiveQuote(nextQuote)
            setPreviousQuote('')
            setIsQuoteTransitioning(false)
            return
        }

        setPreviousQuote(activeQuoteRef.current)
        activeQuoteRef.current = nextQuote
        setActiveQuote(nextQuote)
        setIsQuoteTransitioning(true)

        if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current)
        quoteTimerRef.current = setTimeout(() => {
            setPreviousQuote('')
            setIsQuoteTransitioning(false)
            quoteTimerRef.current = null
        }, 420)
    }, [quoteIndex])

    useEffect(() => {
        return () => {
            if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current)
        }
    }, [])

    useEffect(() => {
        const target = landingRef.current || document.documentElement
        const titleTarget = titleBrandRef.current
        const yearTarget = yearBadgeRef.current
        const ctaTarget = ctaButtonRef.current
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const coarsePointer = window.matchMedia('(pointer: coarse)').matches
        const smallViewport = window.matchMedia('(max-width: 768px)').matches
        const lowCoreDevice = typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
            ? navigator.hardwareConcurrency <= 4
            : false
        const liteMode = coarsePointer || smallViewport || lowCoreDevice
        const reactiveEnhancementsEnabled = !reducedMotion && !liteMode
        const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
        let pointerX = 50
        let pointerY = 34
        let driftX = 58
        let driftY = 16
        let driftX2 = 42
        let driftY2 = 32
        let titleRect = null
        let yearRect = null
        let ctaRect = null

        target.classList.toggle('landing--lite-effects', liteMode)

        const refreshRects = () => {
            titleRect = titleTarget ? titleTarget.getBoundingClientRect() : null
            yearRect = yearTarget ? yearTarget.getBoundingClientRect() : null
            ctaRect = ctaTarget ? ctaTarget.getBoundingClientRect() : null
        }

        const updateTitleGlass = () => {
            if (!titleTarget || !titleRect) return

            const titleX = titleRect.left + titleRect.width / 2
            const titleY = titleRect.top + titleRect.height / 2
            const auraXPercent = pointerX * 0.56 + driftX * 0.28 + driftX2 * 0.16
            const auraYPercent = pointerY * 0.56 + driftY * 0.28 + driftY2 * 0.16
            const auraX = (auraXPercent / 100) * window.innerWidth
            const auraY = (auraYPercent / 100) * window.innerHeight
            const dist = Math.hypot(titleX - auraX, titleY - auraY)
            const threshold = Math.max(titleRect.width * 1.45, 270)
            const proximity = clamp(1 - dist / threshold, 0, 1)
            const intensity = Math.pow(proximity, 1.45)
            const shineX = clamp(((auraX - titleRect.left) / titleRect.width) * 100, -28, 128)

            titleTarget.style.setProperty('--landing-title-glass-alpha', intensity.toFixed(3))
            titleTarget.style.setProperty('--landing-title-glass-blur', `${(8 + intensity * 18).toFixed(1)}px`)
            titleTarget.style.setProperty('--landing-title-glass-shine-x', `${shineX.toFixed(2)}%`)
        }

        const updateYearSweep = () => {
            if (!yearTarget || !yearRect) return
            const pointerPx = (pointerX / 100) * window.innerWidth
            const pointerProgress = (pointerPx - yearRect.left) / yearRect.width
            const sweepX = clamp(pointerProgress * 100, -35, 135)
            const sweepAngle = clamp((pointerProgress - 0.5) * 24, -14, 14)
            const distToCenter = Math.abs(pointerPx - (yearRect.left + yearRect.width / 2))
            const intensity = Math.pow(clamp(1 - distToCenter / (window.innerWidth * 0.46), 0, 1), 1.2)

            yearTarget.style.setProperty('--landing-year-sweep-x', `${sweepX.toFixed(2)}%`)
            yearTarget.style.setProperty('--landing-year-sweep-angle', `${sweepAngle.toFixed(2)}deg`)
            yearTarget.style.setProperty('--landing-year-sweep-alpha', intensity.toFixed(3))
        }

        const updateCtaHalo = () => {
            if (!ctaTarget || !ctaRect) return
            const pointerPx = (pointerX / 100) * window.innerWidth
            const pointerPy = (pointerY / 100) * window.innerHeight
            const localX = ((pointerPx - ctaRect.left) / ctaRect.width) * 100
            const localY = ((pointerPy - ctaRect.top) / ctaRect.height) * 100
            const dx = pointerPx - (ctaRect.left + ctaRect.width / 2)
            const dy = pointerPy - (ctaRect.top + ctaRect.height / 2)
            const dist = Math.hypot(dx, dy)
            const radius = Math.max(ctaRect.width * 0.95, 190)
            const intensity = Math.pow(clamp(1 - dist / radius, 0, 1), 1.25)

            ctaTarget.style.setProperty('--landing-cta-halo-x', `${clamp(localX, -25, 125).toFixed(2)}%`)
            ctaTarget.style.setProperty('--landing-cta-halo-y', `${clamp(localY, -35, 135).toFixed(2)}%`)
            ctaTarget.style.setProperty('--landing-cta-halo-alpha', intensity.toFixed(3))
        }

        const updateReactiveElements = () => {
            updateTitleGlass()
            updateYearSweep()
            updateCtaHalo()
        }

        const disableReactiveTextAndBadgeEffects = () => {
            if (titleTarget) {
                titleTarget.style.setProperty('--landing-title-glass-alpha', '0')
                titleTarget.style.setProperty('--landing-title-glass-blur', '8px')
                titleTarget.style.setProperty('--landing-title-glass-shine-x', '50%')
            }
            if (yearTarget) {
                yearTarget.style.setProperty('--landing-year-sweep-alpha', '0')
            }
            if (ctaTarget) {
                ctaTarget.style.setProperty('--landing-cta-halo-alpha', '0')
            }
        }

        let pointerQueued = false
        let pendingPointerX = pointerX
        let pendingPointerY = pointerY

        const flushPointerUpdate = () => {
            pointerQueued = false
            pointerX = pendingPointerX
            pointerY = pendingPointerY
            target.style.setProperty('--landing-pointer-x', pointerX.toFixed(2))
            target.style.setProperty('--landing-pointer-y', pointerY.toFixed(2))
            updateReactiveElements()
        }

        const queuePointerUpdate = () => {
            if (pointerQueued) return
            pointerQueued = true
            window.requestAnimationFrame(flushPointerUpdate)
        }

        const handlePointerMove = (event) => {
            pendingPointerX = clamp((event.clientX / window.innerWidth) * 100, 8, 92)
            pendingPointerY = clamp((event.clientY / window.innerHeight) * 100, 4, 66)
            queuePointerUpdate()
        }

        const handleResize = () => {
            refreshRects()
            if (reactiveEnhancementsEnabled) {
                updateReactiveElements()
            } else {
                disableReactiveTextAndBadgeEffects()
            }
        }

        let frameId = null
        let t = 0
        const targetFps = 36
        const frameStep = 1000 / targetFps
        let lastFrameTime = 0

        refreshRects()

        if (reducedMotion) {
            updateReactiveElements()
        } else {
            window.addEventListener('resize', handleResize)
            if (reactiveEnhancementsEnabled) {
                window.addEventListener('pointermove', handlePointerMove, { passive: true })
                updateReactiveElements()
            } else {
                disableReactiveTextAndBadgeEffects()
            }

            if (!liteMode) {
                const drift = (timestamp) => {
                    if (timestamp - lastFrameTime < frameStep) {
                        frameId = window.requestAnimationFrame(drift)
                        return
                    }
                    lastFrameTime = timestamp
                    t += 0.008
                    driftX = 58 + Math.sin(t * 0.92) * 17
                    driftY = 16 + Math.cos(t * 1.2) * 7
                    driftX2 = 42 + Math.cos(t * 0.6) * 15
                    driftY2 = 32 + Math.sin(t * 0.76) * 9

                    target.style.setProperty('--landing-drift-x', driftX.toFixed(2))
                    target.style.setProperty('--landing-drift-y', driftY.toFixed(2))
                    target.style.setProperty('--landing-drift-x-2', driftX2.toFixed(2))
                    target.style.setProperty('--landing-drift-y-2', driftY2.toFixed(2))
                    if (reactiveEnhancementsEnabled) updateReactiveElements()

                    frameId = window.requestAnimationFrame(drift)
                }

                frameId = window.requestAnimationFrame(drift)
            }
        }

        return () => {
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('resize', handleResize)
            target.classList.remove('landing--lite-effects')
            if (frameId) window.cancelAnimationFrame(frameId)
            if (titleTarget) {
                titleTarget.style.removeProperty('--landing-title-glass-alpha')
                titleTarget.style.removeProperty('--landing-title-glass-blur')
                titleTarget.style.removeProperty('--landing-title-glass-shine-x')
            }
            if (yearTarget) {
                yearTarget.style.removeProperty('--landing-year-sweep-x')
                yearTarget.style.removeProperty('--landing-year-sweep-angle')
                yearTarget.style.removeProperty('--landing-year-sweep-alpha')
            }
            if (ctaTarget) {
                ctaTarget.style.removeProperty('--landing-cta-halo-x')
                ctaTarget.style.removeProperty('--landing-cta-halo-y')
                ctaTarget.style.removeProperty('--landing-cta-halo-alpha')
            }
        }
    }, [])

    useEffect(() => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const coarsePointer = window.matchMedia('(pointer: coarse)').matches
        const smallViewport = window.matchMedia('(max-width: 768px)').matches
        if (reducedMotion || coarsePointer || smallViewport) return

        const landingEl = landingRef.current
        if (!landingEl) return
        const filmStrips = Array.from(landingEl.querySelectorAll('.landing__film-strip'))
        if (filmStrips.length === 0) return

        let scheduleId = null
        let clearIds = []

        const scheduleShimmer = () => {
            const nextDelay = 4500 + Math.random() * 7000
            scheduleId = setTimeout(() => {
                filmStrips.forEach((strip) => {
                    strip.classList.remove('is-shimmering')
                    void strip.offsetWidth
                    strip.classList.add('is-shimmering')

                    const clearId = setTimeout(() => {
                        strip.classList.remove('is-shimmering')
                        clearIds = clearIds.filter((id) => id !== clearId)
                    }, 1250 + Math.random() * 250)
                    clearIds.push(clearId)
                })
                scheduleShimmer()
            }, nextDelay)
        }

        scheduleShimmer()

        return () => {
            if (scheduleId) clearTimeout(scheduleId)
            clearIds.forEach((id) => clearTimeout(id))
            clearIds = []
            filmStrips.forEach((strip) => strip.classList.remove('is-shimmering'))
        }
    }, [])
    const currentMilestoneIndex = progressMilestones.findIndex(
        (milestone) => milestone.id === loadingProgress.phase
    )
    const safeMilestoneIndex = currentMilestoneIndex >= 0 ? currentMilestoneIndex : 0
    const progressPercent = Math.max(0, Math.min(100, loadingProgress.percent || 0))
    const activeLoadingMessage = loadingMessages[msgIndex]

    return (
        <div className="landing" ref={landingRef}>
            {/* Film grain overlay for cinematic feel */}
            <div className="film-grain" aria-hidden="true"></div>

            {/* Ambient background glow */}
            <div className="landing__glow" aria-hidden="true"></div>
            <div className="landing__glow landing__glow--secondary" aria-hidden="true"></div>
            <div className="landing__glow landing__glow--tertiary" aria-hidden="true"></div>

            <main className="landing__content">
                {/* Logo/Title */}
                <div className="landing__header animate-fade-up">
                    <span className="landing__year" ref={yearBadgeRef}>2025</span>
                    <h1 className="landing__title text-display">
                        <span className="landing__title-brand" ref={titleBrandRef} data-text="Letterboxd">Letterboxd</span>
                        <br />
                        <span>Wrapped</span>
                    </h1>
                    <p className="landing__subtitle">
                        Your cinematic year, unwrapped
                    </p>
                </div>

                {/* Main CTA */}
                <div className="landing__form animate-fade-up delay-2">
                    <button
                        ref={ctaButtonRef}
                        className={`landing__button btn-primary ${isLoading ? 'loading' : ''}`}
                        onClick={() => setShowUploadModal(true)}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="landing__spinner"></span>
                                <span>{activeLoadingMessage}</span>
                            </>
                        ) : (
                            <>
                                <span>Generate My Wrapped</span>
                            </>
                        )}
                    </button>
                </div>

                {isLoading && showLoadingMilestones && (
                    <div className="landing__milestones animate-fade-in" role="status" aria-live="polite">
                        <div className="landing__milestones-progress" aria-hidden="true">
                            <div className="landing__milestones-progress-fill" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        <p className="landing__milestones-percent">{Math.round(progressPercent)}% complete</p>
                        <ul className="landing__milestones-list">
                            {progressMilestones.map((milestone, index) => {
                                const status =
                                    index < safeMilestoneIndex ? 'complete' : index === safeMilestoneIndex ? 'active' : 'pending'
                                return (
                                    <li key={milestone.id} className={`landing__milestone ${status}`}>
                                        <span className="landing__milestone-dot" aria-hidden="true"></span>
                                        <span className="landing__milestone-label">{milestone.label}</span>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                )}

                {/* Rotating Quote */}
                <p className={`landing__loading-quote ${isLoading ? 'animate-fade-in' : ''}`} aria-live="polite">
                    {previousQuote && (
                        <span className="landing__loading-quote-layer landing__loading-quote-layer--out">
                            "{previousQuote}"
                        </span>
                    )}
                    <span
                        className={`landing__loading-quote-layer landing__loading-quote-layer--in ${isQuoteTransitioning ? 'is-transitioning' : 'is-still'}`}
                    >
                        "{activeQuote}"
                    </span>
                </p>

                {/* Footer hint */}
                <p className="landing__hint animate-fade-up delay-4">
                    Upload your Letterboxd data export to get started
                </p>
            </main>

            {/* Upload Modal */}
            {showUploadModal && (
                <UploadModal
                    onClose={() => setShowUploadModal(false)}
                    onFileUpload={(file) => {
                        setShowUploadModal(false)
                        onFileUpload(file)
                    }}
                    onLoadSample={(filename) => {
                        setShowUploadModal(false)
                        onLoadSample(filename)
                    }}
                />
            )}


            {/* Decorative film strip elements */}
            <div className="landing__film-strip landing__film-strip--right" aria-hidden="true"></div>
            <Footer />
        </div>
    )
}

export default Landing
