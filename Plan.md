# Letterboxd Wrapped 2025 - Project Plan

## Project Overview
A viral-worthy year-in-review experience for Letterboxd users, featuring interactive visualizations, personalized insights, and easy social sharing. Think Spotify Wrapped meets interactive web art.

## Core Philosophy
- **Free, no monetization (for now)**
- **Highly shareable** - every element should make users want to post
- **Personal & surprising** - insights users didn't know about themselves
- **Beautiful design** - premium aesthetic that stands out
- **2025 data only** - focused yearly recap

---

## MVP Features (Phase 1 - Launch This)

### User Flow
1. User lands on homepage
2. Enters Letterboxd username
3. App fetches & processes their 2025 data
4. User experiences scrolling reveal page with animations
5. User can share individual cards OR full results

### Feature Set

#### 1. **Flavor Profile Visualization** ⭐ (Point 4)
Interactive radar/circular chart showing user's taste mapped on multiple axes:
- **Axes to include:**
  - Obscure ↔ Mainstream (based on Letterboxd popularity)
  - Old ↔ New (decade distribution)
  - Happy ↔ Dark (genre analysis: comedy/romance vs horror/drama)
  - Arthouse ↔ Blockbuster (budget/indie indicators)
  - Fast ↔ Slow (runtime patterns, pacing)

**Output:** Unique shape/signature that visually represents taste
**Share text:** "My 2025 film taste is: 67% pretentious, 23% comfort watches, 10% chaos 🎬"

#### 2. **Friend Taste Comparison** ⭐ (Point 5)
- Input friend's Letterboxd username
- Side-by-side flavor profiles
- Overlap visualization showing:
  - Films you both watched
  - Films you both loved (4+ stars)
  - Your biggest disagreements (biggest rating difference)
  - "Compatibility score"
- **Share text:** "@friend we have 73% film taste compatibility! Compare yours 👇"

#### 3. **Essential Stats**

**The Big Numbers:**
- Total films watched in 2025
- Total hours watched (calculated from runtimes)
- Average rating
- Percentile ranking vs other users ("You watched more than 82% of Letterboxd users")

**Top Lists:**
- Top 10 films (your highest rated, displayed as poster grid)
- Top 5 directors by count
- Top 5 actors by count
- Favorite genre
- Favorite decade

**Time Insights:**
- Busiest month for watching
- Longest/shortest film watched
- Most productive day (date + count)
- Longest watching streak (consecutive days)

**Quirky/Personality Stats:**
- "Comfort director" (most frequently watched)
- "Guilty pleasure genre" (most watched low-rated genre)
- "Hipster moment" (highest rated film with low avg rating)
- "Contrarian take" (lowest rated film with high avg rating)
- "Top X% of [director] fans globally"
- Diversity score (unique countries represented)
- Rating tendency: "You rated X% harsher than Letterboxd average"

**Narrative Moments:**
- "Your year started with [first film of 2025]"
- "Your highest moment: [top rated] in [month]"
- "You discovered [new favorite director]" (if applicable)

#### 4. **Presentation Format**

**Primary Experience: Infinite Scroll Page**
- Single-page scroll experience
- Sections reveal with animations as user scrolls
- Smooth transitions between stats
- Interactive elements (hover effects, clickable posters)
- Each section is visually distinct

**Secondary: Shareable Cards**
- Auto-generate Instagram story-sized cards (1080x1920)
- Each major stat gets its own card design
- Users can download individual cards or full set
- Pre-filled social media text for easy sharing

**Suggested Scroll Sections Order:**
1. Landing/Title reveal
2. Big number reveal (total films)
3. Hours watched (with fun comparison)
4. Top 10 films grid
5. Flavor Profile visualization
6. Top directors & actors
7. Genre & decade breakdown
8. Quirky stats carousel
9. Narrative moments
10. Friend comparison (if entered)
11. Share prompt

---

## Future Features (Phase 2 - Post-Launch)

### Movie Galaxy Visualization (Points 1 & 2)
**"Your Personal Cinematic Universe"**
- 3D interactive space with Three.js
- Each film = floating sphere
- Size = your rating
- Position = genre clustering (physics-based)
- Color = decade/mood
- Connections = shared directors/actors
- User can rotate, zoom, explore
- Auto-generates rotating video for sharing

**Movie DNA Helix**
- Top films spiral in double helix
- Color-coded by attributes
- Interactive connections
- Generate unique "DNA code" from taste

**Implementation Notes:**
- Requires Three.js expertise
- More complex physics calculations
- Video export functionality needed
- Save for Phase 2 after MVP validation

---

## Technical Architecture

### Frontend Stack
- **Framework:** React (for component reusability)
- **Styling:** Tailwind CSS (rapid UI development)
- **Animations:** Framer Motion (scroll reveals, transitions)
- **3D (Phase 2):** Three.js (for galaxy viz)
- **Charts:** Recharts or D3.js (for flavor profile)
- **Hosting:** Vercel (easy deployment, serverless functions)

### Backend/Data Fetching
- **Approach:** Serverless functions (Vercel/Netlify)
- **Scraping:** Node.js with Cheerio or Puppeteer
- **Caching:** Simple JSON cache with 24hr expiry (prevent re-scraping)
- **Rate Limiting:** Implement delays between requests to Letterboxd

### Data Pipeline

```
User Input (username)
    ↓
Serverless Function
    ↓
Check Cache (has this user been scraped in last 24hrs?)
    ↓ (if no)
Scrape Letterboxd
    ↓
Parse & Process Data
    ↓
Calculate Stats & Insights
    ↓
Return JSON to Frontend
    ↓
Frontend Renders Visualizations
```

### Data Sources (Letterboxd URLs to Scrape)

**Primary Data:**
- `letterboxd.com/{username}/films/diary/for/2025/` - All 2025 watches
- `letterboxd.com/{username}/films/` - All-time films (for context)

**Per-Film Data (visit individual pages as needed):**
- `letterboxd.com/film/{film-slug}/` - Director, actors, genre, runtime, country

**Alternative/Supplementary:**
- RSS feed: `letterboxd.com/{username}/rss/` (easier parsing, limited to ~100 recent)

### Data Schema (What to Extract)

```javascript
{
  username: string,
  year: 2025,
  films: [
    {
      title: string,
      year: number,
      slug: string,
      posterUrl: string,
      userRating: number (0-5, 0.5 increments),
      watchDate: date,
      letterboxdAvgRating: number,
      totalRatings: number, // popularity metric
      directors: [string],
      topActors: [string],
      genres: [string],
      runtime: number (minutes),
      country: string,
      language: string
    }
  ],
  stats: {
    // calculated stats go here
  }
}
```

### Privacy & Error Handling

**Private Profiles:**
- Detect if profile is private (scraping will fail)
- Show friendly message: "This profile is private. Make sure your Letterboxd profile is public!"

**Invalid Usernames:**
- Handle 404 errors gracefully
- "Username not found. Check spelling?"

**Rate Limiting:**
- If scraping too many users simultaneously, queue requests
- Show loading state: "Analyzing your cinematic year..."

**No 2025 Data:**
- If user has no 2025 watches: "No films logged in 2025 yet. Start watching!"

---

## Scraping Implementation Details

### Parsing Strategy

**Option 1: HTML Scraping (Most Reliable)**
```javascript
// Pseudo-code
const response = await fetch(`https://letterboxd.com/${username}/films/diary/for/2025/`)
const html = await response.text()
const $ = cheerio.load(html)

// Extract film entries
$('.film-entry').each((i, elem) => {
  const title = $(elem).find('.film-title').text()
  const rating = $(elem).find('.rating').attr('class') // parse star class
  const date = $(elem).find('.date').text()
  // etc.
})
```

**Option 2: RSS Feed (Faster, Limited)**
- Good for recent activity
- Structured XML, easier parsing
- Limited to ~100 entries (may not capture full year)

**Recommendation:** Start with RSS for speed, fall back to HTML scraping if needed

### Third-Party APIs (Optional Enhancement)

**TMDb API (The Movie Database):**
- Free API for film metadata
- More reliable than scraping individual Letterboxd pages
- Get: directors, actors, genres, runtime, budget
- Use Letterboxd film title to search TMDb
- **Pros:** Fast, reliable, comprehensive
- **Cons:** Requires API key, rate limits

**Implementation:**
1. Scrape Letterboxd for: user ratings, watch dates, titles
2. Use TMDb API to enrich with: directors, actors, genres, metadata
3. Combine datasets for full picture

---

## Calculation Logic for Key Features

### Flavor Profile Axes

**Obscure ↔ Mainstream:**
```
Score = average(film.totalRatings across all films)
Normalize to 0-100 scale
0 = super obscure, 100 = mainstream blockbusters
```

**Old ↔ New:**
```
Score = average(2025 - film.year)
0 = watching newest releases, 100 = watching classics
```

**Happy ↔ Dark:**
```
Genre mapping:
Happy genres: Comedy, Romance, Family, Animation (+points)
Dark genres: Horror, Thriller, Drama, War (-points)
Normalize to 0-100
```

**Arthouse ↔ Blockbuster:**
```
Use combination of:
- Budget (if available from TMDb)
- Popularity (Letterboxd rating count)
- Genre indicators (Drama/Foreign = arthouse, Action/Sci-fi = blockbuster)
```

**Fast ↔ Slow:**
```
Average runtime
< 90 min = Fast
90-120 = Medium
> 120 = Slow paced
```

### Friend Comparison

**Compatibility Score:**
```
1. Find overlapping films (both watched)
2. Calculate rating difference for each overlap
3. Compatibility = 100 - (average rating difference * 20)
Example: Avg difference of 1 star = 80% compatible
```

**Shared Loves:**
Filter overlaps where both rated 4+ stars

**Biggest Disagreements:**
Sort overlaps by rating difference, take top 3

---

## Visual Design Guidelines

### Color Palette
- **Primary:** Deep cinematic blacks, rich film-reel golds
- **Accents:** Gradient purples/blues (like film light leaks)
- **Backgrounds:** Dark mode optimized
- **Text:** High contrast whites, subtle grays

### Typography
- **Headers:** Bold, cinematic serif (like Playfair Display)
- **Body:** Clean sans-serif (Inter, Outfit)
- **Numbers:** Tabular figures for stats

### Animation Principles
- **Scroll reveals:** Fade up + slight scale
- **Numbers:** Count-up animations
- **Charts:** Animated drawing/reveal
- **Transitions:** Smooth, 0.3-0.5s ease
- **Posters:** Hover effects (scale, glow)

### Responsive Design
- Mobile-first approach
- Cards stack vertically on mobile
- Touch-friendly interactive elements
- Optimized poster grids (3x3 on desktop, 2x2 on mobile)

---

## Sharing & Virality Features

### Pre-Generated Share Text Templates

**Twitter/X:**
```
"I watched [X] films in 2025 🎬
My taste is [Y]% pretentious, [Z]% chaos.
Check your cinematic year: [link]"
```

**Instagram Story:**
```
Generate story-sized cards (1080x1920)
Include subtle watermark: "Get yours at [domain]"
```

**Bluesky/Threads:**
Similar to Twitter template

### Share Functionality
- One-click copy share text
- Download individual stat cards as images
- Download full card set as ZIP
- Direct share to Twitter/Instagram/Bluesky (if APIs available)

### Viral Mechanics
- **Friend tagging:** "Compare with @friend"
- **Leaderboards (optional):** "Most obscure taste" "Most films watched"
- **Hashtag:** #MyLetterboxdWrapped2025
- **Badge system:** Unlock badges for milestones (100 films, 50 directors, etc.)

---

## Development Phases

### Phase 1: MVP (Launch Ready)
**Week 1-2:**
- [ ] Set up React app with Tailwind
- [ ] Build username input + loading state
- [ ] Implement Letterboxd scraper (serverless function)
- [ ] Parse and structure data
- [ ] Set up caching system

**Week 3:**
- [ ] Calculate all stats (big numbers, tops, quirky)
- [ ] Build Flavor Profile visualization
- [ ] Implement scroll reveal page
- [ ] Design and code each section

**Week 4:**
- [ ] Friend comparison feature
- [ ] Shareable cards generation
- [ ] Share functionality
- [ ] Polish animations & design
- [ ] Testing with real Letterboxd accounts

**Week 5:**
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Mobile responsive testing
- [ ] Deploy to Vercel
- [ ] Soft launch to friends

### Phase 2: Enhanced Features (Post-Launch)
- [ ] Movie Galaxy 3D visualization
- [ ] Movie DNA Helix
- [ ] Video export of visualizations
- [ ] Historical data (2024, 2023 comparisons)
- [ ] Custom color themes
- [ ] More advanced stats

---

## Launch Strategy

### Pre-Launch
1. Build with sample data, share screenshots on Film Twitter
2. Get 5-10 film-obsessed beta testers
3. Create teaser video showing visualizations
4. Prepare launch tweet thread

### Launch Day
1. Post on Letterboxd subreddit
2. Tweet from personal account + film communities
3. Share in Film Twitter Discord servers
4. Submit to Product Hunt (optional)
5. Post in r/movies, r/TrueFilm (if allowed)

### Post-Launch
1. Monitor for bugs, respond quickly
2. Encourage users to share results
3. Engage with users posting their wraps
4. Iterate based on feedback

---

## Technical Considerations

### Performance
- **Lazy load posters:** Only load visible images
- **Debounce scroll listeners:** Optimize animation triggers
- **Cache aggressively:** Reduce Letterboxd server load
- **Optimize images:** Compress shareable cards

### Scalability
- **If viral:** Move to proper backend (not just serverless)
- **Database:** Store scraped data (with user permission)
- **CDN:** Serve static assets quickly
- **Queue system:** Handle scraping requests during traffic spikes

### Legal/Ethical
- **Respect Letterboxd:** 
  - Rate limit scraping (1-2 requests/second max)
  - Cache data to minimize server load
  - Don't scrape private profiles
- **Attribution:** Credit Letterboxd, link back to user profiles
- **No data selling:** Keep user data private
- **Robots.txt:** Check if scraping is explicitly disallowed

---

## Success Metrics

### MVP Success = 1,000+ users in first week
- 500+ social shares
- <5 second load time
- <5% error rate
- 80%+ mobile compatibility

### Viral Success = 10,000+ users
- Featured in film community newsletters
- Mentioned by film Twitter influencers
- Organic growth via shares

---

## File Structure

```
letterboxd-wrapped/
├── public/
│   └── assets/
│       └── placeholder-poster.jpg
├── src/
│   ├── components/
│   │   ├── UsernameInput.jsx
│   │   ├── LoadingState.jsx
│   │   ├── sections/
│   │   │   ├── Hero.jsx
│   │   │   ├── BigNumbers.jsx
│   │   │   ├── TopFilms.jsx
│   │   │   ├── FlavorProfile.jsx
│   │   │   ├── TopDirectorsActors.jsx
│   │   │   ├── QuirkyStats.jsx
│   │   │   ├── FriendComparison.jsx
│   │   │   └── SharePrompt.jsx
│   │   └── ShareCard.jsx
│   ├── utils/
│   │   ├── scraper.js
│   │   ├── statsCalculator.js
│   │   ├── flavorProfile.js
│   │   └── shareGenerator.js
│   ├── api/
│   │   └── fetch-data.js (serverless function)
│   ├── App.jsx
│   └── index.css
├── package.json
└── vercel.json
```

---

## Notes for Coding Agent

### Priorities
1. **Start with data pipeline:** Get scraping working first
2. **Test with real accounts:** Use public Letterboxd profiles
3. **Focus on core viz:** Nail Flavor Profile before anything fancy
4. **Mobile-first:** Most shares happen on mobile
5. **Speed matters:** <3 second load critical for virality

### Common Gotchas
- Letterboxd HTML structure may change
- Handle edge cases (no ratings, rewatches, same-day watches)
- Film title matching can be tricky (special characters, years)
- Poster URLs may need proxy to avoid CORS issues
- Some users have thousands of films (optimize for scale)

### Quick Wins
- Use Letterboxd's existing poster images (don't re-host)
- Copy color scheme from Letterboxd for familiarity
- Add subtle film grain texture to backgrounds
- Use real film quotes as loading messages

### Testing Accounts (Public Letterboxd Users to Test With)
- karsten (prolific watcher)
- davidehrlich (film critic, huge catalog)
- gemmaruth (active user)

---

## Questions to Resolve

- [ ] Domain name? (letterboxdwrapped.com? cinematicyear.com?)
- [ ] Should we scrape all-time data for context or just 2025?
- [ ] Video export in Phase 1 or Phase 2?
- [ ] Allow users to save/bookmark their results?
- [ ] Email collection for 2026 launch reminder?

---

## Conclusion

This plan prioritizes:
✅ Shippable MVP with core features
✅ Viral sharing mechanics
✅ Beautiful, scroll-based experience
✅ Friend comparison for social engagement
✅ Clear path to Phase 2 enhancements

The galaxy viz is kept for Phase 2 to avoid complexity bloat in MVP, but the plan is complete enough for a coding agent to start building immediately.

**Next Step:** Begin with data scraping implementation and test with real Letterboxd accounts.
