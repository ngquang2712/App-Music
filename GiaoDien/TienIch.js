function XoaKyTuHTML(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
  });
}

function DinhDangLoi(error) {
  if (error && error.message) { return error.message; }
  if (typeof error === 'string') { return error; }
  try { return JSON.stringify(error) || 'Lỗi không xác định'; }
  catch (_) { return String(error); }
}

function DinhDangThoiGian(value, hienThiGio) {
  var seconds = Math.max(0, Math.floor(Number(value) || 0));
  if (!Number.isFinite(seconds)) { seconds = 0; }
  var tail = String(seconds % 60).padStart(2, '0');
  if (hienThiGio && seconds >= 3600) {
    return Math.floor(seconds / 3600) + ':' + String(Math.floor(seconds / 60) % 60).padStart(2, '0') + ':' + tail;
  }
  return Math.floor(seconds / 60) + ':' + tail;
}

function DinhDangThoiLuongBaiHat(track) {
  return track && track.durationFormatted || DinhDangThoiGian(track && track.duration, true);
}

function RutGonTenNguon(source) {
  return { youtube: 'YT', spotify: 'SP', soundcloud: 'SC' }[source] || String(source || '').toUpperCase();
}

function GiaiQuyetDuongDanAnhBia(track) {
  if (!track) { return ''; }
  var choices = [track.customCoverBase64, track.cover, track.originalCover];
  for (var i = 0; i < choices.length; i++) {
    if (typeof choices[i] === 'string' && /^(https?:\/\/|data:image\/|blob:)/i.test(choices[i])) { return choices[i]; }
  }
  if (track.localCoverPath && window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.convertFileSrc) {
    return window.__TAURI__.core.convertFileSrc(track.localCoverPath);
  }
  if (track.source === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(track.id)) {
    return 'https://i.ytimg.com/vi/' + track.id + '/hqdefault.jpg';
  }
  return '';
}
