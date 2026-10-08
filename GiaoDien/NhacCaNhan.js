(function (root) {
  'use strict';
  var api = root.GiaoDienUngDung, entries = [], pending = [], busy = false, cancel = false;
  var ready = false, cover = '', deleting = null, revision = 0;
  var maxBytes = 512 * 1024 * 1024, chunkBytes = 256 * 1024;
  function el(id) { return document.getElementById(id); }
  function node(tag, cls, text) { var n = document.createElement(tag); n.className = cls || ''; if (text != null) { n.textContent = text; } return n; }
  function message(error) { return String(error && error.message || error); }
  function normalized(text) { return root.GoiYAmNhac.core.text(String(text || '')); }
  async function inspectFile(file) {
    var bytes = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    var tagged = bytes.length >= 10 && bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51;
    var frame = bytes.length >= 2 && bytes[0] === 255 && (bytes[1] & 224) === 224 && (bytes[1] & 6) !== 0;
    if (!tagged && !frame) { throw new Error('Nội dung file không phải MP3. Đổi đuôi file sang .mp3 không chuyển đổi được định dạng nhạc.'); }
    return duration(file);
  }
  function setStatus(text) { el('personal-status').textContent = text; }
  function button(text, cls, action) { var n = node('button', cls, text); n.type = 'button'; n.addEventListener('click', action); return n; }
  function duration(file) {
    return new Promise(function (resolve, reject) {
      var audio = document.createElement('audio'), url = URL.createObjectURL(file);
      var timer = setTimeout(function () { finish(new Error('Không đọc được file MP3. Hãy thử file khác.')); }, 15000);
      function finish(error) {
        clearTimeout(timer); audio.onloadedmetadata = audio.onerror = null;
        var seconds = audio.duration; audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url);
        if (error) { reject(error); } else { resolve(seconds); }
      }
      audio.preload = 'metadata';
      audio.onloadedmetadata = function () {
        if (!Number.isFinite(audio.duration) || audio.duration <= 0 || audio.duration > 86400) { finish(new Error('File MP3 cần có thời lượng hợp lệ, tối đa 24 giờ.')); }
        else { finish(); }
      };
      audio.onerror = function () { finish(new Error('File này không phải MP3 có thể phát. Hãy kiểm tra lại file.')); };
      audio.src = url;
    });
  }
  function stage(files) {
    if (busy) { return; }
    Array.from(files).forEach(function (file) {
      if (!/\.mp3$/i.test(file.name)) { setStatus('Chỉ nhận file MP3. File khác đã được bỏ qua.'); return; }
      if (!file.size || file.size > maxBytes) { setStatus('Mỗi file MP3 cần nhỏ hơn hoặc bằng 512 MB và không được rỗng.'); return; }
      if (pending.some(function (item) { return item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified; })) { return; }
      var item = { file: file, title: file.name.replace(/\.mp3$/i, ''), artist: 'Nhạc cá nhân', state: 'Đang kiểm tra file…', duration: null, error: false };
      pending.push(item); renderPending();
      inspectFile(file).then(function (seconds) { item.duration = seconds; item.state = 'Sẵn sàng · ' + root.DinhDangThoiGian(seconds); }).catch(function (error) { item.error = true; item.state = message(error); }).finally(renderPending);
    });
  }
  function renderPending() {
    var container = el('personal-pending'); container.replaceChildren();
    pending.forEach(function (item) {
      var row = node('div', 'personal-import-row');
      var file = node('div', 'personal-file-info'); file.append(node('strong', '', item.file.name), node('small', '', (item.file.size / 1048576).toFixed(1) + ' MB'));
      var titleLabel = node('label', '', 'Tên bài hát'); var title = node('input'); title.value = item.title; title.maxLength = 240; title.disabled = busy;
      title.addEventListener('input', function () { item.title = title.value; updateControls(); }); titleLabel.append(title);
      var artistLabel = node('label', '', 'Nghệ sĩ'); var artist = node('input'); artist.value = item.artist; artist.maxLength = 240; artist.disabled = busy;
      artist.addEventListener('input', function () { item.artist = artist.value; updateControls(); }); artistLabel.append(artist);
      var state = node('span', 'personal-file-status' + (item.error ? ' is-error' : ''), item.state); item.statusNode = state;
      var remove = button('×', 'personal-remove-file', function () { pending = pending.filter(function (i) { return i !== item; }); renderPending(); });
      remove.disabled = busy; remove.setAttribute('aria-label', 'Bỏ file ' + item.file.name);
      row.append(file, titleLabel, artistLabel, state, remove); container.append(row);
    });
    el('personal-import-panel').hidden = !pending.length && !busy;
    updateControls();
  }
  function updateControls() {
    el('personal-import-start').disabled = busy || !pending.some(function (i) { return i.duration && !i.error; }) || pending.some(function (i) { return !i.error && (!i.duration || !i.title.trim() || !i.artist.trim()); });
    el('personal-choose').disabled = busy; el('personal-cover-choose').disabled = busy;
    el('personal-cover-remove').disabled = busy || !cover;
    el('personal-import-cancel').textContent = busy ? 'Hủy nhập' : 'Bỏ lựa chọn';
    el('personal-import-cancel').disabled = cancel;
    el('personal-import-panel').setAttribute('aria-busy', String(busy));
  }
  async function importFiles() {
    if (busy) { return; }
    busy = true; cancel = false; el('personal-import-progress').value = 0; renderPending();
    var batch = pending.filter(function (item) { return item.duration && !item.error; }), done = [], imported = 0, duplicates = 0, failed = 0;
    var batchCover = cover;
    for (var index = 0; index < batch.length && !cancel; index++) {
      var item = batch[index], id = null;
      try {
        if (!item.title.trim() || !item.artist.trim()) { throw new Error('Nhập tên bài hát và nghệ sĩ.'); }
        id = await api.batDauNhapNhac(item.file);
        for (var offset = 0; offset < item.file.size; offset += chunkBytes) {
          if (cancel) { throw new Error('Đã hủy nhập file này.'); }
          var bytes = new Uint8Array(await item.file.slice(offset, offset + chunkBytes).arrayBuffer());
          await api.guiDuLieuNhac(id, offset, bytes);
          el('personal-import-progress').value = (index + (offset + bytes.byteLength) / item.file.size) / batch.length * 100;
          item.statusNode.textContent = 'Đang nhập · ' + Math.round((offset + bytes.byteLength) / item.file.size * 100) + '%';
        }
        if (cancel) { throw new Error('Đã hủy nhập file này.'); }
        var result = await api.hoanTatNhapNhac(id, { title: item.title.trim(), artist: item.artist.trim(), cover: batchCover, duration: item.duration });
        id = null; done.push(item); if (result.duplicate) { duplicates++; } else { imported++; }
      } catch (error) {
        item.state = message(error); item.error = false; failed++;
      } finally { if (id) { try { await api.huyNhapNhac(id); } catch (error) { item.state += ' · Không dọn được file tạm: ' + message(error); } } }
    }
    pending = pending.filter(function (item) { return done.indexOf(item) < 0; });
    var cancelled = cancel; busy = false; cancel = false;
    if (!pending.length) { cover = ''; showCover(); }
    renderPending(); await refresh();
    setStatus('Đã thêm ' + imported + ' bài' + (duplicates ? ' · ' + duplicates + ' file trùng đã có trong bộ sưu tập' : '') + (failed && !cancelled ? ' · ' + failed + ' file lỗi, có thể thử lại' : '') + (cancelled ? ' · Đã hủy các file còn lại' : '') + '.');
    if (imported) { root.dispatchEvent(new Event('ngquang-taste-changed')); }
  }
  function showCover() {
    var preview = el('personal-cover-preview'); preview.hidden = !cover;
    if (cover) { preview.src = cover; } else { preview.removeAttribute('src'); }
    el('personal-cover-label').textContent = cover ? 'Ảnh bìa cho các bài sắp nhập' : 'Ảnh bìa tùy chọn'; updateControls();
  }
  function selectCover(file) {
    if (!file) { return; }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10 * 1048576) { setStatus('Chọn ảnh JPEG, PNG hoặc WebP dưới 10 MB.'); return; }
    var url = URL.createObjectURL(file), image = new Image();
    image.onload = function () {
      var scale = Math.min(1, 600 / Math.max(image.width, image.height)), canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
      var ctx = canvas.getContext('2d'); ctx.fillStyle = '#20232d'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      cover = canvas.toDataURL('image/jpeg', 0.85); URL.revokeObjectURL(url); showCover();
    };
    image.onerror = function () { URL.revokeObjectURL(url); setStatus('Không đọc được ảnh bìa.'); }; image.src = url;
  }
  function render() {
    var query = normalized(el('personal-search').value), sort = el('personal-sort').value;
    var visible = entries.filter(function (entry) { return normalized(entry.track.title + ' ' + entry.track.artist + ' ' + entry.fileName).includes(query); });
    if (sort === 'title') { visible.sort(function (a, b) { return a.track.title.localeCompare(b.track.title, 'vi'); }); }
    var tracks = visible.map(function (entry) { return entry.track; });
    root.VeDanhSachBaiHat(tracks, el('personal-tracks'), false);
    el('personal-tracks').querySelectorAll('.track-card').forEach(function (card, index) {
      var remove = button('Xóa', 'card-action-btn personal-delete-track', function (event) { event.stopPropagation(); openDelete(tracks[index]); });
      remove.title = 'Xóa khỏi Nhạc cá nhân'; remove.setAttribute('aria-label', 'Xóa ' + tracks[index].title + ' khỏi Nhạc cá nhân');
      card.querySelector('.card-actions-row').append(remove);
    });
    var size = entries.reduce(function (sum, entry) { return sum + entry.sizeBytes; }, 0);
    el('personal-summary').textContent = entries.length + ' bài · ' + (size / 1048576).toFixed(1) + ' MB · Nghe được khi không có mạng';
    el('personal-count-badge').textContent = entries.length;
    el('personal-play-all').disabled = !tracks.length;
    el('personal-empty').hidden = !!entries.length; el('personal-tracks').hidden = !entries.length;
    el('personal-play-all').onclick = function () { if (tracks.length) { root.PhatBaiHat(tracks[0], tracks, 0); } };
  }
  async function refresh() {
    var run = ++revision;
    try {
      var value = await api.layNhacCaNhan();
      if (!Array.isArray(value)) { throw new Error('Không đọc được bộ sưu tập nhạc cá nhân.'); }
      if (run !== revision) { return; }
      entries = value; ready = true; render();
    } catch (error) { setStatus(message(error)); }
  }
  function openDelete(track) {
    deleting = track; el('personal-delete-name').textContent = track.title;
    el('personal-delete-status').textContent = ''; el('personal-delete-confirm').disabled = false;
    el('personal-delete-modal').hidden = false; el('personal-delete-cancel').focus();
  }
  async function confirmDelete() {
    if (!deleting) { return; } var track = deleting;
    el('personal-delete-confirm').disabled = true; el('personal-delete-cancel').disabled = true;
    try {
      root.ChuanBiXoaNhacCaNhan(track);
      await new Promise(function (resolve) { setTimeout(resolve, 100); });
      await api.xoaNhacCaNhan(track.id);
      root.XoaThamChieuNhacCaNhan(track); deleting = null; el('personal-delete-modal').hidden = true;
      await Promise.all([refresh(), root.DocDuLieuThuVien(), root.DocDanhSachPhatNguoiDung()]);
      setStatus('Đã xóa “' + track.title + '” khỏi app. File MP3 gốc vẫn được giữ.');
    } catch (error) { el('personal-delete-status').textContent = message(error); }
    finally { el('personal-delete-confirm').disabled = false; el('personal-delete-cancel').disabled = false; }
  }
  function initialize() {
    el('personal-choose').addEventListener('click', function () { el('personal-file-input').click(); });
    el('personal-file-input').addEventListener('change', function () { stage(this.files); this.value = ''; });
    el('personal-cover-choose').addEventListener('click', function () { el('personal-cover-input').click(); });
    el('personal-cover-input').addEventListener('change', function () { selectCover(this.files[0]); this.value = ''; });
    el('personal-cover-remove').addEventListener('click', function () { cover = ''; showCover(); });
    el('personal-import-start').addEventListener('click', importFiles);
    el('personal-import-cancel').addEventListener('click', function () { if (busy) { cancel = true; updateControls(); } else { pending = []; cover = ''; showCover(); renderPending(); } });
    el('personal-search').addEventListener('input', render); el('personal-sort').addEventListener('change', render);
    el('personal-refresh').addEventListener('click', refresh);
    var drop = el('personal-drop-zone');
    drop.addEventListener('dragover', function (event) { event.preventDefault(); if (!busy) { drop.classList.add('is-dragging'); } });
    drop.addEventListener('dragleave', function () { drop.classList.remove('is-dragging'); });
    drop.addEventListener('drop', function (event) { event.preventDefault(); drop.classList.remove('is-dragging'); stage(event.dataTransfer.files); });
    el('personal-delete-confirm').addEventListener('click', confirmDelete);
    el('personal-delete-cancel').addEventListener('click', function () { el('personal-delete-modal').hidden = true; deleting = null; });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !el('personal-delete-modal').hidden && !el('personal-delete-cancel').disabled) { el('personal-delete-cancel').click(); } });
    refresh();
  }
  root.NhacCaNhan = {
    khoiTao: initialize, capNhat: refresh,
    doiGiaoDien: function (view) { if (view === 'personal') { refresh(); } },
    baiHat: function () { return entries.map(function (entry) { return entry.track; }); },
    daTai: function () { return ready; },
    coBai: function (id) { return entries.some(function (entry) { return entry.track.id === id; }); },
    chonAnh: selectCover,
    capNhatBai: function (track) { var entry = entries.find(function (e) { return e.track.id === track.id; }); if (entry) { entry.track = track; render(); } }
  };
})(window);
