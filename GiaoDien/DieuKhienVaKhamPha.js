(function (root) {
  'use strict';
  var refreshing = false, homeRequest = null, genre = '', feedbackTimer;
  function el(id) { return document.getElementById(id); }
  function status(message) { el('home-refresh-status').textContent = message; }
  function navigateHome() {
    root.ChuyenDoiGiaoDien('home', null);
    el('view-home').scrollTo({ top: 0, behavior: 'instant' });
  }
  function home() {
    if (refreshing) { navigateHome(); return homeRequest; }
    refreshing = true; navigateHome(); status('Đang làm mới Trang chủ…');
    el('btn-header-home').setAttribute('aria-busy', 'true');
    homeRequest = (async function () {
      var reads = await Promise.allSettled([root.DocDuLieuThuVien(), root.DocDanhSachPhatNguoiDung(), root.GoiYAmNhac.luuTienDo(), root.NhacOfflineVaTocDo.capNhat()]);
      var feeds = await Promise.allSettled([root.TaiDanhSachThinhHanh(true), root.TaiGoiYCaNhan(true)]);
      // A genre choice made during Home refresh may supersede the first feed.
      if (root.LoiHuaGoiYHienTai) { feeds[1] = (await Promise.allSettled([root.LoiHuaGoiYHienTai]))[0]; }
      var partial = reads.some(function (r) { return r.status === 'rejected'; }) || feeds.some(function (r) { return r.status === 'rejected' || !r.value || r.value.offline || r.value.catalogWarning; });
      status(partial ? 'Đã làm mới phần tải được · Một số nguồn đang bận.' : 'Đã làm mới lúc ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    })().catch(function () { status('Chưa làm mới được. Bấm Home để thử lại.'); }).finally(function () {
      refreshing = false; homeRequest = null; el('btn-header-home').setAttribute('aria-busy', 'false');
      root.GiaoDienMoi.capNhatTrangChu(); root.VePhanTiepTucNghe(); root.VePhanLichSuNghe();
    });
    return homeRequest;
  }
  function feedback(message) {
    el('player-shortcut-status').textContent = message; el('player-shortcut-status').hidden = false;
    clearTimeout(feedbackTimer); feedbackTimer = setTimeout(function () { el('player-shortcut-status').hidden = true; }, 1600);
  }
  function seek(seconds) {
    var audio = root.TrinhPhatAmThanhChinh;
    if (!root.BaiHatDangPhat || root.DangTaiBaiHat || !audio || !audio.getAttribute('src') || !Number.isFinite(audio.duration) || audio.duration <= 0) { return false; }
    root.GoiYAmNhac.quanSat(audio);
    audio.currentTime = Math.max(0, Math.min(Math.max(0, audio.duration - 0.05), audio.currentTime + seconds));
    root.CapNhatThanhTienDo(); root.LuuTrangThaiPhatNhac();
    feedback((seconds < 0 ? 'Lùi ' : 'Tua tới ') + Math.abs(seconds) + ' giây'); return true;
  }
  function adjustSpeed(delta) {
    var current = root.NhacOfflineVaTocDo.layTocDo();
    root.NhacOfflineVaTocDo.datTocDo(Math.round((current + delta) * 100) / 100);
    feedback('Tốc độ ' + root.NhacOfflineVaTocDo.layTocDo().toLocaleString('vi-VN') + '×');
  }
  function visible(node) { return !node.hidden && !node.classList.contains('hidden') && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden'; }
  function shortcut(event) {
    if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) { return; }
    var target = event.target;
    if (target.closest && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), button, a, [role="button"], [role="menuitem"], summary')) { return; }
    if (Array.from(document.querySelectorAll('.modal-overlay, #image-viewer-modal, #ab-loop-popup')).some(visible)) { return; }
    if (event.code === 'Space' || event.key === ' ') {
      event.preventDefault(); if (!event.repeat) { el('btn-play-pause').click(); }
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      if (seek(event.key === 'ArrowLeft' ? -5 : 5)) { event.preventDefault(); }
    } else if (event.key === '+' || event.code === 'Equal' && !event.shiftKey || event.code === 'NumpadAdd') {
      event.preventDefault(); adjustSpeed(0.05);
    } else if (event.key === '-' || event.code === 'NumpadSubtract') {
      event.preventDefault(); adjustSpeed(-0.05);
    }
  }
  function node(tag, className, text) { var value = document.createElement(tag); if (className) { value.className = className; } if (text) { value.textContent = text; } return value; }
  function playlists(values, warning) {
    var grid = el('home-related-playlists-grid'); grid.replaceChildren();
    el('home-playlists-status').textContent = warning || 'Playlist trong app và danh mục liên quan đến nghệ sĩ, thể loại bạn quan tâm.';
    if (!values.length) { grid.appendChild(node('p', 'recommendation-empty', 'Nghe hoặc tìm một nghệ sĩ để có playlist liên quan. Bạn cũng có thể lưu các Mix phía trên.')); }
    values.forEach(function (playlist) {
      var local = playlist.provider === 'local';
      var card = node('article', 'discovery-playlist');
      var art = node('div', 'discovery-playlist-art', '♫');
      try { var url = new URL(playlist.cover); if (url.protocol === 'https:') { var image = node('img'); image.src = url.href; image.alt = ''; image.loading = 'lazy'; image.onerror = function () { image.remove(); }; art.appendChild(image); } } catch (_) {}
      card.appendChild(art); var copy = node('div', 'discovery-playlist-copy'); copy.appendChild(node('span', 'discovery-playlist-provider', local ? 'PLAYLIST CỦA BẠN' : playlist.provider === 'spotify' ? 'SPOTIFY' : 'DEEZER'));
      copy.appendChild(node('h3', '', playlist.name)); copy.appendChild(node('p', '', playlist.reason));
      var count = playlist.trackCount == null ? '' : playlist.trackCount + ' bài';
      copy.appendChild(node('small', '', [playlist.owner, count].filter(Boolean).join(' · ')));
      var button = node('button', 'home-action-btn', local ? 'Mở playlist' : 'Mở ' + (playlist.provider === 'spotify' ? 'Spotify' : 'Deezer') + ' ↗'); button.type = 'button';
      button.addEventListener('click', function () {
        if (local) { root.ChuyenDoiGiaoDien('playlist', playlist.id); }
        else { root.GiaoDienUngDung.moLienKetNhac(playlist.url).catch(function (e) { root.HienThiThongBao(root.XoaKyTuHTML(root.DinhDangLoi(e)), 'error', 3000); }); }
      });
      copy.appendChild(button); card.appendChild(copy); grid.appendChild(card);
    });
  }
  function init() {
    var labels = { 'btn-header-home': 'Trang chủ · Làm mới nội dung', 'btn-shuffle': 'Trộn thứ tự bài hát', 'btn-prev': 'Chuyển sang bài trước', 'btn-play-pause': 'Phát / Tạm dừng · Space', 'btn-next': 'Chuyển sang bài tiếp theo', 'btn-repeat': 'Chế độ lặp lại', 'btn-queue-toggle': 'Mở hàng chờ phát', 'btn-now-panel': 'Mở thông tin bài đang nghe', 'btn-home-layout-compact': 'Hiển thị danh sách gọn', 'btn-home-layout-grid': 'Hiển thị lưới bài hát', 'btn-mute': 'Bật / Tắt âm thanh' };
    Object.keys(labels).forEach(function (id) { if (el(id)) { el(id).title = labels[id]; el(id).setAttribute('aria-label', labels[id]); } });
    ['shuffle', 'prev', 'play-pause', 'next', 'repeat'].forEach(function (id) { var b = el('track-page-btn-' + id); b.title = labels['btn-' + id]; b.setAttribute('aria-label', labels['btn-' + id]); });
    el('seek-slider').setAttribute('aria-label', 'Vị trí phát · Phím ← / → tua 5 giây');
    document.querySelectorAll('[data-seek-seconds]').forEach(function (button) { button.addEventListener('click', function () { seek(Number(button.dataset.seekSeconds)); }); });
    document.addEventListener('keydown', shortcut);
    document.querySelectorAll('[data-feed-genre]').forEach(function (button) { button.addEventListener('click', function () {
      if (genre === this.dataset.feedGenre) { return; } genre = this.dataset.feedGenre;
      document.querySelectorAll('[data-feed-genre]').forEach(function (b) { var selected = b.dataset.feedGenre === genre; b.classList.toggle('active', selected); b.setAttribute('aria-pressed', String(selected)); });
      if (genre) { root.GoiYAmNhac.ghiTheLoai(genre); } root.TaiGoiYCaNhan(true);
    }); });
  }
  root.DieuKhienVaKhamPha = { veTrangChu: home, dangLamMoi: function () { return refreshing; }, theLoai: function () { return genre; }, vePlaylist: playlists };
  document.addEventListener('DOMContentLoaded', init);
})(window);
