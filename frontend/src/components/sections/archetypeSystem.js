export const ARCHETYPE_ORDER = [
    'completionist',
    'contrarian',
    'archaeologist',
    'purist',
    'evangelist',
    'drifter',
    'creature',
    'gatekeeper',
    'maximalist',
    'romantic'
]

export const ARCHETYPES = {
    completionist: {
        id: 'completionist',
        title: 'The Completionist',
        label: 'Dedicated',
        taglineSection: 'You treat unfinished trilogies like open emotional wounds, and you will close every loop.',
        taglineCard: 'you physically cannot leave a filmography half-watched and you need everyone to know it.',
        icon: '✓',
        titleFont: "'Outfit', sans-serif",
        titleStyle: { fontWeight: 800, letterSpacing: '-0.02em', fontSize: 36, fontStyle: 'normal' },
        palette: {
            bg: '#0a0a0f',
            accent: '#c8a96e',
            accent2: '#e8c98a',
            text: '#fff8ee',
            sub: '#b7a487',
            glow: 'rgba(200,169,110,0.25)',
            grain: true
        },
        motif: 'grid'
    },
    contrarian: {
        id: 'contrarian',
        title: 'The Contrarian',
        label: 'Exhausting',
        taglineSection: "You've never once agreed with the Letterboxd average, and somehow that's your whole personality.",
        taglineCard: "you've never once agreed with the letterboxd average and that is your whole personality.",
        icon: '↯',
        titleFont: "'Bebas Neue', sans-serif",
        titleStyle: { fontWeight: 400, letterSpacing: '0.04em', fontSize: 48, fontStyle: 'normal' },
        palette: {
            bg: '#0f0800',
            accent: '#ff4500',
            accent2: '#ff7043',
            text: '#fff8f0',
            sub: '#aa5533',
            glow: 'rgba(255,69,0,0.3)',
            grain: true
        },
        motif: 'diagonal'
    },
    archaeologist: {
        id: 'archaeologist',
        title: 'The Archaeologist',
        label: 'Distinguished',
        taglineSection: "While everyone's watching 2024 releases, you're deep in a 1963 Polish film nobody's heard of.",
        taglineCard: "while everyone's watching 2024 releases you're deep in a 1963 Polish film nobody's heard of.",
        icon: '◎',
        titleFont: "'Playfair Display', Georgia, serif",
        titleStyle: { fontWeight: 700, letterSpacing: '-0.01em', fontSize: 32, fontStyle: 'normal' },
        palette: {
            bg: '#080c0a',
            accent: '#4aad7a',
            accent2: '#7dd4a8',
            text: '#eef5f0',
            sub: '#4a7a5a',
            glow: 'rgba(74,173,122,0.2)',
            grain: true
        },
        motif: 'arc'
    },
    purist: {
        id: 'purist',
        title: 'The Purist',
        label: 'Pretentious',
        taglineSection: "If it doesn't have subtitles and a 3-hour runtime, you're not interested and you've already left.",
        taglineCard: "if it doesn't have subtitles and a 3-hour runtime you're not interested and you've already left.",
        icon: '◇',
        titleFont: "'Cormorant Garamond', Georgia, serif",
        titleStyle: { fontWeight: 600, letterSpacing: '0.07em', fontSize: 42, fontStyle: 'normal' },
        palette: {
            bg: '#06060e',
            accent: '#8888ff',
            accent2: '#bbbbff',
            text: '#f0f0ff',
            sub: '#5555aa',
            glow: 'rgba(136,136,255,0.2)',
            grain: false
        },
        motif: 'minimal'
    },
    evangelist: {
        id: 'evangelist',
        title: 'The Evangelist',
        label: 'Delusional',
        taglineSection: "You gave 5 stars to something described as 'a film,' and you stand by that.",
        taglineCard: 'you gave out 5 stars like they were free and you meant every single one of them.',
        icon: '★',
        titleFont: "'Outfit', sans-serif",
        titleStyle: { fontWeight: 800, letterSpacing: '-0.02em', fontSize: 36, fontStyle: 'normal' },
        palette: {
            bg: '#0c0800',
            accent: '#ffcc00',
            accent2: '#ffe566',
            text: '#fffbee',
            sub: '#997700',
            glow: 'rgba(255,204,0,0.25)',
            grain: true
        },
        motif: 'burst'
    },
    drifter: {
        id: 'drifter',
        title: 'The Drifter',
        label: 'Unreadable',
        taglineSection: 'No pattern, no loyalty, no explanation. Your Letterboxd is a fever dream, and we respect it.',
        taglineCard: 'no pattern, no loyalty, no explanation. your letterboxd is a fever dream and we respect it.',
        icon: '∿',
        titleFont: "'DM Sans', sans-serif",
        titleStyle: { fontWeight: 500, letterSpacing: '0.01em', fontSize: 36, fontStyle: 'normal' },
        palette: {
            bg: '#080810',
            accent: '#66ccdd',
            accent2: '#99eeff',
            text: '#eefaff',
            sub: '#3a7788',
            glow: 'rgba(102,204,221,0.2)',
            grain: false
        },
        motif: 'scatter'
    },
    creature: {
        id: 'creature',
        title: 'The Creature of Habit',
        label: 'Predictable',
        taglineSection: 'Your 2024 looks exactly like 2023 and 2022. Honestly kind of impressive.',
        taglineCard: 'your 2024 looks exactly like 2023. and 2022. honestly kind of impressive.',
        icon: '◉',
        titleFont: "'Outfit', sans-serif",
        titleStyle: { fontWeight: 800, letterSpacing: '-0.02em', fontSize: 30, fontStyle: 'normal' },
        palette: {
            bg: '#0a0808',
            accent: '#dd6688',
            accent2: '#ff99bb',
            text: '#fff0f5',
            sub: '#994466',
            glow: 'rgba(221,102,136,0.2)',
            grain: true
        },
        motif: 'loop'
    },
    gatekeeper: {
        id: 'gatekeeper',
        title: 'The Gatekeeper',
        label: 'Insufferable',
        taglineSection: "You've never given 4 stars without also writing a paragraph about why it deserved 3.5.",
        taglineCard: "you've never given 4 stars without also writing a paragraph about why it deserved 3.5.",
        icon: '⌀',
        titleFont: "'Cormorant Garamond', Georgia, serif",
        titleStyle: { fontWeight: 600, letterSpacing: '0.02em', fontSize: 38, fontStyle: 'italic' },
        palette: {
            bg: '#050505',
            accent: '#aaaaaa',
            accent2: '#dddddd',
            text: '#f8f8f8',
            sub: '#555555',
            glow: 'rgba(180,180,180,0.15)',
            grain: true
        },
        motif: 'bars'
    },
    maximalist: {
        id: 'maximalist',
        title: 'The Maximalist',
        label: 'Unwell',
        taglineSection: "You watched how many films this year? That's not a hobby. That's a condition.",
        taglineCard: "you watched how many films this year? that's not a hobby. that's a condition.",
        icon: '∞',
        titleFont: "'Bebas Neue', sans-serif",
        titleStyle: { fontWeight: 400, letterSpacing: '0.05em', fontSize: 52, fontStyle: 'normal' },
        palette: {
            bg: '#08000f',
            accent: '#cc44ff',
            accent2: '#ee88ff',
            text: '#faf0ff',
            sub: '#7722aa',
            glow: 'rgba(204,68,255,0.3)',
            grain: false
        },
        motif: 'overflow'
    },
    romantic: {
        id: 'romantic',
        title: 'The Romantic',
        label: 'Sensitive',
        taglineSection: "You cried twice this year, and both times you'd do it again without hesitation.",
        taglineCard: "you cry at least three times a week and honestly you wouldn't have it any other way.",
        icon: '♡',
        titleFont: "'Playfair Display', Georgia, serif",
        titleStyle: { fontWeight: 700, letterSpacing: '-0.01em', fontSize: 36, fontStyle: 'italic' },
        palette: {
            bg: '#080508',
            accent: '#ff8877',
            accent2: '#ffbbaa',
            text: '#fff5f3',
            sub: '#bb5544',
            glow: 'rgba(255,136,119,0.2)',
            grain: true
        },
        motif: 'soft'
    }
}

function clampScore(value) {
    if (!Number.isFinite(value)) return 0
    return Math.max(0, Math.min(100, value))
}

export function getCinematicArchetype({
    stats = {},
    flavor = {},
    genres = [],
    rewatchData = {},
    dayOfWeek = {},
    topFilms = [],
    topDirectors = []
} = {}) {
    const avgRating = Number(stats.averageRating || 0)
    const totalFilms = Number(stats.totalFilms || 0)
    const totalHours = Number(stats.totalHours || 0)
    const ratingDifference = Number(stats.ratingDifference || 0)
    const mainstream = Number(flavor.mainstream || 0)
    const modern = Number(flavor.modern || 0)
    const light = Number(flavor.light || 0)
    const arthouse = Number(flavor.arthouse || 0)
    const slow = Number(flavor.slow || 0)
    const rewatches = Number(rewatchData.totalRewatches || 0)
    const rewatchPct = Number(rewatchData.rewatchPercentage || 0)
    const discovery = Number(rewatchData.discoveryScore || 0)
    const favoriteDayCount = Number(dayOfWeek.favoriteDayCount || 0)
    const topGenrePct = Number(genres?.[0]?.percentage || 0)
    const topDirectorCount = Number(topDirectors?.[0]?.count || 0)
    const fiveStarCount = topFilms.filter((film) => Number(film.rating || 0) >= 5).length
    const harshness = Math.max(0, (-ratingDifference) * 100)
    const positivity = Math.max(0, ratingDifference * 100)
    const uniqueness = 100 - topGenrePct

    const scores = {
        completionist: clampScore((totalFilms * 0.34) + (topDirectorCount * 9) + (rewatches * 2.4)),
        contrarian: clampScore((harshness * 0.75) + ((100 - mainstream) * 0.45) + (uniqueness * 0.2)),
        archaeologist: clampScore((arthouse * 0.7) + ((100 - modern) * 0.6) + (discovery * 0.22)),
        purist: clampScore((arthouse * 0.5) + (slow * 0.5) + ((100 - light) * 0.34) + (avgRating * 8)),
        evangelist: clampScore((avgRating * 12) + (fiveStarCount * 8.5) + (positivity * 0.35) + (mainstream * 0.2)),
        drifter: clampScore((uniqueness * 0.62) + (discovery * 0.33) + (Math.abs(mainstream - arthouse) * 0.4)),
        creature: clampScore((rewatchPct * 1.18) + (rewatches * 3.2) + (favoriteDayCount * 2.1)),
        gatekeeper: clampScore((harshness * 0.62) + (arthouse * 0.34) + ((100 - avgRating * 20) * 0.4)),
        maximalist: clampScore((totalFilms * 0.35) + (totalHours * 0.12) + (modern * 0.1)),
        romantic: clampScore((light * 0.54) + (avgRating * 11.2) + (fiveStarCount * 3.4) + (positivity * 0.2))
    }

    const ranked = ARCHETYPE_ORDER
        .map((id) => ({
            ...ARCHETYPES[id],
            computedScore: Math.round(scores[id] || 0)
        }))
        .sort((a, b) => (
            b.computedScore - a.computedScore
            || ARCHETYPE_ORDER.indexOf(a.id) - ARCHETYPE_ORDER.indexOf(b.id)
        ))

    return ranked[0] || ARCHETYPES.completionist
}
