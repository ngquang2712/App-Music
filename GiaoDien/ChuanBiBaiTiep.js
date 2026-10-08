(function (root) {
  'use strict';
  var ticket = null, generation = 0, timer = null;
  function key(track) { return JSON.stringify([track.source, track.id]); }
  function cancel(keepAudio) {
    generation += 1; clearTimeout(timer); timer = null;
    if (ticket && !keepAudio && ticket.audio !== root.TrinhPhatAmThanhChinh) {
      ticket.audio.pause(); ticket.audio.removeAttribute('src'); ticket.audio.load();
    }
    ticket = null;
  }
  function prepare() {
    clearTimeout(timer); timer = null;
    var queue = root.DanhSachCho || [], index = root.ViTriDangPhat;
    if (root.CheDoTronBai || root.CheDoLapLai === 'one' || !root.BaiHatDangPhat || !queue.length) { cancel(false); return; }
    var nextIndex = index + 1;
    if (nextIndex >= queue.length) { if (root.CheDoLapLai !== 'all') { cancel(false); return; } nextIndex = 0; }
    var next = queue[nextIndex], audio = root.TrinhPhatAmThanhPhu;
    if (!next || !audio || key(next) === key(root.BaiHatDangPhat) || (root.KhamPhaNhac && root.KhamPhaNhac.laBaiNgoai(next))) { cancel(false); return; }
    if (ticket && ticket.key === key(next) && Date.now() - ticket.created < 45000 && !audio.error) {
      timer = setTimeout(function () { if (root.DangPhatNhac) { prepare(); } }, Math.max(1000, 46000 - (Date.now() - ticket.created)));
      return;
    }
    cancel(false); var revision = generation;
    ticket = { key: key(next), audio: audio, created: Date.now(), ready: false };
    root.GiaoDienUngDung.chuanBiLuongPhat(next).then(function (stream) {
      if (revision !== generation || !ticket || ticket.audio !== audio || audio === root.TrinhPhatAmThanhChinh) { return; }
      if (!stream || !stream.streamUrl) { throw new Error('Không chuẩn bị được bài kế tiếp.'); }
      if (root.EqualizerBaiHat) { root.EqualizerBaiHat.chonBai(next, audio, false); }
      if (root.NhacOfflineVaTocDo) { root.NhacOfflineVaTocDo.apDungAudio(audio); }
      audio.preload = 'auto'; audio.volume = 0; audio.src = stream.streamUrl;
      ticket.ready = true; ticket.created = Date.now();
    }).catch(function () { if (revision === generation) { cancel(false); } });
    // Keep expiring provider URLs fresh while the current song is playing.
    timer = setTimeout(function () { if (root.DangPhatNhac) { prepare(); } }, 47000);
  }
  root.ChuanBiBaiTiep = {
    chuanBi: prepare, huy: cancel,
    nhanBai: function (track) {
      var ready = ticket && ticket.key === key(track) && ticket.ready && !ticket.audio.error && ticket.audio.readyState >= 2 && Date.now() - ticket.created < 45000;
      var result = ready ? ticket.audio : null;
      cancel(!!result); return result;
    },
    layTrangThai: function () { return ticket ? { key: ticket.key, ready: ticket.ready, buffered: ticket.audio.readyState >= 2 } : null; }
  };
})(window);
