import React from 'react'
import './DirectorsActors.css'

function DirectorsActors({ directors = [], actors = [], isVisible }) {
    const topDirector = directors[0] || { name: 'The Auteur', count: '-' }
    const topActor = actors[0] || { name: 'The Legend', count: '-' }

    return (
        <div className="people-stats">
            <div className={`people-stats__card people-stats__card--director ${isVisible ? 'animate-fade-up' : ''}`}>
                <span className="wrapped__label">Most Watched Director</span>
                <h3 className="people-stats__name text-display">{topDirector.name}</h3>
                <div className="people-stats__count text-gradient-blue">
                    <span className="count">{topDirector.count}</span>
                    <span className="label">films</span>
                </div>
            </div>

            <div className={`people-stats__card people-stats__card--actor ${isVisible ? 'animate-fade-up delay-2' : ''}`}>
                <span className="wrapped__label">Most Watched Actor</span>
                <h3 className="people-stats__name text-display">{topActor.name}</h3>
                <div className="people-stats__count text-gradient-blue">
                    <span className="count">{topActor.count}</span>
                    <span className="label">films</span>
                </div>
            </div>
        </div>
    )
}

export default DirectorsActors
