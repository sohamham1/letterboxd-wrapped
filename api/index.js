import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper to determine star rating from class name
// Letterboxd uses classes like "rated-9" for 4.5 stars (9/2 = 4.5)
const getRatingFromClass = ($elem) => {
    const classList = $elem.attr('class') || '';
    const match = classList.match(/rated-(\d+)/);
    return match ? parseInt(match[1], 10) / 2 : 0;
};

// Scrape a single page of the diary
const scrapePage = async (username, year, page) => {
    const url = `https://letterboxd.com/${username}/diary/for/${year}/page/${page}/`;
    console.log(`Fetching ${url}...`);

    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Referer': 'https://letterboxd.com/',
                'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            },
            // Ensure we follow redirects correctly
            maxRedirects: 5
        });

        const $ = cheerio.load(data);
        const entries = [];

        // Iterate over diary entries
        $('.diary-entry-row').each((i, el) => {
            const $row = $(el);
            const $filmLink = $row.find('.td-film-details .headline-2 a');

            const title = $filmLink.text().trim();
            const slug = $filmLink.attr('href').split('/')[2]; // /film/anora/
            const yearReleased = parseInt($row.find('.td-released').text().trim()) || 0;

            // Date watched
            const day = $row.find('.td-day .date a').text().trim(); // "02"
            const month = $row.find('.td-day .date a').attr('href').split('/')[6]; // /.../diary/for/2025/11/
            // Simple date construction

            // Rating
            const rating = getRatingFromClass($row.find('.td-rating .rating'));

            // Poster
            const posterUrl = $row.find('.td-film-poster img').attr('src');

            entries.push({
                title,
                slug,
                year: yearReleased,
                userRating: rating,
                posterUrl,
                isRewatch: $row.hasClass('is-rewatch'),
                watchDate: `${year}-${month}-${day}` // Crude format, refine later
            });
        });

        // Check if there's a next page
        const hasNext = $('.paginate-nextprev .next').length > 0;

        return { entries, hasNext };

    } catch (error) {
        if (error.response && error.response.status === 404) {
            return { entries: [], hasNext: false };
        }
        console.error(`Error scraping page ${page}:`, error.message);
        throw error;
    }
};

app.get('/api/user/:username', async (req, res) => {
    const { username } = req.params;
    const year = 2025; // Hardcoded for now, could be param

    try {
        let allEntries = [];
        let page = 1;
        let hasMore = true;

        // Limit pages to avoid timeout during dev testing
        const MAX_PAGES = 50;

        while (hasMore && page <= MAX_PAGES) {
            const { entries, hasNext } = await scrapePage(username, year, page);
            if (entries.length === 0) break;

            allEntries = [...allEntries, ...entries];
            hasMore = hasNext;
            page++;

            // Be nice to their servers
            await new Promise(r => setTimeout(r, 500));
        }

        // Basic stats calculation to verify data
        const totalFilms = allEntries.length;
        const totalHours = allEntries.length * 2; // Approx 2h per film

        res.json({
            username,
            year,
            totalFilms,
            entries: allEntries
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user data', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
