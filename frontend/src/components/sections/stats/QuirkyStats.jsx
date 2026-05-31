import React from 'react'
import './QuirkyStats.css'

const statConfigs = {
    binge: { icon: '🍿', class: 'card-binge' },
    loyalist: { icon: '🎬', class: 'card-loyalist' },
    hopper: { icon: '📅', class: 'card-hopper' },
    speed: { icon: '⚡', class: 'card-speed' },
    epic: { icon: '🎭', class: 'card-epic' },
    critic: { icon: '📝', class: 'card-critic' },
    diverse: { icon: '🌟', class: 'card-diverse' },
    hipster: { icon: '👓', class: 'card-hipster' },
    guilty: { icon: '🗑️', class: 'card-guilty' },
    auteur: { icon: '🏛️', class: 'card-auteur' },
    global: { icon: '🌍', class: 'card-global' },
    'weekend-energy': { icon: '🎉', class: 'card-binge' },
    'day-energy': { icon: '🔥', class: 'card-speed' },
}

function QuirkyStats({ stats, isVisible }) {
    if (!stats || !Array.isArray(stats)) return null

    return (
        <div className="quirky-stats-grid">
            {stats.map((stat, index) => {
                const config = statConfigs[stat.id] || { icon: '✨', class: 'card-default' }
                return (
                    <div
                        key={stat.id}
                        className={`quirky-card ${config.class} ${isVisible ? 'animate-flip-up' : ''}`}
                        style={{ '--delay': `${index * 150}ms` }}
                    >
                        <div className="quirky-icon">{config.icon}</div>
                        <h3 className="quirky-title">{stat.title}</h3>
                        <p className="quirky-desc">{stat.description}</p>
                    </div>
                )
            })}

        </div>
    )
}

export default QuirkyStats
