(function (root) {
  'use strict';

  function text(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim(); }
  function key(track) { return JSON.stringify([track.source, String(track.id)]); }
  function artistName(track) {
    var name = String(track.originalArtist || track.artist || '').replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim();
    // YouTube may return a channel instead of the performer. Prefer the title's
    // artist prefix only when the channel is clearly a label/compilation channel.
    var title = String(track.originalTitle || track.title || '');
    var parts = title.split(/\s+[-–—]\s+/);
    if (/records|music channel|nhac remix|nhạc remix|nhạc trẻ|nhac tre|compilation/i.test(name) && parts.length === 2 && parts[0].length < 70) { name = parts[0]; }
    return name.replace(/\s+(official|chính thức)$/i, '').trim();
  }
  function artistKey(track) { return text(artistName(track)).replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' '); }
  function musicKey(track) {
    var title = text(track.originalTitle || track.title).replace(/\b(official|music video|lyric[s]?|audio|video|mv|hd|4k)\b/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    var name = artistKey(track);
    var prefix = text(artistName(track)).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    [prefix, name].forEach(function (value) {
      if (!value) { return; }
      if (title.indexOf(value + ' ') === 0) { title = title.slice(value.length + 1); }
      if (title.endsWith(' ' + value)) { title = title.slice(0, -value.length - 1); }
    });
    return name + '|' + title;
  }
  var styles = [
    { id: 'remix', name: 'Remix', query: 'nhac remix vinahouse', re: /\b(remix|vinahouse|nonstop|dj mix)\b/ },
    { id: 'electronic', name: 'Electronic', query: 'electronic dance music', re: /\b(edm|electronic|techno|trance|dubstep|house)\b/ },
    { id: 'lofi', name: 'Lo-fi', query: 'lofi chill music', re: /\b(lofi|lo fi|chill|chillout)\b/ },
    { id: 'acoustic', name: 'Acoustic', query: 'acoustic songs', re: /\b(acoustic|unplugged)\b/ },
    { id: 'ballad', name: 'Ballad', query: 'ballad nhac buon', re: /\b(ballad|nhac buon|sad song)\b/ },
    { id: 'rap', name: 'Rap / Hip-hop', query: 'hip hop rap songs', re: /\b(rap|hip hop|hiphop|trap)\b/ },
    { id: 'rock', name: 'Rock', query: 'rock alternative songs', re: /\b(rock|metal|punk|grunge)\b/ },
    { id: 'indie', name: 'Indie', query: 'indie pop music', re: /\b(indie|alternative)\b/ },
    { id: 'bolero', name: 'Bolero', query: 'nhac bolero tru tinh', re: /\b(bolero|tru tinh)\b/ },
    { id: 'classical', name: 'Nhạc không lời', query: 'instrumental piano music', re: /\b(classical|instrumental|piano|khong loi)\b/ },
    { id: 'pop', name: 'Pop', query: 'pop songs', re: /\b(pop|vpop|kpop|k pop|jpop|cpop)\b/ },
    { id: 'rnb', name: 'R&B / Soul', query: 'rnb soul songs', re: /\b(rnb|r&b|soul|rhythm and blues)\b/ },
    { id: 'jazz', name: 'Jazz', query: 'jazz songs', re: /\b(jazz|swing|bebop)\b/ },
    { id: 'country', name: 'Country', query: 'country folk songs', re: /\b(country|folk|bluegrass)\b/ }
  ];
  function preferences(value) {
    value = value || {};
    var seen = new Set();
    var artists = (Array.isArray(value.favoriteArtists) ? value.favoriteArtists : []).filter(function (name) { return typeof name === 'string'; }).map(function (name) { return name.trim().replace(/\s+/g, ' ').slice(0, 80); }).filter(function (name) {
      var normalized = artistKey({ artist: name });
      if (!normalized || seen.has(normalized)) { return false; } seen.add(normalized); return true;
    }).slice(0, 20);
    var genres = styles.filter(function (style) { return Array.isArray(value.favoriteGenres) && value.favoriteGenres.indexOf(style.id) >= 0; }).map(function (style) { return style.id; }).slice(0, 6);
    return { favoriteArtists: artists, favoriteGenres: genres };
  }
  function classify(track) {
    track = track || {};
    var metadata = Array.isArray(track.genreTags) ? track.genreTags.filter(function (s) { return typeof s === 'string'; }) : [];
    var input = text((track.originalTitle || track.title || '') + ' ' + (track.album || '')).replace(/[-_/]+/g, ' ');
    var ids = [], kinds = {};
    styles.forEach(function (style) {
      var known = metadata.some(function (tag) { return text(tag) === style.id || style.re.test(text(tag).replace(/[-_/]+/g, ' ')); });
      if (known || style.re.test(input)) { ids.push(style.id); kinds[style.id] = known ? 'metadata' : 'title'; }
    });
    return { ids: ids, kinds: kinds };
  }
  function tags(track) {
    var classified = classify(track).ids;
    return styles.filter(function (style) { return classified.indexOf(style.id) >= 0 || Array.isArray(track.recommendationGenreHints) && track.recommendationGenreHints.indexOf(style.id) >= 0; }).map(function (style) { return style.id; });
  }
  function valid(track) { return track && !['spotify', 'itunes'].includes(track.catalogProvider) && track.id != null && String(track.id).length > 0 && ['youtube', 'spotify', 'soundcloud', 'local'].indexOf(track.source) >= 0 && (track.source !== 'local' || !root.NhacCaNhan || !root.NhacCaNhan.daTai() || root.NhacCaNhan.coBai(track.id)) && track.title; }
  function cleanTrack(track) {
    var copy = Object.assign({}, track);
    ['recommendationReason', 'recommendationNew', 'recommendationGenreHints', 'suggestionReason', 'customCoverBase64', 'originalCover', 'localCoverPath', 'discordCoverUrl', 'continueTime', 'continueDuration'].forEach(function (name) { delete copy[name]; });
    if (String(copy.cover || '').indexOf('data:') === 0 || String(copy.cover || '').length > 4096) { copy.cover = ''; }
    return copy;
  }
  function qualifies(session) {
    var duration = Number(session.duration) || Number(session.track && session.track.duration) || 0;
    return Number(session.listenedSeconds) >= (duration > 0 ? Math.min(30, duration / 2) : 30);
  }
  function buildTaste(profile, library, recent, now, chosenPreferences, playlists) {
    profile = profile || {};
    now = now || Date.now();
    var taste = { artists: new Map(), styles: new Map(), recentStyles: new Map(), songs: new Map(), known: new Set(), blocked: new Set(), heard: new Set(), sessions: 0, minutes: 0 };
    (profile.hiddenTracks || []).filter(valid).forEach(function (track) { taste.blocked.add(key(track)); taste.blocked.add(musicKey(track)); });
    function add(track, weight, artistFactor, recentWeight) {
      if (!valid(track) || taste.blocked.has(key(track)) || taste.blocked.has(musicKey(track))) { return; }
      var mk = musicKey(track), ak = artistKey(track);
      var song = taste.songs.get(mk) || { track: track, score: 0, plays: 0, recentPlays: 0, skips: 0, recentSkips: 0, last: 0, lastPlayed: 0, liked: false };
      song.score += weight;
      taste.songs.set(mk, song);
      if (ak && ak !== 'unknown artist' && ak !== 'unknown') {
        var artist = taste.artists.get(ak) || { name: artistName(track), key: ak, score: 0, recentScore: 0, plays: 0 };
        artist.score += weight * (artistFactor == null ? 1 : artistFactor);
        artist.recentScore += recentWeight || 0;
        taste.artists.set(ak, artist);
      }
      // Search-query hints help rank candidates, but are not genre metadata and
      // must not teach the profile that every search result belongs to that genre.
      classify(track).ids.forEach(function (tag) {
        taste.styles.set(tag, (taste.styles.get(tag) || 0) + weight * (artistFactor == null ? 1 : artistFactor));
        taste.recentStyles.set(tag, (taste.recentStyles.get(tag) || 0) + (recentWeight || 0));
      });
      return song;
    }
    var sessions = new Map();
    (profile.sessions || []).forEach(function (session) {
      if (!session || !session.id) { return; }
      var previous = sessions.get(session.id);
      if (!previous || session.listenedSeconds > previous.listenedSeconds) { sessions.set(session.id, session); }
    });
    sessions.forEach(function (session) {
      if (!valid(session.track) || !Number.isFinite(session.listenedSeconds) || session.listenedSeconds < 1) { return; }
      var track = session.track, mk = musicKey(track), duration = Number(session.duration) || Number(track.duration) || 0;
      taste.heard.add(mk);
      taste.minutes += session.listenedSeconds / 60;
      var age = Math.max(0, (now - (Number(session.updatedAt) || now)) / 86400000);
      var decay = Math.exp(-age / 60);
      var full = duration > 0 && Number(session.coverageSeconds) >= duration * 0.8;
      var early = session.skipped && session.listenedSeconds < (duration > 0 ? Math.min(30, duration * 0.2) : 30);
      var qualified = qualifies(session);
      if (qualified) { taste.sessions++; }
      var weight = (qualified ? 1.6 + Math.min(1.4, session.listenedSeconds / 150) + (full ? 1.6 : 0) : 0) * decay;
      if (early) { weight = -1.8 * decay; }
      var record = add(track, weight, early ? 0.2 : 1, qualified && !early ? weight * Math.exp(-age / 7) : 0);
      if (!record) { return; }
      record.last = Math.max(record.last, Number(session.updatedAt) || 0);
      if (qualified) {
        record.plays++;
        record.lastPlayed = Math.max(record.lastPlayed, Number(session.updatedAt) || 0);
        if (age <= 14) { record.recentPlays++; }
        var artist = taste.artists.get(artistKey(track)); if (artist) { artist.plays++; }
      }
      if (early) { record.skips++; if (age <= 14) { record.recentSkips++; } }
    });
    var liked = new Set();
    (library || []).filter(valid).forEach(function (track) {
      var mk = musicKey(track); if (liked.has(mk)) { return; } liked.add(mk);
      var record = add(track, 4.5); if (record) { record.liked = true; }
    });
    var saved = new Set(), playlistArtists = new Map();
    (playlists || []).forEach(function (playlist) {
      (playlist.tracks || []).filter(valid).forEach(function (track) {
        var mk = musicKey(track), ak = artistKey(track);
        if (saved.has(mk)) { return; } saved.add(mk);
        // A large saved Mix must not outweigh actual listening or explicit likes.
        var count = playlistArtists.get(ak) || 0; playlistArtists.set(ak, count + 1);
        add(track, 1.2, count < 4 ? 1 : 0);
      });
    });
    taste.songs.forEach(function (song) {
      if (song.recentPlays >= 2) {
        var bonus = Math.min(6, (song.recentPlays - 1) * 2.2);
        song.score += bonus;
        var artist = taste.artists.get(artistKey(song.track));
        if (artist) { artist.score += bonus * 0.65; artist.recentScore += bonus * 0.5; }
      }
    });
    var selected = preferences(chosenPreferences);
    taste.preferredArtists = new Set(); taste.preferredGenres = new Set(selected.favoriteGenres);
    selected.favoriteArtists.forEach(function (name) {
      var ak = artistKey({ artist: name }), artist = taste.artists.get(ak) || { name: name, key: ak, score: 0, recentScore: 0, plays: 0 };
      artist.score = Math.max(0, artist.score) + 12; artist.preferred = true; artist.name = name;
      taste.artists.set(ak, artist); taste.preferredArtists.add(ak);
    });
    selected.favoriteGenres.forEach(function (genre) { taste.styles.set(genre, Math.max(0, taste.styles.get(genre) || 0) + 10); });
    // Legacy recent history records clicks before playback succeeds. Keep it
    // for the existing History UI, but do not learn preferences from those clicks.
    taste.artists.forEach(function (artist, ak) { if (artist.score > 0.2) { taste.known.add(ak); } });
    function artistRank(a) { return Math.log1p(Math.max(0, a.score)) * 2 + Math.log1p(Math.max(0, a.recentScore)) + (a.preferred ? 1.2 : 0); }
    taste.topArtists = Array.from(taste.artists.values()).filter(function (a) { return a.score > 0; }).sort(function (a, b) { return artistRank(b) - artistRank(a); }).slice(0, Math.max(8, selected.favoriteArtists.length));
    taste.topStyles = styles.map(function (s) { return Object.assign({}, s, { score: taste.styles.get(s.id) || 0, recentScore: taste.recentStyles.get(s.id) || 0, preferred: taste.preferredGenres.has(s.id) }); }).filter(function (s) { return s.score > 0; }).sort(function (a, b) { return Math.log1p(b.score) + Math.log1p(b.recentScore) * 0.5 + Number(b.preferred) - Math.log1p(a.score) - Math.log1p(a.recentScore) * 0.5 - Number(a.preferred); }).slice(0, Math.max(4, selected.favoriteGenres.length));
    taste.seeds = Array.from(taste.songs.values()).filter(function (s) { return s.score > 0 && !taste.blocked.has(musicKey(s.track)); }).sort(function (a, b) { return b.score - a.score; }).slice(0, 30).map(function (s) { return s.track; });
    return taste;
  }
  function scorePool(pool, taste, similar, now, salt) {
    similar = similar || {}; now = now || Date.now();
    var unique = new Map(), related = new Map(), relatedSongs = new Map();
    (similar.artists || []).forEach(function (artist) { related.set(artistKey({ artist: artist.name }), artist.seedArtist); });
    (similar.tracks || []).forEach(function (track) { relatedSongs.set(musicKey({ title: track.title, artist: track.artist }), track.seedArtist); });
    function noise(str) { var value = salt || 0; for (var i = 0; i < str.length; i++) { value = (Math.imul(value, 31) + str.charCodeAt(i)) | 0; } return (value >>> 0) % 1000 / 1000; }
    pool.forEach(function (track) {
      if (!valid(track)) { return; }
      var mk = musicKey(track), ak = artistKey(track), record = taste.songs.get(mk);
      if (taste.blocked.has(key(track)) || taste.blocked.has(mk)) { return; }
      if (record && !record.liked && record.recentSkips >= 2 && record.recentSkips > record.recentPlays && record.score <= 0) { return; }
      var affinity = taste.artists.get(ak), styleList = tags(track);
      var style = taste.topStyles.find(function (s) { return styleList.indexOf(s.id) >= 0; });
      var isKnown = taste.known.has(ak), isNew = !taste.heard.has(mk);
      var relatedSeed = related.get(ak) || relatedSongs.get(mk);
      var score = 0.5 + noise(mk) * 0.8;
      if (affinity && affinity.score > 0) { score += Math.log1p(affinity.score) * 2 + Math.log1p(Math.max(0, affinity.recentScore || 0)); }
      if (affinity && affinity.preferred) { score += 3; }
      if (style) { score += (classify(track).ids.includes(style.id) ? 2 : 0.7) + Math.log1p(style.score); }
      if (style && style.preferred) { score += 2; }
      if (relatedSeed) { score += 5; }
      if (record && record.score > 0) { score += Math.log1p(record.score) * 1.2; }
      if (record && record.recentPlays >= 2) { score += Math.min(7, 2.5 + (record.recentPlays - 2) * 1.5); }
      if (record && record.liked) { score += 1.5; }
      if (isNew) { score += 0.7; }
      if (record && record.lastPlayed && now - record.lastPlayed < 7200000 && record.recentPlays < 2) { score -= 0.8; }
      if (record && record.recentSkips) { score -= Math.min(5, record.recentSkips * 1.4); }
      var reason = relatedSeed ? 'Liên quan đến ' + relatedSeed : (isKnown ? 'Thêm nhạc của ' + artistName(track) : (style ? 'Khám phá ' + style.name : 'Thử một màu nhạc mới'));
      if (affinity && affinity.preferred) { reason = 'Nghệ sĩ bạn ưa thích: ' + affinity.name; }
      else if (style && style.preferred && !relatedSeed) { reason = 'Theo gu ' + style.name + ' bạn chọn'; }
      if (record && record.recentPlays >= 2) { reason = 'Bạn nghe lại ' + record.recentPlays + ' lần gần đây'; }
      else if (record && record.liked) { reason = 'Bài hát bạn yêu thích'; }
      var entry = { track: Object.assign({}, track, { recommendationReason: reason, recommendationNew: isNew }), score: score, artist: ak, music: mk, discovery: isNew, newArtist: !isKnown, relatedSeed: relatedSeed || null };
      var old = unique.get(mk);
      if (!old || entry.score > old.score) { unique.set(mk, entry); }
    });
    return Array.from(unique.values()).sort(function (a, b) { return b.score - a.score; });
  }
  function balanced(entries, count, percent, onlyNew) {
    var familiar = entries.filter(function (e) { return !e.discovery; });
    var fresh = entries.filter(function (e) { return e.discovery; });
    if (onlyNew) { familiar = []; entries = fresh; }
    var chosen = [], used = new Set(), perArtist = new Map();
    var target = Math.round(count * percent / 100), hardCap = Math.max(4, Math.ceil(count / 3));
    function take(list, cap) {
      var lastArtist = chosen.length ? artistKey(chosen[chosen.length - 1]) : null;
      var entry = list.filter(function (e) { return !used.has(e.music) && (perArtist.get(e.artist) || 0) < cap; }).sort(function (a, b) {
        function rank(e) { return e.score - (perArtist.get(e.artist) || 0) * 1.6 - (e.artist === lastArtist ? 2.5 : 0); }
        return rank(b) - rank(a);
      })[0];
      if (!entry) { return false; }
      used.add(entry.music); perArtist.set(entry.artist, (perArtist.get(entry.artist) || 0) + 1); chosen.push(entry.track); return true;
    }
    for (var i = 0; i < count; i++) {
      var explore = onlyNew || Math.floor((i + 1) * target / count) > Math.floor(i * target / count);
      if (!take(explore ? fresh : familiar, 2)) {
        if (!take(explore ? familiar : fresh, 2) && !take(entries, hardCap)) { break; }
      }
    }
    return chosen;
  }
  function refreshSelection(entries, count, percent, onlyNew, previous) {
    if (!previous || !previous.length) { return balanced(entries, count, percent, onlyNew); }
    var shown = new Set(previous.map(musicKey));
    var eligible = entries.filter(function (entry) { return !onlyNew || entry.discovery; });
    var chosen = balanced(eligible.filter(function (entry) { return !shown.has(entry.music); }), count, percent, onlyNew);
    var used = new Set(chosen.map(musicKey)), perArtist = new Map(), cap = Math.max(4, Math.ceil(count / 3));
    chosen.forEach(function (track) { var artist = artistKey(track); perArtist.set(artist, (perArtist.get(artist) || 0) + 1); });
    // Keep a full rail when sources have few new matches, without duplicates or
    // allowing one artist to take over the refreshed recommendations.
    while (chosen.length < count) {
      var last = chosen.length ? artistKey(chosen[chosen.length - 1]) : null;
      var next = eligible.filter(function (entry) { return !used.has(entry.music) && (perArtist.get(entry.artist) || 0) < cap; }).sort(function (a, b) {
        function rank(entry) { return entry.score - (perArtist.get(entry.artist) || 0) * 1.6 - (entry.artist === last ? 2.5 : 0); }
        return rank(b) - rank(a);
      })[0];
      if (!next) { break; }
      chosen.push(next.track); used.add(next.music); perArtist.set(next.artist, (perArtist.get(next.artist) || 0) + 1);
    }
    return chosen;
  }
  function makeMixes(entries, taste, percent) {
    var mixes = [];
    var main = balanced(entries, 25, percent, false);
    if (main.length) { mixes.push({ id: 'personal', name: 'Daily Mix của bạn', description: 'Bài quen và nhạc mới, cập nhật theo gu nghe của bạn.', tracks: main }); }
    var replay = entries.filter(function (entry) { var song = taste.songs.get(entry.music); return song && song.recentPlays >= 2 && song.score > 0; });
    if (replay.length) { mixes.push({ id: 'repeat', name: 'Nghe nhiều gần đây', description: 'Những bài bạn nghe lại từ hai lần trong 14 ngày qua.', tracks: balanced(replay, 20, 0, false) }); }
    var discovery = balanced(entries, 20, 100, true);
    if (discovery.length) { mixes.push({ id: 'discovery', name: 'Khám phá hôm nay', description: 'Bài chưa nghe, gồm ca sĩ quen và nghệ sĩ cùng gu.', tracks: discovery }); }
    taste.topStyles.slice(0, 3).forEach(function (style) {
      var selected = entries.filter(function (e) { return tags(e.track).indexOf(style.id) >= 0; });
      var tracks = balanced(selected, 20, percent, false);
      if (tracks.length >= 3) { mixes.push({ id: style.id, name: style.name + ' Mix', description: 'Thêm nhạc theo phong cách bạn thường chọn.', tracks: tracks }); }
    });
    return mixes;
  }

  function matchScore(value, query) {
    var input = text(value).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    var q = text(query).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (!q) { return 1; }
    if (input === q) { return 10; }
    if (input.startsWith(q)) { return 7; }
    var words = input.split(' '), parts = q.split(' ');
    if (parts.every(function (part) { return words.some(function (word) { return word.startsWith(part); }); })) { return 5.5; }
    if (q.length >= 2 && !q.includes(' ') && words.map(function (word) { return word[0] || ''; }).join('').startsWith(q)) { return 4; }
    if (input.includes(q)) { return 2.5; }
    return parts.length > 1 && parts.every(function (part) { return input.includes(part); }) ? 1.5 : 0;
  }
  function searchAffinity(track, taste) {
    var song = taste.songs.get(musicKey(track)), artist = taste.artists.get(artistKey(track));
    var score = artist ? Math.log1p(Math.max(0, artist.score)) * 1.7 + (artist.preferred ? 5 : 0) : 0;
    var reason = artist && artist.preferred ? 'Nghệ sĩ bạn yêu thích' : artist && artist.plays >= 2 ? 'Nghệ sĩ bạn hay nghe' : '';
    if (song) {
      score += Math.log1p(Math.max(0, song.score)) * 2 + Math.min(9, song.recentPlays * 3) - Math.min(8, song.recentSkips * 2);
      if (song.recentPlays >= 2) { reason = 'Bạn nghe lại ' + song.recentPlays + ' lần gần đây'; }
      else if (song.liked) { score += 3; reason = 'Bài hát bạn yêu thích'; }
    }
    return { score: score, reason: reason };
  }
  function rankSearchTracks(tracks, query, taste, includeUnmatched) {
    var q = text(query), unique = new Map();
    (tracks || []).forEach(function (track, index) {
      if (!track || track.id == null || !track.title) { return; }
      var mk = musicKey(track), match = Math.max(matchScore(track.originalTitle || track.title, q), matchScore(artistName(track), q), matchScore(track.title + ' ' + artistName(track), q));
      if (q && !match && !includeUnmatched) { return; }
      if (!q && (taste.blocked.has(key(track)) || taste.blocked.has(mk))) { return; }
      var affinity = searchAffinity(track, taste);
      var entry = { track: Object.assign({}, track, { suggestionReason: affinity.reason }), score: match * 10 + Math.min(25, affinity.score) - index * 0.015 };
      var old = unique.get(mk);
      if (!old || old.score < entry.score) { unique.set(mk, entry); }
    });
    return Array.from(unique.values()).sort(function (a, b) { return b.score - a.score; }).map(function (entry) { return entry.track; });
  }
  function rankSearchArtists(values, query, taste) {
    var q = text(query), unique = new Map();
    (values || []).forEach(function (value) {
      if (!value || typeof value.name !== 'string') { return; }
      var ak = artistKey({ artist: value.name }), match = matchScore(value.name, q), affinity = taste.artists.get(ak);
      if (!ak || q && !match) { return; }
      var score = match * 10 + (affinity ? Math.min(24, Math.log1p(Math.max(0, affinity.score)) * 2.5 + Math.log1p(Math.max(0, affinity.recentScore || 0)) * 2 + (affinity.preferred ? 7 : 0)) : 0);
      var reason = affinity && affinity.preferred ? 'Nghệ sĩ bạn yêu thích' : affinity && affinity.plays >= 2 ? 'Nghệ sĩ bạn hay nghe' : '';
      var old = unique.get(ak), item = Object.assign({}, value, { suggestionReason: reason });
      if (!old) { unique.set(ak, { artist: item, score: score }); }
      else if (old.artist.provider === 'local' && value.provider && value.provider !== 'local' || !old.artist.picture && value.picture) { old.artist = item; }
    });
    return Array.from(unique.values()).sort(function (a, b) { return b.score - a.score; }).map(function (entry) { return entry.artist; });
  }
  function recommendationQueries(taste, similar, rotation) {
    rotation = Math.abs(Math.floor(rotation || 0)); similar = similar || {};
    var requests = [], artists = taste.topArtists, genres = taste.topStyles;
    if (artists.length) { requests.push({ query: artists[0].name, kind: 'artist' }); }
    if (artists.length > 1) { requests.push({ query: artists[1 + rotation % Math.min(5, artists.length - 1)].name, kind: 'artist' }); }
    if (genres.length) { requests.push({ query: genres[0].query, kind: 'style', genre: genres[0].id }); }
    var related = (similar.artists || []).filter(function (a) { return a.name && !taste.known.has(artistKey({ artist: a.name })); });
    if (related.length) { requests.push({ query: related[rotation % Math.min(6, related.length)].name, kind: 'new' }); }
    var songs = (similar.tracks || []).filter(function (track) { var mk = musicKey(track); return track.artist && track.title && !taste.heard.has(mk) && !taste.blocked.has(mk); });
    if (songs.length) { var song = songs[rotation % Math.min(6, songs.length)]; requests.push({ query: song.artist + ' ' + song.title, kind: 'new' }); }
    if (genres.length > 1) { var genre = genres[1 + rotation % (genres.length - 1)]; requests.push({ query: genre.query, kind: 'style', genre: genre.id }); }
    if (requests.length < 3 && artists.length) {
      // A joint query can surface collaborations and playlists around the user's
      // artists when no trustworthy genre or similar-artist data is available.
      requests.push({ query: artists.slice(0, 2).map(function (a) { return a.name; }).join(' ') + ' songs', kind: 'new' });
    }
    if (requests.length < 2) { requests.push({ query: genres.length ? genres[0].query + ' new songs' : 'nhac viet pop acoustic', kind: 'new', genre: genres.length ? genres[0].id : null }); }
    if (!artists.length && !genres.length) { requests.push({ query: 'indie pop chill songs', kind: 'new' }); }
    var seen = new Set();
    return requests.filter(function (request) { var q = text(request.query); if (seen.has(q)) { return false; } seen.add(q); return true; }).slice(0, 6);
  }

  function Accumulator(track, id, now) {
    this.session = { id: id, track: cleanTrack(track), listenedSeconds: 0, coverageSeconds: 0, duration: Number(track.duration) || 0, startedAt: now || Date.now(), updatedAt: now || Date.now(), ended: false, skipped: false };
    this.previous = null;
    this.ranges = [];
  }
  Accumulator.prototype.resetClock = function () { this.previous = null; };
  Accumulator.prototype.sample = function (audio, playing, wall) {
    var position = Number(audio.currentTime), rate = Number(audio.playbackRate) || 1;
    var eligible = playing && !audio.paused && !audio.seeking && !audio.ended && audio.readyState >= 2 && Number.isFinite(position);
    var previous = this.previous;
    this.previous = eligible ? { wall: wall, position: position } : null;
    if (Number.isFinite(audio.duration) && audio.duration > 0) { this.session.duration = audio.duration; }
    if (!previous || !eligible) { return; }
    var elapsed = (wall - previous.wall) / 1000, distance = position - previous.position;
    // A seek can occur between two samples without a seeking event. Reject
    // implausible jumps rather than counting the seek distance as listening.
    if (elapsed <= 0 || elapsed > 8 || distance <= 0 || distance > elapsed * rate + 0.6) { return; }
    var heard = Math.min(distance, elapsed * rate);
    this.session.listenedSeconds += heard;
    this.session.updatedAt = Date.now();
    var start = Math.max(0, position - heard), end = position;
    var ranges = this.ranges.concat([[start, end]]).sort(function (a, b) { return a[0] - b[0]; });
    var merged = [];
    ranges.forEach(function (range) {
      var last = merged[merged.length - 1];
      if (last && range[0] <= last[1] + 0.1) { last[1] = Math.max(last[1], range[1]); } else { merged.push(range); }
    });
    // Preserve a conservative coverage estimate even for very fragmented seeks.
    this.ranges = merged.slice(-300);
    this.session.coverageSeconds = Math.min(this.session.listenedSeconds, this.ranges.reduce(function (sum, range) { return sum + range[1] - range[0]; }, 0));
  };
  var core = { text: text, key: key, artistName: artistName, artistKey: artistKey, musicKey: musicKey, tags: tags, classify: classify, cleanTrack: cleanTrack, preferences: preferences, styles: styles, buildTaste: buildTaste, scorePool: scorePool, balanced: balanced, refreshSelection: refreshSelection, makeMixes: makeMixes, matchScore: matchScore, rankSearchTracks: rankSearchTracks, rankSearchArtists: rankSearchArtists, recommendationQueries: recommendationQueries, Accumulator: Accumulator, qualifies: qualifies };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; }
  if (!root.document) { return; }

  var profile = { epoch: 0, sessions: [], hiddenTracks: [] }, initialized = null, profileReady = false, active = null, activeAudio = null;
  var settings = { percent: 30, lastfm: false, favoriteArtists: [], favoriteGenres: [] }, pending = {}, writeQueue = Promise.resolve(), cache = null, inflight = null, generation = 0;
  var queryCache = new Map(), queryPending = new Map(), candidateCache = null, refreshNumber = 0, lastSave = 0, lastError = 0, timer = null, activeSignal = 0;
  function error(message) {
    if (Date.now() - lastError < 20000) { return; }
    lastError = Date.now();
    if (typeof root.HienThiThongBao === 'function') { root.HienThiThongBao(root.XoaKyTuHTML(String(message && message.message || message)), 'error', 4500); }
  }
  function savePending() {
    try { root.localStorage.setItem('ngquang_listening_pending_v1', JSON.stringify({ epoch: profile.epoch, sessions: pending })); }
    catch (_) { error('Chưa lưu được lượt nghe dự phòng trên máy.'); }
  }
  function upsert(session) {
    var index = profile.sessions.findIndex(function (s) { return s.id === session.id; });
    if (index < 0) { profile.sessions.push(session); } else {
      var old = profile.sessions[index];
      session.listenedSeconds = Math.max(session.listenedSeconds, old.listenedSeconds);
      session.coverageSeconds = Math.max(session.coverageSeconds || 0, old.coverageSeconds || 0);
      session.updatedAt = Math.max(session.updatedAt, old.updatedAt);
      session.startedAt = old.startedAt;
      session.ended = session.ended || old.ended; session.skipped = session.skipped || old.skipped;
      profile.sessions[index] = session;
    }
    if (profile.sessions.length > 5000) { profile.sessions.splice(0, profile.sessions.length - 5000); }
  }
  function queue(session) {
    if (!profileReady) { return initialize().then(function () { return queue(session); }); }
    var copy = JSON.parse(JSON.stringify(session)), epoch = profile.epoch;
    upsert(copy); pending[copy.id] = copy; savePending();
    writeQueue = writeQueue.then(function () {
      if (epoch !== profile.epoch) { return; }
      return root.GiaoDienUngDung.luuLuotNghe(epoch, copy).then(function () {
        if (epoch === profile.epoch && pending[copy.id] && pending[copy.id].updatedAt === copy.updatedAt && pending[copy.id].listenedSeconds === copy.listenedSeconds) { delete pending[copy.id]; savePending(); }
      });
    }).catch(error);
    return writeQueue;
  }
  function initialize() {
    if (initialized) { return initialized; }
    initialized = Promise.all([
      root.GiaoDienUngDung.layHoSoNghe().then(function (value) {
        if (value && Array.isArray(value.sessions)) { profile = value; profile.hiddenTracks = profile.hiddenTracks || []; }
        profileReady = true;
        try {
          var saved = JSON.parse(root.localStorage.getItem('ngquang_listening_pending_v1') || 'null');
          if (saved && saved.epoch === profile.epoch) {
            Object.values(saved.sessions || {}).forEach(function (session) { if (valid(session.track) && session.id) { queue(session); } });
          }
        } catch (_) {}
      }).catch(function (message) { profileReady = true; error(message); }),
      root.GiaoDienUngDung.layCauHinh().then(function (config) {
        if (config) { settings.percent = Math.max(0, Math.min(60, Number(config.recommendationDiscoveryPercent) || (config.recommendationDiscoveryPercent === 0 ? 0 : 30))); settings.lastfm = !!String(config.lastfmApiKey || '').trim(); Object.assign(settings, preferences(config)); }
        return config;
      }).catch(error)
    ]).then(function () { return profile; });
    return initialized;
  }
  function checkpoint() {
    if (active && activeAudio) {
      active.sample(activeAudio, !!root.DangPhatNhac, performance.now());
      if (active.session.listenedSeconds >= 1) {
        active.session.updatedAt = Date.now(); lastSave = Date.now();
        var signal = qualifies(active.session) ? (active.session.duration > 0 && active.session.coverageSeconds >= active.session.duration * 0.8 ? 2 : 1) : 0;
        if (signal !== activeSignal) { activeSignal = signal; invalidate(); }
        return queue(active.session);
      }
    }
    return writeQueue;
  }
  function finish(reason) {
    if (!active) { return writeQueue; }
    active.sample(activeAudio, !!root.DangPhatNhac, performance.now());
    active.session.ended = reason === 'ended';
    active.session.skipped = reason === 'switch';
    active.session.updatedAt = Date.now();
    var saving = active.session.listenedSeconds >= 1 ? queue(active.session) : writeQueue;
    active = null; activeAudio = null; invalidate();
    return saving;
  }
  function start(track, audio) {
    if (active) { finish('switch'); }
    activeAudio = audio;
    var id = root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    active = new Accumulator(track, id, Date.now());
    activeSignal = 0;
    active.sample(audio, true, performance.now()); lastSave = Date.now();
  }
  function search(query, refresh) {
    var cached = queryCache.get(query);
    if (!refresh && cached && Date.now() - cached.at < 1800000) { return Promise.resolve(cached.tracks); }
    if (queryPending.has(query)) { return queryPending.get(query); }
    var request = (root.GiaoDienUngDung.timKiemGoiY || root.GiaoDienUngDung.timKiemTatCa)(query).then(function (tracks) {
      tracks = Array.isArray(tracks) ? tracks.filter(valid) : [];
      if (tracks.length) {
        if (queryCache.size >= 30) { queryCache.delete(queryCache.keys().next().value); }
        queryCache.set(query, { at: Date.now(), tracks: tracks });
      }
      else { queryCache.delete(query); }
      return tracks;
    }).catch(function (message) { queryCache.delete(query); throw message; }).finally(function () { queryPending.delete(query); });
    // Keep the in-flight query cached even after the UI timeout, so pressing
    // Refresh cannot start duplicate engine processes for the same query.
    var timeout, visible = Promise.race([request, new Promise(function (resolve) { timeout = root.setTimeout(function () { resolve([]); }, 18000); })]).finally(function () { root.clearTimeout(timeout); });
    queryPending.set(query, visible);
    return visible;
  }
  function currentTaste(library) {
    var snapshot = profile;
    if (active && active.session.listenedSeconds >= 1) {
      snapshot = Object.assign({}, profile, { sessions: profile.sessions.filter(function (session) { return session.id !== active.session.id; }).concat([active.session]) });
    }
    return buildTaste(snapshot, library || [], [], Date.now(), settings, root.DanhSachPhatNguoiDung || []);
  }
  function retrievalSignature(taste) {
    return JSON.stringify([profile.epoch, settings.lastfm, taste.topArtists.slice(0, 6).map(function (artist) { return artist.key; }), taste.topStyles.map(function (style) { return style.id; })]);
  }
  function composeRecommendations(pool, taste, similar, salt, successes, previous) {
    var entries = scorePool(pool.concat(taste.seeds), taste, similar, Date.now(), salt);
    var artists = [], names = new Set();
    entries.filter(function (entry) { return entry.discovery && entry.artist && entry.newArtist; }).forEach(function (entry) {
      if (!names.has(entry.artist) && artists.length < 8) { names.add(entry.artist); artists.push({ name: artistName(entry.track), track: entry.track, reason: entry.track.recommendationReason }); }
    });
    var mixes = makeMixes(entries, taste, settings.percent);
    if (previous && previous.length) {
      mixes.forEach(function (mix) {
        if (mix.id === 'personal') { mix.tracks = refreshSelection(entries, 25, settings.percent, false, previous); }
        if (mix.id === 'discovery') { mix.tracks = refreshSelection(entries, 20, 100, true, previous); }
      });
    }
    return { forYou: refreshSelection(entries, 18, settings.percent, false, previous), discovery: refreshSelection(entries, 18, 100, true, previous), artists: artists, mixes: mixes, taste: taste, warning: similar.warning || null, offline: !successes, personalized: taste.seeds.length > 0 || taste.preferredArtists.size > 0 || taste.preferredGenres.size > 0 };
  }
  async function getRecommendations(library, recent, force) {
    await initialize();
    if (inflight) { return inflight; }
    var taste = currentTaste(library), signature = retrievalSignature(taste);
    if (!force && cache && cache.signature === signature && Date.now() - cache.at < 1800000) { return cache.value; }
    if (!force && candidateCache && candidateCache.signature === signature && Date.now() - candidateCache.at < 1800000) {
      var refreshed = composeRecommendations(candidateCache.pool.concat(library || []), taste, candidateCache.similar, candidateCache.salt, candidateCache.successes, candidateCache.previous);
      cache = { at: Date.now(), signature: signature, value: refreshed }; return refreshed;
    }
    var run = ++generation;
    var oldValue = cache && cache.value;
    var previous = force ? [].concat(oldValue ? oldValue.forYou : root.DanhSachChoBan || [], oldValue ? oldValue.discovery : root.DanhSachKhamPha || []) : [];
    inflight = (async function () {
      var similar = { artists: [], tracks: [] };
      if (settings.lastfm && taste.topArtists.length) {
        try { similar = await root.GiaoDienUngDung.layNhacTuongTu(taste.topArtists.slice(0, 2).map(function (a) { return a.name; }), taste.seeds.slice(0, 2)); }
        catch (_) { similar.warning = 'Chưa lấy được nhạc tương tự. Gợi ý theo hồ sơ nghe vẫn hoạt động.'; }
      }
      similar = similar || { artists: [], tracks: [] };
      var rotation = Math.floor(Date.now() / 86400000) + (force ? ++refreshNumber : refreshNumber);
      var requests = recommendationQueries(taste, similar, rotation);
      var pool = (library || []).slice().concat(taste.seeds), successes = 0;
      for (var offset = 0; offset < requests.length; offset += 2) {
        var results = await Promise.allSettled(requests.slice(offset, offset + 2).map(function (r) { return search(r.query, force); }));
        results.forEach(function (result, index) { if (result.status === 'fulfilled' && result.value.length) {
          successes++; var genre = requests[offset + index].genre;
          pool = pool.concat(result.value.map(function (track) { return genre ? Object.assign({}, track, { recommendationGenreHints: [genre] }) : track; }));
        } });
      }
      var salt = rotation, latestTaste = currentTaste(root.DanhSachBaiHatThuVien || library);
      // Feedback can arrive while slow music sources are loading. Always rank
      // against the latest profile, including the current qualified session.
      var value = composeRecommendations(pool, latestTaste, similar, salt, successes, previous);
      if (run === generation) {
        candidateCache = { at: Date.now(), signature: signature, pool: pool, similar: similar, salt: salt, successes: successes, previous: previous };
        cache = { at: Date.now(), signature: signature, value: value };
        if (retrievalSignature(latestTaste) !== signature) { root.setTimeout(invalidate, 0); }
      }
      return value;
    })();
    try { return await inflight; } finally { if (run === generation) { inflight = null; } }
  }
  async function hide(track) {
    await initialize();
    await root.GiaoDienUngDung.anBaiGoiY(profile.epoch, cleanTrack(track));
    profile.hiddenTracks.push(cleanTrack(track)); invalidate();
  }
  async function clear() {
    await initialize();
    var track = active && active.session.track, audio = activeAudio;
    await finish('reset'); await writeQueue;
    try { profile = await root.GiaoDienUngDung.xoaHoSoNghe(); }
    catch (message) { if (track && audio && !audio.paused && root.DangPhatNhac) { start(track, audio); } throw message; }
    pending = {}; savePending(); cache = null; candidateCache = null; inflight = null; generation++; queryCache.clear();
    if (track && audio && !audio.paused && root.DangPhatNhac) { start(track, audio); }
    return profile;
  }
  function invalidate() {
    cache = null;
    root.dispatchEvent(new CustomEvent('ngquang-taste-changed'));
  }
  function bindAudio(audio) {
    ['seeking', 'seeked', 'playing', 'waiting', 'stalled', 'pause'].forEach(function (event) {
      audio.addEventListener(event, function () { if (audio === activeAudio && active) { active.resetClock(); } });
    });
    audio.addEventListener('error', function () { if (audio === activeAudio) { finish('error'); } });
  }
  function bind() {
    document.querySelectorAll('audio').forEach(bindAudio);
    timer = root.setInterval(function () {
      if (active && activeAudio) { active.sample(activeAudio, !!root.DangPhatNhac, performance.now()); if (Date.now() - lastSave >= 15000) { checkpoint(); } }
    }, 1000);
    root.addEventListener('pagehide', function () { finish('close'); });
  }
  root.GoiYAmNhac = {
    core: core, khoiTao: initialize, batDauPhien: start, ketThucPhien: finish, luuTienDo: checkpoint,
    tiepTucPhien: function (track, audio) { if (!active || key(active.session.track) !== key(track)) { start(track, audio); } else { active.resetClock(); } },
    quanSat: function (audio) { if (active && audio === activeAudio) { active.sample(audio, !!root.DangPhatNhac, performance.now()); } },
    layGoiY: getRecommendations, anBai: hide, xoaHoSo: clear, lamMoi: invalidate,
    capNhatCaiDat: function (percent, lastfm) { settings.percent = Math.max(0, Math.min(60, Number(percent) || 0)); settings.lastfm = !!lastfm; candidateCache = null; invalidate(); },
    capNhatSoThich: function (artists, genres) { Object.assign(settings, preferences({ favoriteArtists: artists, favoriteGenres: genres })); invalidate(); },
    thongKe: currentTaste,
    layHoSo: function () { return profile; },
    truocKhiDong: function () { return finish('close'); }
  };
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', bind); } else { bind(); }
})(typeof window !== 'undefined' ? window : globalThis);
