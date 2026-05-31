import React, { useEffect, useRef, useState } from 'react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import './FlavorProfile.css'

function FlavorProfile({ data, isVisible }) {
    const chartMountRef = useRef(null)
    const [chartReady, setChartReady] = useState(false)
    const [isPhoneViewport, setIsPhoneViewport] = useState(false)
    const profile = data || { mainstream: 50, modern: 50, light: 50, arthouse: 50, slow: 50 }

    // Transform data object to array for Recharts
    const chartData = [
        { subject: 'Mainstream', A: profile.mainstream, fullMark: 100 },
        { subject: 'Modern', A: profile.modern, fullMark: 100 },
        { subject: 'Comfort', A: profile.light, fullMark: 100 },
        { subject: 'Arthouse', A: profile.arthouse, fullMark: 100 },
        { subject: 'Slow-Burn', A: profile.slow, fullMark: 100 },
    ]

    const sortedAxes = [...chartData].sort((a, b) => b.A - a.A)
    const topAxis = sortedAxes[0]?.subject || 'Mainstream'
    const secondAxis = sortedAxes[1]?.subject || topAxis
    const topScore = sortedAxes[0]?.A || 0
    const secondScore = sortedAxes[1]?.A || 0
    const hasClearDominance = (topScore - secondScore) >= 10
    const dominantAxis = hasClearDominance ? topAxis : 'Balanced'

    const getCineDNAHeadline = () => {
        if (!hasClearDominance) return 'You balanced mainstream heat with deep-cut taste this year'
        if (dominantAxis === 'Arthouse') return 'You were on your festival-run arc this year'
        if (dominantAxis === 'Slow-Burn') return 'You locked in for long takes and slow-burn pain'
        if (dominantAxis === 'Comfort') return 'You curated pure comfort cinema energy'
        if (dominantAxis === 'Modern') return 'You stayed tapped into modern film culture'
        return 'You balanced crowd-pleasers with deep-cut cinema taste'
    }

    const getCineDNACopy = () => {
        const mainstream = profile.mainstream
        const arthouse = profile.arthouse
        const slow = profile.slow
        const modern = profile.modern
        const light = profile.light

        if (!hasClearDominance) {
            return null
        }
        if (arthouse >= 70 && slow >= 60) {
            return "You were deep in art-house mode. You weren't watching for noise, you were watching for mood and emotional damage."
        }
        if (mainstream >= 70 && modern >= 65) {
            return "You had immaculate opening-weekend instincts. Big titles, big reactions, and zero fear of a hot take."
        }
        if (light >= 65 && mainstream < 60) {
            return "Your year was cozy but curated. You knew exactly when to revisit comfort and when to try a side-quest watch."
        }
        if (modern >= 70 && arthouse >= 50) {
            return "You kept one foot in timeline cinema and one in critic-core territory. That's elite balance."
        }
        if (slow >= 70) {
            return "You gave patient cinema the respect it deserves. If the pace is deliberate, you still stay locked in."
        }
        if (mainstream >= 55 && arthouse >= 55) {
            return "You balanced multiplex hype with critic-darling picks. Big-screen fun and deep cuts both made the list."
        }
        return "Your taste was low-key unpredictable in the best way. You moved between vibes without losing your cinematic identity."
    }

    useEffect(() => {
        if (!isVisible) {
            setChartReady(false)
            return
        }

        let frameId = null
        let retries = 0
        const checkReady = () => {
            const width = chartMountRef.current?.offsetWidth || 0
            if (width > 0) {
                setChartReady(true)
                return
            }
            retries += 1
            if (retries < 8) {
                frameId = requestAnimationFrame(checkReady)
            }
        }
        frameId = requestAnimationFrame(checkReady)

        return () => {
            if (frameId) cancelAnimationFrame(frameId)
        }
    }, [isVisible])

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
        const media = window.matchMedia('(max-width: 480px)')
        const sync = () => setIsPhoneViewport(media.matches)
        sync()

        if (typeof media.addEventListener === 'function') {
            media.addEventListener('change', sync)
            return () => media.removeEventListener('change', sync)
        }

        media.addListener(sync)
        return () => media.removeListener(sync)
    }, [])

    return (
        <div className="flavor-profile">
            <div className="flavor-profile__content">
                <span className="wrapped__label animate-fade-up">Your Cinematic DNA</span>
                <p className="flavor-profile__subtitle text-secondary animate-fade-up delay-2">
                    {getCineDNAHeadline()}
                </p>

                <div ref={chartMountRef} className={`flavor-profile__chart ${isVisible ? 'animate-scale-in delay-2' : ''}`}>
                    {isVisible && chartReady ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={280}>
                            <RadarChart
                                cx="50%"
                                cy={isPhoneViewport ? '52%' : '50%'}
                                outerRadius={isPhoneViewport ? '58%' : '70%'}
                                margin={isPhoneViewport
                                    ? { top: 30, right: 48, bottom: 24, left: 48 }
                                    : { top: 22, right: 26, bottom: 18, left: 26 }}
                                data={chartData}
                            >
                                <PolarGrid stroke="#2e2e36" />
                                <PolarAngleAxis
                                    dataKey="subject"
                                    tick={{
                                        fill: '#3b82f6',
                                        fontSize: isPhoneViewport ? 12 : 16,
                                        fontWeight: 700,
                                        fontFamily: 'Outfit',
                                        letterSpacing: isPhoneViewport ? '0.06em' : '0.1em'
                                    }}
                                />
                                <Radar
                                    name="Taste"
                                    dataKey="A"
                                    stroke="#fbbf24"
                                    strokeWidth={3}
                                    fill="#fbbf24"
                                    fillOpacity={0.3}
                                    isAnimationActive={Boolean(isVisible)}
                                    animationBegin={40}
                                    animationDuration={760}
                                    animationEasing="ease-out"
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flavor-profile__chart-placeholder" aria-hidden="true"></div>
                    )}
                </div>

                <div className="flavor-profile__summary animate-fade-up delay-4">
                    {hasClearDominance ? (
                        <p>
                            {getCineDNACopy()}{' '}
                            <strong className="text-gradient-blue">{dominantAxis}</strong>{' '}
                            was your strongest signal this year.
                        </p>
                    ) : (
                        <p>
                            Your taste didn't lock into one lane.{' '}
                            <span className="flavor-profile__axis-pill">{topAxis}</span>{' '}
                            and{' '}
                            <span className="flavor-profile__axis-pill">{secondAxis}</span>{' '}
                            stayed close all year, which is a strong sign of range.
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default FlavorProfile
