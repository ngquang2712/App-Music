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
    if (name && title.indexOf(name + ' ') === 0) { title = title.slice(name.length + 1); }
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
  function valid(track) { return track && !['spotify', 'itunes'].includes(track.catalogProvider) && track.id != null && String(track.id).length > 0 && ['youtube', 'spotify', 'soundcloud'].indexOf(track.source) >= 0 && track.title; }
  function cleanTrack(track) {
    var copy = Object.assign({}, track);
    ['recommendationReason', 'recommendationNew', 'recommendationGenreHints', 'customCoverBase64', 'originalCover', 'localCoverPath', 'discordCoverUrl', 'continueTime', 'continueDuration'].forEach(function (name) { delete copy[name]; });
    if (String(copy.cover || '').indexOf('data:') === 0 || String(copy.cover || '').length > 4096) { copy.cover = ''; }
    return copy;
  }
  function qualifies(session) {
    var duration = Number(session.duration) || Number(session.track.duration) || 0;
    return Number(session.listenedSeconds) >= (duration > 0 ? Math.min(30, duration / 2) : 30);
  }
  function buildTaste(profile, library, recent, now, chosenPreferences) {
    now = now || Date.now();
    var taste = { artists: new Map(), styles: new Map(), songs: new Map(), known: new Set(), blocked: new Set(), heard: new Set(), sessions: 0, minutes: 0 };
    function add(track, weight) {
      if (!valid(track)) { return; }
      var mk = musicKey(track), ak = artistKey(track);
      var song = taste.songs.get(mk) || { track: track, score: 0, plays: 0, skips: 0, last: 0 };
      song.score += weight;
      taste.songs.set(mk, song);
      if (ak && ak !== 'unknown artist' && ak !== 'unknown') {
        var artist = taste.artists.get(ak) || { name: artistName(track), key: ak, score: 0 };
        artist.score += weight;
        taste.artists.set(ak, artist);
      }
      tags(track).forEach(function (tag) { taste.styles.set(tag, (taste.styles.get(tag) || 0) + weight); });
    }
    var sessions = new Map();
    (profile.sessions || []).forEach(function (session) {
      var previous = sessions.get(session.id);
      if (!previous || session.listenedSeconds > previous.listenedSeconds) { sessions.set(session.id, session); }
    });
    sessions.forEach(function (session) {
      if (!valid(session.track) || !Number.isFinite(session.listenedSeconds) || session.listenedSeconds < 1) { return; }
      var track = session.track, mk = musicKey(track), duration = Number(session.duration) || Number(track.duration) || 0;
      taste.heard.add(mk);
      taste.minutes += session.listenedSeconds / 60;
      var age = Math.max(0, (now - (Number(session.updatedAt) || now)) / 86400000);
      var decay = Math.exp(-age / 45);
      var full = duration > 0 && Number(session.coverageSeconds) >= duration * 0.8;
      var early = session.skipped && session.listenedSeconds < (duration > 0 ? Math.min(30, duration * 0.2) : 30);
      var weight = (qualifies(session) ? 1 + Math.min(1.5, session.listenedSeconds / 180) + (full ? 1.5 : 0) : 0.15) * decay;
      if (early) { weight = -1.8 * decay; }
      add(track, weight);
      var record = taste.songs.get(mk);
      record.last = Math.max(record.last, Number(session.updatedAt) || 0);
      if (qualifies(session)) { record.plays++; taste.sessions++; }
      if (early) { record.skips++; }
    });
    (library || []).forEach(function (track) { add(track, 4); });
    var selected = preferences(chosenPreferences);
    taste.preferredArtists = new Set(); taste.preferredGenres = new Set(selected.favoriteGenres);
    selected.favoriteArtists.forEach(function (name) {
      var ak = artistKey({ artist: name }), artist = taste.artists.get(ak) || { name: name, key: ak, score: 0 };
      artist.score = Math.max(0, artist.score) + 12; artist.preferred = true; artist.name = name;
      taste.artists.set(ak, artist); taste.preferredArtists.add(ak);
    });
    selected.favoriteGenres.forEach(function (genre) { taste.styles.set(genre, Math.max(0, taste.styles.get(genre) || 0) + 10); });
    // Legacy recent history records clicks before playback succeeds. Keep it
    // for the existing History UI, but do not learn preferences from those clicks.
    (profile.hiddenTracks || []).forEach(function (track) { taste.blocked.add(key(track)); taste.blocked.add(musicKey(track)); });
    taste.artists.forEach(function (artist, ak) { if (artist.score > 0.2) { taste.known.add(ak); } });
    taste.topArtists = Array.from(taste.artists.values()).filter(function (a) { return a.score > 0; }).sort(function (a, b) { return Number(!!b.preferred) - Number(!!a.preferred) || b.score - a.score; }).slice(0, Math.max(6, selected.favoriteArtists.length));
    taste.topStyles = styles.map(function (s) { return Object.assign({}, s, { score: taste.styles.get(s.id) || 0, preferred: taste.preferredGenres.has(s.id) }); }).filter(function (s) { return s.score > 0; }).sort(function (a, b) { return Number(b.preferred) - Number(a.preferred) || b.score - a.score; }).slice(0, Math.max(3, selected.favoriteGenres.length));
    taste.seeds = Array.from(taste.songs.values()).filter(function (s) { return s.score > 0 && !taste.blocked.has(musicKey(s.track)); }).sort(function (a, b) { return b.score - a.score; }).slice(0, 8).map(function (s) { return s.track; });
    return taste;
  }
  function scorePool(pool, taste, similar, now, salt) {
    var unique = new Map(), related = new Map(), relatedSongs = new Map();
    (similar.artists || []).forEach(function (artist) { related.set(artistKey({ artist: artist.name }), artist.seedArtist); });
    (similar.tracks || []).forEach(function (track) { relatedSongs.set(musicKey({ title: track.title, artist: track.artist }), track.seedArtist); });
    function noise(str) { var value = salt || 0; for (var i = 0; i < str.length; i++) { value = (Math.imul(value, 31) + str.charCodeAt(i)) | 0; } return (value >>> 0) % 1000 / 1000; }
    pool.forEach(function (track) {
      if (!valid(track)) { return; }
      var mk = musicKey(track), ak = artistKey(track), record = taste.songs.get(mk);
      if (taste.blocked.has(key(track)) || taste.blocked.has(mk)) { return; }
      if (record && record.skips >= 2 && record.score < 0) { return; }
      var affinity = taste.artists.get(ak), styleList = tags(track);
      var style = taste.topStyles.find(function (s) { return styleList.indexOf(s.id) >= 0; });
      var isKnown = taste.known.has(ak), isNew = !taste.heard.has(mk);
      var relatedSeed = related.get(ak) || relatedSongs.get(mk);
      var score = 0.5 + noise(mk) * 0.8;
      if (affinity && affinity.score > 0) { score += Math.log1p(affinity.score) * 2; }
      if (affinity && affinity.preferred) { score += 6; }
      if (style) { score += 2 + Math.log1p(style.score); }
      if (style && style.preferred) { score += 2; }
      if (relatedSeed) { score += 5; }
      if (record && record.score > 0) { score += Math.log1p(record.score) * 0.6; }
      if (isNew) { score += 0.7; }
      if (record && record.last && now - record.last < 86400000) { score -= 2; }
      if (record && record.skips) { score -= Math.min(3, record.skips); }
      var reason = relatedSeed ? 'Liên quan đến ' + relatedSeed : (isKnown ? 'Thêm nhạc của ' + artistName(track) : (style ? 'Khám phá ' + style.name : 'Thử một màu nhạc mới'));
      if (affinity && affinity.preferred) { reason = 'Nghệ sĩ bạn ưa thích: ' + affinity.name; }
      else if (style && style.preferred && !relatedSeed) { reason = 'Theo gu ' + style.name + ' bạn chọn'; }
      if (record && record.plays >= 2) { reason = 'Bạn thường nghe bài này'; }
      var entry = { track: Object.assign({}, track, { recommendationReason: reason, recommendationNew: isNew }), score: score, artist: ak, music: mk, discovery: !isKnown && isNew };
      var old = unique.get(mk);
      if (!old || entry.score > old.score) { unique.set(mk, entry); }
    });
    return Array.from(unique.values()).sort(function (a, b) { return b.score - a.score; });
  }
  function balanced(entries, count, percent, onlyNew) {
    var familiar = entries.filter(function (e) { return !e.discovery; });
    var fresh = entries.filter(function (e) { return e.discovery; });
    if (onlyNew) { familiar = []; }
    var chosen = [], used = new Set(), perArtist = new Map();
    var target = Math.round(count * percent / 100);
    function take(list, cap) {
      var entry = list.find(function (e) { return !used.has(e.music) && (perArtist.get(e.artist) || 0) < cap; });
      if (!entry) { return false; }
      used.add(entry.music); perArtist.set(entry.artist, (perArtist.get(entry.artist) || 0) + 1); chosen.push(entry.track); return true;
    }
    for (var i = 0; i < count; i++) {
      var explore = onlyNew || Math.floor((i + 1) * target / count) > Math.floor(i * target / count);
      if (!take(explore ? fresh : familiar, 2)) {
        if (!take(explore ? familiar : fresh, 2) && !take(entries.filter(function (e) { return !onlyNew || e.discovery; }), 4)) { break; }
      }
    }
    return chosen;
  }
  function makeMixes(entries, taste, percent) {
    var mixes = [];
    var main = balanced(entries, 25, percent, false);
    if (main.length) { mixes.push({ id: 'personal', name: 'Daily Mix của bạn', description: 'Bài cùng gu xen kẽ những khám phá mới.', tracks: main }); }
    var discovery = balanced(entries, 20, 100, true);
    if (discovery.length) { mixes.push({ id: 'discovery', name: 'Khám phá hôm nay', description: 'Nhạc và nghệ sĩ bạn chưa nghe trong app.', tracks: discovery }); }
    taste.topStyles.slice(0, 3).forEach(function (style) {
      var selected = entries.filter(function (e) { return tags(e.track).indexOf(style.id) >= 0; });
      var tracks = balanced(selected, 20, percent, false);
      if (tracks.length >= 3) { mixes.push({ id: style.id, name: style.name + ' Mix', description: 'Thêm nhạc theo phong cách bạn thường chọn.', tracks: tracks }); }
    });
    return mixes;
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
  var core = { text: text, key: key, artistName: artistName, artistKey: artistKey, musicKey: musicKey, tags: tags, classify: classify, cleanTrack: cleanTrack, preferences: preferences, styles: styles, buildTaste: buildTaste, scorePool: scorePool, balanced: balanced, makeMixes: makeMixes, Accumulator: Accumulator, qualifies: qualifies };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; }
  if (!root.document) { return; }

  var profile = { epoch: 0, sessions: [], hiddenTracks: [] }, initialized = null, profileReady = false, active = null, activeAudio = null;
  var settings = { percent: 30, lastfm: false, favoriteArtists: [], favoriteGenres: [] }, pending = {}, writeQueue = Promise.resolve(), cache = null, inflight = null, generation = 0;
  var queryCache = new Map(), lastSave = 0, lastError = 0, timer = null;
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
      if (active.session.listenedSeconds >= 1) { active.session.updatedAt = Date.now(); lastSave = Date.now(); return queue(active.session); }
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
    active.sample(audio, true, performance.now()); lastSave = Date.now();
  }
  function search(query) {
    var cached = queryCache.get(query);
    if (cached && Date.now() - cached.at < 1800000) { return cached.promise || Promise.resolve(cached.tracks); }
    var request = (root.GiaoDienUngDung.timKiemGoiY || root.GiaoDienUngDung.timKiemTatCa)(query).then(function (tracks) {
      tracks = Array.isArray(tracks) ? tracks.filter(valid) : [];
      if (tracks.length) { queryCache.set(query, { at: Date.now(), tracks: tracks }); }
      else { queryCache.delete(query); }
      return tracks;
    }).catch(function (message) { queryCache.delete(query); throw message; });
    // Keep the in-flight query cached even after the UI timeout, so pressing
    // Refresh cannot start duplicate engine processes for the same query.
    var timeout, visible = Promise.race([request, new Promise(function (resolve) { timeout = root.setTimeout(function () { resolve([]); }, 18000); })]).finally(function () { root.clearTimeout(timeout); });
    if (queryCache.size >= 30) { queryCache.clear(); }
    queryCache.set(query, { at: Date.now(), promise: visible });
    return visible;
  }
  async function getRecommendations(library, recent, force) {
    await initialize();
    if (!force && cache && Date.now() - cache.at < 1800000) { return cache.value; }
    if (!force && inflight) { return inflight; }
    var run = ++generation;
    inflight = (async function () {
      var taste = buildTaste(profile, library, recent, Date.now(), settings);
      var similar = { artists: [], tracks: [] }, requests = [];
      var artistsToSearch = taste.topArtists.filter(function (artist) { return artist.preferred; });
      var genresToSearch = taste.topStyles.filter(function (genre) { return genre.preferred; });
      if (!artistsToSearch.length) { artistsToSearch = taste.topArtists.slice(); }
      if (!genresToSearch.length) { genresToSearch = taste.topStyles.slice(); }
      if (force && artistsToSearch.length > 2) { var artistOffset = Math.floor(Math.random() * artistsToSearch.length); artistsToSearch = artistsToSearch.slice(artistOffset).concat(artistsToSearch.slice(0, artistOffset)); }
      if (force && genresToSearch.length > 2) { var genreOffset = Math.floor(Math.random() * genresToSearch.length); genresToSearch = genresToSearch.slice(genreOffset).concat(genresToSearch.slice(0, genreOffset)); }
      if (artistsToSearch.length < 2 && taste.preferredArtists.size) { artistsToSearch = artistsToSearch.concat(taste.topArtists.filter(function (artist) { return !artist.preferred; })); }
      if (genresToSearch.length < 2 && taste.preferredGenres.size) { genresToSearch = genresToSearch.concat(taste.topStyles.filter(function (genre) { return !genre.preferred; })); }
      if (settings.lastfm && artistsToSearch.length) {
        try { similar = await root.GiaoDienUngDung.layNhacTuongTu(artistsToSearch.slice(0, 2).map(function (a) { return a.name; }), taste.seeds.slice(0, 2)); }
        catch (_) { similar.warning = 'Chưa lấy được nhạc tương tự. Gợi ý theo hồ sơ nghe vẫn hoạt động.'; }
      }
      artistsToSearch.slice(0, 2).forEach(function (artist) { requests.push({ query: artist.name, kind: 'artist' }); });
      genresToSearch.slice(0, 2).forEach(function (style) { requests.push({ query: style.query, kind: 'style', genre: style.id }); });
      if (similar.artists && similar.artists.length) {
        var index = force ? Math.floor(Math.random() * Math.min(6, similar.artists.length)) : 0;
        requests.push({ query: similar.artists[index].name, kind: 'new' });
      }
      if (similar.tracks && similar.tracks.length) { requests.push({ query: similar.tracks[0].artist + ' ' + similar.tracks[0].title, kind: 'new' }); }
      if (requests.length < 3) { requests.push({ query: taste.topStyles.length ? taste.topStyles[0].query + ' new songs' : 'nhac viet pop acoustic remix', kind: 'new', genre: taste.topStyles.length ? taste.topStyles[0].id : null }); }
      if (!requests.length || !taste.topArtists.length && !taste.topStyles.length) { requests.push({ query: 'indie pop chill songs', kind: 'new' }); }
      var seen = new Set();
      requests = requests.filter(function (r) { if (seen.has(r.query)) { return false; } seen.add(r.query); return true; }).slice(0, 5);
      var pool = (library || []).slice().concat(taste.seeds), successes = 0;
      for (var offset = 0; offset < requests.length; offset += 2) {
        var results = await Promise.allSettled(requests.slice(offset, offset + 2).map(function (r) { return search(r.query); }));
        results.forEach(function (result, index) { if (result.status === 'fulfilled' && result.value.length) {
          successes++; var genre = requests[offset + index].genre;
          pool = pool.concat(result.value.map(function (track) { return genre ? Object.assign({}, track, { recommendationGenreHints: [genre] }) : track; }));
        } });
      }
      var salt = force ? Math.floor(Math.random() * 1000000) : Math.floor(Date.now() / 86400000);
      var entries = scorePool(pool, taste, similar || {}, Date.now(), salt);
      var forYou = balanced(entries, 18, settings.percent, false), discovery = balanced(entries, 18, 100, true);
      var artists = [], names = new Set();
      entries.filter(function (entry) { return entry.discovery && entry.artist && !taste.known.has(entry.artist); }).forEach(function (entry) {
        if (!names.has(entry.artist) && artists.length < 8) { names.add(entry.artist); artists.push({ name: artistName(entry.track), track: entry.track, reason: entry.track.recommendationReason }); }
      });
      var value = { forYou: forYou, discovery: discovery, artists: artists, mixes: makeMixes(entries, taste, settings.percent), taste: taste, warning: similar.warning || null, offline: !successes, personalized: taste.seeds.length > 0 || taste.preferredArtists.size > 0 || taste.preferredGenres.size > 0 };
      if (run === generation) { cache = { at: Date.now(), value: value }; inflight = null; }
      return value;
    })();
    try { return await inflight; } finally { if (run === generation) { inflight = null; } }
  }
  async function hide(track) {
    await initialize();
    await root.GiaoDienUngDung.anBaiGoiY(profile.epoch, cleanTrack(track));
    profile.hiddenTracks.push(cleanTrack(track)); cache = null; generation++;
  }
  async function clear() {
    await initialize();
    var track = active && active.session.track, audio = activeAudio;
    await finish('reset'); await writeQueue;
    try { profile = await root.GiaoDienUngDung.xoaHoSoNghe(); }
    catch (message) { if (track && audio && !audio.paused && root.DangPhatNhac) { start(track, audio); } throw message; }
    pending = {}; savePending(); cache = null; inflight = null; generation++; queryCache.clear();
    if (track && audio && !audio.paused && root.DangPhatNhac) { start(track, audio); }
    return profile;
  }
  function invalidate() { cache = null; generation++; inflight = null; }
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
    capNhatCaiDat: function (percent, lastfm) { settings.percent = percent; settings.lastfm = !!lastfm; invalidate(); },
    capNhatSoThich: function (artists, genres) { Object.assign(settings, preferences({ favoriteArtists: artists, favoriteGenres: genres })); invalidate(); },
    thongKe: function (library) { return buildTaste(profile, library || [], [], Date.now(), settings); },
    layHoSo: function () { return profile; },
    truocKhiDong: function () { return finish('close'); }
  };
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', bind); } else { bind(); }
})(typeof window !== 'undefined' ? window : globalThis);
