(function (root) {
  'use strict';
  var defaults = { backgroundMode: 'default', backgroundColor: '#182332', backgroundColor2: '#39244a', coverBlurEnabled: true, coverBlurPx: 24 };
  var backgrounds = {
    violet: { backgroundColor: '#34204c', backgroundColor2: '#762b81', accentColor: '#c49bff' },
    ocean: { backgroundColor: '#123944', backgroundColor2: '#16666b', accentColor: '#6ddbc5' },
    rose: { backgroundColor: '#4d243d', backgroundColor2: '#9d426b', accentColor: '#f6a6c4' }
  };
  var appearance = Object.assign({}, defaults), theme = 'dark', accent = '#1db954', savedAppearance;
  var savedDiscord = { discordRpcEnabled: true, discordClientId: '', discordLargeImage: '{cover}', discordState: '{artist}', discordDetails: '{title}' };
  var ready = false, initialized = false, appearanceRevision = 0, appearanceTimer = null, discordSaving = false;
  var customProperties = ['--bg-base', '--bg-surface', '--bg-surface-hover', '--border', '--slider-track', '--card-bg', '--card-hover-bg', '--card-playing-bg', '--custom-background', '--custom-hue-rgb'];

  function el(id) { return document.getElementById(id); }
  function color(value) { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function mix(a, b, amount) {
    return '#' + [1, 3, 5].map(function (i) { return Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - amount) + parseInt(b.slice(i, i + 2), 16) * amount).toString(16).padStart(2, '0'); }).join('');
  }
  function normalizeAppearance(value) {
    value = Object.assign({}, defaults, value);
    if (!['default', 'solid', 'gradient'].includes(value.backgroundMode)) { value.backgroundMode = 'default'; }
    ['backgroundColor', 'backgroundColor2'].forEach(function (name) { value[name] = color(value[name]) ? value[name].toLowerCase() : defaults[name]; });
    value.coverBlurEnabled = value.coverBlurEnabled !== false;
    value.coverBlurPx = Number.isFinite(Number(value.coverBlurPx)) ? Math.round(Math.max(10, Math.min(60, Number(value.coverBlurPx)))) : 24;
    return value;
  }
  function currentAppearance() { return { appearance: clone(appearance), theme: theme, accentColor: accent }; }
  function applyBackground() {
    var style = document.documentElement.style, custom = appearance.backgroundMode !== 'default', light = theme === 'light';
    document.documentElement.toggleAttribute('data-custom-background', custom);
    document.documentElement.toggleAttribute('data-cover-blur-off', !appearance.coverBlurEnabled);
    style.setProperty('--cover-blur', appearance.coverBlurPx + 'px');
    customProperties.forEach(function (name) { style.removeProperty(name); });
    if (custom) {
      // Tint neutral surfaces so custom colors stay readable in both themes.
      var base = mix(appearance.backgroundColor, light ? '#ffffff' : '#0c0c10', light ? 0.86 : 0.65);
      var second = appearance.backgroundMode === 'gradient' ? mix(appearance.backgroundColor2, light ? '#ffffff' : '#0c0c10', light ? 0.86 : 0.65) : base;
      var surface = mix(base, '#ffffff', light ? 0.5 : 0.055), hover = mix(base, light ? '#000000' : '#ffffff', light ? 0.04 : 0.12);
      style.setProperty('--bg-base', base); style.setProperty('--bg-surface', surface); style.setProperty('--bg-surface-hover', hover);
      style.setProperty('--border', mix(base, light ? '#000000' : '#ffffff', 0.15));
      style.setProperty('--slider-track', mix(base, light ? '#000000' : '#ffffff', 0.23));
      style.setProperty('--card-bg', surface); style.setProperty('--card-hover-bg', hover); style.setProperty('--card-playing-bg', hover);
      style.setProperty('--custom-background', appearance.backgroundMode === 'gradient' ? 'linear-gradient(145deg, ' + base + ', ' + second + ')' : base);
      style.setProperty('--custom-hue-rgb', [1, 3, 5].map(function (i) { return parseInt(appearance.backgroundColor.slice(i, i + 2), 16); }).join(', '));
    }
  }
  function renderAppearance() {
    el('appearance-mode').value = appearance.backgroundMode;
    ['backgroundColor', 'backgroundColor2'].forEach(function (name, i) {
      el('appearance-color-' + i).value = appearance[name]; el('appearance-hex-' + i).value = appearance[name];
      var disabled = !ready || appearance.backgroundMode === 'default' || i === 1 && appearance.backgroundMode !== 'gradient';
      el('appearance-color-' + i).disabled = disabled; el('appearance-hex-' + i).disabled = disabled;
      el('appearance-hex-' + i).removeAttribute('aria-invalid');
    });
    el('appearance-blur-enabled').checked = appearance.coverBlurEnabled;
    el('appearance-blur-slider').value = appearance.coverBlurPx; el('appearance-blur-slider').disabled = !ready || !appearance.coverBlurEnabled;
    el('appearance-blur-value').textContent = appearance.coverBlurPx + ' px';
    document.querySelectorAll('[data-background-preset]').forEach(function (button) {
      var preset = backgrounds[button.dataset.backgroundPreset], selected = appearance.backgroundMode === 'gradient' && appearance.backgroundColor === preset.backgroundColor && appearance.backgroundColor2 === preset.backgroundColor2;
      button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected)); button.disabled = !ready;
    });
    ['appearance-mode', 'appearance-blur-enabled', 'appearance-reset', 'theme-toggle-input', 'accent-color-input', 'accent-hex-input'].forEach(function (id) { el(id).disabled = !ready; });
    document.querySelectorAll('.color-dot').forEach(function (button) { button.disabled = !ready; });
    el('accent-hex-input').value = accent; el('accent-hex-input').removeAttribute('aria-invalid');
    applyBackground();
  }
  function saveAppearance() {
    clearTimeout(appearanceTimer); appearanceTimer = null;
    var revision = appearanceRevision, value = currentAppearance();
    el('appearance-status').textContent = 'Đang lưu giao diện…';
    return root.GiaoDienUngDung.luuTuyChinh(value).then(function (config) {
      savedAppearance = { appearance: normalizeAppearance(config.appearance), theme: config.theme, accentColor: config.accentColor };
      if (revision === appearanceRevision) { el('appearance-status').textContent = 'Đã lưu. Giữ nguyên khi mở lại app.'; }
    }).catch(function (error) {
      if (revision === appearanceRevision) {
        appearance = clone(savedAppearance.appearance); theme = savedAppearance.theme; accent = savedAppearance.accentColor;
        root.ApDungGiaoDien(theme); root.ApDungMauChuDao(accent); renderAppearance();
        el('appearance-status').textContent = 'Chưa lưu được. Đã khôi phục giao diện đã lưu.';
      }
      root.HienThiThongBao(root.XoaKyTuHTML(String(error && error.message || error)), 'error', 4000);
    });
  }
  function changeAppearance(immediate) {
    if (!ready) { return; }
    appearanceRevision += 1; renderAppearance();
    el('appearance-status').textContent = 'Đang lưu giao diện…';
    clearTimeout(appearanceTimer);
    if (immediate) { saveAppearance(); } else { appearanceTimer = setTimeout(saveAppearance, 300); }
  }

  function discordForm() {
    return { discordRpcEnabled: el('discord-enabled').checked, discordClientId: el('discord-client-id').value.trim(), discordLargeImage: el('discord-large-image').value.trim(), discordState: el('discord-state').value, discordDetails: el('discord-details').value };
  }
  function validImage(value) {
    if (new TextEncoder().encode(value).length > 256) { return false; }
    if (!value || value === '{cover}' || /^[a-z0-9_-]+$/i.test(value)) { return true; }
    try { var url = new URL(value); return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password && !/\s/.test(value); } catch (_) { return false; }
  }
  function templateError(value) {
    if (Array.from(value).length > 128 || /[\u0000-\u001f\u007f-\u009f]/.test(value)) { return true; }
    return /[{}]/.test(value.replace(/\{(title|artist|album|source|status)\}/g, ''));
  }
  function discordError(value) {
    if (value.discordClientId && !/^\d{17,20}$/.test(value.discordClientId)) { return 'Application ID cần có 17–20 chữ số. Để trống để dùng app hiện tại.'; }
    if (!validImage(value.discordLargeImage)) { return 'large_image: dùng {cover}, URL HTTPS hoặc tên asset; tối đa 256 byte.'; }
    if (templateError(value.discordState) || templateError(value.discordDetails)) { return 'state/details: tối đa 128 ký tự. Biến hỗ trợ: {title}, {artist}, {album}, {source}, {status}.'; }
    return '';
  }
  function shortText(value) {
    var text = '', size = 0;
    Array.from(value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '')).some(function (letter) {
      size += new TextEncoder().encode(letter).length; if (size > 128) { return true; } text += letter; return false;
    });
    return text.trim();
  }
  function renderTemplate(template, track, playing) {
    var values = { title: track.title || 'Tên bài hát', artist: track.artist || 'Không rõ nghệ sĩ', album: track.album == null ? track.title || 'Tên album' : track.album, source: { youtube: 'YouTube', soundcloud: 'SoundCloud', spotify: 'Spotify', local: 'Nhạc cá nhân' }[track.source] || track.source || 'YouTube', status: playing ? 'Đang phát' : 'Tạm dừng' };
    return shortText(template.replace(/\{(title|artist|album|source|status)\}/g, function (_, name) { return values[name]; }));
  }
  function previewDiscord() {
    if (!initialized) { return; }
    var value = discordForm(), track = root.BaiHatDangPhat || { title: 'Tên bài hát', artist: 'Tên nghệ sĩ', source: 'youtube' }, playing = root.BaiHatDangPhat ? !!root.DangPhatNhac : true;
    var details = renderTemplate(value.discordDetails, track, playing);
    if (!playing && value.discordDetails === '{title}') { details = shortText('⏸ ' + details); }
    el('discord-preview-details').textContent = details; el('discord-preview-state').textContent = renderTemplate(value.discordState, track, playing);
    el('discord-preview-app-name').textContent = value.discordClientId ? 'Ứng dụng Discord của bạn' : 'NgQuang Music App';
    el('discord-preview').classList.toggle('presence-disabled', !value.discordRpcEnabled);
    el('discord-preview-note').textContent = !value.discordRpcEnabled ? 'Hiển thị Discord đang tắt.' : !root.BaiHatDangPhat ? 'Xem trước bằng thông tin mẫu. Phát một bài để xem nội dung thật.' : 'Xem trước hoạt động của bài hiện tại.';
    var imageValue = value.discordLargeImage, url = imageValue === '{cover}' ? track.discordCoverUrl || track.cover || '' : imageValue;
    var img = el('discord-preview-image'), placeholder = el('discord-preview-image-placeholder');
    var previewable = /^https:\/\//.test(url) || imageValue === '{cover}' && /^data:image\//.test(url);
    placeholder.textContent = !imageValue ? 'Không có ảnh' : imageValue === '{cover}' ? 'Ảnh bìa' : /^https:\/\//.test(imageValue) ? 'Ảnh URL' : 'Asset: ' + imageValue;
    if (previewable && !discordError(value)) {
      if (img.getAttribute('src') !== url) { img.hidden = false; img.src = url; }
    } else { img.hidden = true; img.removeAttribute('src'); }
  }
  function renderDiscordStatus() {
    var value = discordForm(), error = discordError(value), dirty = JSON.stringify(value) !== JSON.stringify(savedDiscord);
    el('discord-save').disabled = !ready || discordSaving || !dirty || !!error;
    el('discord-revert').disabled = !ready || discordSaving || !dirty;
    el('discord-use-track').disabled = !ready || discordSaving;
    el('discord-status').textContent = error || (discordSaving ? 'Đang lưu…' : dirty ? 'Đang xem trước. Bấm Lưu Discord để áp dụng.' : !value.discordRpcEnabled ? 'Đã lưu. Hiển thị Discord đang tắt.' : 'Đã lưu. Hiển thị khi Discord trên máy đang mở và cho phép chia sẻ hoạt động.');
    el('discord-status').classList.toggle('settings-error', !!error);
    el('discord-large-image').setAttribute('aria-invalid', String(!validImage(value.discordLargeImage)));
    el('discord-state').setAttribute('aria-invalid', String(templateError(value.discordState)));
    el('discord-details').setAttribute('aria-invalid', String(templateError(value.discordDetails)));
    el('discord-client-id').setAttribute('aria-invalid', String(!!value.discordClientId && !/^\d{17,20}$/.test(value.discordClientId)));
    previewDiscord();
  }
  function fillDiscord(value) {
    el('discord-enabled').checked = value.discordRpcEnabled;
    el('discord-client-id').value = value.discordClientId;
    el('discord-large-image').value = value.discordLargeImage;
    el('discord-state').value = value.discordState; el('discord-details').value = value.discordDetails;
    renderDiscordStatus();
  }
  function refreshPresence(value) {
    if (!value.discordRpcEnabled) { return root.GiaoDienUngDung.xoaDiscord(); }
    if (root.BaiHatDangPhat) { return root.GiaoDienUngDung.capNhatDiscord(root.BaiHatDangPhat, root.TrinhPhatAmThanhChinh ? root.TrinhPhatAmThanhChinh.currentTime : 0, !!root.DangPhatNhac); }
    return Promise.resolve();
  }
  function saveDiscord() {
    var value = discordForm(); if (!ready || discordSaving || discordError(value)) { return; }
    discordSaving = true; renderDiscordStatus();
    ['discord-enabled', 'discord-client-id', 'discord-large-image', 'discord-state', 'discord-details'].forEach(function (id) { el(id).disabled = true; });
    root.GiaoDienUngDung.luuTuyChinh(value).then(function (config) {
      Object.keys(savedDiscord).forEach(function (name) { savedDiscord[name] = config[name]; });
      discordSaving = false;
      fillDiscord(savedDiscord); refreshPresence(savedDiscord);
    }).catch(function (error) {
      // Keep the draft to retry; live presence still uses the saved config.
      el('discord-status').textContent = 'Chưa lưu được. Nội dung đang sửa được giữ để thử lại.';
      root.HienThiThongBao(root.XoaKyTuHTML(String(error && error.message || error)), 'error', 4000);
    }).finally(function () {
      discordSaving = false;
      ['discord-enabled', 'discord-client-id', 'discord-large-image', 'discord-state', 'discord-details'].forEach(function (id) { el(id).disabled = false; });
      el('discord-save').disabled = JSON.stringify(discordForm()) === JSON.stringify(savedDiscord) || !!discordError(discordForm());
      el('discord-revert').disabled = JSON.stringify(discordForm()) === JSON.stringify(savedDiscord); el('discord-use-track').disabled = false;
    });
  }
  function init() {
    if (initialized) { return; } initialized = true;
    renderAppearance(); fillDiscord(savedDiscord);
    ['discord-enabled', 'discord-client-id', 'discord-large-image', 'discord-state', 'discord-details'].forEach(function (id) {
      el(id).disabled = true; el(id).addEventListener('input', renderDiscordStatus);
    });
    el('discord-preview-image').addEventListener('error', function () { this.hidden = true; });
    el('discord-save').addEventListener('click', saveDiscord);
    el('discord-revert').addEventListener('click', function () { fillDiscord(savedDiscord); });
    el('discord-use-track').addEventListener('click', function () { fillDiscord(Object.assign({}, discordForm(), { discordLargeImage: '{cover}', discordState: '{artist}', discordDetails: '{title}' })); });
    el('theme-toggle-input').addEventListener('change', function () { theme = this.checked ? 'light' : 'dark'; root.ApDungGiaoDien(theme); changeAppearance(true); });
    document.querySelectorAll('.color-dot').forEach(function (button) {
      button.addEventListener('click', function () { accent = button.dataset.color; root.ApDungMauChuDao(accent, button.dataset.name); changeAppearance(true); });
    });
    el('accent-color-input').addEventListener('input', function () { accent = this.value; root.ApDungMauChuDao(accent); changeAppearance(false); });
    el('accent-hex-input').addEventListener('change', function () {
      if (!color(this.value)) { this.setAttribute('aria-invalid', 'true'); el('appearance-status').textContent = 'Màu cần có dạng #RRGGBB.'; return; }
      accent = this.value.toLowerCase(); root.ApDungMauChuDao(accent); changeAppearance(true);
    });
    el('appearance-mode').addEventListener('change', function () { appearance.backgroundMode = this.value; changeAppearance(true); });
    ['backgroundColor', 'backgroundColor2'].forEach(function (name, i) {
      el('appearance-color-' + i).addEventListener('input', function () { appearance[name] = this.value; changeAppearance(false); });
      el('appearance-hex-' + i).addEventListener('change', function () {
        if (!color(this.value)) { this.setAttribute('aria-invalid', 'true'); el('appearance-status').textContent = 'Màu nền cần có dạng #RRGGBB.'; return; }
        appearance[name] = this.value.toLowerCase(); changeAppearance(true);
      });
    });
    document.querySelectorAll('[data-background-preset]').forEach(function (button) {
      button.addEventListener('click', function () {
        var preset = backgrounds[button.dataset.backgroundPreset];
        appearance = Object.assign({}, appearance, { backgroundMode: 'gradient', backgroundColor: preset.backgroundColor, backgroundColor2: preset.backgroundColor2 });
        accent = preset.accentColor; root.ApDungMauChuDao(accent); changeAppearance(true);
      });
    });
    el('appearance-blur-enabled').addEventListener('change', function () { appearance.coverBlurEnabled = this.checked; changeAppearance(true); });
    el('appearance-blur-slider').addEventListener('input', function () { appearance.coverBlurPx = Number(this.value); changeAppearance(false); });
    el('appearance-reset').addEventListener('click', function () {
      appearance = clone(defaults); theme = 'dark'; accent = '#1db954'; root.ApDungGiaoDien(theme); root.ApDungMauChuDao(accent); changeAppearance(true);
    });
    root.addEventListener('pagehide', function () { if (appearanceTimer) { saveAppearance(); } });
  }
  root.TuyChinhUngDung = {
    khoiTao: init, capNhatXemTruoc: previewDiscord,
    apDungCauHinh: function (config) {
      ready = true; appearance = normalizeAppearance(config.appearance); theme = config.theme === 'light' ? 'light' : 'dark'; accent = color(config.accentColor) ? config.accentColor.toLowerCase() : '#1db954';
      savedAppearance = currentAppearance(); root.ApDungGiaoDien(theme); root.ApDungMauChuDao(accent); renderAppearance();
      Object.keys(savedDiscord).forEach(function (name) { if (config[name] != null) { savedDiscord[name] = config[name]; } });
      ['discord-enabled', 'discord-client-id', 'discord-large-image', 'discord-state', 'discord-details'].forEach(function (id) { el(id).disabled = false; });
      fillDiscord(savedDiscord);
    }
  };
})(window);
