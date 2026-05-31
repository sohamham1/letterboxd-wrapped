import { useRef, useEffect, useState } from 'react'
import Hero from './sections/Hero'
import StatCard from './sections/StatCard'
import TopFilms from './sections/TopFilms'
import FlavorProfile from './sections/FlavorProfile'
import PersonalityArchetype from './sections/PersonalityArchetype'
import DirectorsActors from './sections/DirectorsActors'
import GenreDecade from './sections/GenreDecade'
import ActivityHeatmap from './sections/stats/ActivityHeatmap'
import QuirkyStats from './sections/stats/QuirkyStats'
import NarrativeTimeline from './sections/stats/NarrativeTimeline'
import RatingTendency from './sections/stats/RatingTendency'
import EndSection from './sections/EndSection'
import WatchStreakSection from './sections/WatchStreakSection'
import ComfortZoneSection from './sections/ComfortZoneSection'
import DayOfWeekSection from './sections/DayOfWeekSection'
import Footer from './Footer'
import { getCinematicArchetype } from './sections/archetypeSystem'
import './WrappedExperience.css'

function WrappedExperience({
    userData,
    onReset,
    currentYear = 2025,
    availableYears = [],
    onSelectYear,
    isYearLoading = false,
    wrappedByYear = {},
    yearFallbackNotice = '',
    onLoadAcrossYears,
    isAcrossYearsLoading = false
}) {
    const wrappedRef = useRef(null)
    const sectionsRef = useRef([])
    const activeSectionRef = useRef('')
    const bridgePulseTimerRef = useRef(null)
    const bridgePulseActiveRef = useRef(false)
    const scrollProgressRef = useRef(0)
    const scrollCueTargetRef = useRef('')
    const [visibleSections, setVisibleSections] = useState(new Set())
    const [scrollProgress, setScrollProgress] = useState(0)
    const [scrollCueTarget, setScrollCueTarget] = useState('')
    const [isBridgePulseActive, setIsBridgePulseActive] = useState(false)

    // Intersection Observer for scroll reveal animations
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const sectionId = entry.target.dataset.section

                    if (entry.isIntersecting) {
                        setVisibleSections((prev) => {
                            if (prev.has(sectionId)) return prev
                            const next = new Set(prev)
                            next.add(sectionId)
                            return next
                        })
                    }
                })
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px 14% 0px',
            }
        )

        sectionsRef.current.forEach((section) => {
            if (section) observer.observe(section)
        })

        return () => observer.disconnect()
    }, [userData])

    useEffect(() => {
        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        const mobileViewportQuery = window.matchMedia('(max-width: 768px)')
        const coarsePointerQuery = window.matchMedia('(pointer: coarse)')
        const lowCoreDevice = typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
            ? navigator.hardwareConcurrency <= 4
            : false
        const androidDevice = typeof navigator !== 'undefined'
            ? /Android/i.test(navigator.userAgent || '')
            : false

        const applyPerformanceMode = () => {
            if (!wrappedRef.current) return
            const liteMode = (
                reducedMotionQuery.matches ||
                mobileViewportQuery.matches ||
                coarsePointerQuery.matches ||
                lowCoreDevice ||
                androidDevice
            )
            wrappedRef.current.classList.toggle('wrapped--lite-effects', liteMode)
            if (liteMode) {
                wrappedRef.current.style.setProperty('--wrapped-mobile-drift', '0px')
                if (bridgePulseTimerRef.current) {
                    clearTimeout(bridgePulseTimerRef.current)
                    bridgePulseTimerRef.current = null
                }
                setIsBridgePulseActive(false)
                if (scrollCueTargetRef.current !== '') {
                    scrollCueTargetRef.current = ''
                    setScrollCueTarget('')
                }
            }
        }

        const updateProgress = () => {
            const firstStatSection = sectionsRef.current[1]
            const endSection = [...sectionsRef.current].reverse().find(Boolean)
            if (!firstStatSection || !endSection) return

            const startY = firstStatSection.offsetTop
            const endY = (endSection.offsetTop + endSection.offsetHeight) - window.innerHeight

            if (window.scrollY <= startY) {
                if (scrollProgressRef.current !== 0) {
                    scrollProgressRef.current = 0
                    setScrollProgress(0)
                }
                if (wrappedRef.current) {
                    wrappedRef.current.style.setProperty('--wrapped-mobile-drift', '0px')
                }
                return
            }

            const range = Math.max(1, endY - startY)
            const progress = ((window.scrollY - startY) / range) * 100
            const clampedProgress = Math.max(0, Math.min(100, progress))
            const reducedMotion = reducedMotionQuery.matches
            const isMobileViewport = mobileViewportQuery.matches
            const isLiteMode = wrappedRef.current?.classList.contains('wrapped--lite-effects')
            const progressStep = isLiteMode ? 4 : 2
            const steppedProgress = Math.round(clampedProgress / progressStep) * progressStep
            if (steppedProgress !== scrollProgressRef.current) {
                scrollProgressRef.current = steppedProgress
                setScrollProgress(steppedProgress)
            }
            if (wrappedRef.current) {
                const drift = reducedMotion || !isMobileViewport || isLiteMode
                    ? 0
                    : ((clampedProgress - 50) / 50) * 7
                wrappedRef.current.style.setProperty('--wrapped-mobile-drift', `${drift.toFixed(2)}px`)
            }

            // Show cue when user is near the end of the current section (except last)
            const presentSections = sectionsRef.current.filter(Boolean)
            const viewportMid = window.scrollY + window.innerHeight * 0.5
            const activeIndex = presentSections.findIndex((sectionEl) => {
                const top = sectionEl.offsetTop
                const bottom = top + sectionEl.offsetHeight
                return viewportMid >= top && viewportMid < bottom
            })

            if (activeIndex >= 0) {
                const nextActiveId = presentSections[activeIndex].id || ''
                if (!isLiteMode && nextActiveId && nextActiveId !== activeSectionRef.current) {
                    activeSectionRef.current = nextActiveId
                    setIsBridgePulseActive(true)
                    if (bridgePulseTimerRef.current) clearTimeout(bridgePulseTimerRef.current)
                    bridgePulseTimerRef.current = setTimeout(() => {
                        setIsBridgePulseActive(false)
                        bridgePulseTimerRef.current = null
                    }, 650)
                } else if (isLiteMode) {
                    if (bridgePulseActiveRef.current) setIsBridgePulseActive(false)
                }
            }

            if (activeIndex === -1 || activeIndex >= presentSections.length - 1) {
                if (scrollCueTargetRef.current !== '') {
                    scrollCueTargetRef.current = ''
                    setScrollCueTarget('')
                }
                return
            }

            const activeEl = presentSections[activeIndex]
            const activeTop = activeEl.offsetTop
            const activeProgress = (viewportMid - activeTop) / Math.max(1, activeEl.offsetHeight)

            const nextCueTarget = activeProgress > 0.82
                ? (presentSections[activeIndex + 1].id || '')
                : ''
            if (nextCueTarget !== scrollCueTargetRef.current) {
                scrollCueTargetRef.current = nextCueTarget
                setScrollCueTarget(nextCueTarget)
            }
        }

        let ticking = false
        const onScroll = () => {
            if (ticking) return
            ticking = true
            window.requestAnimationFrame(() => {
                updateProgress()
                ticking = false
            })
        }

        const onResize = () => {
            applyPerformanceMode()
            updateProgress()
        }
        const onMediaChange = () => {
            applyPerformanceMode()
            updateProgress()
        }

        const addMediaQueryListener = (query, handler) => {
            if (typeof query.addEventListener === 'function') {
                query.addEventListener('change', handler)
                return () => query.removeEventListener('change', handler)
            }
            query.addListener(handler)
            return () => query.removeListener(handler)
        }

        applyPerformanceMode()
        updateProgress()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onResize)
        const removeReducedMotionListener = addMediaQueryListener(reducedMotionQuery, onMediaChange)
        const removeMobileViewportListener = addMediaQueryListener(mobileViewportQuery, onMediaChange)
        const removeCoarsePointerListener = addMediaQueryListener(coarsePointerQuery, onMediaChange)
        return () => {
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onResize)
            removeReducedMotionListener()
            removeMobileViewportListener()
            removeCoarsePointerListener()
            if (wrappedRef.current) wrappedRef.current.classList.remove('wrapped--lite-effects')
        }
    }, [userData])

    useEffect(() => () => {
        if (bridgePulseTimerRef.current) clearTimeout(bridgePulseTimerRef.current)
    }, [])

    useEffect(() => {
        bridgePulseActiveRef.current = isBridgePulseActive
    }, [isBridgePulseActive])

    const addToRefs = (el, index) => {
        if (el) sectionsRef.current[index] = el
    }

    const isVisible = (sectionId) => visibleSections.has(sectionId)

    const pickLine = (value, lines) => {
        if (!Array.isArray(lines) || lines.length === 0) return ''
        const safeValue = Number.isFinite(Number(value)) ? Math.abs(Math.floor(Number(value))) : 0
        return lines[safeValue % lines.length]
    }

    const getFilmsPunchline = (count) => {
        if (count <= 20) {
            return pickLine(count, [
                'The "I have a life now" numbers.',
                'Either very employed or very selective. Probably both.'
            ])
        }
        if (count <= 50) {
            return pickLine(count, [
                'Casual but committed. The sweet spot.',
                "You watch films. You don't make it your whole thing.",
                'A reasonable amount. Suspiciously reasonable.'
            ])
        }
        if (count <= 100) {
            return pickLine(count, [
                'This is officially a hobby now.',
                "You're in deep but you can still see daylight.",
                'Respectable numbers. Concerning dedication.'
            ])
        }
        if (count <= 150) {
            return pickLine(count, [
                'At what point does this become a job?',
                "You've crossed a line and you know it.",
                'This is past hobby territory. This is a lifestyle.'
            ])
        }
        if (count <= 250) {
            return pickLine(count, [
                'Go outside. Seriously.',
                "You need to touch grass. We're worried.",
                "This isn't healthy but we respect the commitment."
            ])
        }
        return pickLine(count, [
            'Are you okay? Genuinely.',
            'This is a cry for help disguised as a hobby.',
            'Congratulations on never seeing sunlight.'
        ])
    }

    const getHoursPunchline = (hours) => {
        if (hours <= 50) {
            return pickLine(hours, [
                "That's 2 days. You barely started.",
                'Casual energy. We respect it.',
                "You dipped your toes in. Didn't even get wet."
            ])
        }
        if (hours <= 100) {
            return pickLine(hours, [
                "That's 4 days of your life. Worth it.",
                "A solid week if you did it all at once. You didn't, right?",
                'Letterboxd account gathering dust. Good for you honestly.',
                "You're off the film bro grind. Respect."
            ])
        }
        if (hours <= 200) {
            return pickLine(hours, [
                "That's 8 days. Over a week. In the dark.",
                "You've lived a full work week in a cinema. Think about that.",
                'This is commitment. Borderline concerning commitment.'
            ])
        }
        if (hours <= 300) {
            return pickLine(hours, [
                "That's 12 days. Nearly two weeks. Go outside.",
                'You spent half a month in the dark and it shows.',
                'At some point this stops being a hobby.'
            ])
        }
        if (hours <= 500) {
            return pickLine(hours, [
                "That's 20 days. Three full weeks. Touch grass.",
                "You've lived in a cinema for a month. Seek help.",
                "This is unwell behaviour. We're genuinely concerned."
            ])
        }
        return pickLine(hours, [
            "That's over 3 weeks. This is a problem.",
            "You need an intervention. We're staging one now.",
            'Congratulations on forgetting what sunlight feels like.'
        ])
    }

    const totalFilms = userData.stats?.totalFilms || 0;
    const totalHours = userData.stats?.totalHours || 0;
    const sharedArchetype = getCinematicArchetype({
        stats: userData.stats,
        flavor: userData.flavorProfile,
        genres: userData.genres,
        rewatchData: userData.rewatchData,
        dayOfWeek: userData.dayOfWeek,
        topFilms: userData.topFilms,
        topDirectors: userData.topDirectors
    })
    const sharedShareStats = {
        totalFilms: userData.stats?.totalFilms || 0,
        averageRating: userData.stats?.averageRating || 0,
        director: userData.topDirectors?.[0]?.name || '',
        actor: userData.topActors?.[0]?.name || '',
        year: currentYear
    }
    return (
        <div
            ref={wrappedRef}
            className={`wrapped ${isBridgePulseActive ? 'wrapped--bridge-active' : ''}`}
        >
            {(isYearLoading || isAcrossYearsLoading) && (
                <div className="wrapped__loading-overlay" aria-live="polite" aria-busy="true">
                    <div className="wrapped__loading-spinner"></div>
                </div>
            )}
            {/* Film grain overlay */}
            <div className="film-grain" aria-hidden="true"></div>
            <div className="wrapped__bridge-flash" aria-hidden="true"></div>

            <div className={`wrapped__scroll-progress ${scrollProgress > 0 ? 'visible' : ''}`} aria-hidden="true">
                <div className="wrapped__scroll-progress-fill" style={{ width: `${scrollProgress}%` }}></div>
            </div>
            {scrollCueTarget && (
                <a className="wrapped__section-cue" href={`#${scrollCueTarget}`} aria-label="Scroll to next section">
                    <span>Keep scrolling</span>
                    <span className="wrapped__section-cue-arrow">↓</span>
                </a>
            )}

            {/* 1. Hero Section */}
            <section
                ref={(el) => addToRefs(el, 0)}
                id="section-hero"
                data-section="hero"
                className={`wrapped__section wrapped__hero ${isVisible('hero') ? 'visible' : ''}`}
            >
                <Hero userData={userData} year={currentYear} isVisible={isVisible('hero')} />
            </section>

            {/* 2. Film Count */}
            <section
                ref={(el) => addToRefs(el, 1)}
                id="section-total-films"
                data-section="total-films"
                className={`wrapped__section wrapped__stat-section ${isVisible('total-films') ? 'visible' : ''}`}
            >
                <StatCard
                    label="Films Watched"
                    number={totalFilms}
                    isActive={isVisible('total-films')}
                    reactiveCopy={getFilmsPunchline(totalFilms)}
                    colorClass="text-gradient-blue"
                    className="wrapped__stat-card--films"
                />
            </section>

            {/* 3. Hours in the Dark */}
            <section
                ref={(el) => addToRefs(el, 2)}
                id="section-hours"
                data-section="hours"
                className={`wrapped__section wrapped__stat-section ${isVisible('hours') ? 'visible' : ''}`}
            >
                <StatCard
                    label="Hours in the Dark"
                    number={totalHours}
                    isActive={isVisible('hours')}
                    unit="hours"
                    reactiveCopy={getHoursPunchline(totalHours)}
                    context="*Runtime estimate, so this may be slightly off."
                    contextClassName="wrapped__stat-context--subtle"
                    colorClass="text-gradient-blue"
                    className="wrapped__stat-card--hours"
                />
            </section>

            {/* 4. Watch Streak (conditional) */}
            {userData.watchStreaks && userData.watchStreaks.longestStreak > 0 && (
                <section
                    ref={(el) => addToRefs(el, 3)}
                    id="section-streak"
                    data-section="streak"
                    className={`wrapped__section ${isVisible('streak') ? 'visible' : ''}`}
                >
                    <WatchStreakSection userData={userData} isVisible={isVisible('streak')} />
                </section>
            )}

            {/* 5. Narrative Timeline */}
            <section
                ref={(el) => addToRefs(el, 4)}
                id="section-narrative"
                data-section="narrative"
                className={`wrapped__section wrapped__narrative ${isVisible('narrative') ? 'visible' : ''}`}
            >
                <NarrativeTimeline narrative={userData.narrative} isVisible={isVisible('narrative')} />
            </section>

            {/* 6. Personality Archetype */}
            <section
                ref={(el) => addToRefs(el, 5)}
                id="section-archetype"
                data-section="archetype"
                className={`wrapped__section wrapped__archetype ${isVisible('archetype') ? 'visible' : ''}`}
            >
                <PersonalityArchetype
                    stats={userData.stats}
                    flavor={userData.flavorProfile}
                    genres={userData.genres}
                    rewatchData={userData.rewatchData}
                    dayOfWeek={userData.dayOfWeek}
                    topFilms={userData.topFilms}
                    topDirectors={userData.topDirectors}
                    topActors={userData.topActors}
                    isVisible={isVisible('archetype')}
                    year={currentYear}
                    username={userData.username}
                    archetype={sharedArchetype}
                    shareStats={sharedShareStats}
                />
            </section>

            {/* 7. Activity Heatmap */}
            <section
                ref={(el) => addToRefs(el, 6)}
                id="section-heatmap"
                data-section="heatmap"
                className={`wrapped__section wrapped__heatmap ${isVisible('heatmap') ? 'visible' : ''}`}
            >
                <ActivityHeatmap data={userData.activityData} year={currentYear} isVisible={isVisible('heatmap')} />
            </section>

            {/* 8. Top 10 Films */}
            <section
                ref={(el) => addToRefs(el, 7)}
                id="section-top-films"
                data-section="top-films"
                className={`wrapped__section wrapped__top-films ${isVisible('top-films') ? 'visible' : ''}`}
            >
                <TopFilms films={userData.topFilms} isVisible={isVisible('top-films')} year={currentYear} />
            </section>

            {/* 9. Flavor Profile */}
            <section
                ref={(el) => addToRefs(el, 8)}
                id="section-flavor"
                data-section="flavor"
                className={`wrapped__section wrapped__flavor ${isVisible('flavor') ? 'visible' : ''}`}
            >
                <FlavorProfile data={userData.flavorProfile} isVisible={isVisible('flavor')} year={currentYear} />
            </section>

            {/* 10. Genres & Decades */}
            <section
                ref={(el) => addToRefs(el, 9)}
                id="section-genres"
                data-section="genres"
                className={`wrapped__section wrapped__genres ${isVisible('genres') ? 'visible' : ''}`}
            >
                <GenreDecade
                    genres={userData.genres}
                    decades={userData.decades}
                    isVisible={isVisible('genres')}
                />
            </section>

            {/* 11. People Stats */}
            <section
                ref={(el) => addToRefs(el, 10)}
                id="section-people"
                data-section="people"
                className={`wrapped__section wrapped__people ${isVisible('people') ? 'visible' : ''}`}
            >
                <DirectorsActors
                    directors={userData.topDirectors}
                    actors={userData.topActors}
                    isVisible={isVisible('people')}
                />
            </section>

            {/* 12. Comfort Zone (conditional) */}
            {userData.rewatchData && userData.rewatchData.totalRewatches > 0 && (
                <section
                    ref={(el) => addToRefs(el, 11)}
                    id="section-comfort"
                    data-section="comfort"
                    className={`wrapped__section ${isVisible('comfort') ? 'visible' : ''}`}
                >
                    <ComfortZoneSection userData={userData} />
                </section>
            )}

            {/* 13. Day of Week (conditional) */}
            {userData.dayOfWeek && (
                <section
                    ref={(el) => addToRefs(el, 12)}
                    id="section-dayofweek"
                    data-section="dayofweek"
                    className={`wrapped__section ${isVisible('dayofweek') ? 'visible' : ''}`}
                >
                    <DayOfWeekSection userData={userData} />
                </section>
            )}

            {/* 14. Quirky Stats */}
            <section
                ref={(el) => addToRefs(el, 13)}
                id="section-quirky"
                data-section="quirky"
                className={`wrapped__section wrapped__quirky ${isVisible('quirky') ? 'visible' : ''}`}
            >
                <QuirkyStats stats={userData.quirkyStats} isVisible={isVisible('quirky')} />
            </section>

            {/* 15. End Section (Downloadable Card) */}
            <section
                ref={(el) => addToRefs(el, 14)}
                id="section-end"
                data-section="end"
                className={`wrapped__section wrapped__end ${isVisible('end') ? 'visible' : ''}`}
            >
                <EndSection
                    userData={userData}
                    archetype={sharedArchetype}
                    shareStats={sharedShareStats}
                    onReset={onReset}
                    isVisible={isVisible('end')}
                    currentYear={currentYear}
                    availableYears={availableYears}
                    onSelectYear={onSelectYear}
                    isYearLoading={isYearLoading}
                    wrappedByYear={wrappedByYear}
                    yearFallbackNotice={yearFallbackNotice}
                    onLoadAcrossYears={onLoadAcrossYears}
                    isAcrossYearsLoading={isAcrossYearsLoading}
                />
            </section>
            <Footer />
        </div>
    )
}

export default WrappedExperience
