import React from 'react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import './RatingTendency.css'

function RatingTendency({ difference, distribution, isVisible }) {
    // Fill in distribution data or use default if empty
    const data = distribution && distribution.length > 0 ? distribution : [
        { rating: '0.5', count: 0 },
        { rating: '1.0', count: 0 },
        { rating: '1.5', count: 0 },
        { rating: '2.0', count: 0 },
        { rating: '2.5', count: 0 },
        { rating: '3.0', count: 0 },
        { rating: '3.5', count: 0 },
        { rating: '4.0', count: 0 },
        { rating: '4.5', count: 0 },
        { rating: '5.0', count: 0 },
    ]

    const isGenerous = (difference || 0) > 0
    const diffText = Math.abs(difference || 0).toFixed(1)

    return (
        <div className="rating-tendency">
            <div className="rating-header">
                <h3 className="text-display">The Critic's Corner</h3>
                <p className="rating-subtitle">
                    You are <strong className={isGenerous ? 'text-green' : 'text-red'}>
                        {diffText} star{diffText !== '1.0' ? 's' : ''} {isGenerous ? 'more generous' : 'harsher'}
                    </strong>
                    <br /> than the average Letterboxd user.
                </p>
            </div>

            <div className={`rating-chart ${isVisible ? 'animate-fade-up' : ''}`}>
                <ResponsiveContainer width="100%" height={200} minWidth={300}>
                    <BarChart data={data}>
                        <XAxis dataKey="rating" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #333', borderRadius: '8px' }}
                            itemStyle={{ color: '#fbbf24' }}
                            labelStyle={{ color: '#fff', marginBottom: '4px' }}
                            labelFormatter={(label) => `${label} stars`}
                            formatter={(value) => [value, '']}
                        />
                        <Bar dataKey="count" fill="#fbbf24" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={parseFloat(entry.rating) >= 3.5 ? '#fbbf24' : '#a1a1aa'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="rating-footer">
                <p className="text-muted text-xs">
                    Your most frequent rating is <strong>
                        {data.reduce((prev, current) => (prev.count > current.count) ? prev : current).rating} stars
                    </strong>
                </p>
            </div>
        </div>
    )
}

export default RatingTendency
