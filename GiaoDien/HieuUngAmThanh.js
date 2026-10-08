(function() {
  'use strict';

  var KhoaLuu = 'omni_audio_visualizer';
  var MacDinh = { shake: true, waves: true, sensitivity: 100, colors: ['#ffffff', '#9348ff', '#c49bff'] };
  var MauSongMacDinh = ['#ff0030', '#7564ff', '#9500ed'];
  var CaiDat = { shake: true, waves: true, sensitivity: 100, colors: MacDinh.colors.slice(), waveColors: MauSongMacDinh.slice() };
  var CacAudio = [];
  var NguonAmThanh = new Map();
  var NguCanh = null;
  var BoPhanTich = null;
  var MauAmThanh = null;
  var TanSo = null;
  var PhoDecibel = null;
  var Canvas = null;
  var ButVe = null;
  var CanvasPho = null;
  var ButVePho = null;
  var AnhSang = null;
  var AnhBia = null;
  var CacCot = [];
  var KhungHinh = 0;
  var KhungTruoc = 0;
  var MucBass = 0;
  var MucAm = 0;
  var MucSong = 0;
  var DinhAm = 0.045;
  var DinhBass = 0;
  var NguonCanChinh = '';
  var BassTruoc = 0;
  var DongChay = 0;
  var DuongSong = new Float32Array(48);
  var ThuTuPho = [0.08, 0.63, 0.29, 0.89, 0.16, 0.74, 0.43, 0.97, 0.22, 0.55, 0.36, 0.82];
  var CacLopSong = [0, 1, 2].map(function() { return { hienTai: new Float32Array(33), mucTieu: new Float32Array(33) }; });
  var ThoiGianDoiSong = 0;
  var DoiSongSau = 0.4;
  var DaKhoiTao = false;
  var GiamChuyenDong = window.matchMedia('(prefers-reduced-motion: reduce)');

  function DocCaiDat() {
    try {
      var DaLuu = JSON.parse(localStorage.getItem(KhoaLuu) || 'null');
      if (!DaLuu || typeof DaLuu !== 'object') { return; }
      ['shake', 'waves'].forEach(function(Khoa) {
        if (typeof DaLuu[Khoa] === 'boolean') { CaiDat[Khoa] = DaLuu[Khoa]; }
      });
      if (Number.isFinite(DaLuu.sensitivity)) { CaiDat.sensitivity = Math.min(200, Math.max(50, DaLuu.sensitivity)); }
      if (Array.isArray(DaLuu.colors)) {
        CaiDat.colors = MacDinh.colors.map(function(Mau, i) {
          return /^#[0-9a-f]{6}$/i.test(DaLuu.colors[i] || '') ? DaLuu.colors[i] : Mau;
        });
      }
      if (Array.isArray(DaLuu.waveColors)) {
        CaiDat.waveColors = MauSongMacDinh.map(function(Mau, i) {
          return /^#[0-9a-f]{6}$/i.test(DaLuu.waveColors[i] || '') ? DaLuu.waveColors[i] : Mau;
        });
      }
    } catch (Loi) {}
  }

  function CapNhatCaiDat() {
    ['shake', 'waves'].forEach(function(Khoa) {
      var Nut = document.getElementById('music-effect-' + Khoa);
      if (Nut) { Nut.checked = CaiDat[Khoa]; }
    });
    CaiDat.colors.forEach(function(Mau, i) {
      var Nut = document.getElementById('music-wave-color-' + (i + 1));
      if (Nut) { Nut.value = Mau; }
    });
    CaiDat.waveColors.forEach(function(Mau, i) {
      var Nut = document.getElementById('music-neon-color-' + (i + 1));
      if (Nut) { Nut.value = Mau; }
    });
    var ThanhKeo = document.getElementById('music-effect-sensitivity');
    var GiaTri = document.getElementById('music-effect-sensitivity-value');
    if (ThanhKeo) { ThanhKeo.value = CaiDat.sensitivity; }
    if (GiaTri) { GiaTri.textContent = CaiDat.sensitivity + '%'; }
    if (Canvas) { Canvas.style.display = CaiDat.waves ? '' : 'none'; }
    if (CanvasPho) { CanvasPho.style.display = CaiDat.waves ? '' : 'none'; }
    if (AnhSang) { AnhSang.style.display = CaiDat.waves ? '' : 'none'; }
    var TrangBaiHat = document.getElementById('view-track-detail');
    if (TrangBaiHat) {
      CaiDat.colors.forEach(function(Mau, i) { TrangBaiHat.style.setProperty('--music-color-' + (i + 1), Mau); });
      CaiDat.waveColors.forEach(function(Mau, i) { TrangBaiHat.style.setProperty('--music-wave-color-' + (i + 1), Mau); });
    }
  }

  function LuuCaiDat() {
    try { localStorage.setItem(KhoaLuu, JSON.stringify(CaiDat)); } catch (Loi) {}
    CapNhatCaiDat();
    DongBo();
    if (!KhungHinh) { VeSong(); VePho(); }
  }

  function ChuanBiPhat() {
    var LoaiNguCanh = window.AudioContext || window.webkitAudioContext;
    if (!LoaiNguCanh || !CacAudio.length) { return; }
    try {
      if (!NguCanh) {
        NguCanh = new LoaiNguCanh();
        NguCanh.addEventListener('statechange', DongBo);
        BoPhanTich = NguCanh.createAnalyser();
        BoPhanTich.fftSize = 2048;
        BoPhanTich.smoothingTimeConstant = 0.1;
        BoPhanTich.minDecibels = -90;
        BoPhanTich.maxDecibels = -15;
        MauAmThanh = new Float32Array(BoPhanTich.fftSize);
        TanSo = new Uint8Array(BoPhanTich.frequencyBinCount);
        PhoDecibel = new Float32Array(BoPhanTich.frequencyBinCount);
      }
      CacAudio.forEach(function(Audio) {
        if (NguonAmThanh.has(Audio)) { return; }
        var Nguon = NguCanh.createMediaElementSource(Audio);
        // Each element has one audible route, including the EQ for its own song.
        if (window.EqualizerBaiHat) {
          try { EqualizerBaiHat.ketNoi(NguCanh, Audio, Nguon, BoPhanTich); }
          catch (LoiEQ) {
            Nguon.disconnect(); Nguon.connect(NguCanh.destination); Nguon.connect(BoPhanTich);
            console.warn('Không khởi tạo được EQ:', LoiEQ.message);
          }
        } else {
          Nguon.connect(NguCanh.destination);
          Nguon.connect(BoPhanTich);
        }
        NguonAmThanh.set(Audio, Nguon);
      });
      if (NguCanh.state === 'suspended') {
        NguCanh.resume().then(DongBo).catch(function() {});
      }
    } catch (Loi) {
      console.warn('Không khởi tạo được hiệu ứng âm thanh:', Loi.message);
    }
  }

  function DangNghe() {
    return CacAudio.some(function(Audio) {
      return !Audio.paused && !Audio.ended && !Audio._omniWaiting && Audio.readyState >= 2 && !Audio.muted && Audio.volume > 0;
    });
  }

  function ChoPhepVe() {
    var CuaSoAnh = document.getElementById('image-viewer-modal');
    var TrongTrangBaiHat = document.body.classList.contains('in-track-page');
    var CoHieuUng = TrongTrangBaiHat ? (CaiDat.shake || CaiDat.waves) : CaiDat.waves;
    return !!BoPhanTich && NguCanh.state === 'running' && !document.hidden && !GiamChuyenDong.matches &&
      CoHieuUng && (!CuaSoAnh || CuaSoAnh.style.display !== 'flex') && DangNghe();
  }

  function DoiKichThuoc() {
    var TiLe = Math.min(2, window.devicePixelRatio || 1);
    [Canvas, CanvasPho].forEach(function(PhanTu) {
      if (!PhanTu || !PhanTu.clientWidth || !PhanTu.clientHeight) { return; }
      var Rong = Math.max(1, Math.round(PhanTu.clientWidth * TiLe));
      var Cao = Math.max(1, Math.round(PhanTu.clientHeight * TiLe));
      if (PhanTu.width !== Rong || PhanTu.height !== Cao) {
        PhanTu.width = Rong;
        PhanTu.height = Cao;
      }
    });
  }

  function LayMucPho(ViTri) {
    var ChiSo = Math.min(1, Math.max(0, ViTri)) * (DuongSong.length - 1);
    var Cot = Math.floor(ChiSo);
    return DuongSong[Cot] + (DuongSong[Math.min(DuongSong.length - 1, Cot + 1)] - DuongSong[Cot]) * (ChiSo - Cot);
  }

  function LayMucPhanBo(ViTri) {
    // Interleave frequency bands across the whole shape instead of pinning bass to its center.
    var ChiSo = Math.min(1, Math.max(0, ViTri)) * (ThuTuPho.length - 1);
    var Dau = Math.floor(ChiSo);
    var Phan = ChiSo - Dau;
    return LayMucPho(ThuTuPho[Dau]) * (1 - Phan) + LayMucPho(ThuTuPho[Math.min(Dau + 1, ThuTuPho.length - 1)]) * Phan;
  }

  function LamMuot(HienTai, MucTieu, ThoiLuong, Len, Xuong) {
    return HienTai + (MucTieu - HienTai) * (1 - Math.exp(-ThoiLuong / (MucTieu > HienTai ? Len : Xuong)));
  }

  function DoiDangSong(DatNgay) {
    CacLopSong.forEach(function(Lop) {
      var DinhLon = Math.floor(Math.random() * 4);
      var CacDinh = [];
      // One peak per quarter keeps activity spread across the whole width.
      // Each peak has an independent position, width and height.
      for (var i = 0; i < 4; i += 1) {
        CacDinh.push({
          viTri: (i + 0.12 + Math.random() * 0.76) / 4,
          doRong: 0.025 + Math.random() * 0.04,
          doCao: i === DinhLon ? 0.94 + Math.random() * 0.06 : 0.18 + Math.pow(Math.random(), 1.3) * 0.68
        });
      }
      var SoDinhPhu = Math.floor(Math.random() * 3);
      for (var j = 0; j < SoDinhPhu; j += 1) {
        CacDinh.push({ viTri: Math.random(), doRong: 0.018 + Math.random() * 0.022, doCao: 0.12 + Math.random() * 0.25 });
      }
      for (var k = 0; k < Lop.mucTieu.length; k += 1) {
        var ViTri = k / (Lop.mucTieu.length - 1);
        var Cao = 0.012;
        CacDinh.forEach(function(Dinh) {
          var Cach = (ViTri - Dinh.viTri) / Dinh.doRong;
          Cao += Dinh.doCao * Math.exp(-Cach * Cach / 2);
        });
        Lop.mucTieu[k] = Math.min(1, Cao);
        if (DatNgay) { Lop.hienTai[k] = Lop.mucTieu[k]; }
      }
    });
    ThoiGianDoiSong = 0;
    DoiSongSau = 0.3 + Math.random() * 0.35;
  }

  function CapNhatDangSong(ThoiLuong, Nhip) {
    if (MucSong < 0.003) { return; }
    ThoiGianDoiSong += ThoiLuong;
    if (ThoiGianDoiSong > DoiSongSau || (Nhip > 0.1 && ThoiGianDoiSong > 0.15)) { DoiDangSong(false); }
    CacLopSong.forEach(function(Lop) {
      for (var i = 0; i < Lop.hienTai.length; i += 1) {
        Lop.hienTai[i] = LamMuot(Lop.hienTai[i], Lop.mucTieu[i], ThoiLuong, 0.075, 0.14);
      }
    });
  }

  function LayDoCaoNgauNhien(Lop, ViTri) {
    var Duong = CacLopSong[Lop].hienTai;
    var ChiSo = ViTri * (Duong.length - 1);
    var Dau = Math.floor(ChiSo);
    var Phan = ChiSo - Dau;
    var A = Duong[Math.max(0, Dau - 1)], B = Duong[Dau];
    var C = Duong[Math.min(Dau + 1, Duong.length - 1)], D = Duong[Math.min(Dau + 2, Duong.length - 1)];
    var Cao = 0.5 * (2 * B + (-A + C) * Phan + (2 * A - 5 * B + 4 * C - D) * Phan * Phan +
      (-A + 3 * B - 3 * C + D) * Phan * Phan * Phan);
    return Math.max(0, Math.min(1, Cao)) * (0.9 + LayMucPhanBo(ViTri) * 0.1);
  }

  function TaoDuongSong(CacDiem) {
    ButVe.beginPath();
    ButVe.moveTo(CacDiem[0].x, CacDiem[0].y);
    for (var k = 1; k < CacDiem.length; k += 1) {
      var Truoc = CacDiem[k - 1], Sau = CacDiem[k];
      ButVe.quadraticCurveTo(Truoc.x, Truoc.y, (Truoc.x + Sau.x) / 2, (Truoc.y + Sau.y) / 2);
    }
    var Cuoi = CacDiem[CacDiem.length - 1];
    ButVe.lineTo(Cuoi.x, Cuoi.y);
  }

  function VeSong() {
    if (!ButVe || !Canvas) { return; }
    DoiKichThuoc();
    var Rong = Canvas.width;
    var Cao = Canvas.height;
    ButVe.clearRect(0, 0, Rong, Cao);
    if (!CaiDat.waves) { return; }
    var TiLe = Math.min(2, window.devicePixelRatio || 1);
    var ChanSong = Cao - 1.5 * TiLe;
    var DangVe = document.body.classList.contains('in-track-page') && MucSong > 0.001;
    var BienDo = DangVe ? (Cao - 12 * TiLe) * (1 - Math.exp(-MucSong * CaiDat.sensitivity / 100 * 2.6)) : 0;
    if (!DangVe) {
      ButVe.fillStyle = CaiDat.waveColors[2] + '28';
      ButVe.fillRect(0, ChanSong, Rong, Cao - ChanSong);
      return;
    }
    // Bright, crisp neon edges with only a faint tinted body, as in the reference clip.
    ButVe.save();
    for (var Lop = 2; Lop >= 0; Lop -= 1) {
      var SoDiem = 96;
      var CacDiem = [];
      var TiLeLop = [1, 0.84, 0.66][Lop];
      for (var i = 0; i <= SoDiem; i += 1) {
        var ViTri = i / SoDiem;
        CacDiem.push({ x: ViTri * Rong, y: ChanSong - BienDo * LayDoCaoNgauNhien(Lop, ViTri) * TiLeLop });
      }
      var Mau = CaiDat.waveColors[Lop];
      var ThanSong = ButVe.createLinearGradient(0, ChanSong - BienDo, 0, Cao);
      ThanSong.addColorStop(0, Mau + '22');
      ThanSong.addColorStop(0.6, Mau + '09');
      ThanSong.addColorStop(1, Mau + '02');
      TaoDuongSong(CacDiem);
      ButVe.lineTo(Rong, Cao);
      ButVe.lineTo(0, Cao);
      ButVe.closePath();
      ButVe.fillStyle = ThanSong;
      ButVe.fill();
      TaoDuongSong(CacDiem);
      ButVe.strokeStyle = Mau;
      ButVe.lineJoin = 'round';
      ButVe.lineCap = 'round';
      ButVe.globalAlpha = 0.2;
      ButVe.lineWidth = 4 * TiLe;
      ButVe.shadowColor = Mau;
      ButVe.shadowBlur = 5 * TiLe;
      ButVe.stroke();
      ButVe.shadowBlur = 0;
      ButVe.globalAlpha = 0.94;
      ButVe.lineWidth = 1.6 * TiLe;
      ButVe.stroke();
      ButVe.globalAlpha = 1;
    }
    ButVe.restore();
  }

  function VePho() {
    if (!CanvasPho || !ButVePho) { return; }
    DoiKichThuoc();
    ButVePho.clearRect(0, 0, CanvasPho.width, CanvasPho.height);
    if (!CaiDat.waves || !document.body.classList.contains('in-track-page')) { return; }
    var TiLe = Math.min(2, window.devicePixelRatio || 1);
    var Kieu = getComputedStyle(CanvasPho);
    var LeVien = parseFloat(Kieu.getPropertyValue('--music-rim-padding')) || 72;
    var CaoCot = parseFloat(Kieu.getPropertyValue('--music-rim-height')) || 55;
    var NuaCanh = (CanvasPho.width - 2 * LeVien * TiLe) / 2;
    if (NuaCanh < 30 * TiLe) { return; }
    var BienDo = 1 - Math.exp(-Math.pow(MucSong, 0.65) * CaiDat.sensitivity / 100 * 2.3);
    var BanKinh = 19 * TiLe;
    var Canh = NuaCanh + TiLe;
    ButVePho.save();
    ButVePho.translate(CanvasPho.width / 2, CanvasPho.height / 2);
    ButVePho.strokeStyle = CaiDat.colors[2];
    ButVePho.lineWidth = TiLe;
    ButVePho.globalAlpha = 0.22;
    ButVePho.beginPath();
    ButVePho.moveTo(-Canh + BanKinh, -Canh);
    ButVePho.lineTo(Canh - BanKinh, -Canh);
    ButVePho.quadraticCurveTo(Canh, -Canh, Canh, -Canh + BanKinh);
    ButVePho.lineTo(Canh, Canh - BanKinh);
    ButVePho.quadraticCurveTo(Canh, Canh, Canh - BanKinh, Canh);
    ButVePho.lineTo(-Canh + BanKinh, Canh);
    ButVePho.quadraticCurveTo(-Canh, Canh, -Canh, Canh - BanKinh);
    ButVePho.lineTo(-Canh, -Canh + BanKinh);
    ButVePho.quadraticCurveTo(-Canh, -Canh, -Canh + BanKinh, -Canh);
    ButVePho.closePath();
    ButVePho.stroke();
    if (MucSong > 0.001) {
      var SoO = 24;
      var Buoc = (2 * NuaCanh - 24 * TiLe) / SoO;
      var CaoO = Buoc * 0.63;
      for (var i = 0; i < SoO; i += 1) {
        var ViTri = (i + 0.5) / SoO;
        var Dinh = (1 + Math.sin(ViTri * Math.PI * 4.6 + DongChay * 1.1)) / 2;
        var Hinh = 0.3 + Math.pow(Dinh, 1.5) * 0.56 + LayMucPhanBo(ViTri) * 0.14;
        var DoDai = (2 + CaoCot * BienDo * Hinh) * TiLe;
        var Y = -NuaCanh + 12 * TiLe + i * Buoc + (Buoc - CaoO) / 2;
        // Evenly stacked hollow slots on both sides, with a narrow diagonal near the cover.
        for (var Phia = -1; Phia <= 1; Phia += 2) {
          var X = Phia > 0 ? NuaCanh - 4 * TiLe : -NuaCanh - DoDai;
          var RongO = DoDai + 4 * TiLe;
          ButVePho.globalAlpha = 0.55;
          ButVePho.lineWidth = 2.5 * TiLe;
          ButVePho.strokeStyle = CaiDat.colors[2];
          ButVePho.strokeRect(X, Y, RongO, CaoO);
          ButVePho.globalAlpha = Math.min(1, 0.6 + MucAm * 0.4);
          ButVePho.lineWidth = 1.15 * TiLe;
          ButVePho.strokeStyle = CaiDat.colors[0];
          ButVePho.strokeRect(X, Y, RongO, CaoO);
          if (DoDai > 6 * TiLe) {
            var GanAnh = Phia * (NuaCanh + 3 * TiLe);
            ButVePho.beginPath();
            ButVePho.moveTo(GanAnh, Y);
            ButVePho.lineTo(GanAnh + Phia * Math.min(7 * TiLe, DoDai * 0.4), Y + CaoO);
            ButVePho.stroke();
          }
        }
      }
    }
    ButVePho.restore();
  }

  function DatAnhVeChoCu() {
    if (AnhBia) { AnhBia.style.transform = ''; }
    if (CanvasPho) { CanvasPho.style.transform = ''; }
  }

  function DungHieuUng() {
    if (KhungHinh) { cancelAnimationFrame(KhungHinh); }
    KhungHinh = 0;
    KhungTruoc = 0;
    MucAm = 0;
    MucBass = 0;
    MucSong = 0;
    BassTruoc = 0;
    ThoiGianDoiSong = 0;
    DuongSong.fill(0);
    DatAnhVeChoCu();
    CacCot.forEach(function(Cot) { Cot.style.height = '4px'; });
    var Song = document.getElementById('track-page-waves');
    if (Song) { Song.classList.remove('is-playing'); }
    if (AnhSang) { AnhSang.style.opacity = '0'; AnhSang.style.transform = ''; }
    VeSong();
    VePho();
  }

  function LayTrungBinhTanSo(TuHz, DenHz) {
    var Buoc = NguCanh.sampleRate / BoPhanTich.fftSize;
    var Dau = Math.max(1, Math.floor(TuHz / Buoc));
    var Cuoi = Math.min(TanSo.length - 1, Math.ceil(DenHz / Buoc));
    var Tong = 0;
    for (var i = Dau; i <= Cuoi; i += 1) { Tong += TanSo[i] / 255; }
    return Tong / Math.max(1, Cuoi - Dau + 1);
  }

  function LayDinhTanSo(TuHz, DenHz) {
    var Buoc = NguCanh.sampleRate / BoPhanTich.fftSize;
    var Dau = Math.max(1, Math.floor(TuHz / Buoc));
    var Cuoi = Math.min(TanSo.length - 1, Math.ceil(DenHz / Buoc));
    var Dinh = 0;
    for (var i = Dau; i <= Cuoi; i += 1) { Dinh = Math.max(Dinh, TanSo[i] / 255); }
    return Dinh;
  }

  function LayNangLuongBass() {
    var Buoc = NguCanh.sampleRate / BoPhanTich.fftSize;
    var Dau = Math.max(1, Math.floor(35 / Buoc));
    var Cuoi = Math.min(PhoDecibel.length - 1, Math.ceil(180 / Buoc));
    var NangLuong = 0;
    for (var i = Dau; i <= Cuoi; i += 1) { NangLuong += Math.pow(10, PhoDecibel[i] / 10); }
    return Math.sqrt(NangLuong);
  }

  function VeKhung(ThoiGian) {
    KhungHinh = 0;
    if (!ChoPhepVe()) { DungHieuUng(); return; }
    // Up to 60 fps. Envelope timing stays the same on slower displays.
    if (ThoiGian - KhungTruoc < 14) { KhungHinh = requestAnimationFrame(VeKhung); return; }
    var ThoiLuong = KhungTruoc ? Math.min(0.1, (ThoiGian - KhungTruoc) / 1000) : 1 / 60;
    KhungTruoc = ThoiGian;
    BoPhanTich.getFloatTimeDomainData(MauAmThanh);
    BoPhanTich.getByteFrequencyData(TanSo);
    BoPhanTich.getFloatFrequencyData(PhoDecibel);
    var TongBinhPhuong = 0;
    for (var i = 0; i < MauAmThanh.length; i += 1) { TongBinhPhuong += MauAmThanh[i] * MauAmThanh[i]; }
    var RMS = Math.sqrt(TongBinhPhuong / MauAmThanh.length);
    var Am = Math.min(1, RMS * 3.5);
    var AudioChinh = CacAudio.find(function(Audio) { return !Audio.paused && !Audio.ended && !Audio._omniWaiting; });
    var NguonHienTai = AudioChinh ? (AudioChinh.currentSrc || AudioChinh.src) : '';
    if (NguonHienTai !== NguonCanChinh) { NguonCanChinh = NguonHienTai; DinhAm = 0.045; DinhBass = 0; }
    var AmLuong = CacAudio.reduce(function(Muc, Audio) { return !Audio.paused && !Audio.muted ? Math.max(Muc, Audio.volume) : Muc; }, 0);
    var RMSBanGoc = RMS / Math.max(0.05, AmLuong);
    // A slowly falling peak handles quiet recordings without lifting every quiet note to full height.
    // The floor rejects very low noise; the player's volume still reduces the visible amplitude.
    DinhAm = Math.max(0.045, DinhAm * Math.exp(-ThoiLuong / 18), RMSBanGoc);
    var AmChuan = Math.min(1, RMSBanGoc / DinhAm) * Math.sqrt(AmLuong);
    var BassBanGoc = LayNangLuongBass() / Math.max(0.05, AmLuong);
    DinhBass = Math.max(DinhBass * Math.exp(-ThoiLuong / 18), BassBanGoc);
    var Bass = Math.min(1, BassBanGoc / Math.max(0.007, DinhBass)) * Math.sqrt(AmLuong);
    var NhacDangCoTieng = Am > 0.001;
    if (!NhacDangCoTieng) { Bass = 0; }
    var Nhip = Math.max(0, Bass - BassTruoc) * 2;
    BassTruoc = Bass;
    var MucMucTieu = Math.min(1, Bass * 0.7 + Nhip);
    MucBass = LamMuot(MucBass, MucMucTieu, ThoiLuong, 0.025, 0.055);
    MucAm = LamMuot(MucAm, Am, ThoiLuong, 0.025, 0.055);
    // Bass-rich music follows its kicks; tracks without bass still follow their overall loudness.
    var TyTrongBass = Math.min(0.8, Math.max(0, DinhBass / DinhAm * 4 - 0.3));
    var MucKetHop = AmChuan * (1 - TyTrongBass) + Bass * TyTrongBass;
    var NangLuongSong = NhacDangCoTieng ? Math.pow(Math.min(1, Math.max(0, (MucKetHop - 0.05) / 0.95) * 1.06 + Nhip * 0.2), 3) : 0;
    MucSong = LamMuot(MucSong, NangLuongSong, ThoiLuong, 0.018, 0.05);
    DongChay = (DongChay + ThoiLuong * (1.6 + MucBass * 2.2) * Math.sqrt(MucAm)) % (Math.PI * 200);
    for (var k = 0; k < DuongSong.length; k += 1) {
      var Tu = 35 * Math.pow(12000 / 35, k / DuongSong.length);
      var Den = 35 * Math.pow(12000 / 35, (k + 1) / DuongSong.length);
      // A peak preserves vocals/treble in wider high-frequency bands.
      var Pho = Math.max(0, (LayDinhTanSo(Tu, Den) - 0.2) / 0.8);
      var NangLuong = NhacDangCoTieng ? Math.pow(Pho, 1.6) * Math.min(1, Am * 1.5) : 0;
      DuongSong[k] = LamMuot(DuongSong[k], NangLuong, ThoiLuong, 0.024, 0.08);
    }
    var TrongTrangBaiHat = document.body.classList.contains('in-track-page');
    if (TrongTrangBaiHat && CaiDat.waves && NhacDangCoTieng) { CapNhatDangSong(ThoiLuong, Nhip); }
    if (AnhBia && TrongTrangBaiHat && CaiDat.shake) {
      var DoNhay = CaiDat.sensitivity / 100;
      var TiLePhong = 1 + Math.min(0.085, (MucBass * 0.055 + MucAm * 0.01) * DoNhay);
      var Lech = (MauAmThanh[64] - MauAmThanh[192]) * MucBass * DoNhay;
      AnhBia.style.transform = 'translate(' + (Lech * 2).toFixed(3) + 'px, ' + (-MucBass * 2 * DoNhay).toFixed(3) + 'px) rotate(' + (Lech * 0.7).toFixed(3) + 'deg) scale(' + TiLePhong.toFixed(5) + ')';
      if (CanvasPho) { CanvasPho.style.transform = AnhBia.style.transform; }
    } else { DatAnhVeChoCu(); }
    CacCot.forEach(function(Cot, j) {
      var Muc = NhacDangCoTieng && CaiDat.waves ? LayTrungBinhTanSo([35, 180, 800, 3000][j], [180, 800, 3000, 12000][j]) * Am : 0;
      Cot.style.height = (4 + Math.min(12, Muc * 18)).toFixed(2) + 'px';
    });
    var Song = document.getElementById('track-page-waves');
    if (Song) { Song.classList.toggle('is-playing', TrongTrangBaiHat && CaiDat.waves && NhacDangCoTieng); }
    if (AnhSang) {
      AnhSang.style.opacity = TrongTrangBaiHat && CaiDat.waves ? (Math.min(1, MucAm * CaiDat.sensitivity / 100) * 0.025 + MucBass * 0.012).toFixed(3) : '0';
      AnhSang.style.transform = 'translate(' + (Math.sin(DongChay * 0.4) * MucAm * 18).toFixed(2) + 'px, ' + (Math.cos(DongChay * 0.3) * MucAm * 12).toFixed(2) + 'px)';
    }
    if (TrongTrangBaiHat) { VeSong(); VePho(); }
    KhungHinh = requestAnimationFrame(VeKhung);
  }

  function DongBo() {
    if (!ChoPhepVe()) { DungHieuUng(); return; }
    if (!document.body.classList.contains('in-track-page')) { DatAnhVeChoCu(); }
    if (!CaiDat.shake) { DatAnhVeChoCu(); }
    if (!KhungHinh) { KhungHinh = requestAnimationFrame(VeKhung); }
  }

  function KhoiTao(CacPhanTu) {
    if (DaKhoiTao) { return; }
    DaKhoiTao = true;
    CacAudio = CacPhanTu.filter(Boolean);
    Canvas = document.getElementById('track-page-wave-canvas');
    ButVe = Canvas ? Canvas.getContext('2d') : null;
    CanvasPho = document.getElementById('track-page-spectrum-canvas');
    ButVePho = CanvasPho ? CanvasPho.getContext('2d') : null;
    AnhSang = document.getElementById('track-page-lights');
    AnhBia = document.getElementById('track-page-artwork-wrap');
    CacCot = Array.from(document.querySelectorAll('#audio-visualizer .bar'));
    DocCaiDat();
    DoiDangSong(true);
    CapNhatCaiDat();
    CacAudio.forEach(function(Audio) {
      // The Rust stream server supplies CORS headers for both streams and cache.
      Audio.crossOrigin = 'anonymous';
      ['playing', 'canplay'].forEach(function(Ten) { Audio.addEventListener(Ten, function() { Audio._omniWaiting = false; DongBo(); }); });
      ['waiting', 'emptied', 'error'].forEach(function(Ten) { Audio.addEventListener(Ten, function() { Audio._omniWaiting = true; DongBo(); }); });
      Audio.addEventListener('play', function() { ChuanBiPhat(); DongBo(); });
      ['pause', 'ended', 'volumechange', 'seeked'].forEach(function(Ten) { Audio.addEventListener(Ten, DongBo); });
      Audio.addEventListener('seeking', DungHieuUng);
    });
    ['shake', 'waves'].forEach(function(Khoa) {
      var Nut = document.getElementById('music-effect-' + Khoa);
      if (Nut) { Nut.addEventListener('change', function() { CaiDat[Khoa] = Nut.checked; LuuCaiDat(); }); }
    });
    CaiDat.colors.forEach(function(Mau, i) {
      var Nut = document.getElementById('music-wave-color-' + (i + 1));
      if (Nut) { Nut.addEventListener('input', function() { CaiDat.colors[i] = Nut.value; LuuCaiDat(); }); }
    });
    CaiDat.waveColors.forEach(function(Mau, i) {
      var Nut = document.getElementById('music-neon-color-' + (i + 1));
      if (Nut) { Nut.addEventListener('input', function() { CaiDat.waveColors[i] = Nut.value; LuuCaiDat(); }); }
    });
    var DoNhay = document.getElementById('music-effect-sensitivity');
    if (DoNhay) { DoNhay.addEventListener('input', function() { CaiDat.sensitivity = Number(DoNhay.value); LuuCaiDat(); }); }
    var DatLai = document.getElementById('music-wave-colors-reset');
    if (DatLai) { DatLai.addEventListener('click', function() { CaiDat.colors = MacDinh.colors.slice(); LuuCaiDat(); }); }
    var DatLaiSong = document.getElementById('music-neon-colors-reset');
    if (DatLaiSong) { DatLaiSong.addEventListener('click', function() { CaiDat.waveColors = MauSongMacDinh.slice(); LuuCaiDat(); }); }
    document.addEventListener('visibilitychange', DongBo);
    window.addEventListener('resize', function() { DoiKichThuoc(); if (!KhungHinh) { VeSong(); VePho(); } });
    window.addEventListener('pagehide', DungHieuUng);
    window.addEventListener('pageshow', DongBo);
    if (GiamChuyenDong.addEventListener) { GiamChuyenDong.addEventListener('change', DongBo); }
    VeSong();
    VePho();
  }

  window.HieuUngAmThanh = {
    khoiTao: KhoiTao,
    chuanBiPhat: ChuanBiPhat,
    dongBo: DongBo,
    layTrangThai: function() {
      var Dinh = 0, ChiSoDinh = 0;
      if (BoPhanTich && TanSo) {
        BoPhanTich.getByteFrequencyData(TanSo);
        for (var i = 1; i < TanSo.length; i += 1) { if (TanSo[i] > Dinh) { Dinh = TanSo[i]; ChiSoDinh = i; } }
      }
      return { running: !!KhungHinh, rms: MucAm, bass: MucBass, wave: MucSong, sources: NguonAmThanh.size, context: NguCanh ? NguCanh.state : 'uninitialized', dominantHz: NguCanh && BoPhanTich ? ChiSoDinh * NguCanh.sampleRate / BoPhanTich.fftSize : 0 };
    }
  };
}());
