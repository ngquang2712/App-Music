(function () {
  'use strict';

  function invoke(command, args) {
    if (!window.__TAURI__ || !window.__TAURI__.core) {
      return Promise.reject(new Error('Hãy chạy app bằng CaiDatVaChay.bat; mở index.html trực tiếp không có backend Tauri.'));
    }
    return window.__TAURI__.core.invoke(command, args || {});
  }

  function report(error) {
    console.error(error);
    if (typeof window.HienThiThongBao === 'function') {
      var text = String(error && error.message || error).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
      window.HienThiThongBao(text, 'error', 5000);
    }
  }

  function notify(command, args) {
    return invoke(command, args).catch(report);
  }

  function track(value) {
    return Object.assign({ id: '', source: 'youtube', title: '', artist: '', cover: '', url: '', duration: 0 }, value);
  }

  var config = null;
  var configWrite = Promise.resolve();
  function writeConfig(changes) {
    var task = configWrite.then(function () { return config ? config : invoke('get_config'); }).then(function (value) {
      var patch = typeof changes === 'function' ? changes(value) : changes;
      return invoke('save_config', { config: Object.assign({}, value, patch) });
    }).then(function (saved) { config = saved; return saved; });
    configWrite = task.catch(function () {});
    return task;
  }
  function artistKey(name) { return window.GoiYAmNhac.core.artistKey({ artist: name }); }
  window.GiaoDienUngDung = {
    timKiemTatCa: function (query) { return invoke('search_all', { query: query }); },
    timKiemGoiY: function (query) { return invoke('search_all', { query: query, purpose: 'recommendation' }); },
    timKiemTheoNguon: function (source, query) { return invoke('search_source', { source: source, query: query }); },
    timKiemNgheSi: function (query) { return invoke('search_artists', { query: query }); },
    layHoSoNgheSi: function (artist) { return invoke('get_artist_profile', { artist: artist }); },
    layTrangThaiSpotify: function () { return invoke('get_spotify_status'); },
    ketNoiSpotify: function () { return invoke('connect_spotify'); },
    ngatSpotify: function () { return invoke('disconnect_spotify'); },
    moLienKetNhac: function (url) { return invoke('open_catalog_link', { url: url }); },
    datYeuThichNgheSi: function (artist, liked) {
      return writeConfig(function (value) {
        var normalized = window.GoiYAmNhac.core.preferences(value), ak = artistKey(artist.name);
        var artists = normalized.favoriteArtists.filter(function (name) { return artistKey(name) !== ak; });
        var profiles = (value.favoriteArtistProfiles || []).filter(function (profile) { return artistKey(profile.name) !== ak; });
        if (liked) {
          if (artists.length >= 20) { throw new Error('Bạn đã chọn 20 nghệ sĩ. Bỏ tim một nghệ sĩ để thêm người mới.'); }
          var snapshot = Object.assign({}, artist, { name: artist.name.trim().slice(0, 80) });
          artists.push(snapshot.name); profiles.push(snapshot);
        }
        return { favoriteArtists: artists, favoriteArtistProfiles: profiles };
      });
    },
    datYeuThichTheLoai: function (id, liked) {
      return writeConfig(function (value) {
        var genres = window.GoiYAmNhac.core.preferences(value).favoriteGenres.filter(function (genre) { return genre !== id; });
        if (liked) {
          if (genres.length >= 6) { throw new Error('Chọn tối đa 6 thể loại. Bỏ tim một thể loại để thêm gu mới.'); }
          genres.push(id);
        }
        return { favoriteGenres: genres };
      });
    },
    layLuongPhat: function (value) { return invoke('get_stream_url', { track: track(value) }); },
    chuanBiLuongPhat: function (value) { return invoke('prepare_stream_url', { track: track(value) }); },
    luuEQBaiHat: function (key, setting) {
      return writeConfig(function (value) {
        var settings = Object.assign({}, value.trackEqualizers || {});
        if (setting.gainsDb.every(function (gain) { return gain === 0; }) && setting.enabled) { delete settings[key]; }
        else { settings[key] = { enabled: setting.enabled, gainsDb: setting.gainsDb.slice() }; }
        return { trackEqualizers: settings };
      });
    },
    layThuVien: function () { return invoke('get_library'); },
    layNhacOffline: function () { return invoke('get_offline_library'); },
    luuBaiOffline: function (value) { return invoke('cache_track_offline', { track: track(value) }); },
    xoaBaiOffline: function (id, source) { return invoke('remove_offline_track', { trackId: id, source: source }); },
    xoaBoNhoOffline: function () { return invoke('clear_offline_cache'); },
    layHoSoNghe: function () { return invoke('get_listening_profile'); },
    luuLuotNghe: function (epoch, session) { return invoke('save_listening_session', { epoch: epoch, session: Object.assign({}, session, { track: track(session.track) }) }); },
    anBaiGoiY: function (epoch, value) { return invoke('hide_recommended_track', { epoch: epoch, track: track(value) }); },
    xoaHoSoNghe: function () { return invoke('clear_listening_profile'); },
    layNhacTuongTu: function (artists, tracks) { return invoke('get_music_discovery', { artists: artists, tracks: tracks.map(track) }); },
    luuBaiHat: function (value) { return invoke('save_track', { track: track(value) }); },
    xoaBaiHat: function (id, source) { return invoke('delete_track', { trackId: id, source: source }); },
    chinhSuaBaiHat: function (id, source, changes) {
      return invoke('edit_track', {
        trackId: id, source: source, title: changes.title || null, artist: changes.artist || null,
        cover: changes.customCoverBase64 || changes.cover || null, reset: !!changes.reset
      });
    },
    layDanhSachPhat: function () { return invoke('get_playlists'); },
    luuDanhSachPhat: function (value) {
      var playlist = Object.assign({}, value, {
        cover: value.customCoverBase64 || value.cover || null,
        tracks: (value.tracks || []).map(track)
      });
      return invoke('save_playlist', { playlist: playlist });
    },
    xoaDanhSachPhat: function (id) { return invoke('delete_playlist', { id: id }); },
    layCauHinh: function () {
      return invoke('get_config').then(function (value) { config = value; return value; });
    },
    luuCauHinh: function (changes) {
      configWrite = configWrite.then(function () {
        return config ? Promise.resolve(config) : invoke('get_config');
      }).then(function (value) {
        return invoke('save_config', { config: Object.assign({}, value, changes) });
      }).then(function (saved) { config = saved; return saved; }).catch(report);
      return configWrite;
    },
    layTrangThaiPhat: function () { return invoke('get_playback_state'); },
    luuCaiDatGoiY: function (changes) {
      return writeConfig(changes);
    },
    luuTuyChinh: function (changes) { return writeConfig(changes); },
    luuTrangThaiPhat: function (value) {
      return notify('save_playback_state', { playbackState: Object.assign({ abSegments: {} }, value) });
    },
    thuNhoCuaSo: function () { return notify('minimize_window'); },
    phongToCuaSo: function () { return notify('toggle_maximize_window'); },
    dongCuaSo: function () { return notify('close_window'); },
    capNhatDiscord: function (value, time, playing) {
      return notify('update_discord_activity', {
        title: value.title || '', artist: value.artist || '',
        coverUrl: value.discordCoverUrl || value.cover || null,
        currentTime: Math.max(0, Math.floor(time || 0)), duration: Math.max(0, Math.floor(value.duration || 0)),
        isPlaying: !!playing, album: value.album || null, trackId: value.id || null, source: value.source || null
      });
    },
    xoaDiscord: function () { return notify('clear_discord_activity'); },
    taiBaiHat: function (value) { return invoke('download_track', { track: track(value) }); },
    moThuMucTaiVe: function () { return notify('open_downloads_folder'); },
    chonTepHinhAnh: function () {
      return new Promise(function (resolve, reject) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);
        input.oncancel = function () { input.remove(); resolve(null); };
        input.onchange = function () {
          var file = input.files[0];
          if (!file) { input.remove(); resolve(null); return; }
          var reader = new FileReader();
          reader.onload = function () { input.remove(); resolve({ base64: reader.result, name: file.name }); };
          reader.onerror = function () { input.remove(); reject(new Error('Không đọc được ảnh.')); };
          reader.readAsDataURL(file);
        };
        input.click();
      });
    }
  };

  function svg(content, filled) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" ' +
      'fill="' + (filled ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + content + '</svg>';
  }
  var play = svg('<path d="m8 5 11 7-11 7Z"/>', true);
  var pause = svg('<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>', true);
  var heart = '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>';
  var repeat = '<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/>';
  var shuffle = '<path d="m18 14 4 4-4 4m0-20 4 4-4 4M2 18h2c5 0 7-12 12-12h6M2 6h2c2 0 4 2 6 6m4 4 2 2h6"/>';
  window.BieuTuong = {
    Phat: play, PhatPlaylist: play, TamDung: pause, TamDungPlaylist: pause,
    TimRong: svg(heart), TimDac: svg(heart, true),
    NotNhac: svg('<path d="M9 18V5l12-2v13M9 8l12-2"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
    ThungRac: svg('<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>'),
    ChinhSua: svg('<path d="m16 3 5 5L8 21H3v-5Z"/>'),
    BaCham: svg('<circle cx="4" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="20" cy="12" r="1"/>'),
    ThanhCong: svg('<path d="m5 12 4 4L19 6"/>'),
    DangTai: svg('<path d="M21 12a9 9 0 1 1-9-9"/>'),
    LapTat: svg(repeat), LapTatCa: svg(repeat), LapMotBai: svg(repeat + '<path d="M11 10h1v4"/>'),
    TronBat: svg(shuffle), TronTat: svg(shuffle),
    TatTieng: svg('<path d="M11 5 6 9H3v6h3l5 4ZM17 9l5 6m0-6-5 6"/>'),
    AmThanhThap: svg('<path d="M11 5 6 9H3v6h3l5 4ZM15 8a5 5 0 0 1 0 8"/>'),
    AmThanhCao: svg('<path d="M11 5 6 9H3v6h3l5 4ZM15 8a5 5 0 0 1 0 8m3-11a9 9 0 0 1 0 14"/>'),
    TayNamKeo: svg('<path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01"/>'),
    LienKet: svg('<path d="m10 13 4-4m-5 7-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 0 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>'),
    SaoChep: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>')
  };
})();
