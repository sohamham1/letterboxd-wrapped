import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import './GenreDecade.css'

function GenreDecade({ genres = [], decades = [], isVisible }) {
    // Colors for charts
    const COLORS = ['#fbbf24', '#f59e0b', '#f97316', '#ef4444', '#a855f7', '#3b82f6', '#10b981']

    return (
        <div className="charts-grid">
            {/* Genre Chart */}
            <div className={`chart-card chart-card--genre ${isVisible ? 'animate-fade-up' : ''}`}>
                <h3 className="chart-title">Genre Breakdown</h3>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={250} minWidth={200} debounce={120}>
                        <PieChart>
                            <Pie
                                data={genres}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="count"
                            >
                                {genres.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #333', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Legend */}
                    <div className="chart-legend">
                        {genres.slice(0, 3).map((genre, index) => (
                            <div key={genre.name} className="legend-item">
                                <span className="dot" style={{ backgroundColor: COLORS[index] }}></span>
                                <span className="name">{genre.name}</span>
                                <span className="percent">{genre.percentage}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Decade Timeline (Vertical Bars) */}
            <div className={`chart-card chart-card--decade ${isVisible ? 'animate-fade-up delay-2' : ''}`}>
                <h3 className="chart-title">Time Travel</h3>
                <div className="decade-list">
                    {decades.map((decade, index) => (
                        <div key={decade.decade} className="decade-item">
                            <span className="decade-label">{decade.decade}</span>
                            <div className="decade-bar-container">
                                <div
                                    className="decade-bar"
                                    style={{
                                        width: `${Number(decade.percentage || 0)}%`,
                                        backgroundColor: COLORS[index % COLORS.length]
                                    }}
                                ></div>
                            </div>
                            <span className="decade-count">{decade.count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default GenreDecade
