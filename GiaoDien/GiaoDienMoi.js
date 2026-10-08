(function (root) {
  'use strict';
  var initialized = false, input, popup, list, status, revision = 0, timer;
  var opened = false, composing = false, selected = -1, options = [], suggestionTracks = [];
  var cache = new Map(), suggestionPending = new Map(), history = [], featured = null, queueSignature = '', panelCover = '';
  var smallWindow = root.matchMedia('(max-width: 1179px)');
  var core = root.GoiYAmNhac.core;
  function el(id) { return document.getElementById(id); }
  function node(tag, className, value) { var item = document.createElement(tag); item.className = className || ''; if (value != null) { item.textContent = value; } return item; }
  function musicKey(track) { return JSON.stringify([track.source, track.id]); }
  function text(value) { return core.text(String(value || '')); }
  function unique(tracks) {
    var seen = new Set();
    return tracks.filter(function (track) {
      if (!track || !track.id || !track.title || seen.has(musicKey(track))) { return false; }
      seen.add(musicKey(track)); return true;
    });
  }
  function localTracks() {
    return unique([].concat(root.LichSuNgheTrangChu || [], root.TiepTucNgheTrangChu || [],
      root.DanhSachBaiHatThuVien || [], root.NhacCaNhan ? root.NhacCaNhan.baiHat() : [], root.NhacOfflineVaTocDo ? root.NhacOfflineVaTocDo.baiDaLuu() : [],
      (root.DanhSachPhatNguoiDung || []).flatMap(function (playlist) { return playlist.tracks || []; }),
      root.DanhSachCho || [], root.KetQuaTimKiem || [], root.DanhSachChoBan || [], root.DanhSachKhamPha || []));
  }
  function sourceMatches(track) {
    var source = root.BoLocHienTai || 'all';
    if (source === 'all') { return true; }
    if (source === 'spotify') { return track.catalogProvider === 'spotify'; }
    if (source === 'deezer') { return track.source === 'spotify' && (!track.catalogProvider || track.catalogProvider === 'deezer'); }
    return track.source === source;
  }
  function sourceLabel(track) { return root.KhamPhaNhac.nhanNguon(track) || 'Trong app'; }
  function thumbnail(track, className) {
    var wrap = node('span', className || 'suggestion-cover', '♫');
    var url = root.GiaiQuyetDuongDanAnhBia(track);
    if (url) {
      var image = node('img'); image.src = url; image.alt = ''; image.loading = 'lazy';
      image.addEventListener('error', function () { image.remove(); }); wrap.appendChild(image);
    }
    return wrap;
  }
  function artistThumbnail(artist) {
    var initials = artist.name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (part) { return Array.from(part)[0]; }).join('').toUpperCase();
    var wrap = node('span', 'suggestion-cover round artist-suggestion-cover', initials);
    if (artist.picture) {
      var image = node('img'); image.src = artist.picture; image.alt = ''; image.loading = 'lazy';
      image.addEventListener('error', function () { image.remove(); }); wrap.appendChild(image);
    }
    return wrap;
  }
  function rememberQuery(query) {
    query = String(query || '').trim().slice(0, 160); closeSuggestions();
    if (!query) { return; }
    history = [query].concat(history.filter(function (value) { return text(value) !== text(query); })).slice(0, 8);
    try { localStorage.setItem('ngquang_recent_searches', JSON.stringify(history)); } catch (_) {}
  }
  function closeSuggestions() {
    opened = false; revision++; clearTimeout(timer); selected = -1;
    if (!popup) { return; }
    popup.hidden = true; input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-busy', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  function selectIndex(index) {
    selected = index;
    list.querySelectorAll('[role="option"]').forEach(function (row, i) {
      row.classList.toggle('selected', i === index); row.setAttribute('aria-selected', String(i === index));
    });
    if (index >= 0) {
      input.setAttribute('aria-activedescendant', 'search-option-' + index);
      el('search-option-' + index).scrollIntoView({ block: 'nearest' });
    } else { input.removeAttribute('aria-activedescendant'); }
  }
  function activate(option) {
    if (!option) { return; } closeSuggestions();
    if (option.type === 'query') { input.value = option.query; el('search-clear-btn').classList.remove('hidden'); root.ThucHienTimKiem(option.query); return; }
    if (option.type === 'artist') { root.KhamPhaNhac.moNgheSi(option.artist); return; }
    var track = option.track;
    if (root.KhamPhaNhac.laBaiNgoai(track)) { root.KhamPhaNhac.moBaiNgoai(track); return; }
    var context = suggestionTracks.filter(function (item) { return !root.KhamPhaNhac.laBaiNgoai(item); });
    root.PhatBaiHat(track, context, Math.max(0, context.findIndex(function (item) { return musicKey(item) === musicKey(track); })), false);
  }
  function renderSuggestions(query, remote, message) {
    if (!opened) { return; }
    var normalized = text(query), oldOption = options[selected];
    var taste = root.GoiYAmNhac.thongKe(root.DanhSachBaiHatThuVien || []);
    var local = localTracks().filter(sourceMatches);
    var online = (remote && remote.tracks || []).filter(sourceMatches);
    suggestionTracks = core.rankSearchTracks(unique(local.concat(online)), query, taste, false).slice(0, query ? 5 : 4);
    var artists = core.rankSearchArtists([].concat(root.KhamPhaNhac.goiYNgheSi(query), remote && remote.artists || [], unique(local.concat(online)).map(function (track) {
      var id = track.artistId || '';
      return { name: core.artistName(track), id: id, picture: track.artistPicture || '', provider: id.split(':')[0] || 'local' };
    })), query, taste).slice(0, query ? 4 : 3);
    options = []; list.replaceChildren();
    function heading(value) { var label = node('div', 'suggestion-group-title', value); label.setAttribute('role', 'presentation'); list.appendChild(label); }
    function add(option) {
      var index = options.length, row = node('button', 'search-suggestion'); row.type = 'button'; row.tabIndex = -1;
      row.id = 'search-option-' + index; row.setAttribute('role', 'option'); row.setAttribute('aria-selected', 'false');
      options.push(option);
      var copy = node('span', 'suggestion-copy');
      if (option.type === 'query') {
        row.appendChild(node('span', 'suggestion-symbol', query ? '⌕' : '↶'));
        copy.appendChild(node('strong', '', option.query)); copy.appendChild(node('small', '', query ? 'Xem tất cả kết quả' : 'Tìm kiếm gần đây'));
      } else if (option.type === 'artist') {
        row.appendChild(artistThumbnail(option.artist)); copy.appendChild(node('strong', '', option.artist.name));
        copy.appendChild(node('small', '', option.artist.suggestionReason || 'Nghệ sĩ · Mở hồ sơ'));
      } else {
        row.appendChild(thumbnail(option.track)); copy.appendChild(node('strong', '', option.track.title));
        var offline = root.NhacOfflineVaTocDo.daLuu(option.track);
        copy.appendChild(node('small', '', (option.track.artist || 'Bài hát') + ' · ' + (option.track.suggestionReason || (offline ? 'Đã lưu offline' : sourceLabel(option.track)))));
      }
      row.appendChild(copy); row.appendChild(node('span', 'suggestion-arrow', option.type === 'track' ? '▶' : '↗'));
      row.addEventListener('pointerdown', function (event) { if (event.button === 0) { event.preventDefault(); } });
      row.addEventListener('pointermove', function () { selectIndex(index); });
      row.addEventListener('click', function () { activate(option); }); list.appendChild(row);
    }
    if (!query && history.length) { heading('Tìm kiếm gần đây'); history.slice(0, 3).forEach(function (value) { add({ type: 'query', query: value }); }); }
    if (artists.length) { heading(query ? 'Nghệ sĩ gợi ý' : 'Nghệ sĩ gợi ý cho bạn'); artists.forEach(function (artist) { add({ type: 'artist', artist: artist }); }); }
    if (suggestionTracks.length) { heading(query ? 'Bài hát' : 'Nghe lại'); suggestionTracks.forEach(function (track) { add({ type: 'track', track: track }); }); }
    if (query) {
      var searches = history.filter(function (value) { return text(value) !== normalized && core.matchScore(value, query); }).slice(0, 2);
      if (searches.length) { heading('Tìm kiếm gần đây'); searches.forEach(function (value) { add({ type: 'query', query: value }); }); }
      add({ type: 'query', query: query });
    }
    status.textContent = message || (!options.length ? 'Tìm bài hát hoặc nghệ sĩ để bắt đầu.' : '↑ ↓ chọn · Enter mở · Esc đóng');
    popup.hidden = false; input.setAttribute('aria-expanded', 'true');
    var index = oldOption ? options.findIndex(function (option) {
      return option.type === oldOption.type && (option.track ? musicKey(option.track) === musicKey(oldOption.track) : option.artist ? text(option.artist.name) === text(oldOption.artist.name) : option.query === oldOption.query);
    }) : -1;
    selectIndex(index);
  }
  function requestSuggestions(query, cacheKey, source) {
    if (suggestionPending.has(cacheKey)) { return suggestionPending.get(cacheKey); }
    var tracks = source === 'all' ? root.GiaoDienUngDung.timKiemTatCa(query) : root.GiaoDienUngDung.timKiemTheoNguon(source, query);
    var artists = root.GiaoDienUngDung.timKiemNgheSi(query);
    var request = Promise.allSettled([tracks, artists]).then(function (results) {
      var songs = results[0].status === 'fulfilled' && Array.isArray(results[0].value) ? results[0].value : [];
      var artistResult = results[1].status === 'fulfilled' ? results[1].value : null;
      var names = Array.isArray(artistResult) ? artistResult : artistResult && artistResult.artists || [];
      var data = { at: Date.now(), tracks: unique(songs).slice(0, 36), artists: Array.isArray(names) ? names.slice(0, 12) : [], failed: results.every(function (result) { return result.status === 'rejected'; }) };
      if (!data.failed) { if (cache.size >= 20) { cache.delete(cache.keys().next().value); } cache.set(cacheKey, data); }
      return data;
    }).finally(function () { suggestionPending.delete(cacheKey); });
    suggestionPending.set(cacheKey, request); return request;
  }
  function showSuggestions() {
    var query = input.value.trim().slice(0, 160), run = ++revision; clearTimeout(timer); opened = true; selected = -1;
    var cacheKey = JSON.stringify([root.BoLocHienTai || 'all', text(query)]), saved = cache.get(cacheKey);
    var cached = saved && Date.now() - saved.at < 180000;
    var fetchRemote = query.length >= 2 && !composing && navigator.onLine && !cached;
    input.setAttribute('aria-busy', String(fetchRemote));
    renderSuggestions(query, cached ? saved : null, fetchRemote ? 'Đang tìm thêm nghệ sĩ và bài hát…' : !navigator.onLine ? 'Đang offline · Gợi ý từ nhạc có sẵn' : '');
    if (!fetchRemote) { return; }
    timer = setTimeout(async function () {
      var source = root.BoLocHienTai || 'all';
      try {
        // Only two autocomplete requests may run together. Waited requests
        // recheck the input revision so old keystrokes never become a backlog.
        while (suggestionPending.size >= 2 && !suggestionPending.has(cacheKey)) {
          await Promise.race(Array.from(suggestionPending.values()));
          if (run !== revision || !opened) { return; }
        }
        var data = await requestSuggestions(query, cacheKey, source);
        if (run !== revision || !opened) { return; }
        input.setAttribute('aria-busy', 'false'); renderSuggestions(query, data, data.failed ? 'Chưa kết nối được nguồn nhạc · Gợi ý từ bài có sẵn' : '');
      } catch (_) {
        if (run !== revision || !opened) { return; }
        input.setAttribute('aria-busy', 'false'); renderSuggestions(query, null, 'Chưa kết nối được nguồn nhạc · Gợi ý từ bài có sẵn');
      }
    }, 500);
  }
  function panelVisible() { return smallWindow.matches ? document.body.classList.contains('now-panel-overlay') : !document.body.classList.contains('now-panel-hidden'); }
  function syncPanelButton() { el('btn-now-panel').setAttribute('aria-pressed', String(panelVisible())); el('btn-now-panel').title = panelVisible() ? 'Ẩn bài đang phát' : 'Hiện bài đang phát'; }
  function setPanel(open) {
    document.body.classList.toggle('now-panel-hidden', !open); document.body.classList.toggle('now-panel-overlay', !!open && smallWindow.matches);
    try { localStorage.setItem('ngquang_now_panel', String(open)); } catch (_) {} syncPanelButton();
  }
  function updateQueue() {
    if (!initialized) { return; }
    var queue = root.DanhSachCho || [], current = root.ViTriDangPhat;
    var next = queue.slice(Math.max(0, current + 1), Math.max(0, current + 1) + 3);
    var signature = JSON.stringify([current, root.CheDoTronBai, next.map(function (track) { return [musicKey(track), track.title, track.artist, root.GiaiQuyetDuongDanAnhBia(track)]; })]);
    if (signature === queueSignature) { return; } queueSignature = signature;
    var container = el('now-next-list'); container.replaceChildren();
    el('now-next-note').textContent = root.CheDoTronBai ? 'Đang bật trộn bài' : 'Trong danh sách của bạn';
    if (!next.length) { container.appendChild(node('p', 'now-next-empty', 'Chọn thêm nhạc để nối dài danh sách.')); return; }
    next.forEach(function (track, index) {
      var button = node('button', 'now-next-track'); button.type = 'button'; button.setAttribute('aria-label', 'Phát ' + track.title);
      var copy = node('span', 'now-next-copy'); copy.append(node('strong', '', track.title), node('small', '', track.artist || 'Bài hát'));
      button.append(thumbnail(track, 'now-next-cover'), copy, node('span', 'now-next-play', '▶'));
      button.addEventListener('click', function () { root.PhatBaiHat(track, queue, current + 1 + index, false); }); container.appendChild(button);
    });
  }
  function updateState() {
    if (!initialized) { return; }
    var track = root.BaiHatDangPhat;
    el('now-playing-status').textContent = !track ? 'Không gian âm nhạc của bạn' : root.DangTaiBaiHat ? 'Đang tải bài hát…' : root.DangPhatNhac ? 'Đang phát' : 'Đã tạm dừng';
    el('now-status-dot').classList.toggle('playing', !!root.DangPhatNhac && !root.DangTaiBaiHat);
    el('now-playing-panel').classList.toggle('has-track', !!track);
    ['btn-now-expand', 'btn-now-heart', 'btn-now-artist'].forEach(function (id) { el(id).disabled = !track; });
    var heart = el('btn-now-heart'), liked = track && root.KiemTraBaiHatDaLuu(track);
    heart.innerHTML = liked ? root.BieuTuong.TimDac : root.BieuTuong.TimRong; heart.classList.toggle('liked', !!liked);
    heart.setAttribute('aria-pressed', String(!!liked)); heart.setAttribute('aria-label', liked ? 'Bỏ yêu thích' : 'Yêu thích bài hát');
    el('now-offline-label').textContent = track && root.NhacOfflineVaTocDo.daLuu(track) ? '✓ Đã lưu offline' : '';
    updateQueue();
  }
  function updateTrack(track) {
    if (!initialized) { return; }
    el('now-playing-title').textContent = track ? track.title || 'Bài hát không tên' : 'Một bài hát, một tâm trạng';
    el('now-playing-title').title = el('now-playing-title').textContent;
    el('btn-now-artist').textContent = track ? track.artist || 'Nghệ sĩ chưa xác định' : 'Chọn nhạc và tận hưởng';
    el('now-source-label').textContent = track ? sourceLabel(track) : 'NGQUANG MUSIC';
    var image = el('now-playing-cover'), ambient = el('now-playing-ambient'), cover = track ? root.GiaiQuyetDuongDanAnhBia(track) : '';
    if (panelCover !== cover || image.dataset.trackKey !== (track ? musicKey(track) : '')) {
      panelCover = cover; image.dataset.trackKey = track ? musicKey(track) : '';
      image.alt = track ? 'Ảnh bìa ' + track.title : ''; image.hidden = !cover;
      image.onerror = function () { image.hidden = true; ambient.style.backgroundImage = 'none'; };
      if (cover) { image.src = cover; } else { image.removeAttribute('src'); }
      ambient.style.backgroundImage = cover ? 'url(' + JSON.stringify(cover) + ')' : 'none';
    }
    updateState();
  }
  function updateHome(preferFresh) {
    if (!initialized) { return; }
    var candidates = unique([].concat(preferFresh ? root.DanhSachChoBan || [] : [], root.TiepTucNgheTrangChu || [], root.DanhSachChoBan || [], root.LichSuNgheTrangChu || [], root.DanhSachBaiHatThuVien || [], localTracks()));
    featured = candidates.find(function (track) { return !root.KhamPhaNhac.laBaiNgoai(track); }) || null;
    el('home-featured-title').textContent = featured ? featured.title : 'Bật nhạc, vào gu.';
    el('home-featured-artist').textContent = featured ? featured.artist || 'Trong thư viện của bạn' : 'Bài mới để khám phá. Bài quen để nghe lại.';
    el('home-featured-label').textContent = featured ? (featured.continueTime ? 'TIẾP TỤC NGHE' : 'MỘT GIAI ĐIỆU CHO BẠN') : 'KHÔNG GIAN ÂM NHẠC CỦA BẠN';
    el('home-featured-play-label').textContent = featured ? 'Nghe ngay' : 'Tìm bài hát';
    var art = el('home-featured-cover'), cover = featured ? root.GiaiQuyetDuongDanAnhBia(featured) : '';
    art.onerror = function () { art.hidden = true; };
    if (cover && art.getAttribute('src') !== cover) { art.hidden = false; art.src = cover; }
    else if (!cover) { art.hidden = true; art.removeAttribute('src'); }
    el('home-featured').classList.toggle('has-cover', !!cover);
    el('sidebar-liked-total').textContent = (root.DanhSachBaiHatThuVien || []).length + ' bài hát';
  }
  function onView() { closeSuggestions(); syncPanelButton(); updateState(); }
  function init() {
    if (initialized) { return; } initialized = true;
    input = el('search-input'); popup = el('search-suggestions'); list = el('search-suggestions-list'); status = el('search-suggestions-status');
    try { history = JSON.parse(localStorage.getItem('ngquang_recent_searches') || '[]'); } catch (_) { history = []; }
    history = (Array.isArray(history) ? history : []).filter(function (value) { return typeof value === 'string' && value.trim(); }).map(function (value) { return value.slice(0, 160); }).slice(0, 8);
    input.addEventListener('focus', showSuggestions); input.addEventListener('input', showSuggestions);
    input.addEventListener('compositionstart', function () { composing = true; clearTimeout(timer); revision++; });
    input.addEventListener('compositionend', function () { composing = false; showSuggestions(); });
    input.addEventListener('keydown', function (event) {
      if (event.isComposing || composing) { return; }
      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && options.length) {
        if (!opened) { showSuggestions(); } event.preventDefault(); event.stopImmediatePropagation();
        selectIndex(event.key === 'ArrowDown' ? (selected + 1) % options.length : (selected < 0 ? options.length - 1 : (selected - 1 + options.length) % options.length));
      } else if (event.key === 'Enter' && opened && selected >= 0) {
        event.preventDefault(); event.stopImmediatePropagation(); activate(options[selected]);
      } else if (event.key === 'Escape' && opened) { event.preventDefault(); event.stopImmediatePropagation(); closeSuggestions(); }
      else if (event.key === 'Tab') { closeSuggestions(); }
    }, true);
    document.addEventListener('pointerdown', function (event) { if (!event.target.closest('.header-search-area')) { closeSuggestions(); } });
    document.querySelector('.header-search-area').addEventListener('focusout', function (event) { if (!this.contains(event.relatedTarget)) { closeSuggestions(); } });
    document.querySelectorAll('.filter-pill').forEach(function (button) { button.addEventListener('click', function () { cache.clear(); closeSuggestions(); }); });
    root.addEventListener('offline', function () { if (opened) { showSuggestions(); } });
    root.addEventListener('online', function () { if (opened) { showSuggestions(); } });
    root.addEventListener('ngquang-taste-changed', function () { if (opened && !composing) { showSuggestions(); } });
    try { document.body.classList.toggle('now-panel-hidden', localStorage.getItem('ngquang_now_panel') === 'false'); } catch (_) {}
    el('btn-now-panel').addEventListener('click', function () { setPanel(!panelVisible()); }); el('btn-now-close').addEventListener('click', function () { setPanel(false); });
    smallWindow.addEventListener('change', function () { document.body.classList.remove('now-panel-overlay'); syncPanelButton(); });
    el('btn-now-expand').addEventListener('click', function () { if (root.BaiHatDangPhat) { root.MoTrangChiTietBaiHat(root.BaiHatDangPhat); } });
    el('btn-now-artist').addEventListener('click', function () { if (root.BaiHatDangPhat) { root.KhamPhaNhac.moNgheSiTuBai(root.BaiHatDangPhat); } });
    el('btn-now-heart').addEventListener('click', function () { if (root.BaiHatDangPhat) { root.DaoTrangThaiYeuThich(root.BaiHatDangPhat); } });
    el('btn-now-queue').addEventListener('click', function () { el('btn-queue-toggle').click(); });
    el('home-featured-play').addEventListener('click', function () {
      if (featured) { root.PhatBaiHat(featured, [featured], 0, !!featured.continueTime); }
      else { root.ChuyenDoiGiaoDien('explore', null); input.focus(); }
    });
    el('sidebar-liked').addEventListener('click', function () { root.ChuyenDoiGiaoDien('library', null); });
    el('btn-track-page-expand').addEventListener('click', function () { root.GiaoDienUngDung.phongToCuaSo(); });
    syncPanelButton(); updateTrack(root.BaiHatDangPhat); updateHome();
  }
  root.GiaoDienMoi = { khoiTao: init, capNhatBai: updateTrack, capNhatTrangThai: updateState, capNhatTrangChu: updateHome,
    capNhatHangCho: updateQueue, doiGiaoDien: onView, ghiTimKiem: rememberQuery };
})(window);
