import React from 'react'

function Hero({ userData, year = 2025 }) {
    return (
        <div className="wrapped__hero-content">
            <span className="wrapped__label animate-fade-up">Your {year} in Film</span>
            <h1 className="wrapped__hero-title text-display animate-fade-up delay-1">
                Hey, <span className="text-gradient-blue">{userData.username}</span>
            </h1>
            <p className="wrapped__hero-subtitle animate-fade-up delay-2">
                You had quite the cinematic year! Let's dive in
            </p>
            <div className="wrapped__scroll-hint animate-fade-in delay-5">
                <span>Scroll to explore</span>
                <div className="wrapped__scroll-arrow">↓</div>
            </div>
        </div>
    )
}

export default Hero
