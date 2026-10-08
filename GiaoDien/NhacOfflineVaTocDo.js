(function (root) {
  'use strict';
  var library = { entries: [], usedBytes: 0, limitBytes: 2147483648, autoCache: true };
  var audioElements = [], initialized = false, request = null, renderSignature = '';
  var speed = 1, preservePitch = true, savedSpeed = 1, savedPitch = true, speedRevision = 0, speedTimer = null;
  var settingsBusy = false, deletionBusy = false, pendingSaves = new Set();
  var spaceDown = false, spaceHeld = false, spaceCanceled = false, spaceTarget = null, spaceTimer = null, temporaryBoost = false;
  function el(id) { return document.getElementById(id); }
  function key(track) { return JSON.stringify([track.source, track.id]); }
  function bytes(value) { value = Math.max(0, Number(value) || 0); if (value >= 1073741824) { return (value / 1073741824).toFixed(2) + ' GB'; } if (value >= 1048576) { return (value / 1048576).toFixed(1) + ' MB'; } return Math.round(value / 1024) + ' KB'; }
  function rate(value) { return Math.max(0.5, Math.min(2, Number(value) || 1)); }
  function label(value) { return Number(value.toFixed(2)).toLocaleString('vi-VN') + '×'; }
  function effectiveSpeed() { return temporaryBoost ? Math.min(4, speed * 2) : speed; }
  function error(value) { root.HienThiThongBao(root.XoaKyTuHTML(String(value && value.message || value)), 'error', 4500); }
  function readyTracks() { return library.entries.filter(function (entry) { return entry.status === 'ready'; }).map(function (entry) { return entry.track; }); }
  function find(track) { return track && library.entries.find(function (entry) { return key(entry.track) === key(track); }); }
  function applyAudio(audio) {
    if (!audio) { return; }
    // A mode change updates the existing stream in place. Never reload or seek.
    ['preservesPitch', 'webkitPreservesPitch', 'mozPreservesPitch'].forEach(function (property) {
      if (property in audio && audio[property] !== preservePitch) { audio[property] = preservePitch; }
    });
    var current = effectiveSpeed();
    if (audio.defaultPlaybackRate !== current) { audio.defaultPlaybackRate = current; }
    if (audio.playbackRate !== current) { audio.playbackRate = current; }
  }
  function syncSpeed() {
    audioElements.forEach(applyAudio);
    ['playback-speed-slider', 'quick-speed-slider'].forEach(function (id) { if (el(id)) { el(id).value = speed; } });
    ['playback-speed-value', 'quick-speed-value'].forEach(function (id) { if (el(id)) { el(id).textContent = label(speed); } });
    ['preserve-pitch-input', 'quick-preserve-pitch'].forEach(function (id) { if (el(id)) { el(id).checked = preservePitch; } });
    document.querySelectorAll('[data-speed-open]').forEach(function (button) {
      var current = effectiveSpeed();
      button.textContent = label(current); button.classList.toggle('space-boost-active', temporaryBoost);
      button.title = temporaryBoost ? 'Đang giữ Space: ' + label(current) + ' · Thả để trở về ' + label(speed) : 'Tốc độ phát: ' + label(speed) + ' · Giữ Space để phát nhanh';
      button.setAttribute('aria-label', temporaryBoost ? button.title : 'Điều chỉnh tốc độ phát, hiện tại ' + label(speed));
    });
    var indicator = el('space-speed-indicator');
    if (indicator) { indicator.hidden = !temporaryBoost; indicator.textContent = temporaryBoost ? 'Phát nhanh ' + label(effectiveSpeed()) + ' · Thả Space để trở lại' : ''; }
    document.querySelectorAll('[data-speed-preset]').forEach(function (button) { var selected = Math.abs(Number(button.dataset.speedPreset) - speed) < 0.005; button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected)); });
    if (el('speed-mode-description')) { el('speed-mode-description').textContent = preservePitch ? 'Đổi tốc độ, giữ cao độ giọng hát.' : 'Giọng trầm hơn khi phát chậm, cao hơn khi phát nhanh.'; }
    if (el('quick-speed-description')) {
      var shift = 12 * Math.log2(speed);
      el('quick-speed-description').textContent = preservePitch ? 'Cùng bài hát, giữ giọng gốc khi đổi tốc độ.' : 'Cùng bài hát · cao độ ' + (shift > 0 ? '+' : '') + shift.toFixed(1).replace('.', ',') + ' bán âm theo speed. 1× giữ giọng gốc.';
    }
  }
  function saveSpeed() {
    clearTimeout(speedTimer); var revision = speedRevision, value = speed, pitch = preservePitch;
    return root.GiaoDienUngDung.luuCaiDatGoiY({ playbackSpeed: value, preservePitch: pitch }).then(function () { savedSpeed = value; savedPitch = pitch; }).catch(function (failure) { if (revision === speedRevision) { speed = savedSpeed; preservePitch = savedPitch; syncSpeed(); } error(failure); });
  }
  function changeSpeed(value, pitch, saveNow) {
    cancelSpace();
    if (root.GoiYAmNhac && root.TrinhPhatAmThanhChinh) { root.GoiYAmNhac.quanSat(root.TrinhPhatAmThanhChinh); }
    speedRevision += 1; speed = rate(value); if (typeof pitch === 'boolean') { preservePitch = pitch; } syncSpeed(); clearTimeout(speedTimer); if (saveNow) { saveSpeed(); } else { speedTimer = setTimeout(saveSpeed, 400); }
  }
  function stopBoost() {
    if (!temporaryBoost) { return; }
    if (root.GoiYAmNhac && root.TrinhPhatAmThanhChinh) { root.GoiYAmNhac.quanSat(root.TrinhPhatAmThanhChinh); }
    temporaryBoost = false; syncSpeed();
  }
  function cancelSpace() { clearTimeout(spaceTimer); if (spaceDown) { spaceCanceled = true; } stopBoost(); }
  function releaseSpace() {
    cancelSpace(); spaceDown = false; spaceHeld = false; spaceCanceled = false; spaceTarget = null;
  }
  function isSpace(event) { return event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar'; }
  function editable(target) { return target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable || target.closest('[role="textbox"]')); }
  function modalVisible() {
    return Array.from(document.querySelectorAll('[role="dialog"], .modal-overlay')).some(function (node) { return !node.hidden && node.getClientRects().length > 0; });
  }
  function bindSpace() {
    var indicator = document.createElement('div'); indicator.id = 'space-speed-indicator'; indicator.hidden = true;
    indicator.setAttribute('role', 'status'); indicator.setAttribute('aria-live', 'polite'); indicator.setAttribute('aria-atomic', 'true'); document.body.appendChild(indicator);
    document.addEventListener('keydown', function (event) {
      if (!isSpace(event)) { return; }
      if (spaceDown) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || editable(event.target) || modalVisible() || !root.BaiHatDangPhat) { return; }
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.repeat) { return; }
      spaceDown = true; spaceHeld = false; spaceCanceled = false; spaceTarget = event.target;
      spaceTimer = setTimeout(function () {
        spaceHeld = true;
        var audio = root.TrinhPhatAmThanhChinh;
        if (!spaceDown || spaceCanceled || modalVisible() || !root.DangPhatNhac || !audio || audio.paused || audio.ended) { return; }
        if (root.GoiYAmNhac) { root.GoiYAmNhac.quanSat(audio); }
        temporaryBoost = true; syncSpeed();
      }, 350);
    }, true);
    document.addEventListener('keyup', function (event) {
      if (!isSpace(event) || !spaceDown) { return; }
      event.preventDefault(); event.stopImmediatePropagation();
      var target = spaceTarget, tap = !spaceHeld && !spaceCanceled;
      releaseSpace();
      if (!tap || editable(event.target) || modalVisible()) { return; }
      var button = target && target.closest('button, a[href], [role="button"], .track-card');
      if (button && button.isConnected && !button.disabled && document.activeElement === target) { button.click(); }
      else { var play = el('btn-play-pause'); if (play) { play.click(); } }
    }, true);
    root.addEventListener('blur', releaseSpace);
    root.addEventListener('pagehide', releaseSpace);
    document.addEventListener('visibilitychange', function () { if (document.hidden) { releaseSpace(); } });
    document.addEventListener('focusin', function (event) { if (editable(event.target) || event.target.closest('[role="dialog"], .modal-overlay')) { cancelSpace(); } });
    audioElements.forEach(function (audio) {
      ['pause', 'ended', 'error'].forEach(function (event) { audio.addEventListener(event, function () { if (audio === root.TrinhPhatAmThanhChinh) { cancelSpace(); } }); });
    });
  }
  function closeSpeed() { el('speed-popover').hidden = true; document.querySelectorAll('[data-speed-open]').forEach(function (button) { button.setAttribute('aria-expanded', 'false'); }); }
  function showSpeed(button) {
    var panel = el('speed-popover'), opening = panel.hidden; closeSpeed(); if (!opening) { return; }
    panel.hidden = false; button.setAttribute('aria-expanded', 'true'); var bounds = button.getBoundingClientRect(), height = panel.getBoundingClientRect().height;
    panel.style.left = Math.max(12, Math.min(window.innerWidth - 312, bounds.right - 300)) + 'px'; panel.style.top = Math.max(12, Math.min(window.innerHeight - height - 12, bounds.top - height - 12)) + 'px'; el('quick-speed-slider').focus();
  }
  function updatePlayerStatus() {
    var track = root.BaiHatDangPhat, entry = find(track), button = el('btn-cache-current'); if (!button) { return; }
    if (track && track.source === 'local') {
      button.disabled = false; button.classList.add('is-ready'); button.setAttribute('aria-label', 'Nhạc cá nhân đã lưu trên máy. Mở bộ sưu tập'); button.title = button.getAttribute('aria-label');
      var personalMark = el('current-offline-status'); if (personalMark) { personalMark.textContent = 'Nhạc trên máy'; }
      el('offline-now-save').disabled = true; el('offline-now-save').textContent = 'Nhạc cá nhân đã ở trên máy'; return;
    }
    var saving = entry && (entry.status === 'queued' || entry.status === 'downloading'); button.disabled = !track || !!saving || pendingSaves.has(track && key(track)); button.classList.toggle('is-ready', !!entry && entry.status === 'ready');
    button.setAttribute('aria-label', entry && entry.status === 'ready' ? 'Đã lưu offline. Mở danh sách nhạc offline' : saving ? 'Đang lưu bài offline' : 'Lưu bài đang nghe để phát offline'); button.title = button.getAttribute('aria-label');
    var mark = el('current-offline-status'); if (mark) { mark.textContent = entry && entry.status === 'ready' ? 'Đã lưu offline' : saving ? 'Đang lưu offline…' : ''; }
    el('offline-now-save').disabled = button.disabled; el('offline-now-save').textContent = entry && entry.status === 'ready' ? 'Đã lưu bài đang nghe' : saving ? 'Đang lưu bài đang nghe…' : 'Lưu bài đang nghe';
  }
  function button(text, className, action) { var node = document.createElement('button'); node.type = 'button'; node.className = className; node.textContent = text; node.addEventListener('click', action); return node; }
  function accept(value) {
    if (!value || !Array.isArray(value.entries)) { throw new Error('Không đọc được danh sách nhạc offline.'); } library = value;
    el('offline-service-status').textContent = navigator.onLine === false ? 'Bạn đang offline. Những bài có dấu Đã lưu vẫn nghe được.' : '';
    var ready = readyTracks().length, downloading = library.entries.filter(function (entry) { return entry.status === 'queued' || entry.status === 'downloading'; }).length;
    el('offline-count-badge').textContent = ready; el('offline-summary').textContent = ready + ' bài sẵn sàng nghe offline' + (downloading ? ' · ' + downloading + ' bài đang tải' : '');
    var usage = bytes(library.usedBytes) + ' / ' + bytes(library.limitBytes); el('offline-storage-label').textContent = usage; el('offline-settings-usage').textContent = 'Đã dùng ' + usage;
    el('offline-storage-progress').value = Math.min(100, 100 * library.usedBytes / Math.max(1, library.limitBytes)); el('offline-play-all').disabled = !ready;
    if (!settingsBusy) {
      el('auto-cache-audio-input').checked = library.autoCache; var megabytes = Math.round(library.limitBytes / 1048576), limitSelect = el('offline-limit-select');
      if (!Array.from(limitSelect.options).some(function (option) { return Number(option.value) === megabytes; })) { limitSelect.add(new Option(bytes(library.limitBytes), String(megabytes))); } limitSelect.value = megabytes;
    }
    updatePlayerStatus();
    if (root.GiaoDienMoi) { root.GiaoDienMoi.capNhatTrangThai(); }
    var signature = JSON.stringify(library.entries.map(function (entry) { return [key(entry.track), entry.status, entry.downloadedBytes, entry.sizeBytes, entry.error, entry.track.title, entry.track.artist, entry.cachedAt]; }));
    if (signature === renderSignature) { return; } renderSignature = signature; var list = el('offline-tracks'); list.replaceChildren(); el('offline-empty').hidden = library.entries.length > 0;
    if (root.GiaoDienMoi) { root.GiaoDienMoi.capNhatTrangChu(); }
    library.entries.forEach(function (entry) {
      var row = document.createElement('div'); row.className = 'offline-track-row'; row.dataset.status = entry.status; row.dataset.key = key(entry.track);
      var play = button('▶', 'offline-track-play', function () { var tracks = readyTracks(), index = tracks.findIndex(function (track) { return key(track) === key(entry.track); }); if (index >= 0) { root.TiepTucHoacPhatBaiHat(tracks[index], tracks, index, false); } }); play.disabled = entry.status !== 'ready'; play.setAttribute('aria-label', 'Phát ' + entry.track.title);
      var cover = document.createElement('div'); cover.className = 'offline-track-cover'; cover.textContent = '♪'; if (entry.track.cover) { var image = document.createElement('img'); image.alt = ''; image.src = entry.track.cover; image.onerror = function () { image.remove(); }; cover.appendChild(image); }
      var info = document.createElement('div'); info.className = 'offline-track-info'; var title = document.createElement('strong'); title.textContent = entry.track.title; var artist = document.createElement('span'); artist.textContent = entry.track.artist;
      var status = document.createElement('small'); status.className = 'offline-track-status'; var percent = entry.sizeBytes ? Math.min(100, Math.floor(100 * entry.downloadedBytes / entry.sizeBytes)) + '%' : bytes(entry.downloadedBytes);
      status.textContent = entry.status === 'ready' ? '✓ Đã lưu · ' + bytes(entry.sizeBytes) : entry.status === 'queued' ? 'Đang chờ tải…' : entry.status === 'downloading' ? 'Đang tải ' + percent : (entry.error || 'Chưa lưu được bài'); info.append(title, artist, status);
      var actions = document.createElement('div'); actions.className = 'offline-track-actions'; if (entry.status === 'error') { actions.appendChild(button('Thử lại', 'outline-btn', function () { cacheTrack(entry.track); })); }
      var remove = button(entry.status === 'ready' ? 'Xóa bản offline' : 'Bỏ', 'offline-remove', function () { remove.disabled = true; root.GiaoDienUngDung.xoaBaiOffline(entry.track.id, entry.track.source).then(accept).catch(error).finally(function () { remove.disabled = false; }); }); actions.appendChild(remove); row.append(play, cover, info, actions); list.appendChild(row);
    });
  }
  function refresh() { if (request) { return request; } request = root.GiaoDienUngDung.layNhacOffline().then(accept).catch(function (failure) { el('offline-service-status').textContent = String(failure && failure.message || failure); }).finally(function () { request = null; }); return request; }
  function cacheTrack(track) {
    if (!track || pendingSaves.has(key(track))) { return; } pendingSaves.add(key(track)); updatePlayerStatus();
    return root.GiaoDienUngDung.luuBaiOffline(track).then(function (value) { accept(value); root.HienThiThongBao('Đã bắt đầu lưu bài. Xem tiến độ trong Nhạc offline.', 'info', 3000); }).catch(error).finally(function () { pendingSaves.delete(key(track)); updatePlayerStatus(); });
  }
  function saveOfflineSettings() {
    settingsBusy = true; var toggle = el('auto-cache-audio-input'), limit = el('offline-limit-select'); toggle.disabled = true; limit.disabled = true;
    root.GiaoDienUngDung.luuCaiDatGoiY({ autoCacheAudio: toggle.checked, offlineCacheLimitMb: Number(limit.value) }).then(refresh).catch(function (failure) { toggle.checked = library.autoCache; limit.value = Math.round(library.limitBytes / 1048576); error(failure); }).finally(function () { settingsBusy = false; toggle.disabled = false; limit.disabled = false; });
  }
  function init(elements) {
    if (initialized) { return; } initialized = true; audioElements = elements.filter(Boolean);
    audioElements.forEach(function (audio) { audio.addEventListener('loadedmetadata', function () { applyAudio(audio); }); audio.addEventListener('play', function () { applyAudio(audio); updatePlayerStatus(); refresh(); }); });
    ['playback-speed-slider', 'quick-speed-slider'].forEach(function (id) { el(id).addEventListener('input', function () { changeSpeed(this.value); }); el(id).addEventListener('change', saveSpeed); });
    ['preserve-pitch-input', 'quick-preserve-pitch'].forEach(function (id) { el(id).addEventListener('change', function () { changeSpeed(speed, this.checked, true); }); });
    document.querySelectorAll('[data-speed-preset]').forEach(function (item) { item.addEventListener('click', function () { changeSpeed(this.dataset.speedPreset, undefined, true); }); });
    el('speed-slow-deep').addEventListener('click', function () { changeSpeed(0.85, false, true); }); el('speed-fast-high').addEventListener('click', function () { changeSpeed(1.25, false, true); }); el('speed-reset').addEventListener('click', function () { changeSpeed(1, true, true); });
    document.querySelectorAll('[data-speed-open]').forEach(function (item) { item.addEventListener('click', function () { showSpeed(this); }); });
    document.addEventListener('click', function (event) { if (!el('speed-popover').contains(event.target) && !event.target.closest('[data-speed-open]')) { closeSpeed(); } });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !el('speed-popover').hidden) { closeSpeed(); } }); root.addEventListener('resize', closeSpeed);
    el('auto-cache-audio-input').addEventListener('change', saveOfflineSettings); el('offline-limit-select').addEventListener('change', saveOfflineSettings); el('offline-refresh').addEventListener('click', refresh);
    el('offline-play-all').addEventListener('click', function () { var tracks = readyTracks(); if (tracks.length) { root.PhatBaiHat(tracks[0], tracks, 0, false); } });
    el('offline-now-save').addEventListener('click', function () { cacheTrack(root.BaiHatDangPhat); }); el('btn-cache-current').addEventListener('click', function () { if (root.BaiHatDangPhat && root.BaiHatDangPhat.source === 'local') { root.ChuyenDoiGiaoDien('personal'); return; } var entry = find(root.BaiHatDangPhat); if (entry && entry.status === 'ready') { root.ChuyenDoiGiaoDien('offline'); } else { cacheTrack(root.BaiHatDangPhat); } });
    function closeClear() { if (!deletionBusy) { el('clear-offline-modal').hidden = true; el('offline-clear').focus(); } }
    el('offline-clear').addEventListener('click', function () { el('clear-offline-modal').hidden = false; el('offline-clear-cancel').focus(); }); el('offline-clear-cancel').addEventListener('click', closeClear);
    el('clear-offline-modal').addEventListener('click', function (event) { if (event.target === this) { closeClear(); } }); document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !el('clear-offline-modal').hidden) { closeClear(); } });
    el('offline-clear-confirm').addEventListener('click', function () { if (deletionBusy) { return; } deletionBusy = true; var confirm = this; confirm.disabled = true; el('offline-clear-cancel').disabled = true;
      root.GiaoDienUngDung.xoaBoNhoOffline().then(function (value) { accept(value); el('clear-offline-modal').hidden = true; root.HienThiThongBao('Đã xóa bản nhạc offline.', 'success', 2200); }).catch(error).finally(function () { deletionBusy = false; confirm.disabled = false; el('offline-clear-cancel').disabled = false; }); });
    root.addEventListener('online', function () { el('offline-service-status').textContent = ''; refresh(); }); root.addEventListener('offline', function () { el('offline-service-status').textContent = 'Bạn đang offline. Những bài có dấu Đã lưu vẫn nghe được.'; });
    bindSpace(); syncSpeed(); refresh(); setInterval(function () { var active = library.entries.some(function (entry) { return entry.status === 'queued' || entry.status === 'downloading'; }); if (root.GiaoDienHienTai === 'offline' || active || root.DangPhatNhac) { refresh(); } updatePlayerStatus(); }, 2000);
  }
  root.NhacOfflineVaTocDo = { khoiTao: init, apDungAudio: applyAudio, doiGiaoDien: function (view) { closeSpeed(); if (view === 'offline') { refresh(); } }, apDungCauHinh: function (config) { if (!speedRevision) { speed = savedSpeed = rate(config.playbackSpeed); preservePitch = savedPitch = config.preservePitch !== false; syncSpeed(); } refresh(); }, baiDaLuu: readyTracks, daLuu: function (track) { if (track && track.source === 'local') { return !!root.NhacCaNhan && root.NhacCaNhan.coBai(track.id); } var entry = find(track); return !!entry && entry.status === 'ready'; }, capNhat: refresh, luuBai: cacheTrack, datTocDo: changeSpeed, huyTangTocTamThoi: cancelSpace };
})(window);
