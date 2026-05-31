/**
 * Client-side Letterboxd Scraper
 * Fetches diary pages directly from the user's browser to bypass server-side IP blocks.
 */

export const fetchUserDiary = async (username, year = 2025, onProgress) => {
    const records = [];
    const parser = new DOMParser();
    let page = 1;
    let hasMore = true;
    const maxPages = 50; // Safety limit
    let realName = username;

    try {
        // First, try to get the user's profile to find their real name
        try {
            const profileRes = await fetch(`https://letterboxd.com/${username}/`);
            if (profileRes.ok) {
                const text = await profileRes.text();
                const doc = parser.parseFromString(text, 'text/html');
                const nameTag = doc.querySelector('.title-3');
                if (nameTag) {
                    realName = nameTag.textContent.trim();
                }
            }
        } catch (e) {
            console.warn('Could not fetch profile for real name', e);
        }

        while (hasMore && page <= maxPages) {
            if (onProgress) onProgress(`Fetching page ${page}...`);

            // Artificial delay to be nice to Letterboxd servers
            if (page > 1) await new Promise(r => setTimeout(r, 1000));

            const response = await fetch(`https://letterboxd.com/${username}/diary/for/${year}/page/${page}/`);

            if (response.status === 404) {
                if (page === 1) throw new Error('User not found or no diary entries for this year');
                hasMore = false;
                break;
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch page ${page}: ${response.status}`);
            }

            const html = await response.text();
            const doc = parser.parseFromString(html, 'text/html');
            const rows = doc.querySelectorAll('.diary-entry-row');

            if (rows.length === 0) {
                hasMore = false;
                break;
            }

            rows.forEach(row => {
                const entry = {};

                // Extract slug
                const div = row.querySelector('div[data-film-slug]');
                if (div) entry.slug = div.getAttribute('data-film-slug');

                // Extract title
                const titleTag = row.querySelector('.headline-3');
                entry.name = titleTag ? titleTag.textContent.trim() : entry.slug;

                // Extract release year
                const relTd = row.querySelector('.td-released');
                if (relTd) {
                    const relText = relTd.textContent.trim();
                    if (/^\d+$/.test(relText)) entry.release = parseInt(relText);
                }

                // Extract rating
                const ratingSpan = row.querySelector('.rating');
                entry.rating = 0;
                if (ratingSpan) {
                    ratingSpan.classList.forEach(cls => {
                        if (cls.startsWith('rated-')) {
                            entry.rating = parseInt(cls.split('-')[1]);
                        }
                    });
                }

                // Extract logged date
                const dateTd = row.querySelector('.td-day') || row.querySelector('.col-daydate');
                if (dateTd) {
                    const link = dateTd.querySelector('a');
                    if (link) {
                        const href = link.getAttribute('href');
                        // href structure: /username/diary/for/2025/01/01/
                        const parts = href.split('/').filter(p => p);
                        // Find 'for' or 'diary' and look ahead
                        let yearIdx = -1;
                        // Try to find the year directly
                        const yIdx = parts.indexOf(year.toString());
                        if (yIdx !== -1 && parts.length >= yIdx + 3) {
                            entry.date = `${parts[yIdx]}-${parts[yIdx + 1]}-${parts[yIdx + 2]}`;
                        }
                    }
                }

                if (entry.slug) {
                    records.push(entry);
                }
            });

            // Check if this is the last page (less than 50 items usually means end, but pagination check is better)
            const nextLink = doc.querySelector('.paginate-nextprev .next');
            if (!nextLink || rows.length < 50) {
                hasMore = false;
            }

            page++;
        }

        return {
            username,
            real_name: realName,
            entries: records,
            source: 'client_side'
        };

    } catch (error) {
        console.error('Client-side scraping error:', error);
        throw error;
    }
};
