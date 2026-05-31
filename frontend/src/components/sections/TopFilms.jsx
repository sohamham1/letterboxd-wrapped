import React from 'react'
import './TopFilms.css'

function TopFilms({ films, isVisible }) {
    // If no films, don't render
    if (!films || films.length === 0) return null

    const filmCount = Math.min(films.length, 10)
    const getPosterUrl = (url) => (url ? `/api/proxy?url=${encodeURIComponent(url)}` : '')

    return (
        <div className="top-films">
            <div className="top-films__header">
                <span className="wrapped__label">The Cream of the Crop</span>
                <h2 className="top-films__title text-display">
                    Your Top <span className="text-gradient">{filmCount}</span>
                </h2>
                <p className="top-films__subtitle text-secondary">
                    {films.length >= 10
                        ? "Out of everything you watched, these reigned supreme."
                        : "These films stood out from your year in cinema."}
                </p>
            </div>

            <div className={`top-films__grid ${isVisible ? 'animate-stagger' : ''}`}>
                {films.slice(0, 10).map((film, index) => (
                    <div
                        key={`${film.title}-${index}`}
                        className="film-card"
                        style={{ '--delay': `${index * 100}ms` }}
                    >
                        <div className="film-card__poster">
                            {film.posterUrl ? (
                                <img src={getPosterUrl(film.posterUrl)} alt={film.title} loading="lazy" />
                            ) : (
                                <div className="film-card__placeholder">
                                    <div className="film-card__placeholder-content">
                                        <span className="film-card__title">{film.title}</span>
                                        <span className="film-card__error">
                                            Poster unavailable. Reload and re-upload your ZIP.
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div className="film-card__overlay">
                                <div className="film-card__rating-badge">
                                    {'★'.repeat(Math.floor(film.rating))}
                                    {film.rating % 1 !== 0 ? '½' : ''}
                                </div>
                                <div className="film-card__footer">
                                    <span className="film-card__title-overlay">{film.title}</span>
                                    <span className="film-card__year">{film.year}</span>
                                </div>
                            </div>
                        </div>
                        <div className="film-card__rank">{index + 1}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default TopFilms
