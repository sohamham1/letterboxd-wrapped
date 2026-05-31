/**
 * Mock data for development and testing
 * Replace with real scraped data in production
 */

export const mockUserData = {
    username: 'cinephile',
    year: 2025,

    stats: {
        // Big Numbers
        totalFilms: 127,
        totalHours: 254,
        averageRating: 3.7,
        percentile: 82, // "more than 82% of users"

        // Time Insights
        busiestMonth: 'October',
        busiestMonthCount: 18,
        longestFilm: { title: 'Killers of the Flower Moon', runtime: 206 },
        shortestFilm: { title: 'Un Chien Andalou', runtime: 16 },
        mostProductiveDay: { date: '2025-10-31', count: 5 },
        longestStreak: 12, // consecutive days

        // Rating Tendency
        ratingDifference: -0.3, // negative = harsher than avg
    },

    // Top 10 Films
    topFilms: [
        { title: 'Anora', year: 2024, rating: 5, posterUrl: null },
        { title: 'The Brutalist', year: 2024, rating: 5, posterUrl: null },
        { title: 'Dune: Part Two', year: 2024, rating: 4.5, posterUrl: null },
        { title: 'Past Lives', year: 2023, rating: 4.5, posterUrl: null },
        { title: 'Poor Things', year: 2023, rating: 4.5, posterUrl: null },
        { title: 'All of Us Strangers', year: 2023, rating: 4.5, posterUrl: null },
        { title: 'The Holdovers', year: 2023, rating: 4.5, posterUrl: null },
        { title: 'Challengers', year: 2024, rating: 4, posterUrl: null },
        { title: 'Love Lies Bleeding', year: 2024, rating: 4, posterUrl: null },
        { title: 'I Saw the TV Glow', year: 2024, rating: 4, posterUrl: null },
    ],

    // Top Directors
    topDirectors: [
        { name: 'Denis Villeneuve', count: 5 },
        { name: 'Greta Gerwig', count: 4 },
        { name: 'Yorgos Lanthimos', count: 4 },
        { name: 'Sean Baker', count: 3 },
        { name: 'Celine Song', count: 2 },
    ],

    // Top Actors
    topActors: [
        { name: 'Timothée Chalamet', count: 6 },
        { name: 'Florence Pugh', count: 5 },
        { name: 'Emma Stone', count: 4 },
        { name: 'Zendaya', count: 4 },
        { name: 'Paul Mescal', count: 3 },
    ],

    // Flavor Profile (0-100 scale)
    flavorProfile: {
        mainstream: 35,    // 0 = obscure, 100 = mainstream
        modern: 72,        // 0 = classics, 100 = new releases
        light: 40,         // 0 = dark/heavy, 100 = light/happy
        arthouse: 65,      // 0 = blockbuster, 100 = arthouse
        slow: 55,          // 0 = fast-paced, 100 = slow cinema
    },

    // Genre Breakdown
    genres: [
        { name: 'Drama', count: 45, percentage: 35 },
        { name: 'Comedy', count: 20, percentage: 16 },
        { name: 'Horror', count: 18, percentage: 14 },
        { name: 'Thriller', count: 15, percentage: 12 },
        { name: 'Sci-Fi', count: 12, percentage: 9 },
        { name: 'Romance', count: 10, percentage: 8 },
        { name: 'Other', count: 7, percentage: 6 },
    ],

    // Decade Breakdown
    decades: [
        { decade: '2020s', count: 78, percentage: 61 },
        { decade: '2010s', count: 25, percentage: 20 },
        { decade: '2000s', count: 10, percentage: 8 },
        { decade: '1990s', count: 6, percentage: 5 },
        { decade: 'Pre-1990', count: 8, percentage: 6 },
    ],

    // Quirky Stats
    quirkyStats: {
        comfortDirector: { name: 'Wes Anderson', reason: 'Most rewatched' },
        guiltyPleasure: { genre: 'Horror', avgRating: 2.8 },
        hipsterMoment: {
            title: 'I Saw the TV Glow',
            userRating: 4.5,
            avgRating: 3.2
        },
        contrarianTake: {
            title: 'Joker: Folie à Deux',
            userRating: 2,
            avgRating: 3.8
        },
        diversityScore: 24, // unique countries
    },

    // Narrative Moments
    narrative: {
        firstFilm: { title: 'The Iron Claw', date: '2025-01-02' },
        highestMoment: { title: 'Anora', month: 'November', rating: 5 },
        discoveredDirector: 'Sean Baker',
    },

    // Activity Heatmap (Day by day count for 2025)
    // Generated for the sake of the demo
    activityData: Array.from({ length: 365 }, (_, i) => {
        const date = new Date(2025, 0, 1 + i).toISOString().split('T')[0]
        // Random count between 0 and 4, weighted towards 0
        const rand = Math.random()
        let count = 0
        if (rand > 0.9) count = 3
        else if (rand > 0.8) count = 2
        else if (rand > 0.6) count = 1

        // Make Oct (busiest month) busier
        if (date.includes('-10-')) {
            if (Math.random() > 0.3) count = Math.max(1, count + 1)
        }

        return { date, count }
    }),
}

// Sample films for the diary (used for detailed calculations)
export const mockFilms = [
    {
        title: 'Anora',
        year: 2024,
        slug: 'anora',
        posterUrl: null,
        userRating: 5,
        watchDate: '2025-11-15',
        letterboxdAvgRating: 4.1,
        totalRatings: 125000,
        directors: ['Sean Baker'],
        topActors: ['Mikey Madison', 'Mark Eydelshteyn'],
        genres: ['Drama', 'Comedy'],
        runtime: 139,
        country: 'USA',
    },
    // More films would be here in real data...
]
