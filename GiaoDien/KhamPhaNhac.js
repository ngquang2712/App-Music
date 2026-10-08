(function (root) {
  'use strict';
  var core = root.GoiYAmNhac.core, api = root.GiaoDienUngDung;
  var profiles = new Map(), favoriteProfiles = [], pendingArtists = new Set(), pendingGenres = new Set();
  var currentArtist = null, currentProfile = null, artistTracks = [], artistRun = 0;
  var currentGenre = null, genreTracks = [], genreRun = 0;
  var savingGenreMix = false;
  var searchRun = 0, searchType = 'all', searchQuery = '', searchSource = 'all', searchArtists = [];
  var previous = { view: 'home', playlistId: null, scroll: 0 }, refreshTimer = null, spotifyPoll = null;
  var spotifyClientId = '', spotifyStatus = { connected: false, connecting: false }, initialized = false;
  var genreDesign = {
    ballad: ['#91463c', 'Những giai điệu nhẹ nhàng, giàu cảm xúc.', '♡'],
    lofi: ['#6657a6', 'Một chút bình yên cho lúc học và nghỉ ngơi.', '☾'],
    pop: ['#a93362', 'Giai điệu dễ nhớ, màu sắc tươi mới.', '♪'],
    rap: ['#865128', 'Flow, lời rap và những nhịp beat cá tính.', '≋'],
    acoustic: ['#3f725d', 'Âm mộc và giọng hát gần gũi.', '♫'],
    indie: ['#3b677e', 'Những góc nhìn và âm thanh riêng.', '✦'],
    remix: ['#8b3782', 'Thêm năng lượng vào những giai điệu quen.', '↗'],
    electronic: ['#386594', 'Không gian điện tử và những nhịp dance.', '⌁'],
    rock: ['#964136', 'Guitar, trống và năng lượng mạnh mẽ.', 'ϟ'],
    rnb: ['#6b417d', 'Giọng hát mềm mại và groove đầy cảm xúc.', '∿'],
    jazz: ['#806032', 'Thả lỏng cùng những giai điệu ngẫu hứng.', '♮'],
    bolero: ['#677a37', 'Những câu chuyện trữ tình thân thuộc.', '♬'],
    classical: ['#456c81', 'Piano và những khoảng lặng không lời.', '♩'],
    country: ['#84603c', 'Những giai điệu mộc mạc và ấm áp.', '✺']
  };
  var genreOrder = ['ballad', 'lofi', 'pop', 'rap', 'acoustic', 'indie', 'remix', 'electronic', 'rock', 'rnb', 'jazz', 'bolero', 'classical', 'country'];
  function el(id) { return document.getElementById(id); }
  function node(tag, className, value) { var item = document.createElement(tag); item.className = className || ''; if (value != null) { item.textContent = value; } return item; }
  function key(artist) { return core.artistKey({ artist: typeof artist === 'string' ? artist : artist.name }); }
  function hide(item, hidden) { item.classList.toggle('hidden', !!hidden); }
  function warn(message) { root.HienThiThongBao(root.XoaKyTuHTML(root.DinhDangLoi(message)), 'error', 3500); }
  function providerName(value) { return { spotify: 'Spotify', deezer: 'Deezer', itunes: 'Apple Music', local: 'Trong app' }[value] || 'Trong app'; }
  function safeImage(value) { try { var u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; } catch (_) { return ''; } }
  function artist(value) {
    if (!value || typeof value.name !== 'string' || !key(value)) { return null; }
    return { id: String(value.id || 'local:' + key(value)).slice(0, 240), name: value.name.trim().replace(/\s+/g, ' ').slice(0, 80),
      provider: ['spotify', 'deezer', 'itunes', 'local'].includes(value.provider) ? value.provider : 'local',
      picture: safeImage(value.picture || ''), url: safeImage(value.url || ''),
      genres: (Array.isArray(value.genres) ? value.genres : []).filter(function (s) { return typeof s === 'string'; }).slice(0, 8) };
  }
  function remember(value) {
    var normalized = artist(value); if (!normalized) { return null; }
    var cached = profiles.get(key(normalized));
    if (normalized.provider === 'local' && cached && cached.provider !== 'local') { return cached; }
    if (profiles.size > 120) { profiles.clear(); favoriteProfiles.forEach(function (a) { profiles.set(key(a), a); }); }
    profiles.set(key(normalized), normalized); return normalized;
  }
  function fromTrack(track) {
    var name = core.artistName(track), id = track.artistId || '', provider = id.split(':')[0];
    return remember({ name: name, id: id, provider: provider, picture: track.artistPicture || '', genres: [] });
  }
  function allLocalTracks() {
    return [].concat(root.DanhSachBaiHatThuVien || [], root.KetQuaTimKiem || [], root.DanhSachChoBan || [], root.DanhSachKhamPha || [], root.LichSuNgheTrangChu || [], root.DanhSachCho || [], root.DanhSachPhatNguoiDung.flatMap(function (p) { return p.tracks || []; }));
  }
  function uniqueTracks(tracks) {
    var seen = new Set();
    return tracks.filter(function (t) { if (!t || !t.id || isExternal(t)) { return false; } var id = core.musicKey(t); if (seen.has(id)) { return false; } seen.add(id); return true; });
  }
  function isExternal(track) { return track && ['spotify', 'itunes'].includes(track.catalogProvider); }
  function openLink(url) { if (!url) { return; } return api.moLienKetNhac(url).catch(warn); }
  function openExternal(track) { return openLink(track.url); }
  function isLiked(value) { var ak = key(value); return root.SoThichNhacDaLuu.favoriteArtists.some(function (n) { return key(n) === ak; }); }
  function likedGenre(id) { return root.SoThichNhacDaLuu.favoriteGenres.includes(id); }
  function initials(name) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (s) { return Array.from(s)[0]; }).join('').toUpperCase(); }
  function portrait(value, className) {
    var wrap = node('span', className || 'artist-card-avatar'); wrap.appendChild(node('span', 'artist-initials', initials(value.name)));
    if (value.picture) { var image = node('img'); image.src = value.picture; image.alt = ''; image.loading = 'lazy'; image.addEventListener('error', function () { image.remove(); }); wrap.appendChild(image); }
    return wrap;
  }
  function paintArtistHearts() {
    document.querySelectorAll('[data-artist-heart]').forEach(function (button) {
      var ak = button.dataset.artistHeart, value = profiles.get(ak) || (currentArtist && key(currentArtist) === ak ? currentArtist : null);
      if (!value) { return; } var liked = isLiked(value);
      button.innerHTML = liked ? root.BieuTuong.TimDac : root.BieuTuong.TimRong;
      if (button.id === 'btn-heart-artist') { button.appendChild(node('span', '', liked ? 'Đã yêu thích' : 'Yêu thích nghệ sĩ')); }
      button.classList.toggle('liked', liked); button.setAttribute('aria-pressed', String(liked));
      button.setAttribute('aria-label', (liked ? 'Bỏ yêu thích ' : 'Yêu thích ') + value.name);
      button.title = (liked ? 'Bỏ yêu thích ' : 'Yêu thích ') + value.name;
      button.disabled = pendingArtists.has(ak) || root.DangLuuSoThichNhac;
    });
  }
  function artistCard(value, reason) {
    value = remember(value); if (!value) { return null; }
    var card = node('article', 'artist-card'); card.dataset.artistId = value.id;
    var open = node('button', 'artist-card-open'); open.type = 'button'; open.setAttribute('aria-label', 'Mở hồ sơ ' + value.name);
    open.appendChild(portrait(value)); open.appendChild(node('strong', 'artist-card-name', value.name));
    open.appendChild(node('span', 'artist-card-caption', reason || ('Nghệ sĩ · ' + providerName(value.provider))));
    open.addEventListener('click', function () { openArtist(value); });
    var heart = node('button', 'artist-card-heart'); heart.type = 'button'; heart.dataset.artistHeart = key(value);
    heart.addEventListener('click', function () { toggleArtist(value); });
    card.appendChild(open); card.appendChild(heart); return card;
  }
  function renderArtistCards(container, values) {
    container.replaceChildren(); values.forEach(function (value) { var card = artistCard(value, value.reason); if (card) { container.appendChild(card); } }); paintArtistHearts();
  }
  function renderFavoriteArtists() {
    var names = root.SoThichNhacDaLuu.favoriteArtists;
    renderArtistCards(el('liked-artists-grid'), names.map(function (name) { return profiles.get(key(name)) || { name: name, provider: 'local' }; }));
    hide(el('liked-artists-empty'), names.length > 0); el('favorite-artists-summary').textContent = names.length + ' nghệ sĩ đã yêu thích · Dùng để chọn nhạc phù hợp với bạn';
    el('artists-count-badge').textContent = names.length; el('home-artists-count').textContent = names.length ? names.length + ' nghệ sĩ theo gu bạn' : 'Thả tim ca sĩ bạn thích';
    el('home-liked-count').textContent = (root.DanhSachBaiHatThuVien || []).length + ' bài trong bộ sưu tập';
  }
  function scheduleRecommendations() {
    clearTimeout(refreshTimer); refreshTimer = setTimeout(function () { root.CapNhatThongKeGuNhac(); root.TaiGoiYCaNhan(true); }, 450);
  }
  function applySaved(config) { root.KhoiPhucSoThichNhac(config, true); scheduleRecommendations(); }
  function toggleArtist(value) {
    value = remember(value); if (!value) { return Promise.resolve(); } var ak = key(value);
    if (pendingArtists.has(ak) || root.DangLuuSoThichNhac) { return Promise.resolve(); }
    var liked = !isLiked(value); pendingArtists.add(ak); paintArtistHearts(); root.CapNhatNutLuuSoThichNhac();
    return api.datYeuThichNgheSi(value, liked).then(function (config) {
      applySaved(config); root.HienThiThongBao(root.XoaKyTuHTML((liked ? 'Đã yêu thích ' : 'Đã bỏ yêu thích ') + value.name), 'success', 1800);
    }).catch(warn).finally(function () { pendingArtists.delete(ak); paintArtistHearts(); root.CapNhatNutLuuSoThichNhac(); });
  }
  function paintGenreHearts() {
    document.querySelectorAll('[data-genre-heart]').forEach(function (button) {
      var id = button.dataset.genreHeart, liked = likedGenre(id), genre = core.styles.find(function (s) { return s.id === id; });
      button.innerHTML = liked ? root.BieuTuong.TimDac : root.BieuTuong.TimRong;
      if (button.id === 'btn-heart-genre') { button.appendChild(node('span', '', liked ? 'Đã yêu thích' : 'Yêu thích thể loại')); }
      button.classList.toggle('liked', liked); button.setAttribute('aria-pressed', String(liked));
      button.setAttribute('aria-label', (liked ? 'Bỏ yêu thích ' : 'Yêu thích ') + (genre ? genre.name : id));
      button.disabled = pendingGenres.has(id) || root.DangLuuSoThichNhac;
    });
  }
  function toggleGenre(id) {
    if (pendingGenres.has(id) || root.DangLuuSoThichNhac) { return Promise.resolve(); }
    pendingGenres.add(id); var liked = !likedGenre(id); paintGenreHearts(); root.CapNhatNutLuuSoThichNhac();
    return api.datYeuThichTheLoai(id, liked).then(applySaved).catch(warn).finally(function () { pendingGenres.delete(id); paintGenreHearts(); root.CapNhatNutLuuSoThichNhac(); });
  }
  function genreCard(genre) {
    var design = genreDesign[genre.id], card = node('article', 'genre-card'); card.style.setProperty('--genre-color', design[0]);
    var open = node('button', 'genre-card-open'); open.type = 'button'; open.dataset.genreOpen = genre.id;
    open.setAttribute('aria-label', 'Khám phá ' + genre.name); open.appendChild(node('strong', '', genre.name));
    open.appendChild(node('span', 'genre-card-description', design[1])); var art = node('span', 'genre-card-art', design[2]); art.setAttribute('aria-hidden', 'true'); open.appendChild(art);
    open.addEventListener('click', function () { openGenre(genre.id); });
    var heart = node('button', 'genre-card-heart'); heart.type = 'button'; heart.dataset.genreHeart = genre.id;
    heart.addEventListener('click', function () { toggleGenre(genre.id); }); card.appendChild(open); card.appendChild(heart); return card;
  }
  function renderGenres() {
    ['browse-genres-grid', 'search-browse-genres'].forEach(function (id) { var container = el(id); container.replaceChildren(); genreOrder.forEach(function (genreId) { container.appendChild(genreCard(core.styles.find(function (s) { return s.id === genreId; }))); }); });
    var selected = core.styles.filter(function (g) { return likedGenre(g.id); });
    el('liked-genres-summary').textContent = selected.length ? 'Gu của bạn: ' + selected.map(function (g) { return g.name; }).join(' · ') : 'Chưa chọn gu. Thả tim một vài thể loại bạn thường nghe.';
    paintGenreHearts();
  }
  function restore(config) {
    favoriteProfiles = (config.favoriteArtistProfiles || []).map(artist).filter(Boolean); favoriteProfiles.forEach(remember);
    if (config.spotifyClientId != null) { spotifyClientId = config.spotifyClientId; el('spotify-client-id').value = spotifyClientId; }
    renderFavoriteArtists(); renderGenres(); paintArtistHearts();
  }
  function rememberPrevious() {
    if (['artist', 'genre-detail'].includes(root.GiaoDienHienTai)) { return; }
    var panel = el('view-' + root.GiaoDienHienTai);
    previous = { view: root.GiaoDienHienTai, playlistId: root.MaDanhSachPhatHienTai, scroll: panel ? panel.scrollTop : 0 };
  }
  function back() { root.ChuyenDoiGiaoDien(previous.view, previous.playlistId); var panel = el('view-' + previous.view); if (panel) { panel.scrollTop = previous.scroll; } }
  function matchesArtist(track, value) { return track.artistId && value.id === track.artistId || core.artistKey(track) === key(value); }
  function renderTrackRows(container, tracks, external) {
    container.replaceChildren();
    if (!tracks.length) { container.appendChild(node('p', 'recommendation-empty', 'Chưa có bài khớp với nghệ sĩ này. Bạn có thể tìm thêm qua ô tìm kiếm.')); return; }
    tracks.slice(0, 30).forEach(function (track, index) {
      var row = node('div', 'artist-track-row'), number = node('span', 'artist-track-number', String(index + 1)), open = node('button', 'artist-track-open'); open.type = 'button';
      var cover = node('span', 'artist-track-cover', '♪'), url = root.GiaiQuyetDuongDanAnhBia(track, 100);
      if (url) { var image = node('img'); image.src = url; image.alt = ''; image.loading = 'lazy'; image.onerror = function () { image.remove(); }; cover.appendChild(image); }
      var copy = node('span', 'artist-track-copy'); copy.appendChild(node('strong', '', track.title)); copy.appendChild(node('small', '', (external ? providerName(track.catalogProvider) + ' · ' : '') + track.artist));
      open.appendChild(cover); open.appendChild(copy); open.title = external ? 'Mở trên ' + providerName(track.catalogProvider) : 'Nghe ' + track.title;
      open.addEventListener('click', function () { if (external) { openExternal(track); } else { root.PhatBaiHat(track, tracks, index); } });
      var duration = node('span', 'artist-track-duration', root.DinhDangThoiLuongBaiHat(track));
      var action = node('button', 'artist-track-action'); action.type = 'button';
      if (external) { action.textContent = 'Mở ↗'; action.setAttribute('aria-label', 'Mở ' + track.title + ' trên ' + providerName(track.catalogProvider)); action.addEventListener('click', function () { openExternal(track); }); }
      else { var liked = root.KiemTraBaiHatDaLuu(track); action.innerHTML = liked ? root.BieuTuong.TimDac : root.BieuTuong.TimRong; action.setAttribute('aria-label', (liked ? 'Bỏ yêu thích ' : 'Yêu thích ') + track.title); action.setAttribute('aria-pressed', String(liked)); action.classList.toggle('liked', liked); action.addEventListener('click', function () { root.DaoTrangThaiYeuThich(track); }); }
      row.append(number, open, duration, action); container.appendChild(row);
    });
  }
  function paintProfile() {
    if (!currentArtist || root.GiaoDienHienTai !== 'artist') { return; }
    el('artist-profile-avatar').replaceChildren(portrait(currentArtist, 'artist-profile-portrait'));
    el('artist-profile-name').textContent = currentArtist.name; el('artist-profile-provider').textContent = 'NGHỆ SĨ · ' + providerName(currentArtist.provider).toUpperCase();
    el('artist-profile-meta').textContent = 'Thả tim để nghe thêm nhạc theo gu của bạn.';
    var labels = el('artist-profile-genres'); labels.replaceChildren(); currentArtist.genres.forEach(function (genre) { labels.appendChild(node('span', 'profile-genre-label', genre)); });
    el('btn-heart-artist').dataset.artistHeart = key(currentArtist); paintArtistHearts();
    hide(el('btn-open-artist-source'), !currentArtist.url);
    artistTracks = uniqueTracks(artistTracks.concat(allLocalTracks().filter(function (t) { return matchesArtist(t, currentArtist); })));
    renderTrackRows(el('artist-local-tracks'), artistTracks, false); el('artist-local-count').textContent = artistTracks.length + ' bài'; el('btn-play-artist').disabled = !artistTracks.length;
    var catalog = currentProfile && currentProfile.tracks || [], external = catalog.filter(isExternal);
    hide(el('artist-catalog-section'), !external.length); renderTrackRows(el('artist-catalog-tracks'), external, true);
    el('artist-catalog-title').textContent = 'Bài hát trên ' + providerName(currentArtist.provider);
    var albums = currentProfile && currentProfile.albums || []; hide(el('artist-albums-section'), !albums.length); el('artist-albums-grid').replaceChildren();
    albums.forEach(function (album) {
      var card = node('button', 'album-card'); card.type = 'button'; var cover = node('span', 'album-cover', '♫');
      if (safeImage(album.cover)) { var image = node('img'); image.src = album.cover; image.alt = ''; image.loading = 'lazy'; image.onerror = function () { image.remove(); }; cover.appendChild(image); }
      card.append(cover, node('strong', '', album.name), node('small', '', (album.releaseDate || '').slice(0, 4) + ' · Spotify ↗'));
      card.addEventListener('click', function () { openLink(album.url); }); el('artist-albums-grid').appendChild(card);
    });
  }
  async function openArtist(value) {
    value = remember(value); if (!value) { return; }
    rememberPrevious(); currentArtist = value; currentProfile = null; artistTracks = []; var run = ++artistRun;
    root.ChuyenDoiGiaoDien('artist', null); el('view-artist').scrollTop = 0; paintProfile(); el('artist-profile-status').textContent = 'Đang tải hồ sơ nghệ sĩ…';
    var active = function () { return run === artistRun; };
    var loadingSongs = api.timKiemGoiY(value.name).then(function (tracks) {
      if (!active()) { return; } artistTracks = uniqueTracks((Array.isArray(tracks) ? tracks : []).filter(function (t) { return matchesArtist(t, value); }).concat(artistTracks)); paintProfile();
    }).catch(function () {});
    try {
      if (value.provider === 'local') {
        var found = await api.timKiemNgheSi(value.name); if (!active()) { return; }
        var exact = (found && found.artists || []).find(function (a) { return key(a) === key(value); });
        if (exact) { value = remember(exact); currentArtist = value; }
      }
      if (value.provider !== 'local') {
        var profile = await api.layHoSoNgheSi(value); if (!active()) { return; }
        if (profile && profile.artist && artist(profile.artist)) { currentArtist = remember(profile.artist); currentProfile = profile; artistTracks = artistTracks.concat((profile.tracks || []).filter(function (t) { return !isExternal(t); })); }
        el('artist-profile-status').textContent = profile && profile.warning || '';
      } else { el('artist-profile-status').textContent = 'Hồ sơ từ các bài trong app. Kết nối Spotify để tìm ảnh và dữ liệu danh mục.'; }
    } catch (message) {
      if (active()) { el('artist-profile-status').textContent = root.DinhDangLoi(message) + ' · Vẫn có thể thả tim và nghe những bài đã có.'; }
    }
    if (active()) { paintProfile(); }
    await loadingSongs;
  }
  function openArtistFromTrack(track) { var value = fromTrack(track); if (value) { return openArtist(value); } }
  async function openGenre(id) {
    var genre = core.styles.find(function (g) { return g.id === id; }); if (!genre) { return; }
    rememberPrevious(); currentGenre = genre; var run = ++genreRun;
    genreTracks = uniqueTracks(allLocalTracks().filter(function (t) { return core.tags(t).includes(id); }));
    root.ChuyenDoiGiaoDien('genre-detail', null); el('view-genre-detail').scrollTop = 0;
    el('genre-detail-title').textContent = genre.name; el('genre-detail-description').textContent = genreDesign[id][1];
    el('view-genre-detail').style.setProperty('--genre-color', genreDesign[id][0]);
    el('btn-heart-genre').dataset.genreHeart = id; paintGenreHearts(); paintGenreTracks(); el('genre-detail-status').textContent = 'Đang tìm thêm nhạc ' + genre.name + '…';
    try {
      var found = await api.timKiemGoiY(genre.query); if (run !== genreRun) { return; }
      genreTracks = uniqueTracks(genreTracks.concat((Array.isArray(found) ? found : []).filter(function (track) {
        var tags = core.classify(track).ids; return !tags.length || tags.includes(id);
      }).map(function (track) { return Object.assign({}, track, { recommendationGenreHints: [id] }); }))).slice(0, 40);
      el('genre-detail-status').textContent = genreTracks.length + ' bài · Nhãn từ dữ liệu / tên bài; bài chưa có nhãn được tìm theo từ khóa ' + genre.name + '.';
    } catch (_) { if (run === genreRun) { el('genre-detail-status').textContent = 'Chưa tải thêm được nhạc. Đang hiển thị bài theo thể loại có sẵn trong app.'; } }
    if (run === genreRun) { paintGenreTracks(); }
  }
  function paintGenreTracks() { root.VeDanhSachBaiHat(genreTracks, el('genre-detail-tracks'), false); el('btn-play-genre').disabled = !genreTracks.length; el('btn-save-genre-mix').disabled = savingGenreMix || !genreTracks.length; }
  async function saveGenreMix() {
    if (savingGenreMix || !currentGenre || !genreTracks.length) { return; }
    var button = el('btn-save-genre-mix'), genre = currentGenre; savingGenreMix = true; button.disabled = true;
    var tracks = genreTracks.map(function (track) { var copy = Object.assign({}, track); delete copy.recommendationGenreHints; delete copy.recommendationReason; delete copy.recommendationNew; return copy; });
    try {
      await api.luuDanhSachPhat({ id: 'genre_' + genre.id + '_' + Date.now(), name: genre.name + ' Mix', description: 'Khám phá ' + genre.name, cover: tracks[0].cover || '', tracks: tracks });
      await root.DocDanhSachPhatNguoiDung(); root.HienThiThongBao('Đã lưu ' + root.XoaKyTuHTML(genre.name) + ' Mix vào playlist.', 'success', 1800);
    } catch (message) { warn(message); }
    finally { savingGenreMix = false; button.disabled = !genreTracks.length; }
  }
  function localArtistResults(query) {
    var taste = root.GoiYAmNhac.thongKe(root.DanhSachBaiHatThuVien || []), list = [];
    allLocalTracks().forEach(function (t) { var a = fromTrack(t); if (a) { list.push(a); } });
    taste.topArtists.forEach(function (value) { list.push(profiles.get(value.key) || artist({ name: value.name })); });
    root.SoThichNhacDaLuu.favoriteArtists.forEach(function (name) { list.push(profiles.get(key(name)) || artist({ name: name })); });
    return core.rankSearchArtists(list, query, taste).slice(0, 12);
  }
  function sourceMatches(track, source) {
    if (source === 'all') { return true; }
    if (source === 'spotify') { return track.catalogProvider === 'spotify'; }
    if (source === 'deezer') { return track.source === 'spotify' && (!track.catalogProvider || track.catalogProvider === 'deezer'); }
    return track.source === source;
  }
  function renderSearchTracks() {
    var genre = el('search-genre-filter').value;
    var tracks = (root.KetQuaTimKiem || []).filter(function (t) { var ids = core.classify(t).ids; return sourceMatches(t, root.BoLocHienTai) && (genre === 'all' || genre === 'unknown' ? genre === 'all' || !ids.length : ids.includes(genre)); });
    root.VeDanhSachBaiHat(tracks, el('tracks-container'), false);
    el('results-count').textContent = tracks.length + ' bài hát · ' + searchArtists.length + ' nghệ sĩ';
    hide(el('search-artists-section'), !searchQuery || searchType === 'tracks');
    hide(el('search-song-heading'), !searchQuery || searchType === 'artists'); hide(el('tracks-container'), searchType === 'artists');
    hide(el('search-loader'), searchType === 'artists' || el('search-loader').dataset.loading !== 'true');
    return true;
  }
  function resetSearch() {
    el('search-input').value = ''; el('search-clear-btn').classList.add('hidden');
    searchRun++; searchQuery = ''; searchArtists = []; root.KetQuaTimKiem = []; el('tracks-container').replaceChildren();
    ['search-artists-section', 'search-song-heading', 'search-loader'].forEach(function (id) { hide(el(id), true); });
    el('results-meta').style.display = 'none'; el('empty-state').style.display = 'flex'; hide(el('search-browse-section'), false);
  }
  function search(query) {
    query = String(query || '').trim(); if (!query) { resetSearch(); return Promise.resolve(); }
    if (root.GiaoDienMoi) { root.GiaoDienMoi.ghiTimKiem(query); }
    var run = ++searchRun; searchQuery = query; searchSource = root.BoLocHienTai; searchArtists = []; root.KetQuaTimKiem = [];
    root.ChuyenDoiGiaoDien('explore', null); el('search-input').value = query; hide(el('search-clear-btn'), false);
    el('empty-state').style.display = 'none'; hide(el('search-browse-section'), true); el('results-meta').style.display = 'flex';
    el('explore-title').textContent = 'Kết quả cho “' + query + '”'; el('search-artists-grid').replaceChildren();
    el('search-artists-status').textContent = 'Đang tìm nghệ sĩ…'; el('search-loader').style.display = 'flex'; el('search-loader').dataset.loading = 'true';
    el('search-genre-filter').value = 'all'; renderSearchTracks();
    var artistTask = api.timKiemNgheSi(query).then(function (result) {
      if (run !== searchRun) { return; }
      var found = Array.isArray(result) ? result : result && result.artists || [], local = localArtistResults(query), names = new Set();
      searchArtists = core.rankSearchArtists(found.concat(local).map(remember).filter(Boolean), query, root.GoiYAmNhac.thongKe(root.DanhSachBaiHatThuVien || [])).slice(0, 8);
      renderArtistCards(el('search-artists-grid'), searchArtists);
      el('search-artists-status').textContent = result && result.warning || (searchArtists.length ? searchArtists.length + ' hồ sơ' : 'Chưa tìm thấy nghệ sĩ. Thử tên đầy đủ hoặc bỏ bộ lọc.'); renderSearchTracks();
    }).catch(function () { if (run === searchRun) { searchArtists = localArtistResults(query); renderArtistCards(el('search-artists-grid'), searchArtists); el('search-artists-status').textContent = 'Chưa kết nối được danh mục. Đang dùng nghệ sĩ từ các bài đã có.'; renderSearchTracks(); } });
    var trackTask = (searchSource === 'all' ? api.timKiemTatCa(query) : api.timKiemTheoNguon(searchSource, query)).then(function (tracks) {
      if (run !== searchRun) { return; } root.KetQuaTimKiem = core.rankSearchTracks(Array.isArray(tracks) ? tracks : [], query, root.GoiYAmNhac.thongKe(root.DanhSachBaiHatThuVien || []), true); renderSearchTracks();
    }).catch(function (message) { if (run === searchRun) { root.KetQuaTimKiem = []; el('tracks-container').replaceChildren(node('p', 'recommendation-empty', root.DinhDangLoi(message))); } }).finally(function () {
      if (run === searchRun) { el('search-loader').dataset.loading = 'false'; hide(el('search-loader'), true); }
    });
    return Promise.allSettled([artistTask, trackTask]);
  }
  function changeSource() { if (searchQuery && searchSource !== 'all' && root.BoLocHienTai !== searchSource) { search(searchQuery); } else { renderSearchTracks(); } }
  function focusSearch() { root.ChuyenDoiGiaoDien('explore', null); el('search-input').focus(); }
  function paintSpotify(status) {
    spotifyStatus = status || { connected: false, connecting: false };
    el('btn-connect-spotify').disabled = spotifyStatus.connecting || !spotifyClientId; el('btn-connect-spotify').textContent = spotifyStatus.connecting ? 'Đang chờ đăng nhập…' : (spotifyStatus.connected ? 'Kết nối lại' : 'Kết nối Spotify');
    hide(el('btn-disconnect-spotify'), !spotifyStatus.connected && !spotifyStatus.connecting);
    el('spotify-connection-status').textContent = spotifyStatus.error || (spotifyStatus.connected ? 'Đã kết nối Spotify API · Phiên này chỉ giữ trong lần mở app hiện tại.' : spotifyStatus.connecting ? 'Hoàn tất đăng nhập trong trình duyệt. App sẽ tự nhận kết quả.' : 'Chưa kết nối. Cấu hình Client ID rồi bấm Kết nối Spotify.');
  }
  async function pollSpotify() {
    clearTimeout(spotifyPoll);
    try {
      var wasConnected = spotifyStatus.connected, status = await api.layTrangThaiSpotify(); paintSpotify(status);
      if (!wasConnected && spotifyStatus.connected) { profiles.clear(); favoriteProfiles.forEach(remember); if (root.GiaoDienHienTai === 'explore' && searchQuery) { search(searchQuery); } }
    } catch (_) { paintSpotify({ connected: false, connecting: false, error: 'Chưa đọc được trạng thái Spotify.' }); }
    if (spotifyStatus.connecting) { spotifyPoll = setTimeout(pollSpotify, 1200); }
  }
  function onView(view) {
    if (view === 'artists') { renderFavoriteArtists(); }
    if (view === 'genres') { paintGenreHearts(); }
    if (view === 'artist') { paintProfile(); }
  }
  function init() {
    if (initialized) { return; } initialized = true;
    var home = el('view-home'); ['home-section-foryou', 'home-section-mixes', 'home-section-continue', 'home-section-history', 'home-section-artists', 'home-section-discovery', 'home-section-hot'].forEach(function (id) { home.appendChild(el(id)); });
    renderFavoriteArtists(); renderGenres();
    core.styles.forEach(function (genre) { var option = node('option', '', genre.name); option.value = genre.id; el('search-genre-filter').appendChild(option); });
    var unknown = node('option', '', 'Chưa phân loại'); unknown.value = 'unknown'; el('search-genre-filter').appendChild(unknown);
    el('search-genre-filter').addEventListener('change', renderSearchTracks);
    document.querySelectorAll('[data-search-type]').forEach(function (button) { button.addEventListener('click', function () {
      searchType = button.dataset.searchType; document.querySelectorAll('[data-search-type]').forEach(function (b) { var active = b.dataset.searchType === searchType; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); }); renderSearchTracks();
    }); });
    document.addEventListener('click', function (event) { var target = event.target.closest('[data-jump-view]'); if (target) { if (target.dataset.jumpView === 'home') { root.LamMoiTrangChu(); } else { root.ChuyenDoiGiaoDien(target.dataset.jumpView, null); } } if (event.target.closest('[data-focus-search]')) { focusSearch(); } });
    el('btn-header-home').addEventListener('click', function () { root.LamMoiTrangChu(); });
    el('btn-find-artists').addEventListener('click', focusSearch);
    el('btn-artist-back').addEventListener('click', back); el('btn-genre-back').addEventListener('click', function () { root.ChuyenDoiGiaoDien('genres', null); });
    el('btn-heart-artist').addEventListener('click', function () { toggleArtist(currentArtist); });
    el('btn-heart-genre').addEventListener('click', function () { if (currentGenre) { toggleGenre(currentGenre.id); } });
    el('btn-play-artist').addEventListener('click', function () { if (artistTracks.length) { root.PhatBaiHat(artistTracks[0], artistTracks, 0); } });
    el('btn-play-genre').addEventListener('click', function () { if (genreTracks.length) { root.PhatBaiHat(genreTracks[0], genreTracks, 0); } });
    el('btn-save-genre-mix').addEventListener('click', saveGenreMix);
    el('btn-open-artist-source').addEventListener('click', function () { if (currentArtist) { openLink(currentArtist.url); } });
    el('search-clear-btn').addEventListener('click', resetSearch);
    ['player-artist', 'track-page-artist'].forEach(function (id) {
      var button = el(id); button.setAttribute('role', 'button'); button.tabIndex = 0; button.title = 'Mở hồ sơ nghệ sĩ';
      button.addEventListener('click', function () { if (root.BaiHatDangPhat) { openArtistFromTrack(root.BaiHatDangPhat); } });
      button.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); button.click(); } });
    });
    el('btn-save-spotify-id').addEventListener('click', async function () {
      var id = el('spotify-client-id').value.trim(), button = el('btn-save-spotify-id');
      if (id && !/^[a-f\d]{32}$/i.test(id)) { el('spotify-connection-status').textContent = 'Client ID cần có 32 ký tự hexadecimal.'; return; }
      button.disabled = true;
      try { var config = await api.luuCaiDatGoiY({ spotifyClientId: id }); var changed = spotifyClientId !== id; if (changed) { await api.ngatSpotify(); } spotifyClientId = config.spotifyClientId; paintSpotify(changed ? { connected: false, connecting: false } : spotifyStatus); }
      catch (message) { el('spotify-connection-status').textContent = root.DinhDangLoi(message); }
      finally { button.disabled = false; }
    });
    el('btn-connect-spotify').addEventListener('click', async function () { el('btn-connect-spotify').disabled = true; try { paintSpotify(await api.ketNoiSpotify()); pollSpotify(); } catch (message) { paintSpotify({ error: root.DinhDangLoi(message) }); } });
    el('btn-disconnect-spotify').addEventListener('click', async function () { try { await api.ngatSpotify(); clearTimeout(spotifyPoll); paintSpotify({}); } catch (message) { warn(message); } });
    pollSpotify();
  }
  root.KhamPhaNhac = { khoiTao: init, khoiPhuc: restore, doiGiaoDien: onView, timKiem: search, xoaTimKiem: resetSearch, veKetQua: renderSearchTracks, doiNguon: changeSource,
    moNgheSi: openArtist, moNgheSiTuBai: openArtistFromTrack, veNgheSiGoiY: function (values) { renderArtistCards(el('home-artists-grid'), values.map(function (value) { return Object.assign({}, fromTrack(value.track || { artist: value.name }), { name: value.name, reason: value.reason }); })); },
    veYeuThich: function () { renderFavoriteArtists(); if (root.GiaoDienHienTai === 'artist') { paintProfile(); } }, capNhatNutTim: function () { paintArtistHearts(); paintGenreHearts(); }, dangLuuTim: function () { return pendingArtists.size > 0 || pendingGenres.size > 0; },
    laBaiNgoai: isExternal, moBaiNgoai: openExternal, nhanNguon: function (track) { if (track.source === 'local') { return 'Nhạc cá nhân'; } return track.catalogProvider ? providerName(track.catalogProvider) : (track.source === 'spotify' ? 'Deezer' : track.source); },
    moTheLoai: openGenre, goiYNgheSi: localArtistResults };
})(window);
