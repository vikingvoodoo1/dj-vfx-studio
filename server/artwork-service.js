/**
 * Universal Music Artwork Lookup Service
 * Retrieves high-resolution album/track artwork from iTunes Search API and Deezer API.
 * 100% Free, keyless, fast, and cached in-memory.
 */

const artworkCache = new Map();

/**
 * Clean strings for search queries by stripping noisy tags if primary query fails.
 */
function cleanTrackQuery(title = '', artist = '') {
    const cleanTitle = title
        .replace(/\[[^\]]*\]/g, '') // remove [Extended Mix], [VIP]
        .replace(/\((?:feat|ft|original|radio|remix|dub|club|vocal|extended|mix|edit|version)[^\)]*\)/gi, '') // remove (feat. ...), (Original Mix)
        .replace(/\s+/g, ' ')
        .trim();

    const cleanArtist = artist
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\((?:feat|ft)[^\)]*\)/gi, '')
        .replace(/\s+feat\.?\s+.*/i, '')
        .replace(/\s+ft\.?\s+.*/i, '')
        .replace(/\s+/g, ' ')
        .trim();

    return { cleanTitle, cleanArtist };
}

/**
 * Query iTunes Search API for song artwork.
 * Replaces 100x100 with 600x600 for crisp high-resolution display.
 */
async function queryITunes(query) {
    try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)'
            },
            signal: AbortSignal.timeout(4000)
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.resultCount > 0 && data.results && data.results[0]) {
            const track = data.results[0];
            let art = track.artworkUrl100 || track.artworkUrl60 || '';
            if (art) {
                art = art.replace(/\/\d+x\d+bb\.jpg/i, '/600x600bb.jpg');
            }
            return {
                coverart: art,
                title: track.trackName || '',
                artist: track.artistName || '',
                album: track.collectionName || '',
                genre: track.primaryGenreName || '',
                source: 'itunes'
            };
        }
    } catch (e) {
        // Fail silently and try next fallback
    }
    return null;
}

/**
 * Fallback to Deezer Search API if iTunes has no match.
 */
async function queryDeezer(query) {
    try {
        const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)'
            },
            signal: AbortSignal.timeout(4000)
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.data && data.data.length > 0) {
            const track = data.data[0];
            const art = track.album?.cover_xl || track.album?.cover_big || track.album?.cover_medium || '';
            if (art) {
                return {
                    coverart: art,
                    title: track.title || '',
                    artist: track.artist?.name || '',
                    album: track.album?.title || '',
                    source: 'deezer'
                };
            }
        }
    } catch (e) {
        // Fail silently
    }
    return null;
}

/**
 * Search for track album art.
 * @param {string} title - Track title
 * @param {string} artist - Artist name
 * @returns {Promise<{success: boolean, coverart?: string, title?: string, artist?: string, album?: string, message?: string}>}
 */
export async function searchAlbumArt(title = '', artist = '') {
    const rawTitle = (title || '').trim();
    const rawArtist = (artist || '').trim();

    if (!rawTitle && !rawArtist) {
        return { success: false, message: 'Title or artist required.' };
    }

    const cacheKey = `${rawArtist.toLowerCase()}:::${rawTitle.toLowerCase()}`;
    if (artworkCache.has(cacheKey)) {
        return { success: true, ...artworkCache.get(cacheKey) };
    }

    // 1. Primary Query: exact artist + title
    const primaryQuery = rawArtist ? `${rawArtist} ${rawTitle}` : rawTitle;
    let match = await queryITunes(primaryQuery);

    // 2. If no result, try Deezer with primary query
    if (!match) {
        match = await queryDeezer(primaryQuery);
    }

    // 3. Cleaned Query: Strip brackets / mix versions / ft. tags if initial query was too specific
    if (!match) {
        const { cleanTitle, cleanArtist } = cleanTrackQuery(rawTitle, rawArtist);
        const secondaryQuery = cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle;
        if (secondaryQuery && secondaryQuery !== primaryQuery) {
            match = await queryITunes(secondaryQuery);
            if (!match) {
                match = await queryDeezer(secondaryQuery);
            }
        }
    }

    // 4. Fallback: Search title only
    if (!match && rawTitle) {
        match = await queryITunes(rawTitle);
    }

    if (match && match.coverart) {
        artworkCache.set(cacheKey, match);
        return {
            success: true,
            coverart: match.coverart,
            title: match.title,
            artist: match.artist,
            album: match.album,
            genre: match.genre || ''
        };
    }

    return {
        success: false,
        message: 'No album artwork found in online databases.'
    };
}
