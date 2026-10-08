
var TrinhPhatAmThanhChinh = null;
var TrinhPhatAmThanhPhu = null;
var DanhSachBaiHatThuVien = [];
var DanhSachCho = [];
var DanhSachPhatNguoiDung = [];
var ViTriDangPhat = -1;
var BaiHatDangPhat = null;
var DangPhatNhac = false;
var DangTaiBaiHat = false;
var CheDoTronBai = false;
var CheDoLapLai = 'off';
var MucAmLuong = 0.8;
var AmLuongTruocKhiTatTieng = 0.8;
var CacYeuCauYeuThich = Object.create(null);
var CheDoHienThiHienTai = 'grid';
var GiaoDienHienTai = 'home';
var MaDanhSachPhatHienTai = null;
var MaYeuCauPhatHienTai = 0;
var DangKeoTienDo = false;
var DangChuyenNhac = false;
var BoDemLuuCauHinh = null;
var BoDemLuuTrangThai = null;
var ThoiGianDongBoDiscordCuoi = 0;
var DuLieuBaiHatDangSua = null;
var DuLieuDanhSachPhatDangSua = null;
var AnhBiaTuyChonBase64 = null;
var AnhBiaPlaylistTuyChonBase64 = null;
var BaiHatMenuTroi = null;
var PhanTuNeoMenuTroi = null;
var LaThuVienTrongMenuTroi = false;
var DanhSachPhatDuocChonTrongModal = [];
var BaiHatThemVaoPlaylistHienTai = null;
var DanhSachPhatDangDoiTen = null;
var DanhSachPhatDangXacNhanXoa = null;
var MocLapABMap = {};
var DangMoCuaSoMocAB = false;
var ThoiGianMocABMucTieu = 0;
var KetQuaTimKiem = [];
var BoLocHienTai = 'all';
var LichSuNgheTrangChu = [];
var TiepTucNgheTrangChu = [];
var BoHenGioThongBao = null;
var GiaoDienTruocKhiMoTrangChiTiet = 'home';
var PlaylistTruocKhiMoTrangChiTiet = null;
var ViTriCuonTruocKhiMoTrangChiTiet = 0;
var PhanTuTruocKhiXemAnh = null;

function HienThiThongBao(NoiDungThongBao, LoaiThongBao, ThoiGianHienThi) {
  var PhanTuThongBao = document.getElementById('toast-notification');
  if (!PhanTuThongBao) {
    return;
  }
  if (!LoaiThongBao) {
    LoaiThongBao = 'info';
  }
  if (!ThoiGianHienThi) {
    ThoiGianHienThi = 1800;
  }
  PhanTuThongBao.innerHTML = NoiDungThongBao;
  PhanTuThongBao.className = 'toast-notification show ' + LoaiThongBao;
  if (BoHenGioThongBao) {
    clearTimeout(BoHenGioThongBao);
  }
  BoHenGioThongBao = setTimeout(function() {
    PhanTuThongBao.className = 'toast-notification';
  }, ThoiGianHienThi);
}

function LuuCauHinhNguoiDung() {
  if (BoDemLuuCauHinh) {
    clearTimeout(BoDemLuuCauHinh);
  }
  BoDemLuuCauHinh = setTimeout(function() {
    var NutThanhBen = document.getElementById('app-sidebar');
    var NutHuyHieu = document.getElementById('badge-toggle-input');
    var NutChuyenBai = document.getElementById('crossfade-toggle-input');
    var NutThoiGianChuyen = document.getElementById('crossfade-duration-slider');
    var NutDuongCongA = document.getElementById('slider-curve-a');
    var NutDuongCongB = document.getElementById('slider-curve-b');

    var CauHinhLuu = {
      volume: MucAmLuong,
      repeatMode: CheDoLapLai,
      shuffle: CheDoTronBai,
      sidebarExpanded: false,
      showSourceBadges: true,
      crossfadeEnabled: false,
      crossfadeDuration: 4,
      crossfadeCurveA: 0.5,
      crossfadeCurveB: 0.5,
      layoutMode: CheDoHienThiHienTai
    };

    if (NutThanhBen && NutThanhBen.classList.contains('expanded')) {
      CauHinhLuu.sidebarExpanded = true;
    }
    if (NutHuyHieu) {
      CauHinhLuu.showSourceBadges = NutHuyHieu.checked;
    }
    if (NutChuyenBai) {
      CauHinhLuu.crossfadeEnabled = NutChuyenBai.checked;
    }
    if (NutThoiGianChuyen) {
      CauHinhLuu.crossfadeDuration = parseFloat(NutThoiGianChuyen.value);
    }
    if (NutDuongCongA) {
      CauHinhLuu.crossfadeCurveA = parseFloat(NutDuongCongA.value);
    }
    if (NutDuongCongB) {
      CauHinhLuu.crossfadeCurveB = parseFloat(NutDuongCongB.value);
    }

    GiaoDienUngDung.luuCauHinh(CauHinhLuu);
    try {
      localStorage.setItem('omni_config', JSON.stringify(CauHinhLuu));
    } catch (Loi) {}
  }, 600);
}

function LuuTrangThaiPhatNhac() {
  if (BoDemLuuTrangThai) {
    clearTimeout(BoDemLuuTrangThai);
  }
  BoDemLuuTrangThai = setTimeout(function() {
    var ThoiGianHienTai = 0;
    if (TrinhPhatAmThanhChinh && !isNaN(TrinhPhatAmThanhChinh.currentTime)) {
      ThoiGianHienTai = TrinhPhatAmThanhChinh.currentTime;
    }
    var TrangThai = {
      currentTrack: BaiHatDangPhat,
      queue: DanhSachCho,
      queueIndex: ViTriDangPhat,
      currentTime: ThoiGianHienTai,
      isPlaying: DangPhatNhac,
      currentPlaylistId: MaDanhSachPhatHienTai
    };
    GiaoDienUngDung.luuTrangThaiPhat(TrangThai);
    try {
      localStorage.setItem('omni_playback', JSON.stringify(TrangThai));
    } catch (Loi) {}
  }, 600);
}

function DatTrangThaiThuGonThanhBen(TrangThaiMoRong) {
  var ThanhBen = document.getElementById('app-sidebar');
  if (!ThanhBen) {
    return;
  }
  if (TrangThaiMoRong) {
    ThanhBen.classList.add('expanded');
  } else {
    ThanhBen.classList.remove('expanded');
  }
}

function ApDungThuGonNhomTren(TrangThaiThuGon) {
  var NhomTren = document.getElementById('sidebar-top-nav-group');
  var BieuTuongThuGon = document.getElementById('collapse-top-nav-icon');
  if (!NhomTren) {
    return;
  }
  if (TrangThaiThuGon) {
    NhomTren.classList.add('collapsed');
    if (BieuTuongThuGon) {
      BieuTuongThuGon.innerHTML = '<polyline points="6 9 12 15 18 9"/>';
    }
  } else {
    NhomTren.classList.remove('collapsed');
    if (BieuTuongThuGon) {
      BieuTuongThuGon.innerHTML = '<polyline points="18 15 12 9 6 15"/>';
    }
  }
  try {
    localStorage.setItem('omni_sidebar_topnav_collapsed', String(TrangThaiThuGon));
  } catch (Loi) {}
}

function ApDungMauChuDao(MaMauHex, TenMau) {
  if (typeof MaMauHex !== 'string' || !/^#[0-9a-f]{6}$/i.test(MaMauHex)) {
    MaMauHex = '#1db954';
  }
  MaMauHex = MaMauHex.toLowerCase();
  document.documentElement.style.setProperty('--accent', MaMauHex);
  var RGB = [1, 3, 5].map(function(ViTri) { return parseInt(MaMauHex.slice(ViTri, ViTri + 2), 16); });
  document.documentElement.style.setProperty('--accent-rgb', RGB.join(', '));
  var KenhTuyenTinh = RGB.map(function(Kenh) {
    var GiaTri = Kenh / 255;
    return GiaTri <= 0.04045 ? GiaTri / 12.92 : Math.pow((GiaTri + 0.055) / 1.055, 2.4);
  });
  var DoSang = KenhTuyenTinh[0] * 0.2126 + KenhTuyenTinh[1] * 0.7152 + KenhTuyenTinh[2] * 0.0722;
  var MauChu = (DoSang + 0.05) / 0.0556 > 1.05 / (DoSang + 0.05) ? '#111111' : '#ffffff';
  document.documentElement.style.setProperty('--accent-contrast', MauChu);
  var CacMauCoSan = document.querySelectorAll('.color-dot');
  var CoMauCoSan = false;
  CacMauCoSan.forEach(function(Nut) {
    var DangChon = Nut.getAttribute('data-color').toLowerCase() === MaMauHex;
    Nut.classList.toggle('active', DangChon);
    Nut.setAttribute('aria-pressed', String(DangChon));
    Nut.setAttribute('aria-label', Nut.getAttribute('data-name'));
    if (DangChon) { CoMauCoSan = true; }
  });
  var NutMauTuyChon = document.querySelector('.custom-color-picker-btn');
  if (NutMauTuyChon) { NutMauTuyChon.classList.toggle('active', !CoMauCoSan); }
  var MoTaMau = document.getElementById('accent-status-desc');
  if (MoTaMau) {
    var TenHienThi = TenMau;
    if (!TenHienThi) {
      var MauCoSan = document.querySelector('.color-dot[data-color="' + MaMauHex + '"]');
      if (MauCoSan) { TenHienThi = MauCoSan.getAttribute('data-name'); }
    }
    if (!TenHienThi) {
      TenHienThi = MaMauHex;
    }
    MoTaMau.textContent = TenHienThi;
  }
  var OChonMau = document.getElementById('accent-color-input');
  if (OChonMau) {
    OChonMau.value = MaMauHex;
  }
  var XemTruocMau = document.getElementById('custom-color-preview');
  if (XemTruocMau) {
    XemTruocMau.style.background = MaMauHex;
    XemTruocMau.style.color = MauChu;
  }
}

function ApDungGiaoDien(TenGiaoDien) {
  var MoTaGiaoDien = document.getElementById('theme-status-desc');
  var CongTacGiaoDien = document.getElementById('theme-toggle-input');
  if (TenGiaoDien === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (MoTaGiaoDien) {
      MoTaGiaoDien.textContent = 'Giao diện sáng';
    }
    if (CongTacGiaoDien) {
      CongTacGiaoDien.checked = true;
    }
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (MoTaGiaoDien) {
      MoTaGiaoDien.textContent = 'Giao diện tối';
    }
    if (CongTacGiaoDien) {
      CongTacGiaoDien.checked = false;
    }
  }
}

function ApDungHienThiNguon(TrangThaiHien) {
  var MoTaHuyHieu = document.getElementById('source-badge-status-desc');
  var CongTacHuyHieu = document.getElementById('badge-toggle-input');
  if (TrangThaiHien) {
    document.documentElement.classList.remove('hide-source-badges');
    if (MoTaHuyHieu) {
      MoTaHuyHieu.textContent = 'Hiện logo YouTube, Spotify, SoundCloud';
    }
    if (CongTacHuyHieu) {
      CongTacHuyHieu.checked = true;
    }
  } else {
    document.documentElement.classList.add('hide-source-badges');
    if (MoTaHuyHieu) {
      MoTaHuyHieu.textContent = 'Ẩn các thẻ nguồn trên ảnh bìa';
    }
    if (CongTacHuyHieu) {
      CongTacHuyHieu.checked = false;
    }
  }
}

function CapNhatBieuTuongPhongTo(TrangThaiPhongTo) {
  var BieuTuongMax = document.getElementById('max-icon');
  if (!BieuTuongMax) {
    return;
  }
  if (TrangThaiPhongTo) {
    BieuTuongMax.innerHTML = '<rect x="2" y="4" width="6" height="6" stroke="currentColor" stroke-width="1.5" fill="none"/><polygon points="4,4 4,2 10,2 10,8 8,8" stroke="currentColor" stroke-width="1.5" fill="none"/>';
  } else {
    BieuTuongMax.innerHTML = '<rect x="2" y="2" width="8" height="8" stroke="currentColor" stroke-width="1.5" fill="none"/>';
  }
}

function TinhToanAmLuongChuyenNhac(TiLe, LoaiChuyen, DoCong) {
  if (TiLe <= 0) {
    if (LoaiChuyen === 'out') {
      return 1;
    }
    return 0;
  }
  if (TiLe >= 1) {
    if (LoaiChuyen === 'out') {
      return 0;
    }
    return 1;
  }
  var HeSo = 1;
  if (DoCong > 0.5) {
    HeSo = 1 + (DoCong - 0.5) * 4;
  } else if (DoCong < 0.5) {
    HeSo = 0.2 + (DoCong / 0.5) * 0.8;
  }
  if (LoaiChuyen === 'out') {
    return Math.pow(1 - TiLe, HeSo);
  }
  return Math.pow(TiLe, HeSo);
}

function CapNhatBieuDoChuyenNhac() {
  var TheThoiGian = document.getElementById('crossfade-seconds-tag');
  var HienThiGiay = document.getElementById('crossfade-display-seconds');
  var ThanhKeoThoiGian = document.getElementById('crossfade-duration-slider');
  var SoGiay = 4;
  if (ThanhKeoThoiGian) {
    SoGiay = parseFloat(ThanhKeoThoiGian.value);
  }
  if (TheThoiGian) {
    TheThoiGian.textContent = String(SoGiay) + 's';
  }
  if (HienThiGiay) {
    HienThiGiay.textContent = String(SoGiay) + 's';
  }
  var NutTheHien = document.getElementById('resizer-time-text');
  if (NutTheHien) {
    NutTheHien.textContent = String(SoGiay) + 's';
  }
}

function ApDungCaiDatChuyenNhac() {
  var MoTa = document.getElementById('crossfade-status-desc');
  var CongTac = document.getElementById('crossfade-toggle-input');
  var KhungBieuDo = document.getElementById('crossfade-diagram-wrapper');
  var ThanhKeoThoiGian = document.getElementById('crossfade-duration-slider');
  var SoGiay = 4;
  if (ThanhKeoThoiGian) {
    SoGiay = parseFloat(ThanhKeoThoiGian.value);
  }
  if (CongTac && CongTac.checked) {
    if (MoTa) {
      MoTa.textContent = 'Bật chuyển bài mượt mà (' + String(SoGiay) + 's)';
    }
    if (KhungBieuDo) {
      KhungBieuDo.classList.add('active');
    }
  } else {
    if (MoTa) {
      MoTa.textContent = 'Tắt hiệu ứng chuyển bài (ngắt tiếng chuẩn)';
    }
    if (KhungBieuDo) {
      KhungBieuDo.classList.remove('active');
    }
  }
  CapNhatBieuDoChuyenNhac();
}

function LayKhoaBaiHat(BaiHat) {
  if (!BaiHat) {
    return '';
  }
  var MaNguon = BaiHat.source;
  if (!MaNguon) {
    MaNguon = 'youtube';
  }
  var MaBaiHat = BaiHat.id;
  if (!MaBaiHat) {
    MaBaiHat = BaiHat.title;
  }
  return String(MaNguon) + ':' + String(MaBaiHat);
}

function LayDoanLapHienTai() {
  if (!BaiHatDangPhat) {
    return null;
  }
  var Khoa = LayKhoaBaiHat(BaiHatDangPhat);
  if (MocLapABMap[Khoa]) {
    return MocLapABMap[Khoa];
  }
  return null;
}

function CapNhatGiaoDienDauMocAB() {
  var VungSang = document.getElementById('ab-segment-highlight');
  var DiemDau = document.getElementById('ab-marker-start');
  var DiemCuoi = document.getElementById('ab-marker-end');
  var DoanLap = LayDoanLapHienTai();
  var TongThoiGian = 0;
  if (TrinhPhatAmThanhChinh && TrinhPhatAmThanhChinh.duration && isFinite(TrinhPhatAmThanhChinh.duration)) {
    TongThoiGian = TrinhPhatAmThanhChinh.duration;
  } else if (BaiHatDangPhat && BaiHatDangPhat.duration) {
    TongThoiGian = BaiHatDangPhat.duration;
  }
  if (!DoanLap || TongThoiGian <= 0) {
    if (VungSang) {
      VungSang.style.display = 'none';
    }
    if (DiemDau) {
      DiemDau.style.display = 'none';
    }
    if (DiemCuoi) {
      DiemCuoi.style.display = 'none';
    }
    return;
  }
  if (DoanLap.start !== null && typeof DoanLap.start === 'number') {
    var PhanTramDau = (DoanLap.start / TongThoiGian) * 100;
    if (DiemDau) {
      DiemDau.style.display = 'block';
      DiemDau.style.left = String(PhanTramDau) + '%';
    }
    if (DoanLap.end !== null && typeof DoanLap.end === 'number' && DoanLap.end > DoanLap.start) {
      var PhanTramCuoi = (DoanLap.end / TongThoiGian) * 100;
      if (DiemCuoi) {
        DiemCuoi.style.display = 'block';
        DiemCuoi.style.left = String(PhanTramCuoi) + '%';
      }
      if (VungSang) {
        VungSang.style.display = 'block';
        VungSang.style.left = String(PhanTramDau) + '%';
        VungSang.style.width = String(PhanTramCuoi - PhanTramDau) + '%';
      }
    } else {
      if (DiemCuoi) {
        DiemCuoi.style.display = 'none';
      }
      if (VungSang) {
        VungSang.style.display = 'none';
      }
    }
  } else {
    if (VungSang) {
      VungSang.style.display = 'none';
    }
    if (DiemDau) {
      DiemDau.style.display = 'none';
    }
    if (DiemCuoi) {
      DiemCuoi.style.display = 'none';
    }
  }
}

function MoCuaSoMocLapAB(ToaDoX, ToaDoY, GiayMucTieu) {
  var CuaSo = document.getElementById('ab-loop-popup');
  var ONhapThoiGian = document.getElementById('ab-time-input');
  var ThongTin = document.getElementById('ab-popup-info');
  var NutThietLap = document.getElementById('btn-ab-set-point');
  var ChuThietLap = document.getElementById('ab-set-point-text');
  if (!CuaSo || !ONhapThoiGian) {
    return;
  }
  ThoiGianMocABMucTieu = GiayMucTieu;
  ONhapThoiGian.value = DinhDangThoiGian(GiayMucTieu, false);
  var DoanLap = LayDoanLapHienTai();
  if (ChuThietLap) {
    if (!DoanLap || DoanLap.start === null) {
      ChuThietLap.textContent = 'Đặt mốc A';
    } else if (DoanLap.end === null) {
      ChuThietLap.textContent = 'Đặt mốc B';
    } else {
      ChuThietLap.textContent = 'Đặt lại mốc A';
    }
  }
  if (ThongTin) {
    if (DoanLap && DoanLap.start !== null && DoanLap.end !== null) {
      ThongTin.textContent = 'Đang lặp: ' + DinhDangThoiGian(DoanLap.start, false) + ' - ' + DinhDangThoiGian(DoanLap.end, false);
    } else if (DoanLap && DoanLap.start !== null) {
      ThongTin.textContent = 'Đã đặt mốc A: ' + DinhDangThoiGian(DoanLap.start, false);
    } else {
      ThongTin.textContent = 'Chưa đặt mốc lặp';
    }
  }
  CuaSo.style.left = String(Math.max(10, Math.min(window.innerWidth - 240, ToaDoX - 100))) + 'px';
  CuaSo.style.top = String(Math.max(10, ToaDoY - 140)) + 'px';
  CuaSo.style.display = 'block';
  DangMoCuaSoMocAB = true;
}

function DongCuaSoMocLapAB() {
  var CuaSo = document.getElementById('ab-loop-popup');
  if (CuaSo) {
    CuaSo.style.display = 'none';
  }
  DangMoCuaSoMocAB = false;
}

function DocDuLieuThuVien() {
  return GiaoDienUngDung.layThuVien().then(function(DanhSach) {
    if (Array.isArray(DanhSach)) {
      DanhSachBaiHatThuVien = DanhSach;
    } else {
      DanhSachBaiHatThuVien = [];
    }
    CapNhatGiaoDienThuVien();
    DongBoTrangThaiYeuThich();
    if (window.GiaoDienMoi) { GiaoDienMoi.capNhatTrangChu(); GiaoDienMoi.capNhatTrangThai(); }
    if (window.KhamPhaNhac) { KhamPhaNhac.veYeuThich(); }
    if (window.GoiYAmNhac) { GoiYAmNhac.lamMoi(); }
    return DanhSachBaiHatThuVien;
  });
}

function CapNhatGiaoDienThuVien() {
  var HuyHieuSoLuong = document.getElementById('library-count-badge');
  var TongSoBaiHat = document.getElementById('library-total-tracks');
  var KhungChua = document.getElementById('library-container');
  var KhungTrong = document.getElementById('library-empty');
  if (HuyHieuSoLuong) {
    HuyHieuSoLuong.textContent = String(DanhSachBaiHatThuVien.length);
  }
  if (TongSoBaiHat) {
    TongSoBaiHat.textContent = String(DanhSachBaiHatThuVien.length) + ' bài hát đã lưu';
  }
  if (DanhSachBaiHatThuVien.length === 0) {
    if (KhungChua) {
      KhungChua.innerHTML = '';
    }
    if (KhungTrong) {
      KhungTrong.style.display = 'flex';
    }
  } else {
    if (KhungTrong) {
      KhungTrong.style.display = 'none';
    }
    if (KhungChua) {
      VeDanhSachBaiHat(DanhSachBaiHatThuVien, KhungChua, true);
    }
  }
}

function KiemTraBaiHatDaLuu(BaiHat) {
  if (!BaiHat) {
    return false;
  }
  for (var i = 0; i < DanhSachBaiHatThuVien.length; i = i + 1) {
    var Item = DanhSachBaiHatThuVien[i];
    if (Item.id === BaiHat.id && Item.source === BaiHat.source) {
      return true;
    }
  }
  return false;
}

function DaoTrangThaiYeuThich(BaiHat) {
  if (!BaiHat) {
    return Promise.resolve();
  }
  var Khoa = JSON.stringify([BaiHat.id, BaiHat.source]);
  if (CacYeuCauYeuThich[Khoa]) { return CacYeuCauYeuThich[Khoa]; }
  var DaLuu = KiemTraBaiHatDaLuu(BaiHat);
  var TacVu = DaLuu ? GiaoDienUngDung.xoaBaiHat(BaiHat.id, BaiHat.source) : GiaoDienUngDung.luuBaiHat(BaiHat);
  CacYeuCauYeuThich[Khoa] = TacVu.then(function() {
    return DocDuLieuThuVien();
  }).then(function() {
    HienThiThongBao((DaLuu ? BieuTuong.TimRong : BieuTuong.TimDac) +
      (DaLuu ? ' <span>Đã xóa khỏi thư viện</span>' : ' <span>Đã lưu vào thư viện</span>'), DaLuu ? 'info' : 'success', 1800);
    CapNhatTrangThaiPhatTheBaiHat();
    CapNhatThanhPhatNhacDuoiCung(BaiHatDangPhat);
    if (GiaoDienHienTai === 'track-detail') { CapNhatGiaoDienTrangChiTiet(BaiHatDangPhat); }
  }).catch(function(Loi) {
    HienThiThongBao(XoaKyTuHTML(DinhDangLoi(Loi)), 'error', 4000);
  }).finally(function() {
    delete CacYeuCauYeuThich[Khoa];
    DongBoTrangThaiYeuThich();
  });
  DongBoTrangThaiYeuThich();
  return CacYeuCauYeuThich[Khoa];
}

function DongBoTrangThaiYeuThich() {
  document.querySelectorAll('.track-card, .playlist-track-row').forEach(function(The) {
    var BaiHat = { id: The.getAttribute('data-id'), source: The.getAttribute('data-source') };
    var DaLuu = KiemTraBaiHatDaLuu(BaiHat);
    var DangLuu = !!CacYeuCauYeuThich[JSON.stringify([BaiHat.id, BaiHat.source])];
    var Nut = The.querySelector('.btn-toggle-fav, .btn-playlist-row-fav');
    if (!Nut) { return; }
    Nut.innerHTML = DaLuu ? BieuTuong.TimDac : BieuTuong.TimRong;
    Nut.classList.toggle('btn-saved', DaLuu);
    Nut.setAttribute('aria-pressed', String(DaLuu));
    Nut.setAttribute('aria-label', DaLuu ? 'Bỏ yêu thích' : 'Thêm vào yêu thích');
    Nut.title = DaLuu ? 'Bỏ yêu thích' : 'Thêm vào yêu thích';
    Nut.disabled = DangLuu;
    Nut.setAttribute('aria-busy', String(DangLuu));
  });
}

function ChuyenDoiGiaoDien(TenGiaoDienMucTieu, MaDanhSachPhat) {
  document.body.classList.toggle('in-track-page', TenGiaoDienMucTieu === 'track-detail');
  DongMenuTrangChiTiet();
  var CacNutMenu = document.querySelectorAll('.nav-item[data-view]');
  for (var i = 0; i < CacNutMenu.length; i = i + 1) {
    var Nut = CacNutMenu[i];
    var MenuMucTieu = TenGiaoDienMucTieu === 'artist' ? 'artists' : (TenGiaoDienMucTieu === 'genre-detail' ? 'genres' : TenGiaoDienMucTieu);
    if (Nut.getAttribute('data-view') === MenuMucTieu) {
      Nut.classList.add('active');
    } else {
      Nut.classList.remove('active');
    }
  }
  var CacPhanTuSidebarPlaylist = document.querySelectorAll('.sidebar-playlist-item');
  for (var j = 0; j < CacPhanTuSidebarPlaylist.length; j = j + 1) {
    var ItemPlaylist = CacPhanTuSidebarPlaylist[j];
    if (TenGiaoDienMucTieu === 'playlist' && ItemPlaylist.getAttribute('data-id') === MaDanhSachPhat) {
      ItemPlaylist.classList.add('active');
    } else {
      ItemPlaylist.classList.remove('active');
    }
  }
  var PhanThan = document.querySelector('.main-content');
  if (PhanThan) {
    PhanThan.setAttribute('data-active-view', TenGiaoDienMucTieu);
  }
  var CacKhungNhin = document.querySelectorAll('.view-panel');
  for (var k = 0; k < CacKhungNhin.length; k = k + 1) {
    var Khung = CacKhungNhin[k];
    Khung.classList.remove('active');
    Khung.style.display = 'none';
  }
  var KhungMucTieu = document.getElementById('view-' + TenGiaoDienMucTieu);
  if (KhungMucTieu) {
    KhungMucTieu.classList.add('active');
    KhungMucTieu.style.display = 'flex';
  }
  GiaoDienHienTai = TenGiaoDienMucTieu;
  MaDanhSachPhatHienTai = MaDanhSachPhat;
  CapNhatHieuUngSong();
  if (TenGiaoDienMucTieu === 'library') {
    CapNhatGiaoDienThuVien();
  } else if (TenGiaoDienMucTieu === 'playlist' && MaDanhSachPhat) {
    VeGiaoDienDanhSachPhat(MaDanhSachPhat);
  } else if (TenGiaoDienMucTieu === 'home') {
    VeToanBoTrangChu();
  }
  if (window.GiaoDienMoi) { GiaoDienMoi.doiGiaoDien(TenGiaoDienMucTieu); }
  if (window.KhamPhaNhac) { KhamPhaNhac.doiGiaoDien(TenGiaoDienMucTieu); }
  if (window.NhacOfflineVaTocDo) { NhacOfflineVaTocDo.doiGiaoDien(TenGiaoDienMucTieu); }
}

function MoTrangChiTietBaiHat(BaiHat, BoBoiCanh, ViTri) {
  BaiHat = BaiHat || BaiHatDangPhat;
  if (!BaiHat) { return; }
  if (window.KhamPhaNhac && KhamPhaNhac.laBaiNgoai(BaiHat)) { KhamPhaNhac.moBaiNgoai(BaiHat); return; }
  if (GiaoDienHienTai !== 'track-detail') {
    GiaoDienTruocKhiMoTrangChiTiet = GiaoDienHienTai;
    PlaylistTruocKhiMoTrangChiTiet = MaDanhSachPhatHienTai;
    var KhungTruoc = document.getElementById('view-' + GiaoDienHienTai);
    ViTriCuonTruocKhiMoTrangChiTiet = KhungTruoc ? KhungTruoc.scrollTop : 0;
  }
  DongMenuTuyChonThanhPhat();
  DongMenuTroiBaiHat();
  var HangCho = document.getElementById('queue-drawer');
  if (HangCho) { HangCho.classList.remove('open'); }
  ChuyenDoiGiaoDien('track-detail', MaDanhSachPhatHienTai);
  var LaBaiHienTai = BaiHatDangPhat && BaiHatDangPhat.id === BaiHat.id && BaiHatDangPhat.source === BaiHat.source;
  if (!LaBaiHienTai || (!DangTaiBaiHat && (!TrinhPhatAmThanhChinh || !TrinhPhatAmThanhChinh.getAttribute('src')))) {
    var DanhSach = BoBoiCanh && BoBoiCanh.length ? BoBoiCanh : [BaiHat];
    var ChiSo = typeof ViTri === 'number' && ViTri >= 0 && ViTri < DanhSach.length ? ViTri : DanhSach.indexOf(BaiHat);
    PhatBaiHat(BaiHat, DanhSach, Math.max(0, ChiSo), !!BaiHat.continueTime);
  }
  CapNhatGiaoDienTrangChiTiet(BaiHatDangPhat);
  var NutQuayLai = document.getElementById('btn-track-page-back');
  if (NutQuayLai) { NutQuayLai.focus({ preventScroll: true }); }
}

function DongTrangChiTietBaiHat() {
  DangKeoTienDo = false;
  ChuyenDoiGiaoDien(GiaoDienTruocKhiMoTrangChiTiet, PlaylistTruocKhiMoTrangChiTiet);
  var KhungTruoc = document.getElementById('view-' + GiaoDienTruocKhiMoTrangChiTiet);
  if (KhungTruoc) { KhungTruoc.scrollTop = ViTriCuonTruocKhiMoTrangChiTiet; }
}

function DongMenuTrangChiTiet() {
  var Menu = document.getElementById('track-page-menu');
  var Nut = document.getElementById('track-page-btn-more');
  if (Menu) { Menu.classList.add('hidden'); }
  if (Nut) { Nut.setAttribute('aria-expanded', 'false'); }
}

function CapNhatHieuUngSong() {
  if (window.HieuUngAmThanh) { HieuUngAmThanh.dongBo(); }
}

function LayThoiLuongDangPhat() {
  var ThoiLuong = !DangTaiBaiHat && TrinhPhatAmThanhChinh ? TrinhPhatAmThanhChinh.duration : 0;
  if (!Number.isFinite(ThoiLuong) || ThoiLuong <= 0) { ThoiLuong = Number(BaiHatDangPhat && BaiHatDangPhat.duration); }
  return Number.isFinite(ThoiLuong) && ThoiLuong > 0 ? ThoiLuong : 0;
}

function CapNhatThanhTienDo(ThoiGian) {
  var Tong = LayThoiLuongDangPhat();
  if (typeof ThoiGian !== 'number') {
    ThoiGian = !DangTaiBaiHat && TrinhPhatAmThanhChinh ? TrinhPhatAmThanhChinh.currentTime : 0;
  }
  ThoiGian = Number.isFinite(ThoiGian) ? Math.max(0, ThoiGian) : 0;
  if (Tong > 0) { ThoiGian = Math.min(ThoiGian, Tong); }
  var PhanTram = Tong > 0 ? (ThoiGian / Tong) * 100 : 0;
  ['', 'track-page-'].forEach(function(TienTo) {
    var HienTai = document.getElementById(TienTo + 'time-current');
    var TongThoiGian = document.getElementById(TienTo + 'time-total');
    var ThanhKeo = document.getElementById(TienTo + 'seek-slider');
    var VungDay = document.getElementById(TienTo + 'progress-fill');
    if (HienTai) { HienTai.textContent = DinhDangThoiGian(ThoiGian, false); }
    if (TongThoiGian) { TongThoiGian.textContent = DinhDangThoiGian(Tong, false); }
    if (ThanhKeo) {
      ThanhKeo.value = PhanTram;
      ThanhKeo.disabled = DangTaiBaiHat || Tong <= 0;
      ThanhKeo.setAttribute('aria-valuetext', DinhDangThoiGian(ThoiGian, false) + ' / ' + DinhDangThoiGian(Tong, false));
    }
    if (VungDay) { VungDay.style.width = PhanTram + '%'; }
  });
}

function CapNhatGiaoDienTrangChiTiet(BaiHat) {
  if (!BaiHat) {
    return;
  }
  var DuongDanAnh = GiaiQuyetDuongDanAnhBia(BaiHat, 600);
  var AnhBia = document.getElementById('track-page-cover');
  var AnhNen = document.getElementById('track-page-ambient');
  var KhungAnh = document.getElementById('track-page-artwork-wrap');
  if (AnhBia) {
    AnhBia.alt = 'Ảnh bìa ' + (BaiHat.title || 'bài hát');
    if ((AnhBia.getAttribute('src') || '') !== DuongDanAnh) {
      AnhBia.onerror = function() {
        AnhBia.style.display = 'none';
        if (AnhNen) { AnhNen.style.backgroundImage = 'none'; }
        if (KhungAnh) { KhungAnh.classList.add('no-artwork'); }
      };
      if (DuongDanAnh) { AnhBia.src = DuongDanAnh; } else { AnhBia.removeAttribute('src'); }
      AnhBia.style.display = DuongDanAnh ? 'block' : 'none';
      if (KhungAnh) { KhungAnh.classList.toggle('no-artwork', !DuongDanAnh); }
    }
  }
  if (AnhNen) {
    AnhNen.style.backgroundImage = DuongDanAnh && AnhBia && AnhBia.style.display !== 'none' ? 'url(' + JSON.stringify(DuongDanAnh) + ')' : 'none';
  }
  if (KhungAnh) { KhungAnh.classList.toggle('no-artwork', !DuongDanAnh || !AnhBia || AnhBia.style.display === 'none'); }
  var TieuDe = document.getElementById('track-page-title');
  var NgheSi = document.getElementById('track-page-artist');
  var HuyHieu = document.getElementById('track-page-badge');
  if (TieuDe) {
    TieuDe.textContent = BaiHat.title || 'Bài hát không tên';
    TieuDe.title = TieuDe.textContent;
  }
  if (NgheSi) {
    NgheSi.textContent = BaiHat.artist || 'Nghệ sĩ chưa xác định';
    NgheSi.title = NgheSi.textContent;
  }
  if (HuyHieu) {
    HuyHieu.textContent = BaiHat.source ? BaiHat.source.toUpperCase() : 'OMNI';
    HuyHieu.className = 'track-page-source-badge ' + BaiHat.source;
  }
  var NutYeuThich = document.getElementById('track-page-btn-fav');
  if (NutYeuThich) {
    var DaLuu = KiemTraBaiHatDaLuu(BaiHat);
    document.getElementById('track-page-fav-icon').innerHTML = DaLuu ? BieuTuong.TimDac : BieuTuong.TimRong;
    document.getElementById('track-page-fav-label').textContent = DaLuu ? 'Xóa khỏi thư viện' : 'Thêm vào thư viện';
    NutYeuThich.classList.toggle('active', DaLuu);
  }
  var NutPhat = document.getElementById('track-page-play-icon');
  if (NutPhat) {
    NutPhat.innerHTML = DangTaiBaiHat ? BieuTuong.DangTai : (DangPhatNhac ? BieuTuong.TamDung : BieuTuong.Phat);
  }
  var NutPhatNhac = document.getElementById('track-page-btn-play-pause');
  if (NutPhatNhac) {
    NutPhatNhac.disabled = DangTaiBaiHat;
    NutPhatNhac.setAttribute('aria-busy', String(DangTaiBaiHat));
    NutPhatNhac.setAttribute('aria-label', DangTaiBaiHat ? 'Đang tải bài hát' : (DangPhatNhac ? 'Tạm dừng' : 'Phát'));
  }
  var NutTron = document.getElementById('track-page-btn-shuffle');
  if (NutTron) {
    NutTron.classList.toggle('active', CheDoTronBai);
    NutTron.setAttribute('aria-pressed', String(CheDoTronBai));
  }
  var NutLap = document.getElementById('track-page-btn-repeat');
  if (NutLap) {
    NutLap.innerHTML = CheDoLapLai === 'one' ? BieuTuong.LapMotBai : BieuTuong.LapTatCa;
    NutLap.classList.toggle('active', CheDoLapLai !== 'off');
    NutLap.setAttribute('aria-label', CheDoLapLai === 'one' ? 'Lặp một bài' : (CheDoLapLai === 'all' ? 'Lặp danh sách' : 'Bật lặp lại'));
    NutLap.setAttribute('aria-pressed', String(CheDoLapLai !== 'off'));
  }
  CapNhatBieuTuongAmLuong(MucAmLuong);
  if (!DangKeoTienDo) { CapNhatThanhTienDo(); }
}

function ApDungBoLocTimKiem() {
  if (window.KhamPhaNhac) { KhamPhaNhac.veKetQua(); return; }
  if (!KetQuaTimKiem || KetQuaTimKiem.length === 0) {
    return;
  }
  var DanhSachLoc = [];
  if (BoLocHienTai === 'all') {
    DanhSachLoc = KetQuaTimKiem;
  } else {
    for (var i = 0; i < KetQuaTimKiem.length; i = i + 1) {
      if (KetQuaTimKiem[i].source === BoLocHienTai) {
        DanhSachLoc.push(KetQuaTimKiem[i]);
      }
    }
  }
  var SoLuongKetQua = document.getElementById('results-count');
  var KhungChua = document.getElementById('tracks-container');
  if (SoLuongKetQua) {
    SoLuongKetQua.textContent = String(DanhSachLoc.length) + ' kết quả';
  }
  if (KhungChua) {
    VeDanhSachBaiHat(DanhSachLoc, KhungChua, false);
  }
}

function DatCheDoHienThi(CheDo) {
  CheDoHienThiHienTai = CheDo;
  var LaThuGon = false;
  if (CheDo === 'compact') {
    LaThuGon = true;
  }
  var KhungTimKiem = document.getElementById('tracks-container');
  var KhungThuVien = document.getElementById('library-container');
  var KhungTrangChu = document.getElementById('view-home');
  if (KhungTimKiem) {
    if (LaThuGon) {
      KhungTimKiem.classList.add('compact-mode');
    } else {
      KhungTimKiem.classList.remove('compact-mode');
    }
  }
  if (KhungThuVien) {
    if (LaThuGon) {
      KhungThuVien.classList.add('compact-mode');
    } else {
      KhungThuVien.classList.remove('compact-mode');
    }
  }
  if (KhungTrangChu) {
    if (LaThuGon) {
      KhungTrangChu.classList.add('compact-mode');
    } else {
      KhungTrangChu.classList.remove('compact-mode');
    }
  }
  var CacHangCuon = document.querySelectorAll('.home-carousel-track');
  for (var i = 0; i < CacHangCuon.length; i = i + 1) {
    if (LaThuGon) {
      CacHangCuon[i].classList.add('compact-mode');
    } else {
      CacHangCuon[i].classList.remove('compact-mode');
    }
  }
  var NutCompact = document.getElementById('btn-layout-compact');
  var NutGrid = document.getElementById('btn-layout-grid');
  var NutLibCompact = document.getElementById('btn-library-layout-compact');
  var NutLibGrid = document.getElementById('btn-library-layout-grid');
  var NutHomeCompact = document.getElementById('btn-home-layout-compact');
  var NutHomeGrid = document.getElementById('btn-home-layout-grid');

  if (NutCompact) {
    if (LaThuGon) { NutCompact.classList.add('active'); } else { NutCompact.classList.remove('active'); }
  }
  if (NutGrid) {
    if (!LaThuGon) { NutGrid.classList.add('active'); } else { NutGrid.classList.remove('active'); }
  }
  if (NutLibCompact) {
    if (LaThuGon) { NutLibCompact.classList.add('active'); } else { NutLibCompact.classList.remove('active'); }
  }
  if (NutLibGrid) {
    if (!LaThuGon) { NutLibGrid.classList.add('active'); } else { NutLibGrid.classList.remove('active'); }
  }
  if (NutHomeCompact) {
    if (LaThuGon) { NutHomeCompact.classList.add('active'); } else { NutHomeCompact.classList.remove('active'); }
  }
  if (NutHomeGrid) {
    if (!LaThuGon) { NutHomeGrid.classList.add('active'); } else { NutHomeGrid.classList.remove('active'); }
  }
  LuuCauHinhNguoiDung();
}

function ThucHienTimKiem(TuKhoa) {
  if (window.KhamPhaNhac) { return KhamPhaNhac.timKiem(TuKhoa); }
  if (!TuKhoa || typeof TuKhoa !== 'string') {
    return;
  }
  var TuKhoaChuan = TuKhoa.trim();
  if (TuKhoaChuan.length === 0) {
    return;
  }
  ChuyenDoiGiaoDien('explore', null);
  var KhungRong = document.getElementById('empty-state');
  var KhungChua = document.getElementById('tracks-container');
  var VongXoay = document.getElementById('search-loader');
  var ThongTinKetQua = document.getElementById('results-meta');
  var TieuDeKhamPha = document.getElementById('explore-title');
  if (KhungRong) {
    KhungRong.style.display = 'none';
  }
  if (KhungChua) {
    KhungChua.innerHTML = '';
  }
  if (VongXoay) {
    VongXoay.style.display = 'flex';
  }
  if (ThongTinKetQua) {
    ThongTinKetQua.style.display = 'none';
  }
  if (TieuDeKhamPha) {
    TieuDeKhamPha.textContent = 'Kết quả: "' + TuKhoaChuan + '"';
  }

  var LoiHuaTimKiem = null;
  if (BoLocHienTai === 'all') {
    LoiHuaTimKiem = GiaoDienUngDung.timKiemTatCa(TuKhoaChuan);
  } else {
    LoiHuaTimKiem = GiaoDienUngDung.timKiemTheoNguon(BoLocHienTai, TuKhoaChuan);
  }

  LoiHuaTimKiem.then(function(DanhSachKetQua) {
    if (VongXoay) {
      VongXoay.style.display = 'none';
    }
    if (ThongTinKetQua) {
      ThongTinKetQua.style.display = 'block';
    }
    if (Array.isArray(DanhSachKetQua)) {
      KetQuaTimKiem = DanhSachKetQua;
    } else {
      KetQuaTimKiem = [];
    }
    ApDungBoLocTimKiem();
  }).catch(function(Loi) {
    if (VongXoay) {
      VongXoay.style.display = 'none';
    }
    if (KhungChua) {
      KhungChua.innerHTML = '<div class="empty-placeholder" style="grid-column:1/-1"><p style="color:#ef4444">Lỗi: ' + XoaKyTuHTML(DinhDangLoi(Loi)) + '</p></div>';
    }
  });
}

function TaoTheBaiHatHTML(BaiHat, LaThuVien) {
  var DuongDanAnh = GiaiQuyetDuongDanAnhBia(BaiHat, 300);
  var DaLuu = KiemTraBaiHatDaLuu(BaiHat);
  var LaBaiHienTai = false;
  if (BaiHatDangPhat && BaiHat && BaiHatDangPhat.id === BaiHat.id && BaiHatDangPhat.source === BaiHat.source) {
    LaBaiHienTai = true;
  }
  var BieuTuongNutPhat = BieuTuong.Phat;
  if (LaBaiHienTai && DangPhatNhac) {
    BieuTuongNutPhat = BieuTuong.TamDung;
  }
  var BieuTuongYeuThich = BieuTuong.TimRong;
  if (DaLuu) {
    BieuTuongYeuThich = BieuTuong.TimDac;
  }
  var NutXoaHTML = '';
  if (LaThuVien) {
    NutXoaHTML = '<button class="card-action-btn btn-delete-track" title="Xóa">' + BieuTuong.ThungRac + '</button>';
  }
  var ThoiLuongDinhDang = DinhDangThoiLuongBaiHat(BaiHat);

  var LopDangPhat = '';
  if (LaBaiHienTai) {
    LopDangPhat = ' playing-now';
  }

  var HTML = '<div class="track-card' + LopDangPhat + '" draggable="true" data-id="' + XoaKyTuHTML(BaiHat.id) + '" data-source="' + XoaKyTuHTML(BaiHat.source) + '">';
  HTML += '<div class="card-cover-container">';
  HTML += '<div class="card-cover-placeholder">' + BieuTuong.NotNhac + '</div>';
  if (DuongDanAnh) {
    HTML += '<img src="' + DuongDanAnh + '" alt="" class="card-cover-img" onerror="this.style.display=\'none\'">';
  }
  var NhanNguon = window.KhamPhaNhac ? KhamPhaNhac.nhanNguon(BaiHat) : BaiHat.source;
  HTML += '<div class="card-badge ' + BaiHat.source + '"><span class="badge-full">' + XoaKyTuHTML(NhanNguon) + '</span><span class="badge-short">' + XoaKyTuHTML(NhanNguon.slice(0, 2).toUpperCase()) + '</span></div>';
  HTML += '<div class="card-duration">' + ThoiLuongDinhDang + '</div>';
  HTML += '<div class="card-play-overlay"><button type="button" class="overlay-play-btn" aria-label="Phát ' + XoaKyTuHTML(BaiHat.title) + '">' + BieuTuongNutPhat + '</button></div>';
  HTML += '</div>';
  HTML += '<div class="card-body">';
  HTML += '<div class="card-title"><span class="title-text">' + XoaKyTuHTML(BaiHat.title) + '</span></div>';
  HTML += '<button type="button" class="card-artist btn-open-card-artist" title="Mở hồ sơ nghệ sĩ"><span class="artist-text">' + XoaKyTuHTML(BaiHat.artist) + '</span></button>';
  var PhanLoai = GoiYAmNhac.core.classify(BaiHat);
  if (PhanLoai.ids.length) {
    HTML += '<div class="track-genre-labels">' + PhanLoai.ids.slice(0, 2).map(function(Id) { var TheLoai = GoiYAmNhac.core.styles.find(function(T) { return T.id === Id; }); return '<span title="' + (PhanLoai.kinds[Id] === 'metadata' ? 'Nhãn thể loại từ dữ liệu bài hát' : 'Nhận diện từ tên bài / album') + '">' + XoaKyTuHTML(TheLoai.name) + '</span>'; }).join('') + '</div>';
  }
  if (window.KhamPhaNhac && KhamPhaNhac.laBaiNgoai(BaiHat)) { HTML += '<div class="catalog-play-label">Mở trên ' + XoaKyTuHTML(NhanNguon) + ' ↗</div>'; }
  if (BaiHat.recommendationReason) {
    HTML += '<div class="recommendation-reason-row"><span class="recommendation-reason">' + (BaiHat.recommendationNew ? '<span class="recommendation-new-label">Mới</span>' : '') + XoaKyTuHTML(BaiHat.recommendationReason) + '</span><button type="button" class="btn-hide-recommendation" aria-label="Không hợp gu, ẩn bài này" title="Không hợp gu">×</button></div>';
  }
  HTML += '</div>';
  HTML += '<div class="card-compact-duration">' + ThoiLuongDinhDang + '</div>';
  HTML += '<div class="card-actions-row">';
  HTML += '<button class="card-action-btn btn-toggle-fav' + (DaLuu ? ' btn-saved' : '') + '" aria-pressed="' + DaLuu + '" aria-label="' + (DaLuu ? 'Bỏ yêu thích' : 'Thêm vào yêu thích') + '">' + BieuTuongYeuThich + '</button>';
  if (!window.KhamPhaNhac || !KhamPhaNhac.laBaiNgoai(BaiHat)) { HTML += '<button class="card-action-btn btn-edit-track">' + BieuTuong.ChinhSua + '</button>'; }
  HTML += NutXoaHTML;
  HTML += '<button class="card-action-btn btn-card-menu">' + BieuTuong.BaCham + '</button>';
  HTML += '</div>';
  HTML += '</div>';
  return HTML;
}

function GanSuKienTheBaiHat(ThePhanTu, BaiHat, DanhSach, ViTri, LaThuVien) {
  var NutPhat = ThePhanTu.querySelector('.overlay-play-btn');
  if (NutPhat) {
    NutPhat.addEventListener('click', function(SuKien) {
      SuKien.preventDefault(); SuKien.stopPropagation();
      if (BaiHatDangPhat && BaiHatDangPhat.id === BaiHat.id && BaiHatDangPhat.source === BaiHat.source) {
        TiepTucHoacPhatBaiHat(BaiHat, DanhSach, ViTri, !!BaiHat.continueTime);
      } else {
        MoTrangChiTietBaiHat(BaiHat, DanhSach, ViTri);
      }
    });
  }
  ThePhanTu.addEventListener('dragstart', function(SuKien) {
    if (SuKien.target.closest('button')) { SuKien.preventDefault(); }
  });
  var NutNgheSi = ThePhanTu.querySelector('.btn-open-card-artist');
  if (NutNgheSi) { NutNgheSi.addEventListener('click', function(SuKien) { SuKien.stopPropagation(); KhamPhaNhac.moNgheSiTuBai(BaiHat); }); }
  ThePhanTu.tabIndex = 0;
  ThePhanTu.setAttribute('aria-label', 'Mở bài hát ' + BaiHat.title);
  ThePhanTu.addEventListener('keydown', function(SuKien) {
    if (SuKien.target === ThePhanTu && (SuKien.key === 'Enter' || SuKien.key === ' ')) {
      SuKien.preventDefault();
      MoTrangChiTietBaiHat(BaiHat, DanhSach, ViTri);
    }
  });
  ThePhanTu.addEventListener('click', function(SuKien) {
    if (SuKien.target.closest('.card-actions-row') || SuKien.target.closest('.card-title')) {
      return;
    }
    MoTrangChiTietBaiHat(BaiHat, DanhSach, ViTri);
  });

  var TieuDePhanTu = ThePhanTu.querySelector('.card-title');
  if (TieuDePhanTu) {
    TieuDePhanTu.addEventListener('click', function(SuKien) {
      SuKien.stopPropagation();
      MoTrangChiTietBaiHat(BaiHat, DanhSach, ViTri);
    });
  }

  var NutYeuThich = ThePhanTu.querySelector('.btn-toggle-fav');
  if (NutYeuThich) {
    NutYeuThich.addEventListener('click', function(SuKien) {
      SuKien.stopPropagation();
      DaoTrangThaiYeuThich(BaiHat);
    });
  }

  var NutAnGoiY = ThePhanTu.querySelector('.btn-hide-recommendation');
  if (NutAnGoiY) {
    NutAnGoiY.addEventListener('click', function(SuKien) {
      SuKien.stopPropagation(); NutAnGoiY.disabled = true;
      GoiYAmNhac.anBai(BaiHat).then(function() {
        GoiYHienTai = null; return TaiGoiYCaNhan(true);
      }).catch(function(Loi) { NutAnGoiY.disabled = false; HienThiThongBao(XoaKyTuHTML(DinhDangLoi(Loi)), 'error', 3000); });
    });
  }
  var NutSua = ThePhanTu.querySelector('.btn-edit-track');
  if (NutSua) {
    NutSua.addEventListener('click', function(SuKien) {
      SuKien.stopPropagation();
      MoCuaSoChinhSuaBaiHat(BaiHat);
    });
  }

  var NutXoa = ThePhanTu.querySelector('.btn-delete-track');
  if (NutXoa && LaThuVien) {
    NutXoa.addEventListener('click', function(SuKien) {
      SuKien.stopPropagation();
      GiaoDienUngDung.xoaBaiHat(BaiHat.id, BaiHat.source).then(function() {
        HienThiThongBao(BieuTuong.ThungRac + ' <span>Đã xóa khỏi thư viện</span>', 'info', 1800);
        DocDuLieuThuVien();
      });
    });
  }

  var NutMenu = ThePhanTu.querySelector('.btn-card-menu');
  if (NutMenu) {
    NutMenu.addEventListener('click', function(SuKien) {
      SuKien.stopPropagation();
      MoMenuTroiBaiHat(BaiHat, NutMenu, LaThuVien);
    });
  }

  ThePhanTu.addEventListener('dragstart', function(SuKien) {
    try {
      SuKien.dataTransfer.setData('text/plain', JSON.stringify(BaiHat));
      SuKien.dataTransfer.effectAllowed = 'copy';
    } catch (Loi) {}
  });
}

function VeDanhSachBaiHat(DanhSach, KhungChua, LaThuVien) {
  if (!KhungChua) {
    return;
  }
  KhungChua.innerHTML = '';
  if (!DanhSach || DanhSach.length === 0) {
    KhungChua.innerHTML = '<div class="empty-placeholder" style="grid-column:1/-1"><p>Không có bài hát nào.</p></div>';
    return;
  }
  for (var i = 0; i < DanhSach.length; i = i + 1) {
    var BaiHat = DanhSach[i];
    var TheTam = document.createElement('div');
    TheTam.innerHTML = TaoTheBaiHatHTML(BaiHat, LaThuVien);
    var TheBaiHat = TheTam.firstElementChild;
    GanSuKienTheBaiHat(TheBaiHat, BaiHat, DanhSach, i, LaThuVien);
    KhungChua.appendChild(TheBaiHat);
  }
}

function VeTheGiaLap(KhungChua, SoLuong) {
  if (!KhungChua) {
    return;
  }
  KhungChua.innerHTML = '';
  for (var i = 0; i < SoLuong; i = i + 1) {
    var TheGiaLap = document.createElement('div');
    TheGiaLap.className = 'skeleton-card';
    TheGiaLap.innerHTML = '<div class="skeleton-cover"></div><div class="skeleton-line skeleton-title"></div><div class="skeleton-line skeleton-artist"></div>';
    KhungChua.appendChild(TheGiaLap);
  }
}

function VeTheBaiHatTrangChu(DanhSach, KhungChua, TuyChon) {
  if (!KhungChua) {
    return;
  }
  KhungChua.innerHTML = '';
  if (!DanhSach || DanhSach.length === 0) {
    KhungChua.innerHTML = '<div class="empty-placeholder"><p>Không có bài hát nào.</p></div>';
    return;
  }
  for (var i = 0; i < DanhSach.length; i = i + 1) {
    var BaiHat = DanhSach[i];
    var TheTam = document.createElement('div');
    TheTam.innerHTML = TaoTheBaiHatHTML(BaiHat, false);
    var TheBaiHat = TheTam.firstElementChild;
    GanSuKienTheBaiHat(TheBaiHat, BaiHat, DanhSach, i, false);

    if (TuyChon && TuyChon.isContinue) {
      var KhungTienDo = document.createElement('div');
      KhungTienDo.className = 'continue-progress-wrap';
      var ThanhPhanTram = 0;
      if (BaiHat.continueDuration && BaiHat.continueDuration > 0 && BaiHat.continueTime) {
        ThanhPhanTram = Math.min(100, Math.max(0, (BaiHat.continueTime / BaiHat.continueDuration) * 100));
      }
      KhungTienDo.innerHTML = '<div class="continue-progress-fill" style="width:' + String(ThanhPhanTram) + '%"></div>';
      TheBaiHat.appendChild(KhungTienDo);

      var NutHuy = document.createElement('button');
      NutHuy.className = 'continue-dismiss-btn';
      NutHuy.innerHTML = '&times;';
      NutHuy.addEventListener('click', (function(ItemBaiHat) {
        return function(e) {
          e.stopPropagation();
          XoaKhoiTiepTucNghe(ItemBaiHat);
        };
      })(BaiHat));
      TheBaiHat.appendChild(NutHuy);
    }
    KhungChua.appendChild(TheBaiHat);
  }
}

function VePhanTiepTucNghe() {
  var PhanChua = document.getElementById('home-section-continue');
  var KhungChua = document.getElementById('home-continue-grid');
  if (!PhanChua || !KhungChua) {
    return;
  }
  if (!TiepTucNgheTrangChu || TiepTucNgheTrangChu.length === 0) {
    PhanChua.style.display = 'none';
    KhungChua.innerHTML = '';
    return;
  }
  PhanChua.style.display = 'block';
  VeTheBaiHatTrangChu(TiepTucNgheTrangChu, KhungChua, { isContinue: true });
}

function VePhanLichSuNghe() {
  var PhanChua = document.getElementById('home-section-history');
  var KhungChua = document.getElementById('home-history-grid');
  if (!PhanChua || !KhungChua) {
    return;
  }
  if (!LichSuNgheTrangChu || LichSuNgheTrangChu.length === 0) {
    PhanChua.style.display = 'none';
    KhungChua.innerHTML = '';
    return;
  }
  PhanChua.style.display = 'block';
  VeTheBaiHatTrangChu(LichSuNgheTrangChu, KhungChua, { isContinue: false });
}

function XoaKhoiTiepTucNghe(BaiHat) {
  var DanhSachMoi = [];
  for (var i = 0; i < TiepTucNgheTrangChu.length; i = i + 1) {
    var Item = TiepTucNgheTrangChu[i];
    if (Item.id !== BaiHat.id || Item.source !== BaiHat.source) {
      DanhSachMoi.push(Item);
    }
  }
  TiepTucNgheTrangChu = DanhSachMoi;
  try {
    localStorage.setItem('omni_home_continue', JSON.stringify(TiepTucNgheTrangChu));
  } catch (Loi) {}
  VePhanTiepTucNghe();
}

function ThemVaoLichSuNghe(BaiHat) {
  if (!BaiHat) {
    return;
  }
  var DanhSachLoc = [BaiHat];
  for (var i = 0; i < LichSuNgheTrangChu.length; i = i + 1) {
    var Item = LichSuNgheTrangChu[i];
    if (Item.id !== BaiHat.id || Item.source !== BaiHat.source) {
      DanhSachLoc.push(Item);
    }
    if (DanhSachLoc.length >= 20) {
      break;
    }
  }
  LichSuNgheTrangChu = DanhSachLoc;
  try {
    localStorage.setItem('omni_home_history', JSON.stringify(LichSuNgheTrangChu));
  } catch (Loi) {}
  VePhanLichSuNghe();
}

function CapNhatTienDoTiepTucNghe(BaiHat, ThoiGianHienTai, TongThoiGian) {
  if (!BaiHat || !TongThoiGian || TongThoiGian <= 0 || !ThoiGianHienTai || ThoiGianHienTai < 5) {
    return;
  }
  var BanSao = Object.assign({}, BaiHat);
  BanSao.continueTime = ThoiGianHienTai;
  BanSao.continueDuration = TongThoiGian;
  var DanhSachMoi = [BanSao];
  for (var i = 0; i < TiepTucNgheTrangChu.length; i = i + 1) {
    var Item = TiepTucNgheTrangChu[i];
    if (Item.id !== BaiHat.id || Item.source !== BaiHat.source) {
      DanhSachMoi.push(Item);
    }
    if (DanhSachMoi.length >= 10) {
      break;
    }
  }
  TiepTucNgheTrangChu = DanhSachMoi;
  try {
    localStorage.setItem('omni_home_continue', JSON.stringify(TiepTucNgheTrangChu));
  } catch (Loi) {}
  VePhanTiepTucNghe();
}

var DanhSachThinhHanh = [];
var DanhSachChoBan = [];
var DanhSachKhamPha = [];

function TaiDanhSachThinhHanh(BatBuocTaiLai) {
  var KhungChua = document.getElementById('home-hot-grid');
  if (!BatBuocTaiLai && DanhSachThinhHanh && DanhSachThinhHanh.length > 0) {
    VeTheBaiHatTrangChu(DanhSachThinhHanh, KhungChua, { isContinue: false });
    return Promise.resolve(DanhSachThinhHanh);
  }
  VeTheGiaLap(KhungChua, 6);
  return GiaoDienUngDung.timKiemTatCa('nhac tre remix thinh hanh tiktok').then(function(KetQua) {
    if (Array.isArray(KetQua)) {
      DanhSachThinhHanh = KetQua.slice(0, 15);
    } else {
      DanhSachThinhHanh = [];
    }
    VeTheBaiHatTrangChu(DanhSachThinhHanh, KhungChua, { isContinue: false });
    return DanhSachThinhHanh;
  }).catch(function() {
    if (KhungChua) {
      KhungChua.innerHTML = '<div class="empty-placeholder"><p>Chưa tải được danh sách</p></div>';
    }
  });
}

var LuotVeGoiY = 0;
var TyLeKhamPhaDaLuu = 30;
var GoiYHienTai = null;
var LoiHuaGoiYHienTai = null;
var SoThichNhacDaLuu = { favoriteArtists: [], favoriteGenres: [] };
var SoThichNhacDangChon = { favoriteArtists: [], favoriteGenres: [] };
var DangLuuSoThichNhac = false;

function KhoiPhucSoThichNhac(CauHinh, GiuBanNhap) {
  var Cu = SoThichNhacDaLuu, BanNhap = SoThichNhacDangChon;
  SoThichNhacDaLuu = GoiYAmNhac.core.preferences(CauHinh);
  if (GiuBanNhap) {
    function TronBanNhap(Ten, TaoKhoa) {
      var CacKhoaMoi = new Set(SoThichNhacDaLuu[Ten].map(TaoKhoa));
      var BoDi = new Set(Cu[Ten].filter(function(X) { return !CacKhoaMoi.has(TaoKhoa(X)); }).map(TaoKhoa));
      var CacKhoaCu = new Set(Cu[Ten].map(TaoKhoa));
      var DanhSach = BanNhap[Ten].filter(function(X) { return !BoDi.has(TaoKhoa(X)); });
      SoThichNhacDaLuu[Ten].forEach(function(X) { if (!CacKhoaCu.has(TaoKhoa(X)) && !DanhSach.some(function(Y) { return TaoKhoa(Y) === TaoKhoa(X); })) { DanhSach.push(X); } });
      return DanhSach;
    }
    SoThichNhacDangChon = GoiYAmNhac.core.preferences({ favoriteArtists: TronBanNhap('favoriteArtists', function(N) { return GoiYAmNhac.core.artistKey({ artist: N }); }), favoriteGenres: TronBanNhap('favoriteGenres', function(N) { return N; }) });
  } else { SoThichNhacDangChon = { favoriteArtists: SoThichNhacDaLuu.favoriteArtists.slice(), favoriteGenres: SoThichNhacDaLuu.favoriteGenres.slice() }; }
  GoiYAmNhac.capNhatSoThich(SoThichNhacDaLuu.favoriteArtists, SoThichNhacDaLuu.favoriteGenres);
  if (window.KhamPhaNhac) { KhamPhaNhac.khoiPhuc(CauHinh); }
  VeSoThichNhac();
}

function CapNhatNutLuuSoThichNhac() {
  var Nhap = document.getElementById('favorite-artist-input');
  var DaDoi = JSON.stringify(GoiYAmNhac.core.preferences(SoThichNhacDangChon)) !== JSON.stringify(SoThichNhacDaLuu) || !!Nhap.value.trim();
  document.getElementById('btn-save-music-preferences').disabled = DangLuuSoThichNhac || (window.KhamPhaNhac && KhamPhaNhac.dangLuuTim()) || !DaDoi;
}

function VeSoThichNhac() {
  var KhungNgheSi = document.getElementById('favorite-artists-list'), KhungTheLoai = document.getElementById('favorite-genres-list');
  KhungNgheSi.innerHTML = ''; KhungTheLoai.innerHTML = '';
  if (!SoThichNhacDangChon.favoriteArtists.length) { var Trong = document.createElement('span'); Trong.className = 'setting-subtitle'; Trong.textContent = 'Chưa chọn nghệ sĩ. Bạn có thể bổ sung bất cứ lúc nào.'; KhungNgheSi.appendChild(Trong); }
  SoThichNhacDangChon.favoriteArtists.forEach(function(Ten) {
    var Nut = document.createElement('button'); Nut.type = 'button'; Nut.className = 'favorite-artist-chip';
    Nut.textContent = Ten + ' ×'; Nut.title = 'Bỏ ' + Ten; Nut.setAttribute('aria-label', 'Bỏ ' + Ten + ' khỏi nghệ sĩ ưa thích'); Nut.disabled = DangLuuSoThichNhac;
    Nut.addEventListener('click', function() { SoThichNhacDangChon.favoriteArtists = SoThichNhacDangChon.favoriteArtists.filter(function(NgheSi) { return NgheSi !== Ten; }); VeSoThichNhac(); document.getElementById('music-preferences-status').textContent = 'Bấm Lưu gu nhạc để áp dụng.'; });
    KhungNgheSi.appendChild(Nut);
  });
  GoiYAmNhac.core.styles.forEach(function(TheLoai) {
    var DaChon = SoThichNhacDangChon.favoriteGenres.indexOf(TheLoai.id) >= 0;
    var Nut = document.createElement('button'); Nut.type = 'button'; Nut.className = 'favorite-genre-chip'; Nut.textContent = TheLoai.name; Nut.dataset.genre = TheLoai.id;
    Nut.setAttribute('aria-pressed', String(DaChon)); Nut.disabled = DangLuuSoThichNhac;
    Nut.addEventListener('click', function() {
      var ViTri = SoThichNhacDangChon.favoriteGenres.indexOf(TheLoai.id);
      if (ViTri >= 0) { SoThichNhacDangChon.favoriteGenres.splice(ViTri, 1); }
      else if (SoThichNhacDangChon.favoriteGenres.length < 6) { SoThichNhacDangChon.favoriteGenres.push(TheLoai.id); }
      else { document.getElementById('music-preferences-status').textContent = 'Bạn có thể chọn tối đa 6 thể loại. Bỏ một mục để chọn mục khác.'; return; }
      VeSoThichNhac(); document.getElementById('music-preferences-status').textContent = 'Bấm Lưu gu nhạc để áp dụng.';
    }); KhungTheLoai.appendChild(Nut);
  });
  document.getElementById('favorite-artist-input').disabled = DangLuuSoThichNhac;
  document.getElementById('btn-add-favorite-artist').disabled = DangLuuSoThichNhac;
  CapNhatNutLuuSoThichNhac();
  if (window.KhamPhaNhac) { KhamPhaNhac.capNhatNutTim(); }
}

function ThemNgheSiUaThich() {
  if (DangLuuSoThichNhac) { return false; }
  var Nhap = document.getElementById('favorite-artist-input'), TrangThai = document.getElementById('music-preferences-status');
  var TenMoi = Nhap.value.split(',').map(function(Ten) { return Ten.trim().replace(/\s+/g, ' '); }).filter(Boolean);
  if (!TenMoi.length) { return true; }
  if (TenMoi.some(function(Ten) { return Ten.length > 80 || !GoiYAmNhac.core.artistKey({ artist: Ten }); })) { TrangThai.textContent = 'Tên nghệ sĩ cần có chữ hoặc số và không dài quá 80 ký tự.'; return false; }
  var BanMoi = GoiYAmNhac.core.preferences({ favoriteArtists: SoThichNhacDangChon.favoriteArtists.concat(TenMoi), favoriteGenres: SoThichNhacDangChon.favoriteGenres });
  var CacTen = new Set(SoThichNhacDangChon.favoriteArtists.concat(TenMoi).map(function(Ten) { return GoiYAmNhac.core.artistKey({ artist: Ten }); }));
  if (CacTen.size > 20) { TrangThai.textContent = 'Bạn có thể chọn tối đa 20 nghệ sĩ.'; return false; }
  SoThichNhacDangChon = BanMoi; Nhap.value = ''; VeSoThichNhac(); TrangThai.textContent = 'Bấm Lưu gu nhạc để áp dụng.'; Nhap.focus({ preventScroll: true }); return true;
}

function LuuSoThichNhac() {
  if (window.KhamPhaNhac && KhamPhaNhac.dangLuuTim()) { return; }
  if (DangLuuSoThichNhac || !ThemNgheSiUaThich()) { return; }
  var BanLuu = GoiYAmNhac.core.preferences(SoThichNhacDangChon), TrangThai = document.getElementById('music-preferences-status');
  DangLuuSoThichNhac = true; VeSoThichNhac(); TrangThai.textContent = 'Đang lưu gu nhạc…';
  GiaoDienUngDung.luuCaiDatGoiY(BanLuu).then(function(CauHinh) {
    KhoiPhucSoThichNhac(CauHinh); CapNhatThongKeGuNhac(); TaiGoiYCaNhan(true);
    TrangThai.textContent = 'Đã lưu. Bài hát và Mix sẽ ưu tiên gu bạn chọn.';
  }).catch(function(Loi) { TrangThai.textContent = 'Chưa lưu được: ' + DinhDangLoi(Loi) + '. Bạn có thể thử lại.'; }).finally(function() { DangLuuSoThichNhac = false; VeSoThichNhac(); });
}

function CapNhatThongKeGuNhac() {
  var MoTa = document.getElementById('recommendation-profile-summary');
  if (!MoTa || !window.GoiYAmNhac) { return; }
  var Gu = GoiYAmNhac.thongKe(DanhSachBaiHatThuVien);
  var GuDaChon = Gu.preferredArtists.size + ' nghệ sĩ ưa thích • ' + Gu.preferredGenres.size + ' thể loại';
  MoTa.textContent = Gu.sessions > 0 ? Gu.sessions + ' lượt nghe • ' + Math.round(Gu.minutes) + ' phút nhạc • ' + GuDaChon : (Gu.preferredArtists.size || Gu.preferredGenres.size ? GuDaChon + ' • Gợi ý ưu tiên gu đã chọn.' : 'Chọn gu, nghe nhạc và thêm Yêu thích để app hiểu sở thích của bạn.');
}

function VeMixGoiY(CacMix) {
  var Khung = document.getElementById('home-mixes-grid');
  if (!Khung) { return; }
  Khung.innerHTML = '';
  if (!CacMix.length) {
    Khung.innerHTML = '<p class="recommendation-empty">Chưa có đủ bài để tạo Mix. Thêm vài bài Yêu thích hoặc thử làm mới gợi ý.</p>';
  }
  CacMix.forEach(function(Mix) {
    var The = document.createElement('article');
    The.className = 'recommendation-mix';
    The.innerHTML = '<span class="recommendation-mix-count">' + Mix.tracks.length + ' bài hát</span><h3>' + XoaKyTuHTML(Mix.name) + '</h3><p>' + XoaKyTuHTML(Mix.description) + '</p><div class="recommendation-mix-actions"><button class="home-action-btn mix-play" type="button">Nghe Mix</button><button class="home-action-btn mix-save" type="button">Lưu playlist</button></div>';
    The.querySelector('.mix-play').addEventListener('click', function() { PhatBaiHat(Mix.tracks[0], Mix.tracks, 0, false); });
    The.querySelector('.mix-save').addEventListener('click', function() {
      var Nut = this;
      Nut.disabled = true;
      var Playlist = { id: 'mix-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7), name: Mix.name, description: Mix.description, tracks: Mix.tracks.map(function(Bai) { var BanSao = Object.assign({}, Bai); delete BanSao.recommendationReason; delete BanSao.recommendationNew; delete BanSao.recommendationGenreHints; return BanSao; }), cover: null };
      GiaoDienUngDung.luuDanhSachPhat(Playlist).then(function() { return DocDanhSachPhatNguoiDung(); }).then(function() {
        Nut.textContent = 'Đã lưu';
        HienThiThongBao('Đã lưu playlist ' + XoaKyTuHTML(Mix.name), 'success', 2000);
      }).catch(function(Loi) { Nut.disabled = false; HienThiThongBao(XoaKyTuHTML(DinhDangLoi(Loi)), 'error', 3000); });
    });
    Khung.appendChild(The);
  });
}

function VeNgheSiGoiY(CacNgheSi) {
  if (window.KhamPhaNhac) { KhamPhaNhac.veNgheSiGoiY(CacNgheSi); return; }
  var Khung = document.getElementById('home-artists-grid');
  if (!Khung) { return; }
  Khung.innerHTML = '';
  if (!CacNgheSi.length) { Khung.innerHTML = '<p class="recommendation-empty">Thêm vài bài Yêu thích để tìm thêm nghệ sĩ phù hợp. Nếu nguồn nhạc chưa trả đủ kết quả, thử làm mới sau.</p>'; }
  CacNgheSi.forEach(function(NgheSi) {
    var Nut = document.createElement('button');
    Nut.type = 'button'; Nut.className = 'recommendation-artist';
    Nut.setAttribute('aria-label', 'Tìm nhạc của ' + NgheSi.name);
    var Anh = GiaiQuyetDuongDanAnhBia(NgheSi.track, 120);
    if (Anh) {
      var Hinh = document.createElement('img'); Hinh.src = Anh; Hinh.alt = ''; Hinh.onerror = function() { Hinh.style.display = 'none'; }; Nut.appendChild(Hinh);
    }
    var Ten = document.createElement('strong'); Ten.textContent = NgheSi.name; Nut.appendChild(Ten);
    var LyDo = document.createElement('span'); LyDo.textContent = NgheSi.reason; Nut.appendChild(LyDo);
    Nut.addEventListener('click', function() { document.getElementById('search-input').value = NgheSi.name; ChuyenDoiGiaoDien('explore'); ThucHienTimKiem(NgheSi.name); });
    Khung.appendChild(Nut);
  });
}

function TaiGoiYCaNhan(BatBuocTaiLai) {
  if (LoiHuaGoiYHienTai && !BatBuocTaiLai) { return LoiHuaGoiYHienTai; }
  var Luot = ++LuotVeGoiY;
  var ForYou = document.getElementById('home-foryou-grid'), Discovery = document.getElementById('home-discovery-grid');
  ['btn-refresh-foryou', 'btn-refresh-discovery'].forEach(function(Id) { var Nut = document.getElementById(Id); if (Nut) { Nut.disabled = true; } });
  if (!GoiYHienTai) { VeTheGiaLap(ForYou, 6); VeTheGiaLap(Discovery, 6); }
  LoiHuaGoiYHienTai = GoiYAmNhac.layGoiY(DanhSachBaiHatThuVien, LichSuNgheTrangChu, BatBuocTaiLai).then(function(KetQua) {
    if (Luot !== LuotVeGoiY) { return KetQua; }
    GoiYHienTai = KetQua;
    DanhSachChoBan = KetQua.forYou; DanhSachKhamPha = KetQua.discovery;
    VeTheBaiHatTrangChu(DanhSachChoBan, ForYou, { isContinue: false });
    VeTheBaiHatTrangChu(DanhSachKhamPha, Discovery, { isContinue: false });
    if (!DanhSachChoBan.length) { ForYou.innerHTML = '<p class="recommendation-empty">Chưa có gợi ý. Thêm vài bài Yêu thích hoặc thử lại khi có kết nối mạng.</p>'; }
    if (!DanhSachKhamPha.length) { Discovery.innerHTML = '<p class="recommendation-empty">Chưa tìm được thêm nhạc mới phù hợp. Bạn vẫn có thể nghe Mix từ các bài đã có.</p>'; }
    document.getElementById('foryou-subtitle').textContent = KetQua.personalized ? 'Bài cùng gu xen kẽ nhạc mới • Cập nhật theo cách bạn nghe và yêu thích' : 'Bắt đầu khám phá, rồi app sẽ học từ những bài bạn nghe và yêu thích.';
    document.getElementById('discovery-subtitle').textContent = KetQua.offline ? 'Chưa tải được nhạc mới. Đang dùng những bài có sẵn để gợi ý.' : 'Nhạc và nghệ sĩ mới đối với lịch sử nghe trong app của bạn.';
    VeMixGoiY(KetQua.mixes); VeNgheSiGoiY(KetQua.artists); CapNhatThongKeGuNhac();
    if (KetQua.warning) { document.getElementById('lastfm-key-status').textContent = KetQua.warning; }
    return KetQua;
  }).catch(function(Loi) {
    if (Luot !== LuotVeGoiY) { return; }
    if (!GoiYHienTai) { ForYou.innerHTML = '<p class="recommendation-empty">Chưa tải được gợi ý. Thử lại sau.</p>'; Discovery.innerHTML = ''; }
    HienThiThongBao(XoaKyTuHTML(DinhDangLoi(Loi)), 'error', 3000);
  }).finally(function() {
    if (Luot === LuotVeGoiY) {
      LoiHuaGoiYHienTai = null;
      ['btn-refresh-foryou', 'btn-refresh-discovery'].forEach(function(Id) { var Nut = document.getElementById(Id); if (Nut) { Nut.disabled = false; } });
    }
  });
  return LoiHuaGoiYHienTai;
}

function TaiDanhSachChoBan(BatBuocTaiLai) { return TaiGoiYCaNhan(BatBuocTaiLai); }
function TaiDanhSachKhamPha(BatBuocTaiLai) { return TaiGoiYCaNhan(BatBuocTaiLai); }

function VeToanBoTrangChu() {
  if (window.GiaoDienMoi) { GiaoDienMoi.capNhatTrangChu(); }
  VePhanTiepTucNghe();
  VePhanLichSuNghe();
  TaiDanhSachThinhHanh(false);
  TaiDanhSachChoBan(false);
  TaiDanhSachKhamPha(false);
}

function DocDanhSachPhatNguoiDung() {
  return GiaoDienUngDung.layDanhSachPhat().then(function(DanhSach) {
    if (Array.isArray(DanhSach)) {
      DanhSachPhatNguoiDung = DanhSach;
    } else {
      DanhSachPhatNguoiDung = [];
    }
    VeDanhSachPhatThanhBen();
    if (GiaoDienHienTai === 'playlist' && MaDanhSachPhatHienTai) {
      VeGiaoDienDanhSachPhat(MaDanhSachPhatHienTai);
    }
    return DanhSachPhatNguoiDung;
  });
}

function LayDuongDanAnhBiaDanhSachPhat(DanhSachPhat) {
  if (!DanhSachPhat) {
    return '';
  }
  if (DanhSachPhat.customCoverBase64 && DanhSachPhat.customCoverBase64.indexOf('data:image') === 0) {
    return DanhSachPhat.customCoverBase64;
  }
  if (DanhSachPhat.cover && (DanhSachPhat.cover.indexOf('http:') === 0 || DanhSachPhat.cover.indexOf('https:') === 0 || DanhSachPhat.cover.indexOf('data:image') === 0)) {
    return DanhSachPhat.cover;
  }
  if (DanhSachPhat.tracks && DanhSachPhat.tracks.length > 0) {
    for (var i = 0; i < DanhSachPhat.tracks.length; i = i + 1) {
      var DuongDan = GiaiQuyetDuongDanAnhBia(DanhSachPhat.tracks[i], 300);
      if (DuongDan) {
        return DuongDan;
      }
    }
  }
  return '';
}

function VeDanhSachPhatThanhBen() {
  var KhungChua = document.getElementById('sidebar-playlists-list');
  if (!KhungChua) {
    return;
  }
  KhungChua.innerHTML = '';
  for (var i = 0; i < DanhSachPhatNguoiDung.length; i = i + 1) {
    var Playlist = DanhSachPhatNguoiDung[i];
    var DuongDanAnh = LayDuongDanAnhBiaDanhSachPhat(Playlist);
    var SoLuongBai = 0;
    if (Playlist.tracks && Array.isArray(Playlist.tracks)) {
      SoLuongBai = Playlist.tracks.length;
    }
    var LaDangChon = false;
    if (GiaoDienHienTai === 'playlist' && MaDanhSachPhatHienTai === Playlist.id) {
      LaDangChon = true;
    }

    var ItemPhanTu = document.createElement('div');
    ItemPhanTu.className = 'sidebar-playlist-item';
    if (LaDangChon) {
      ItemPhanTu.classList.add('active');
    }
    ItemPhanTu.setAttribute('data-id', Playlist.id);
    ItemPhanTu.setAttribute('title', Playlist.name);
    ItemPhanTu.setAttribute('role', 'button'); ItemPhanTu.setAttribute('tabindex', '0');
    ItemPhanTu.setAttribute('aria-label', Playlist.name + ', ' + SoLuongBai + ' bài hát');
    ItemPhanTu.addEventListener('keydown', function(SuKien) { if (SuKien.key === 'Enter' || SuKien.key === ' ') { SuKien.preventDefault(); SuKien.stopPropagation(); this.click(); } });

    var HTML = '<div class="sidebar-playlist-thumb">';
    if (DuongDanAnh) {
      HTML += '<img src="' + DuongDanAnh + '" alt="" onerror="this.style.display=\'none\'">';
    } else {
      HTML += BieuTuong.NotNhac;
    }
    HTML += '</div>';
    HTML += '<span class="sidebar-playlist-copy"><span class="sidebar-playlist-name">' + XoaKyTuHTML(Playlist.name) + '</span><small>Danh sách phát · ' + String(SoLuongBai) + ' bài</small></span>';
    HTML += '<span class="sidebar-playlist-count">' + String(SoLuongBai) + '</span>';
    ItemPhanTu.innerHTML = HTML;

    ItemPhanTu.addEventListener('click', (function(MaId) {
      return function() {
        ChuyenDoiGiaoDien('playlist', MaId);
      };
    })(Playlist.id));

    ItemPhanTu.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.add('drag-over');
    });

    ItemPhanTu.addEventListener('dragleave', function() {
      this.classList.remove('drag-over');
    });

    ItemPhanTu.addEventListener('drop', (function(PlaylistMucTieu) {
      return function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('drag-over');
        try {
          var DuLieuTho = e.dataTransfer.getData('text/plain');
          if (DuLieuTho) {
            var BaiHatKeo = JSON.parse(DuLieuTho);
            if (BaiHatKeo && BaiHatKeo.id) {
              if (!PlaylistMucTieu.tracks) {
                PlaylistMucTieu.tracks = [];
              }
              var DaCo = false;
              for (var k = 0; k < PlaylistMucTieu.tracks.length; k = k + 1) {
                if (PlaylistMucTieu.tracks[k].id === BaiHatKeo.id && PlaylistMucTieu.tracks[k].source === BaiHatKeo.source) {
                  DaCo = true;
                  break;
                }
              }
              if (!DaCo) {
                PlaylistMucTieu.tracks.push(BaiHatKeo);
                GiaoDienUngDung.luuDanhSachPhat(PlaylistMucTieu).then(function() {
                  HienThiThongBao(BieuTuong.ThanhCong + ' <span>Đã thêm vào "' + XoaKyTuHTML(PlaylistMucTieu.name) + '"</span>', 'success', 1800);
                  DocDanhSachPhatNguoiDung();
                });
              } else {
                HienThiThongBao('Bài hát đã có trong danh sách phát', 'info', 1800);
              }
            }
          }
        } catch (Loi) {}
      };
    })(Playlist));

    KhungChua.appendChild(ItemPhanTu);
  }
}

function TimDanhSachPhatTheoId(MaId) {
  for (var i = 0; i < DanhSachPhatNguoiDung.length; i = i + 1) {
    if (DanhSachPhatNguoiDung[i].id === MaId) {
      return DanhSachPhatNguoiDung[i];
    }
  }
  return null;
}

function VeGiaoDienDanhSachPhat(MaDanhSachPhat) {
  var Playlist = TimDanhSachPhatTheoId(MaDanhSachPhat);
  var KhungChua = document.getElementById('playlist-tracks-container');
  var KhungTrong = document.getElementById('playlist-empty');
  var TieuDe = document.getElementById('playlist-title-display');
  var MoTa = document.getElementById('playlist-description-display');
  var ThongTin = document.getElementById('playlist-meta-info');
  var KhungAnh = document.getElementById('playlist-cover-art');
  var NutXemAnh = document.getElementById('btn-playlist-cover-view');
  var NutPhatTatCa = document.getElementById('btn-play-playlist');

  if (!Playlist) {
    if (KhungChua) { KhungChua.innerHTML = ''; }
    if (KhungTrong) { KhungTrong.style.display = 'flex'; }
    return;
  }

  if (TieuDe) {
    TieuDe.textContent = Playlist.name;
  }
  if (MoTa) {
    if (Playlist.description) {
      MoTa.textContent = Playlist.description;
      MoTa.style.display = 'block';
    } else {
      MoTa.style.display = 'none';
    }
  }

  var DanhSachBai = [];
  if (Playlist.tracks && Array.isArray(Playlist.tracks)) {
    DanhSachBai = Playlist.tracks;
  }

  var TongSoGiay = 0;
  for (var i = 0; i < DanhSachBai.length; i = i + 1) {
    if (DanhSachBai[i].duration) {
      TongSoGiay = TongSoGiay + DanhSachBai[i].duration;
    }
  }

  if (ThongTin) {
    ThongTin.textContent = String(DanhSachBai.length) + ' bài hát • ' + DinhDangThoiGian(TongSoGiay, true);
  }

  var DuongDanAnh = LayDuongDanAnhBiaDanhSachPhat(Playlist);
  if (KhungAnh) {
    if (DuongDanAnh) {
      KhungAnh.innerHTML = '<img src="' + DuongDanAnh + '" alt="" onerror="this.style.display=\'none\'">';
    } else {
      KhungAnh.innerHTML = BieuTuong.NotNhac;
    }
  }

  if (NutXemAnh) {
    NutXemAnh.onclick = function() {
      if (DuongDanAnh) {
        MoTrinhXemAnh(DuongDanAnh, Playlist.name);
      }
    };
  }

  var NutSuaPlaylist = document.getElementById('btn-edit-playlist-modal-open');
  if (NutSuaPlaylist) {
    NutSuaPlaylist.onclick = function() {
      MoCuaSoChinhSuaDanhSachPhat(Playlist.id);
    };
  }

  var NutXoaPlaylist = document.getElementById('btn-delete-current-playlist');
  if (NutXoaPlaylist) {
    NutXoaPlaylist.onclick = function() {
      MoCuaSoXacNhanXoaDanhSachPhat(Playlist);
    };
  }

  if (NutPhatTatCa) {
    var DangPhatPlaylistNay = false;
    if (DangPhatNhac && MaDanhSachPhatHienTai === Playlist.id) {
      DangPhatPlaylistNay = true;
    }
    if (DangPhatPlaylistNay) {
      NutPhatTatCa.innerHTML = BieuTuong.TamDungPlaylist + ' <span>Tạm dừng</span>';
    } else {
      NutPhatTatCa.innerHTML = BieuTuong.PhatPlaylist + ' <span>Phát tất cả</span>';
    }
    NutPhatTatCa.onclick = function() {
      if (DangPhatPlaylistNay) {
        XuLyTamDung();
      } else {
        if (DanhSachBai.length > 0) {
          PhatBaiHat(DanhSachBai[0], DanhSachBai, 0, false);
          MaDanhSachPhatHienTai = Playlist.id;
          CapNhatTrangThaiNutPhatDanhSachPhat();
        }
      }
    };
  }

  if (DanhSachBai.length === 0) {
    if (KhungChua) { KhungChua.innerHTML = ''; }
    if (KhungTrong) { KhungTrong.style.display = 'flex'; }
    return;
  }

  if (KhungTrong) {
    KhungTrong.style.display = 'none';
  }
  if (!KhungChua) {
    return;
  }
  KhungChua.innerHTML = '';

  for (var j = 0; j < DanhSachBai.length; j = j + 1) {
    var BaiHat = DanhSachBai[j];
    var DuongDanAnhBaiHat = GiaiQuyetDuongDanAnhBia(BaiHat, 100);
    var DaLuu = KiemTraBaiHatDaLuu(BaiHat);
    var LaBaiHienTai = false;
    if (BaiHatDangPhat && BaiHatDangPhat.id === BaiHat.id && BaiHatDangPhat.source === BaiHat.source) {
      LaBaiHienTai = true;
    }

    var HangPhanTu = document.createElement('div');
    HangPhanTu.className = 'playlist-track-row';
    if (LaBaiHienTai) {
      HangPhanTu.classList.add('playing-now');
    }
    HangPhanTu.setAttribute('data-id', BaiHat.id);
    HangPhanTu.setAttribute('data-source', BaiHat.source);
    HangPhanTu.setAttribute('data-index', String(j));

    var BieuTuongRowPlay = BieuTuong.Phat; if (LaBaiHienTai && DangPhatNhac) { BieuTuongRowPlay = BieuTuong.TamDung; } var HTMLHang = '<div class="track-col-num"><span class="row-index-num">' + String(j + 1) + '</span><span class="row-play-icon">' + BieuTuongRowPlay + '</span></div>';
    HTMLHang += '<div class="track-col-info">';
    HTMLHang += '<div class="playlist-track-thumb">';
    if (DuongDanAnhBaiHat) {
      HTMLHang += '<img src="' + DuongDanAnhBaiHat + '" alt="" onerror="this.style.display=\'none\'">';
    } else {
      HTMLHang += BieuTuong.NotNhac;
    }
    HTMLHang += '</div>';
    HTMLHang += '<div class="playlist-track-meta">';
    HTMLHang += '<div class="playlist-track-title"><span class="title-text">' + XoaKyTuHTML(BaiHat.title) + '</span></div>';
    HTMLHang += '<div class="playlist-track-artist">' + XoaKyTuHTML(BaiHat.artist) + '</div>';
    HTMLHang += '</div>';
    HTMLHang += '</div>';
    HTMLHang += '<div class="track-col-duration">' + DinhDangThoiLuongBaiHat(BaiHat) + '</div>';
    HTMLHang += '<div class="track-col-actions">';
    var BieuTuongFavRow = BieuTuong.TimRong; if (DaLuu) { BieuTuongFavRow = BieuTuong.TimDac; } HTMLHang += '<button class="btn-playlist-row-fav card-action-btn' + (DaLuu ? ' btn-saved' : '') + '" aria-pressed="' + DaLuu + '" aria-label="' + (DaLuu ? 'Bỏ yêu thích' : 'Thêm vào yêu thích') + '">' + BieuTuongFavRow + '</button>';
    HTMLHang += '<button class="btn-playlist-row-remove card-action-btn" title="Xóa khỏi danh sách">' + BieuTuong.ThungRac + '</button>';
    HTMLHang += '</div>';

    HangPhanTu.innerHTML = HTMLHang;

    HangPhanTu.addEventListener('click', (function(ItemBaiHat, ViTri) {
      return function(SuKien) {
        if (SuKien.target.closest('.track-col-actions') || SuKien.target.closest('.playlist-track-title')) {
          return;
        }
        MaDanhSachPhatHienTai = Playlist.id;
        MoTrangChiTietBaiHat(ItemBaiHat, DanhSachBai, ViTri);
        CapNhatTrangThaiNutPhatDanhSachPhat();
      };
    })(BaiHat, j));

    var TieuDeBai = HangPhanTu.querySelector('.playlist-track-title');
    if (TieuDeBai) {
      TieuDeBai.addEventListener('click', (function(ItemBaiHat, ViTri) {
        return function(SuKien) {
          SuKien.stopPropagation();
          MoTrangChiTietBaiHat(ItemBaiHat, DanhSachBai, ViTri);
        };
      })(BaiHat, j));
    }

    var NutYeuThichHang = HangPhanTu.querySelector('.btn-playlist-row-fav');
    if (NutYeuThichHang) {
      NutYeuThichHang.addEventListener('click', (function(ItemBaiHat) {
        return function(SuKien) {
          SuKien.stopPropagation();
          DaoTrangThaiYeuThich(ItemBaiHat);
        };
      })(BaiHat));
    }

    var NutXoaHang = HangPhanTu.querySelector('.btn-playlist-row-remove');
    if (NutXoaHang) {
      NutXoaHang.addEventListener('click', (function(ViTriXoa) {
        return function(SuKien) {
          SuKien.stopPropagation();
          Playlist.tracks.splice(ViTriXoa, 1);
          GiaoDienUngDung.luuDanhSachPhat(Playlist).then(function() {
            HienThiThongBao(BieuTuong.ThungRac + ' <span>Đã xóa bài hát khỏi danh sách</span>', 'info', 1800);
            DocDanhSachPhatNguoiDung();
          });
        };
      })(j));
    }

    KhungChua.appendChild(HangPhanTu);
  }
}

function CapNhatTrangThaiNutPhatDanhSachPhat() {
  var NutPhatTatCa = document.getElementById('btn-play-playlist');
  if (!NutPhatTatCa) {
    return;
  }
  if (DangPhatNhac) {
    NutPhatTatCa.innerHTML = BieuTuong.TamDungPlaylist + ' <span>Tạm dừng</span>';
  } else {
    NutPhatTatCa.innerHTML = BieuTuong.PhatPlaylist + ' <span>Phát tất cả</span>';
  }
}

var DangXoaPlaylist = false;
var PhanTuTruocXoaPlaylist = null;
function MoCuaSoXacNhanXoaDanhSachPhat(Playlist) {
  if (!Playlist || DangXoaPlaylist) { return; }
  PhanTuTruocXoaPlaylist = document.activeElement;
  DanhSachPhatDangXacNhanXoa = Playlist;
  var CuaSo = document.getElementById('confirm-delete-playlist-modal');
  var MoTa = document.getElementById('confirm-delete-playlist-desc');
  if (MoTa && Playlist) {
    MoTa.textContent = 'Bạn có chắc chắn muốn xóa danh sách phát "' + Playlist.name + '"? Thao tác này không thể hoàn tác.';
  }
  if (CuaSo) {
    CuaSo.classList.remove('hidden'); CuaSo.setAttribute('aria-hidden', 'false');
    CuaSo.style.display = 'flex';
    document.getElementById('btn-confirm-delete-cancel').focus();
  }
}

function DongCuaSoXacNhanXoaDanhSachPhat() {
  if (DangXoaPlaylist) { return; }
  DanhSachPhatDangXacNhanXoa = null;
  var CuaSo = document.getElementById('confirm-delete-playlist-modal');
  if (CuaSo) {
    CuaSo.classList.add('hidden'); CuaSo.setAttribute('aria-hidden', 'true');
    CuaSo.style.display = 'none';
  }
  if (PhanTuTruocXoaPlaylist && PhanTuTruocXoaPlaylist.isConnected) { PhanTuTruocXoaPlaylist.focus({ preventScroll: true }); }
  PhanTuTruocXoaPlaylist = null;
}

function MoCuaSoThemVaoDanhSachPhat(BaiHat) {
  BaiHatThemVaoPlaylistHienTai = BaiHat;
  DanhSachPhatDuocChonTrongModal = [];
  var CuaSo = document.getElementById('add-to-playlist-modal');
  VeDanhSachTrongCuaSoThemPlaylist();
  if (CuaSo) {
    CuaSo.classList.remove('hidden');
    CuaSo.style.display = 'flex';
  }
}

function DongCuaSoThemVaoDanhSachPhat() {
  BaiHatThemVaoPlaylistHienTai = null;
  DanhSachPhatDuocChonTrongModal = [];
  var CuaSo = document.getElementById('add-to-playlist-modal');
  if (CuaSo) {
    CuaSo.classList.add('hidden');
    CuaSo.style.display = 'none';
  }
}

function VeDanhSachTrongCuaSoThemPlaylist() {
  var KhungChua = document.getElementById('modal-playlists-list');
  if (!KhungChua) {
    return;
  }
  KhungChua.innerHTML = '';
  if (!DanhSachPhatNguoiDung || DanhSachPhatNguoiDung.length === 0) {
    KhungChua.innerHTML = '<div class="empty-placeholder"><p>Chưa có danh sách phát nào. Hãy tạo mới bên dưới.</p></div>';
    return;
  }
  for (var i = 0; i < DanhSachPhatNguoiDung.length; i = i + 1) {
    var Playlist = DanhSachPhatNguoiDung[i];
    var DuongDanAnh = LayDuongDanAnhBiaDanhSachPhat(Playlist);
    var SoLuongBai = 0;
    if (Playlist.tracks && Array.isArray(Playlist.tracks)) {
      SoLuongBai = Playlist.tracks.length;
    }
    var DaChon = false;
    for (var k = 0; k < DanhSachPhatDuocChonTrongModal.length; k = k + 1) {
      if (DanhSachPhatDuocChonTrongModal[k] === Playlist.id) {
        DaChon = true;
        break;
      }
    }

    var Item = document.createElement('div');
    Item.className = 'add-to-playlist-item';
    if (DaChon) {
      Item.classList.add('selected');
    }
    var ChuoiDaChon = ''; if (DaChon) { ChuoiDaChon = 'checked'; } var HTML = '<input type="checkbox" class="playlist-checkbox" ' + ChuoiDaChon + '>';
    HTML += '<div class="add-playlist-thumb">';
    if (DuongDanAnh) {
      HTML += '<img src="' + DuongDanAnh + '" alt="" onerror="this.style.display=\'none\'">';
    } else {
      HTML += BieuTuong.NotNhac;
    }
    HTML += '</div>';
    HTML += '<div class="add-playlist-info"><div class="add-playlist-name">' + XoaKyTuHTML(Playlist.name) + '</div><div class="add-playlist-count">' + String(SoLuongBai) + ' bài hát</div></div>';
    Item.innerHTML = HTML;

    Item.addEventListener('click', (function(PlaylistId, CheckboxPhanTu, ItemPhanTu) {
      return function() {
        var ViTriTrongMang = -1;
        for (var m = 0; m < DanhSachPhatDuocChonTrongModal.length; m = m + 1) {
          if (DanhSachPhatDuocChonTrongModal[m] === PlaylistId) {
            ViTriTrongMang = m;
            break;
          }
        }
        if (ViTriTrongMang >= 0) {
          DanhSachPhatDuocChonTrongModal.splice(ViTriTrongMang, 1);
          CheckboxPhanTu.checked = false;
          ItemPhanTu.classList.remove('selected');
        } else {
          DanhSachPhatDuocChonTrongModal.push(PlaylistId);
          CheckboxPhanTu.checked = true;
          ItemPhanTu.classList.add('selected');
        }
      };
    })(Playlist.id, Item.querySelector('.playlist-checkbox'), Item));

    KhungChua.appendChild(Item);
  }
}

function XuLyTaoNhanhDanhSachPhat() {
  var ONhap = document.getElementById('new-playlist-quick-input');
  if (!ONhap || !ONhap.value || !ONhap.value.trim()) {
    HienThiThongBao('Vui lòng nhập tên danh sách phát', 'error', 1800);
    return;
  }
  var TenMoi = ONhap.value.trim();
  var PlaylistMoi = {
    id: 'pl_' + String(Date.now()),
    name: TenMoi,
    description: '',
    cover: '',
    customCoverBase64: '',
    tracks: []
  };
  GiaoDienUngDung.luuDanhSachPhat(PlaylistMoi).then(function() {
    HienThiThongBao(BieuTuong.ThanhCong + ' <span>Đã tạo danh sách "' + XoaKyTuHTML(TenMoi) + '"</span>', 'success', 1800);
    ONhap.value = '';
    DocDanhSachPhatNguoiDung().then(function() {
      DanhSachPhatDuocChonTrongModal.push(PlaylistMoi.id);
      VeDanhSachTrongCuaSoThemPlaylist();
    });
  });
}

var BoHenGioChuyenNhac = null;

function HuyBoChuyenNhac(GiuBaiDaChuanBi) {
  DangChuyenNhac = false;
  if (BoHenGioChuyenNhac) {
    cancelAnimationFrame(BoHenGioChuyenNhac);
    BoHenGioChuyenNhac = null;
  }
  if (TrinhPhatAmThanhPhu && !GiuBaiDaChuanBi) {
    TrinhPhatAmThanhPhu.pause();
    TrinhPhatAmThanhPhu.removeAttribute('src');
    TrinhPhatAmThanhPhu.load();
    TrinhPhatAmThanhPhu.volume = 0;
  }
}

function PhatBaiHat(DuLieuBaiHatTho, BoBoiCanh, ViTriTrongDanhSach, BuocTiepTuc, LyDoChuyenBai) {
  if (!DuLieuBaiHatTho) {
    return;
  }
  if (window.KhamPhaNhac && KhamPhaNhac.laBaiNgoai(DuLieuBaiHatTho)) { KhamPhaNhac.moBaiNgoai(DuLieuBaiHatTho); return; }
  if (window.KhamPhaNhac && Array.isArray(BoBoiCanh)) { BoBoiCanh = BoBoiCanh.filter(function(Bai) { return !KhamPhaNhac.laBaiNgoai(Bai); }); ViTriTrongDanhSach = Math.max(0, BoBoiCanh.indexOf(DuLieuBaiHatTho)); }
  if (window.GoiYAmNhac) { GoiYAmNhac.ketThucPhien(LyDoChuyenBai || 'switch'); }
  var AudioDaChuanBi = window.ChuanBiBaiTiep ? ChuanBiBaiTiep.nhanBai(DuLieuBaiHatTho) : null;
  HuyBoChuyenNhac(!!AudioDaChuanBi);
  MaYeuCauPhatHienTai = MaYeuCauPhatHienTai + 1;
  var MaYeuCau = MaYeuCauPhatHienTai;
  DangTaiBaiHat = true;
  DangPhatNhac = false;
  DangKeoTienDo = false;
  if (!TrinhPhatAmThanhChinh) { TrinhPhatAmThanhChinh = document.getElementById('audio-engine'); }
  if (TrinhPhatAmThanhChinh) {
    TrinhPhatAmThanhChinh.pause();
    TrinhPhatAmThanhChinh.removeAttribute('src');
    TrinhPhatAmThanhChinh.load();
  }
  var SongAmCu = document.getElementById('audio-visualizer');
  if (AudioDaChuanBi) {
    var AudioCu = TrinhPhatAmThanhChinh;
    TrinhPhatAmThanhChinh = AudioDaChuanBi;
    TrinhPhatAmThanhPhu = AudioCu;
  }
  var AudioMucTieu = TrinhPhatAmThanhChinh;
  AudioMucTieu._ngquangRequest = MaYeuCau;
  if (SongAmCu) { SongAmCu.classList.remove('playing'); }

  if (BoBoiCanh && Array.isArray(BoBoiCanh)) {
    DanhSachCho = BoBoiCanh.slice();
    ViTriDangPhat = ViTriTrongDanhSach;
  }

  BaiHatDangPhat = DuLieuBaiHatTho;
  if (window.EqualizerBaiHat) { EqualizerBaiHat.chonBai(DuLieuBaiHatTho, AudioMucTieu); }
  if (window.NhacOfflineVaTocDo) { NhacOfflineVaTocDo.apDungAudio(AudioMucTieu); }
  if (window.HieuUngAmThanh) { HieuUngAmThanh.chuanBiPhat(); }
  CapNhatThanhTienDo(0);
  ThemVaoLichSuNghe(DuLieuBaiHatTho);
  CapNhatThanhPhatNhacDuoiCung(DuLieuBaiHatTho);
  CapNhatTrangThaiPhatTheBaiHat();
  CapNhatTrangThaiPhatDanhSachCho();
  CapNhatTrangThaiPhatHangDanhSachPhat();

  if (GiaoDienHienTai === 'track-detail') {
    CapNhatGiaoDienTrangChiTiet(DuLieuBaiHatTho);
  }

  var BieuTuongPhat = document.getElementById('play-icon');
  if (BieuTuongPhat) {
    BieuTuongPhat.innerHTML = BieuTuong.DangTai;
  }

  GiaoDienUngDung.layLuongPhat(DuLieuBaiHatTho).then(function(ThongTinLuong) {
    if (MaYeuCau !== MaYeuCauPhatHienTai) {
      return;
    }
    if (!ThongTinLuong || !ThongTinLuong.streamUrl) {
      throw new Error('Khong the lay luong am thanh');
    }

    if (!TrinhPhatAmThanhChinh) {
      TrinhPhatAmThanhChinh = document.getElementById('audio-engine');
    }
    if (!AudioDaChuanBi) { AudioMucTieu.src = ThongTinLuong.streamUrl; }
    AudioMucTieu.volume = MucAmLuong;
    if (window.NhacOfflineVaTocDo) { NhacOfflineVaTocDo.apDungAudio(AudioMucTieu); }

    var ThoiGianBatDau = 0;
    if (BuocTiepTuc && DuLieuBaiHatTho.continueTime && DuLieuBaiHatTho.continueTime > 0) {
      ThoiGianBatDau = DuLieuBaiHatTho.continueTime;
    }

    AudioMucTieu.play().then(function() {
      if (MaYeuCau !== MaYeuCauPhatHienTai) {
        return;
      }
      if (ThoiGianBatDau > 0) {
        AudioMucTieu.currentTime = ThoiGianBatDau;
      }
      DangPhatNhac = true;
      DangTaiBaiHat = false;
      if (window.GoiYAmNhac) { GoiYAmNhac.batDauPhien(DuLieuBaiHatTho, AudioMucTieu); }
      if (BieuTuongPhat) {
        BieuTuongPhat.innerHTML = BieuTuong.TamDung;
      }
      var SongAm = document.getElementById('audio-visualizer');
      if (SongAm) {
        SongAm.classList.add('playing');
      }
      CapNhatTrangThaiPhatTheBaiHat();
      CapNhatTrangThaiPhatDanhSachCho();
      CapNhatTrangThaiPhatHangDanhSachPhat();
      if (GiaoDienHienTai === 'track-detail') {
        CapNhatGiaoDienTrangChiTiet(BaiHatDangPhat);
      }
      LuuTrangThaiPhatNhac();
      GiaoDienUngDung.capNhatDiscord(BaiHatDangPhat, TrinhPhatAmThanhChinh.currentTime, true);
      if (window.ChuanBiBaiTiep) { ChuanBiBaiTiep.chuanBi(); }
    }).catch(function(Loi) {
      if (MaYeuCau !== MaYeuCauPhatHienTai) {
        return;
      }
      DangPhatNhac = false;
      DangTaiBaiHat = false;
      if (BieuTuongPhat) {
        BieuTuongPhat.innerHTML = BieuTuong.Phat;
      }
      if (GiaoDienHienTai === 'track-detail') { CapNhatGiaoDienTrangChiTiet(BaiHatDangPhat); }
      CapNhatThanhTienDo();
      HienThiThongBao('Lỗi phát nhạc: ' + XoaKyTuHTML(DinhDangLoi(Loi)), 'error', 2500);
    });
  }).catch(function(Loi) {
    if (MaYeuCau !== MaYeuCauPhatHienTai) {
      return;
    }
    DangPhatNhac = false;
    DangTaiBaiHat = false;
    if (BieuTuongPhat) {
      BieuTuongPhat.innerHTML = BieuTuong.Phat;
    }
    if (GiaoDienHienTai === 'track-detail') { CapNhatGiaoDienTrangChiTiet(BaiHatDangPhat); }
    CapNhatThanhTienDo();
    HienThiThongBao('Lỗi kết nối bài hát: ' + XoaKyTuHTML(DinhDangLoi(Loi)), 'error', 2500);
  });
}

function TiepTucHoacPhatBaiHat(BaiHat, BoBoiCanh, ViTri, BuocTiepTuc) {
  if (!BaiHat) {
    return;
  }
  if (BaiHatDangPhat && BaiHatDangPhat.id === BaiHat.id && BaiHatDangPhat.source === BaiHat.source) {
    if (DangTaiBaiHat) { return; }
    if (DangPhatNhac) {
      XuLyTamDung();
    } else {
      if (TrinhPhatAmThanhChinh && TrinhPhatAmThanhChinh.getAttribute('src')) {
        if (window.HieuUngAmThanh) { HieuUngAmThanh.chuanBiPhat(); }
        var MaYeuCau = MaYeuCauPhatHienTai;
        TrinhPhatAmThanhChinh.play().then(function() {
          if (MaYeuCau !== MaYeuCauPhatHienTai) { return; }
          DangPhatNhac = true;
          if (window.GoiYAmNhac) { GoiYAmNhac.tiepTucPhien(BaiHat, TrinhPhatAmThanhChinh); }
          var BieuTuongPhat = document.getElementById('play-icon');
          if (BieuTuongPhat) {
            BieuTuongPhat.innerHTML = BieuTuong.TamDung;
          }
          var SongAm = document.getElementById('audio-visualizer');
          if (SongAm) {
            SongAm.classList.add('playing');
          }
          CapNhatTrangThaiPhatTheBaiHat();
          CapNhatTrangThaiPhatDanhSachCho();
          CapNhatTrangThaiPhatHangDanhSachPhat();
          if (GiaoDienHienTai === 'track-detail') {
            CapNhatGiaoDienTrangChiTiet(BaiHatDangPhat);
          }
          LuuTrangThaiPhatNhac();
          GiaoDienUngDung.capNhatDiscord(BaiHatDangPhat, TrinhPhatAmThanhChinh.currentTime, true);
          if (window.ChuanBiBaiTiep) { ChuanBiBaiTiep.chuanBi(); }
        }).catch(function(Loi) {
          if (MaYeuCau !== MaYeuCauPhatHienTai) { return; }
          HienThiThongBao('Lỗi phát nhạc: ' + XoaKyTuHTML(DinhDangLoi(Loi)), 'error', 2500);
        });
      } else {
        PhatBaiHat(BaiHat, BoBoiCanh, ViTri, BuocTiepTuc);
      }
    }
  } else {
    PhatBaiHat(BaiHat, BoBoiCanh, ViTri, BuocTiepTuc);
  }
}

function XuLyTamDung() {
  if (!DangPhatNhac) {
    return;
  }
  if (window.GoiYAmNhac) { GoiYAmNhac.luuTienDo(); }
  if (TrinhPhatAmThanhChinh) {
    TrinhPhatAmThanhChinh.pause();
  }
  if (TrinhPhatAmThanhPhu) {
    TrinhPhatAmThanhPhu.pause();
  }
  DangPhatNhac = false;
  var BieuTuongPhat = document.getElementById('play-icon');
  if (BieuTuongPhat) {
    BieuTuongPhat.innerHTML = BieuTuong.Phat;
  }
  var SongAm = document.getElementById('audio-visualizer');
  if (SongAm) {
    SongAm.classList.remove('playing');
  }
  CapNhatTrangThaiPhatTheBaiHat();
  CapNhatTrangThaiPhatDanhSachCho();
  CapNhatTrangThaiPhatHangDanhSachPhat();
  if (GiaoDienHienTai === 'track-detail') {
    CapNhatGiaoDienTrangChiTiet(BaiHatDangPhat);
  }
  LuuTrangThaiPhatNhac();
  if (BaiHatDangPhat && TrinhPhatAmThanhChinh) {
    GiaoDienUngDung.capNhatDiscord(BaiHatDangPhat, TrinhPhatAmThanhChinh.currentTime, false);
  }
}

function PhatBaiTiepTheo(TuDong) {
  if (!DanhSachCho || DanhSachCho.length === 0) {
    return;
  }
  if (CheDoTronBai) {
    var ViTriMoi = Math.floor(Math.random() * DanhSachCho.length);
    if (ViTriMoi === ViTriDangPhat && DanhSachCho.length > 1) {
      ViTriMoi = (ViTriMoi + 1) % DanhSachCho.length;
    }
    ViTriDangPhat = ViTriMoi;
  } else {
    ViTriDangPhat = ViTriDangPhat + 1;
    if (ViTriDangPhat >= DanhSachCho.length) {
      ViTriDangPhat = 0;
    }
  }
  PhatBaiHat(DanhSachCho[ViTriDangPhat], DanhSachCho, ViTriDangPhat, false, TuDong ? 'ended' : 'switch');
}

function PhatBaiTruocDo() {
  if (!DanhSachCho || DanhSachCho.length === 0) {
    return;
  }
  if (TrinhPhatAmThanhChinh && TrinhPhatAmThanhChinh.currentTime > 3) {
    TrinhPhatAmThanhChinh.currentTime = 0;
    CapNhatThanhTienDo(0);
    return;
  }
  ViTriDangPhat = ViTriDangPhat - 1;
  if (ViTriDangPhat < 0) {
    ViTriDangPhat = DanhSachCho.length - 1;
  }
  PhatBaiHat(DanhSachCho[ViTriDangPhat], DanhSachCho, ViTriDangPhat, false);
}

function CapNhatTrangThaiPhatTheBaiHat() {
  if (window.GiaoDienMoi) { GiaoDienMoi.capNhatTrangThai(); }
  if (window.TuyChinhUngDung) { TuyChinhUngDung.capNhatXemTruoc(); }
  var CacThe = document.querySelectorAll('.track-card');
  for (var i = 0; i < CacThe.length; i = i + 1) {
    var The = CacThe[i];
    var IdThe = The.getAttribute('data-id');
    var NguonThe = The.getAttribute('data-source');
    var LaBaiDangPhat = false;
    if (BaiHatDangPhat && BaiHatDangPhat.id === IdThe && BaiHatDangPhat.source === NguonThe) {
      LaBaiDangPhat = true;
    }
    var NutPhatTrongThe = The.querySelector('.overlay-play-btn');
    if (LaBaiDangPhat) {
      The.classList.add('playing-now');
      if (NutPhatTrongThe) {
        NutPhatTrongThe.setAttribute('aria-label', (DangPhatNhac ? 'Tạm dừng ' : 'Phát ') + (BaiHatDangPhat.title || 'bài hát'));
        if (DangPhatNhac) {
          NutPhatTrongThe.innerHTML = BieuTuong.TamDung;
        } else {
          NutPhatTrongThe.innerHTML = BieuTuong.Phat;
        }
      }
    } else {
      The.classList.remove('playing-now');
      if (NutPhatTrongThe) {
        NutPhatTrongThe.innerHTML = BieuTuong.Phat;
      }
    }
  }
}

function CapNhatTrangThaiPhatHangDanhSachPhat() {
  var CacHang = document.querySelectorAll('.playlist-track-row');
  for (var i = 0; i < CacHang.length; i = i + 1) {
    var Hang = CacHang[i];
    var IdHang = Hang.getAttribute('data-id');
    var NguonHang = Hang.getAttribute('data-source');
    var LaBaiDangPhat = false;
    if (BaiHatDangPhat && BaiHatDangPhat.id === IdHang && BaiHatDangPhat.source === NguonHang) {
      LaBaiDangPhat = true;
    }
    var NutPhatHang = Hang.querySelector('.row-play-icon');
    if (LaBaiDangPhat) {
      Hang.classList.add('playing-now');
      if (NutPhatHang) {
        if (DangPhatNhac) {
          NutPhatHang.innerHTML = BieuTuong.TamDung;
        } else {
          NutPhatHang.innerHTML = BieuTuong.Phat;
        }
      }
    } else {
      Hang.classList.remove('playing-now');
      if (NutPhatHang) {
        NutPhatHang.innerHTML = BieuTuong.Phat;
      }
    }
  }
}

function CapNhatTrangThaiPhatDanhSachCho() {
  var CacPhanTuCho = document.querySelectorAll('.queue-item');
  for (var i = 0; i < CacPhanTuCho.length; i = i + 1) {
    var Item = CacPhanTuCho[i];
    var ViTriItem = parseInt(Item.getAttribute('data-index'), 10);
    var NutPhatCho = Item.querySelector('.queue-play-btn');
    if (ViTriItem === ViTriDangPhat) {
      Item.classList.add('active');
      if (NutPhatCho) {
        if (DangPhatNhac) {
          NutPhatCho.innerHTML = BieuTuong.TamDung;
        } else {
          NutPhatCho.innerHTML = BieuTuong.Phat;
        }
      }
    } else {
      Item.classList.remove('active');
      if (NutPhatCho) {
        NutPhatCho.innerHTML = BieuTuong.Phat;
      }
    }
  }
}

function CapNhatThanhPhatNhacDuoiCung(BaiHat) {
  if (window.GiaoDienMoi) { GiaoDienMoi.capNhatBai(BaiHat); }
  if (window.TuyChinhUngDung) { TuyChinhUngDung.capNhatXemTruoc(); }
  var KhungAnh = document.getElementById('player-cover');
  var TieuDe = document.getElementById('player-title');
  var NgheSi = document.getElementById('player-artist');
  var BieuTuongPhat = document.getElementById('play-icon');
  if (!BaiHat) {
    if (KhungAnh) { KhungAnh.style.display = 'none'; KhungAnh.removeAttribute('src'); }
    if (TieuDe) { TieuDe.textContent = 'NgQuang Music App'; }
    if (NgheSi) { NgheSi.textContent = 'Chưa phát bài nào'; }
    if (BieuTuongPhat) { BieuTuongPhat.innerHTML = BieuTuong.Phat; }
    return;
  }
  var DuongDanAnh = GiaiQuyetDuongDanAnhBia(BaiHat, 100);
  if (KhungAnh) {
    KhungAnh.onerror = function() { KhungAnh.style.display = 'none'; };
    if (DuongDanAnh) {
      KhungAnh.src = DuongDanAnh;
      KhungAnh.style.display = 'block';
    } else {
      KhungAnh.style.display = 'none';
      KhungAnh.removeAttribute('src');
    }
  }
  if (TieuDe) {
    TieuDe.innerHTML = '<span class="title-text">' + XoaKyTuHTML(BaiHat.title) + '</span>';
  }
  if (NgheSi) {
    NgheSi.textContent = BaiHat.artist;
  }
  if (BieuTuongPhat) {
    if (DangPhatNhac) {
      BieuTuongPhat.innerHTML = BieuTuong.TamDung;
    } else {
      BieuTuongPhat.innerHTML = BieuTuong.Phat;
    }
  }
}

function CapNhatBieuTuongAmLuong(Vol) {
  var BieuTuongVol = Vol <= 0 ? BieuTuong.TatTieng : (Vol < 0.5 ? BieuTuong.AmThanhThap : BieuTuong.AmThanhCao);
  ['btn-mute', 'track-page-btn-mute'].forEach(function(Id) {
    var Nut = document.getElementById(Id);
    if (Nut) {
      Nut.innerHTML = BieuTuongVol;
      Nut.setAttribute('aria-label', Vol <= 0 ? 'Bật tiếng' : 'Tắt tiếng');
      Nut.setAttribute('aria-pressed', String(Vol <= 0));
    }
  });
  ['volume-slider', 'track-page-volume-slider'].forEach(function(Id) {
    var ThanhKeo = document.getElementById(Id);
    if (ThanhKeo) { ThanhKeo.value = Vol * 100; }
  });
  ['volume-fill', 'track-page-volume-fill'].forEach(function(Id) {
    var VungDay = document.getElementById(Id);
    if (VungDay) {
      VungDay.style.width = (Vol * 100) + '%';
      VungDay.classList.toggle('is-empty', Vol <= 0);
    }
  });
  CapNhatHieuUngSong();
}

function DatMucAmLuong(Vol) {
  MucAmLuong = Number.isFinite(Vol) ? Math.max(0, Math.min(1, Vol)) : 0.8;
  if (MucAmLuong > 0) { AmLuongTruocKhiTatTieng = MucAmLuong; }
  if (TrinhPhatAmThanhChinh) { TrinhPhatAmThanhChinh.volume = MucAmLuong; }
  if (TrinhPhatAmThanhPhu) { TrinhPhatAmThanhPhu.volume = MucAmLuong; }
  CapNhatBieuTuongAmLuong(MucAmLuong);
}

function ThietLapSuKienDongCoAmThanh(PhanTuAudio) {
  if (!PhanTuAudio) {
    return;
  }
  ['loadedmetadata', 'durationchange'].forEach(function(TenSuKien) {
    PhanTuAudio.addEventListener(TenSuKien, function() {
      if (PhanTuAudio === TrinhPhatAmThanhChinh && !DangKeoTienDo) { CapNhatThanhTienDo(); }
    });
  });
  PhanTuAudio.addEventListener('timeupdate', function() {
    if (window.GoiYAmNhac) { GoiYAmNhac.quanSat(PhanTuAudio); }
    if (DangKeoTienDo || DangTaiBaiHat || PhanTuAudio !== TrinhPhatAmThanhChinh) {
      return;
    }
    var ThoiGianHienTai = PhanTuAudio.currentTime;
    var TongThoiGian = LayThoiLuongDangPhat();

    var DoanLap = LayDoanLapHienTai();
    if (DoanLap && DoanLap.start !== null && DoanLap.end !== null && DoanLap.end > DoanLap.start) {
      if (ThoiGianHienTai >= DoanLap.end || ThoiGianHienTai < DoanLap.start) {
        PhanTuAudio.currentTime = DoanLap.start;
        return;
      }
    }

    CapNhatThanhTienDo(ThoiGianHienTai);

    CapNhatTienDoTiepTucNghe(BaiHatDangPhat, ThoiGianHienTai, TongThoiGian);

    var ThoiGianThuc = Date.now();
    if (ThoiGianThuc - ThoiGianDongBoDiscordCuoi > 15000 && DangPhatNhac && BaiHatDangPhat) {
      ThoiGianDongBoDiscordCuoi = ThoiGianThuc;
      GiaoDienUngDung.capNhatDiscord(BaiHatDangPhat, ThoiGianHienTai, true);
    }
  });

  PhanTuAudio.addEventListener('ended', function() {
    if (PhanTuAudio !== TrinhPhatAmThanhChinh || DangTaiBaiHat || !PhanTuAudio.ended || PhanTuAudio._ngquangRequest !== MaYeuCauPhatHienTai) { return; }
    if (window.GoiYAmNhac) { GoiYAmNhac.ketThucPhien('ended'); }
    if (CheDoLapLai === 'one') {
      PhanTuAudio.currentTime = 0;
      CapNhatThanhTienDo(0);
      PhanTuAudio.play().then(function() { if (window.GoiYAmNhac && BaiHatDangPhat && PhanTuAudio === TrinhPhatAmThanhChinh) { GoiYAmNhac.batDauPhien(BaiHatDangPhat, PhanTuAudio); } }).catch(function() {});
    } else if (CheDoLapLai === 'all' || ViTriDangPhat < DanhSachCho.length - 1) {
      PhatBaiTiepTheo(true);
    } else {
      DangPhatNhac = false;
      var BieuTuongPhat = document.getElementById('play-icon');
      if (BieuTuongPhat) { BieuTuongPhat.innerHTML = BieuTuong.Phat; }
      var SongAm = document.getElementById('audio-visualizer');
      if (SongAm) { SongAm.classList.remove('playing'); }
      CapNhatTrangThaiPhatTheBaiHat();
      CapNhatTrangThaiPhatDanhSachCho();
      CapNhatTrangThaiPhatHangDanhSachPhat();
      if (GiaoDienHienTai === 'track-detail') { CapNhatGiaoDienTrangChiTiet(BaiHatDangPhat); }
      GiaoDienUngDung.xoaDiscord();
    }
  });
}

function DongMenuTuyChonThanhPhat() {
  var Menu = document.getElementById('player-more-menu');
  if (Menu) {
    Menu.style.display = 'none';
  }
}

function MoMenuTuyChonThanhPhat() {
  var Menu = document.getElementById('player-more-menu');
  if (!Menu || !BaiHatDangPhat) {
    return;
  }
  var NutMenuFav = document.getElementById('player-menu-fav');
  var BieuTuongMenuFav = document.getElementById('player-menu-fav-icon');
  var ChuMenuFav = document.getElementById('player-menu-fav-text');
  var DaLuu = KiemTraBaiHatDaLuu(BaiHatDangPhat);
  if (BieuTuongMenuFav) {
  if (DaLuu) { BieuTuongMenuFav.innerHTML = BieuTuong.TimDac; if (ChuMenuFav) { ChuMenuFav.textContent = 'Đã lưu vào thư viện'; } } else { BieuTuongMenuFav.innerHTML = BieuTuong.TimRong; if (ChuMenuFav) { ChuMenuFav.textContent = 'Thêm vào bài hát yêu thích'; } }
  }
  if (ChuMenuFav) {
  }
  Menu.style.display = 'block';
}

function DongMenuTroiBaiHat() {
  var Menu = document.getElementById('track-floating-menu');
  if (Menu) {
    Menu.style.display = 'none';
  }
  BaiHatMenuTroi = null;
  PhanTuNeoMenuTroi = null;
}

function MoMenuTroiBaiHat(BaiHat, PhanTuNeo, LaThuVien) {
  var Menu = document.getElementById('track-floating-menu');
  if (!Menu || !BaiHat || !PhanTuNeo) {
    return;
  }
  BaiHatMenuTroi = BaiHat;
  PhanTuNeoMenuTroi = PhanTuNeo;
  LaThuVienTrongMenuTroi = LaThuVien;

  var BieuTuongFav = document.getElementById('track-menu-fav-icon');
  var ChuFav = document.getElementById('track-menu-fav-text');
  var NutXoa = document.getElementById('track-menu-delete');
  var DaLuu = KiemTraBaiHatDaLuu(BaiHat);

  if (BieuTuongFav) {
  if (DaLuu) { BieuTuongFav.innerHTML = BieuTuong.TimDac; if (ChuFav) { ChuFav.textContent = 'Đã lưu vào thư viện'; } } else { BieuTuongFav.innerHTML = BieuTuong.TimRong; if (ChuFav) { ChuFav.textContent = 'Thêm vào bài hát yêu thích'; } }
  }
  if (ChuFav) {
  }
  if (NutXoa) {
    if (LaThuVien) {
      NutXoa.style.display = 'flex';
    } else {
      NutXoa.style.display = 'none';
    }
  }

  var KhungHinh = PhanTuNeo.getBoundingClientRect();
  var ToaDoX = KhungHinh.right - 200;
  var ToaDoY = KhungHinh.bottom + 4;
  if (ToaDoX + 200 > window.innerWidth) {
    ToaDoX = window.innerWidth - 210;
  }
  if (ToaDoY + 220 > window.innerHeight) {
    ToaDoY = KhungHinh.top - 220;
  }

  Menu.style.left = String(Math.max(10, ToaDoX)) + 'px';
  Menu.style.top = String(Math.max(10, ToaDoY)) + 'px';
  Menu.style.display = 'block';
}

function VeDanhSachCho() {
  if (window.GiaoDienMoi) { GiaoDienMoi.capNhatHangCho(); }
  var KhungChua = document.getElementById('queue-list');
  var HuyHieuDem = document.getElementById('queue-count-badge');
  if (HuyHieuDem) {
    HuyHieuDem.textContent = String(DanhSachCho.length);
  }
  if (!KhungChua) {
    return;
  }
  KhungChua.innerHTML = '';
  if (!DanhSachCho || DanhSachCho.length === 0) {
    KhungChua.innerHTML = '<p class="queue-empty-text">Hàng đợi trống</p>';
    return;
  }
  for (var i = 0; i < DanhSachCho.length; i = i + 1) {
    var BaiHat = DanhSachCho[i];
    var DuongDanAnh = GiaiQuyetDuongDanAnhBia(BaiHat, 100);
    var LaBaiDangPhat = false;
    if (i === ViTriDangPhat) {
      LaBaiDangPhat = true;
    }

    var ItemPhanTu = document.createElement('div');
    if (LaBaiDangPhat) { ItemPhanTu.className = 'queue-item active'; } else { ItemPhanTu.className = 'queue-item'; }
    ItemPhanTu.setAttribute('data-index', String(i));
    ItemPhanTu.draggable = true;

    var HTML = '<span class="queue-drag-handle">' + BieuTuong.TayNamKeo + '</span>';
    HTML += '<div class="queue-thumb-wrap">';
    if (DuongDanAnh) {
      HTML += '<img src="' + DuongDanAnh + '" alt="" class="queue-thumb" onerror="this.style.display=\'none\'">';
    } else {
      HTML += '<div class="queue-thumb-placeholder">' + BieuTuong.NotNhac + '</div>';
    }
    var BieuTuongQueuePlay = BieuTuong.Phat; if (LaBaiDangPhat && DangPhatNhac) { BieuTuongQueuePlay = BieuTuong.TamDung; } HTML += '<div class="queue-play-btn">' + BieuTuongQueuePlay + '</div>';
    HTML += '</div>';
    HTML += '<div class="queue-info">';
    HTML += '<div class="queue-title">' + XoaKyTuHTML(BaiHat.title) + '</div>';
    HTML += '<div class="queue-artist">' + XoaKyTuHTML(BaiHat.artist) + '</div>';
    HTML += '</div>';
    HTML += '<div class="queue-duration">' + DinhDangThoiLuongBaiHat(BaiHat) + '</div>';
    HTML += '<button class="queue-remove-btn" title="Xóa khỏi hàng đợi">' + BieuTuong.ThungRac + '</button>';

    ItemPhanTu.innerHTML = HTML;

    ItemPhanTu.addEventListener('click', (function(ItemBaiHat, ViTri) {
      return function(SuKien) {
        if (SuKien.target.closest('.queue-remove-btn') || SuKien.target.closest('.queue-drag-handle')) {
          return;
        }
        MoTrangChiTietBaiHat(ItemBaiHat, DanhSachCho, ViTri);
      };
    })(BaiHat, i));

    var NutXoaItem = ItemPhanTu.querySelector('.queue-remove-btn');
    if (NutXoaItem) {
      NutXoaItem.addEventListener('click', (function(ViTriXoa) {
        return function(SuKien) {
          SuKien.stopPropagation();
          DanhSachCho.splice(ViTriXoa, 1);
          if (ViTriXoa < ViTriDangPhat) {
            ViTriDangPhat = ViTriDangPhat - 1;
          } else if (ViTriXoa === ViTriDangPhat) {
            if (ViTriDangPhat >= DanhSachCho.length) {
              ViTriDangPhat = 0;
            }
            if (DanhSachCho.length > 0) {
              PhatBaiHat(DanhSachCho[ViTriDangPhat], DanhSachCho, ViTriDangPhat, false);
            } else {
              XuLyTamDung();
              BaiHatDangPhat = null;
              CapNhatThanhPhatNhacDuoiCung(null);
            }
          }
          VeDanhSachCho();
          LuuTrangThaiPhatNhac();
        };
      })(i));
    }

    KhungChua.appendChild(ItemPhanTu);
  }
}

function MoCuaSoChinhSuaBaiHat(BaiHat) {
  DuLieuBaiHatDangSua = Object.assign({}, BaiHat);
  AnhBiaTuyChonBase64 = null;
  var CuaSo = document.getElementById('edit-modal');
  var OTieuDe = document.getElementById('modal-track-title');
  var ONgheSi = document.getElementById('modal-track-artist');
  var OUrlAnh = document.getElementById('modal-cover-url');
  var KhungXemTruoc = document.getElementById('modal-cover-preview');
  var NguonText = document.getElementById('modal-track-source');
  var ThoiLuongText = document.getElementById('modal-track-duration');

  if (OTieuDe) { OTieuDe.value = BaiHat.title; }
  if (ONgheSi) { ONgheSi.value = BaiHat.artist; }
  if (OUrlAnh) { if (BaiHat.cover && BaiHat.cover.indexOf('http') === 0) { OUrlAnh.value = BaiHat.cover; } else { OUrlAnh.value = ''; } }
  if (NguonText) { NguonText.textContent = BaiHat.source.toUpperCase(); }
  if (ThoiLuongText) { ThoiLuongText.textContent = DinhDangThoiLuongBaiHat(BaiHat); }

  var DuongDanAnh = GiaiQuyetDuongDanAnhBia(BaiHat, 300);
  if (KhungXemTruoc) {
    if (DuongDanAnh) {
      KhungXemTruoc.src = DuongDanAnh;
      KhungXemTruoc.style.display = 'block';
    } else {
      KhungXemTruoc.style.display = 'none';
    }
  }
  if (CuaSo) {
    CuaSo.classList.remove('hidden');
    CuaSo.style.display = 'flex';
  }
}

function DongCuaSoChinhSuaBaiHat() {
  DuLieuBaiHatDangSua = null;
  AnhBiaTuyChonBase64 = null;
  var CuaSo = document.getElementById('edit-modal');
  if (CuaSo) {
    CuaSo.classList.add('hidden');
    CuaSo.style.display = 'none';
  }
}

function MoCuaSoCaiDat() {
  var CuaSo = document.getElementById('settings-modal');
  if (CuaSo) {
    CuaSo.classList.remove('hidden');
    CuaSo.style.display = 'flex';
  }
}

function DongCuaSoCaiDat() {
  var CuaSo = document.getElementById('settings-modal');
  if (CuaSo) {
    CuaSo.classList.add('hidden');
    CuaSo.style.display = 'none';
  }
}

function MoCuaSoChinhSuaDanhSachPhat(MaDanhSachPhat) {
  var Playlist = TimDanhSachPhatTheoId(MaDanhSachPhat);
  if (!Playlist) {
    return;
  }
  DuLieuDanhSachPhatDangSua = Playlist;
  AnhBiaPlaylistTuyChonBase64 = null;
  var CuaSo = document.getElementById('edit-playlist-modal');
  var ONhapTen = document.getElementById('modal-playlist-name');
  var ONhapMoTa = document.getElementById('modal-playlist-desc');
  var ONhapUrl = document.getElementById('modal-playlist-cover-url');
  var KhungXemTruoc = document.getElementById('modal-playlist-cover-preview');

  if (ONhapTen) { ONhapTen.value = Playlist.name; }
  if (ONhapMoTa) { ONhapMoTa.value = Playlist.description || ''; }
  if (ONhapUrl) { if (Playlist.cover && Playlist.cover.indexOf('http') === 0) { ONhapUrl.value = Playlist.cover; } else { ONhapUrl.value = ''; } }

  var DuongDanAnh = LayDuongDanAnhBiaDanhSachPhat(Playlist);
  if (KhungXemTruoc) {
    if (DuongDanAnh) {
      KhungXemTruoc.src = DuongDanAnh;
      KhungXemTruoc.style.display = 'block';
    } else {
      KhungXemTruoc.style.display = 'none';
    }
  }
  if (CuaSo) {
    CuaSo.style.display = 'flex';
  }
}

function DongCuaSoChinhSuaDanhSachPhat() {
  DuLieuDanhSachPhatDangSua = null;
  AnhBiaPlaylistTuyChonBase64 = null;
  var CuaSo = document.getElementById('edit-playlist-modal');
  if (CuaSo) {
    CuaSo.style.display = 'none';
  }
}

function MoTrinhXemAnh(DuongDanAnh, TieuDeAnh) {
  var CuaSo = document.getElementById('image-viewer-modal');
  var TheAnh = document.getElementById('image-viewer-img');
  if (!CuaSo || !TheAnh || !DuongDanAnh) { return; }
  PhanTuTruocKhiXemAnh = document.activeElement;
  TheAnh.alt = 'Ảnh bìa ' + (TieuDeAnh || 'bài hát');
  TheAnh.classList.remove('zoomed');
  TheAnh.style.transform = '';
  TheAnh.style.transformOrigin = 'center center';
  TheAnh.setAttribute('aria-pressed', 'false');
  TheAnh.setAttribute('aria-label', 'Phóng to ảnh bìa');
  TheAnh.onload = DatKichThuocAnhXem;
  TheAnh.onerror = function() {
    DongTrinhXemAnh();
    HienThiThongBao('Không tải được ảnh bìa', 'error', 2000);
  };
  CuaSo.style.display = 'flex';
  TheAnh.src = DuongDanAnh;
  if (TheAnh.complete && TheAnh.naturalWidth > 0) { DatKichThuocAnhXem(); }
  TheAnh.focus({ preventScroll: true });
  CapNhatHieuUngSong();
}

function DatKichThuocAnhXem() {
  var TheAnh = document.getElementById('image-viewer-img');
  if (!TheAnh || !TheAnh.naturalWidth || !TheAnh.naturalHeight) { return; }
  var TiLe = Math.min(window.innerWidth * 0.9 / TheAnh.naturalWidth, window.innerHeight * 0.88 / TheAnh.naturalHeight);
  TheAnh.style.width = (TheAnh.naturalWidth * TiLe) + 'px';
  TheAnh.style.height = (TheAnh.naturalHeight * TiLe) + 'px';
}

function DaoPhongToAnh(SuKien) {
  var TheAnh = document.getElementById('image-viewer-img');
  if (!TheAnh || !TheAnh.naturalWidth) { return; }
  var PhongTo = !TheAnh.classList.contains('zoomed');
  var Khung = document.getElementById('image-viewer-container').getBoundingClientRect();
  var X = SuKien && SuKien.detail > 0 ? Math.min(100, Math.max(0, (SuKien.clientX - Khung.left) / Khung.width * 100)) : 50;
  var Y = SuKien && SuKien.detail > 0 ? Math.min(100, Math.max(0, (SuKien.clientY - Khung.top) / Khung.height * 100)) : 50;
  TheAnh.style.transformOrigin = PhongTo ? X + '% ' + Y + '%' : 'center center';
  TheAnh.style.transform = PhongTo ? 'scale(2.2)' : '';
  TheAnh.classList.toggle('zoomed', PhongTo);
  TheAnh.setAttribute('aria-pressed', String(PhongTo));
  TheAnh.setAttribute('aria-label', PhongTo ? 'Thu nhỏ ảnh bìa' : 'Phóng to ảnh bìa');
}

function DongTrinhXemAnh() {
  var CuaSo = document.getElementById('image-viewer-modal');
  if (CuaSo) {
    CuaSo.style.display = 'none';
  }
  var TheAnh = document.getElementById('image-viewer-img');
  if (TheAnh) {
    TheAnh.classList.remove('zoomed');
    TheAnh.style.transform = '';
    TheAnh.style.transformOrigin = 'center center';
    TheAnh.setAttribute('aria-pressed', 'false');
    TheAnh.setAttribute('aria-label', 'Phóng to ảnh bìa');
  }
  if (PhanTuTruocKhiXemAnh && PhanTuTruocKhiXemAnh.isConnected) { PhanTuTruocKhiXemAnh.focus({ preventScroll: true }); }
  PhanTuTruocKhiXemAnh = null;
  CapNhatHieuUngSong();
}

function KhoiPhucPhienLamViec() {
  GiaoDienUngDung.layCauHinh().then(function(CauHinh) {
    if (CauHinh) {
      var TyLeKhamPha = Number.isFinite(CauHinh.recommendationDiscoveryPercent) ? Math.max(0, Math.min(60, CauHinh.recommendationDiscoveryPercent)) : 30;
      TyLeKhamPhaDaLuu = TyLeKhamPha;
      document.getElementById('recommendation-discovery-slider').value = TyLeKhamPha;
      document.getElementById('recommendation-discovery-value').textContent = TyLeKhamPha + '%';
      document.getElementById('lastfm-api-key').value = CauHinh.lastfmApiKey || '';
      document.getElementById('lastfm-key-status').textContent = CauHinh.lastfmApiKey ? 'Đã lưu khóa Last.fm.' : '';
      KhoiPhucSoThichNhac(CauHinh);
      if (window.NhacOfflineVaTocDo) { NhacOfflineVaTocDo.apDungCauHinh(CauHinh); }
      if (window.EqualizerBaiHat) { EqualizerBaiHat.apDungCauHinh(CauHinh); }
      if (typeof CauHinh.volume === 'number') {
        DatMucAmLuong(CauHinh.volume);
      }
      if (CauHinh.repeatMode) {
        CheDoLapLai = CauHinh.repeatMode;
      }
      if (typeof CauHinh.shuffle === 'boolean') {
        CheDoTronBai = CauHinh.shuffle;
      }
      if (CauHinh.accentColor) {
        ApDungMauChuDao(CauHinh.accentColor, null);
      }
      if (CauHinh.theme) {
        ApDungGiaoDien(CauHinh.theme);
      }
      if (window.TuyChinhUngDung) { TuyChinhUngDung.apDungCauHinh(CauHinh); }
      if (typeof CauHinh.showSourceBadges === 'boolean') {
        ApDungHienThiNguon(CauHinh.showSourceBadges);
      }
      if (typeof CauHinh.sidebarExpanded === 'boolean') {
        DatTrangThaiThuGonThanhBen(CauHinh.sidebarExpanded);
      }
      if (CauHinh.layoutMode) {
        DatCheDoHienThi(CauHinh.layoutMode);
      }
      var ThanhAmLuong = document.getElementById('volume-slider');
      if (ThanhAmLuong) {
        ThanhAmLuong.value = MucAmLuong * 100;
        CapNhatBieuTuongAmLuong(MucAmLuong);
      }
      var NutRepeat = document.getElementById('btn-repeat');
      if (NutRepeat) {
        if (CheDoLapLai === 'all') {
          NutRepeat.innerHTML = BieuTuong.LapTatCa;
          NutRepeat.classList.add('active');
        } else if (CheDoLapLai === 'one') {
          NutRepeat.innerHTML = BieuTuong.LapMotBai;
          NutRepeat.classList.add('active');
        } else {
          NutRepeat.innerHTML = BieuTuong.LapTat;
          NutRepeat.classList.remove('active');
        }
      }
      var NutShuffle = document.getElementById('btn-shuffle');
      if (NutShuffle) {
        if (CheDoTronBai) {
          NutShuffle.innerHTML = BieuTuong.TronBat;
          NutShuffle.classList.add('active');
        } else {
          NutShuffle.innerHTML = BieuTuong.TronTat;
          NutShuffle.classList.remove('active');
        }
      }
    }
  });

  GiaoDienUngDung.layTrangThaiPhat().then(function(TrangThai) {
    if (TrangThai && TrangThai.currentTrack) {
      BaiHatDangPhat = TrangThai.currentTrack;
      if (Array.isArray(TrangThai.queue)) {
        DanhSachCho = TrangThai.queue;
      }
      if (typeof TrangThai.queueIndex === 'number') {
        ViTriDangPhat = TrangThai.queueIndex;
      }
      CapNhatThanhPhatNhacDuoiCung(BaiHatDangPhat);
      VeDanhSachCho();
    }
  });
}

function KhoiTaoUngDung() {
  if (window.KhamPhaNhac) { KhamPhaNhac.khoiTao(); }
  TrinhPhatAmThanhChinh = document.getElementById('audio-engine');
  TrinhPhatAmThanhPhu = document.getElementById('audio-engine-secondary');
  if (window.EqualizerBaiHat) { EqualizerBaiHat.khoiTao(); }
  if (window.HieuUngAmThanh) { HieuUngAmThanh.khoiTao([TrinhPhatAmThanhChinh, TrinhPhatAmThanhPhu]); }
  ThietLapSuKienDongCoAmThanh(TrinhPhatAmThanhChinh);
  ThietLapSuKienDongCoAmThanh(TrinhPhatAmThanhPhu);
  if (window.NhacOfflineVaTocDo) { NhacOfflineVaTocDo.khoiTao([TrinhPhatAmThanhChinh, TrinhPhatAmThanhPhu]); }
  if (window.GiaoDienMoi) { GiaoDienMoi.khoiTao(); }
  if (window.TuyChinhUngDung) { TuyChinhUngDung.khoiTao(); }

  var ThanhKhamPha = document.getElementById('recommendation-discovery-slider');
  document.getElementById('btn-add-favorite-artist').addEventListener('click', ThemNgheSiUaThich);
  document.getElementById('btn-save-music-preferences').addEventListener('click', LuuSoThichNhac);
  document.getElementById('favorite-artist-input').addEventListener('input', CapNhatNutLuuSoThichNhac);
  document.getElementById('favorite-artist-input').addEventListener('keydown', function(SuKien) { if (SuKien.key === 'Enter') { SuKien.preventDefault(); SuKien.stopPropagation(); ThemNgheSiUaThich(); } });
  VeSoThichNhac();
  ThanhKhamPha.addEventListener('input', function() { document.getElementById('recommendation-discovery-value').textContent = ThanhKhamPha.value + '%'; });
  ThanhKhamPha.addEventListener('change', function() {
    var TyLeMoi = Number(ThanhKhamPha.value);
    ThanhKhamPha.disabled = true;
    GiaoDienUngDung.luuCaiDatGoiY({ recommendationDiscoveryPercent: TyLeMoi }).then(function(CauHinh) {
      TyLeKhamPhaDaLuu = TyLeMoi;
      GoiYAmNhac.capNhatCaiDat(TyLeMoi, CauHinh.lastfmApiKey);
      TaiGoiYCaNhan(true);
    }).catch(function(Loi) {
      ThanhKhamPha.value = TyLeKhamPhaDaLuu;
      document.getElementById('recommendation-discovery-value').textContent = TyLeKhamPhaDaLuu + '%';
      HienThiThongBao(XoaKyTuHTML(DinhDangLoi(Loi)), 'error', 3000);
    }).finally(function() { ThanhKhamPha.disabled = false; });
  });
  document.getElementById('btn-save-lastfm-key').addEventListener('click', function() {
    var Nut = this, Khoa = document.getElementById('lastfm-api-key').value.trim();
    var MoTa = document.getElementById('lastfm-key-status');
    if (Khoa && !/^[a-f0-9]{32}$/i.test(Khoa)) { MoTa.textContent = 'Khóa Last.fm cần có 32 ký tự hexadecimal.'; return; }
    Nut.disabled = true;
    GiaoDienUngDung.luuCaiDatGoiY({ lastfmApiKey: Khoa }).then(function(CauHinh) {
      GoiYAmNhac.capNhatCaiDat(TyLeKhamPhaDaLuu, Khoa);
      MoTa.textContent = Khoa ? 'Đã lưu khóa. Đổi gợi ý để lấy thêm dữ liệu tương tự.' : 'Đã bỏ khóa Last.fm.';
      TaiGoiYCaNhan(true);
    }).catch(function(Loi) { MoTa.textContent = DinhDangLoi(Loi); }).finally(function() { Nut.disabled = false; });
  });
  var CuaSoDatLai = document.getElementById('reset-taste-modal');
  function DongXacNhanDatLai() { CuaSoDatLai.classList.add('hidden'); CuaSoDatLai.style.display = 'none'; document.getElementById('btn-reset-music-taste').focus(); }
  document.getElementById('btn-reset-music-taste').addEventListener('click', function() {
    CuaSoDatLai.classList.remove('hidden'); CuaSoDatLai.style.display = 'flex'; document.getElementById('btn-cancel-reset-taste').focus();
  });
  document.getElementById('btn-cancel-reset-taste').addEventListener('click', DongXacNhanDatLai);
  CuaSoDatLai.addEventListener('click', function(SuKien) { if (SuKien.target === CuaSoDatLai) { DongXacNhanDatLai(); } });
  document.addEventListener('keydown', function(SuKien) { if (SuKien.key === 'Escape' && !CuaSoDatLai.classList.contains('hidden')) { SuKien.stopImmediatePropagation(); DongXacNhanDatLai(); } });
  document.getElementById('btn-confirm-reset-taste').addEventListener('click', function() {
    var Nut = this; Nut.disabled = true;
    GoiYAmNhac.xoaHoSo().then(function() {
      LichSuNgheTrangChu = []; localStorage.removeItem('omni_home_history'); VePhanLichSuNghe();
      GoiYHienTai = null; DongXacNhanDatLai(); CapNhatThongKeGuNhac(); TaiGoiYCaNhan(true);
      HienThiThongBao('Đã đặt lại hồ sơ nghe và các bài đã ẩn.', 'success', 2400);
    }).catch(function(Loi) { HienThiThongBao(XoaKyTuHTML(DinhDangLoi(Loi)), 'error', 3000); }).finally(function() { Nut.disabled = false; });
  });

  var NutHieuUng = document.getElementById('btn-track-page-effects');
  if (NutHieuUng) {
    NutHieuUng.addEventListener('click', function() {
      MoCuaSoCaiDat();
      document.getElementById('music-effects-settings').scrollIntoView({ block: 'center' });
      document.getElementById('music-effect-shake').focus({ preventScroll: true });
    });
  }

  var NutThuNho = document.getElementById('btn-min');
  var NutPhongTo = document.getElementById('btn-max');
  var NutDong = document.getElementById('btn-close');

  if (NutThuNho) {
    NutThuNho.addEventListener('click', function() {
      GiaoDienUngDung.thuNhoCuaSo();
    });
  }
  if (NutPhongTo) {
    NutPhongTo.addEventListener('click', function() {
      GiaoDienUngDung.phongToCuaSo();
    });
  }
  if (NutDong) {
    NutDong.addEventListener('click', function() {
      GoiYAmNhac.truocKhiDong().finally(function() { GiaoDienUngDung.dongCuaSo(); });
    });
  }

  var CacNutDieuHuong = document.querySelectorAll('.nav-item[data-view]');
  for (var i = 0; i < CacNutDieuHuong.length; i = i + 1) {
    (function(Nut) {
      Nut.addEventListener('click', function() {
        var TenView = Nut.getAttribute('data-view');
        ChuyenDoiGiaoDien(TenView, null);
      });
    })(CacNutDieuHuong[i]);
  }

  var NutMoTaiVe = document.getElementById('btn-open-downloads');
  if (NutMoTaiVe) {
    NutMoTaiVe.addEventListener('click', function() {
      GiaoDienUngDung.moThuMucTaiVe();
    });
  }

  var NutMoCaiDat = document.getElementById('btn-open-settings');
  if (NutMoCaiDat) {
    NutMoCaiDat.addEventListener('click', function() {
      MoCuaSoCaiDat();
    });
  }

  var NutTaoPlaylistThanhBen = document.getElementById('btn-sidebar-create-playlist');
  if (NutTaoPlaylistThanhBen) {
    NutTaoPlaylistThanhBen.addEventListener('click', function() {
      var PlaylistMoi = {
        id: 'pl_' + String(Date.now()),
        name: 'Danh sách phát mới',
        description: '',
        cover: '',
        customCoverBase64: '',
        tracks: []
      };
      GiaoDienUngDung.luuDanhSachPhat(PlaylistMoi).then(function() {
        HienThiThongBao(BieuTuong.ThanhCong + ' <span>Đã tạo danh sách phát</span>', 'success', 1800);
        DocDanhSachPhatNguoiDung().then(function() {
          ChuyenDoiGiaoDien('playlist', PlaylistMoi.id);
        });
      });
    });
  }

  var NutThuGonThanhBen = document.getElementById('btn-toggle-sidebar');
  if (NutThuGonThanhBen) {
    NutThuGonThanhBen.addEventListener('click', function() {
      var ThanhBen = document.getElementById('app-sidebar');
      var DangMoRong = false;
      if (ThanhBen && ThanhBen.classList.contains('expanded')) {
        DangMoRong = true;
      }
      DatTrangThaiThuGonThanhBen(!DangMoRong);
      LuuCauHinhNguoiDung();
    });
  }

  var NutThuGonNhomTren = document.getElementById('btn-collapse-top-nav');
  if (NutThuGonNhomTren) {
    NutThuGonNhomTren.addEventListener('click', function(e) {
      e.stopPropagation();
      var NhomTren = document.getElementById('sidebar-top-nav-group');
      var DangThuGon = false;
      if (NhomTren && NhomTren.classList.contains('collapsed')) {
        DangThuGon = true;
      }
      ApDungThuGonNhomTren(!DangThuGon);
    });
  }

  var ONhapTimKiem = document.getElementById('search-input');
  var NutXoaTimKiem = document.getElementById('search-clear-btn');
  var NutGuiTimKiem = document.getElementById('search-submit-btn');

  if (ONhapTimKiem) {
    ONhapTimKiem.addEventListener('keydown', function(SuKien) {
      if (SuKien.key === 'Enter' && !SuKien.isComposing) {
        SuKien.preventDefault(); ThucHienTimKiem(ONhapTimKiem.value);
      }
    });
    ONhapTimKiem.addEventListener('input', function() {
      if (NutXoaTimKiem) {
        if (ONhapTimKiem.value && ONhapTimKiem.value.length > 0) {
          NutXoaTimKiem.classList.remove('hidden');
        } else {
          NutXoaTimKiem.classList.add('hidden');
        }
      }
    });
  }

  if (NutXoaTimKiem) {
    NutXoaTimKiem.addEventListener('click', function() {
      if (ONhapTimKiem) {
        ONhapTimKiem.value = '';
        ONhapTimKiem.focus();
        ONhapTimKiem.dispatchEvent(new Event('input', { bubbles: true }));
      }
      NutXoaTimKiem.classList.add('hidden');
    });
  }

  if (NutGuiTimKiem && ONhapTimKiem) {
    NutGuiTimKiem.addEventListener('click', function() {
      ThucHienTimKiem(ONhapTimKiem.value);
    });
  }

  var CacNutLoc = document.querySelectorAll('.filter-pill');
  for (var j = 0; j < CacNutLoc.length; j = j + 1) {
    (function(NutLoc) {
      NutLoc.addEventListener('click', function() {
        for (var k = 0; k < CacNutLoc.length; k = k + 1) {
          CacNutLoc[k].classList.remove('active');
        }
        NutLoc.classList.add('active');
        BoLocHienTai = NutLoc.getAttribute('data-filter') || 'all';
        if (window.KhamPhaNhac) { KhamPhaNhac.doiNguon(); } else { ApDungBoLocTimKiem(); }
      });
    })(CacNutLoc[j]);
  }

  var CacChip = document.querySelectorAll('.chip');
  for (var c = 0; c < CacChip.length; c = c + 1) {
    (function(Chip) {
      Chip.addEventListener('click', function() {
        var TuKhoaChip = Chip.getAttribute('data-query');
        if (ONhapTimKiem && TuKhoaChip) {
          ONhapTimKiem.value = TuKhoaChip;
          ThucHienTimKiem(TuKhoaChip);
        }
      });
    })(CacChip[c]);
  }

  var NutChuyenTimKiemTuRong = document.getElementById('btn-go-search');
  if (NutChuyenTimKiemTuRong) {
    NutChuyenTimKiemTuRong.addEventListener('click', function() {
      ChuyenDoiGiaoDien('explore', null);
      if (ONhapTimKiem) {
        ONhapTimKiem.focus();
      }
    });
  }

  var NutXoaLichSu = document.getElementById('btn-clear-history');
  if (NutXoaLichSu) {
    NutXoaLichSu.addEventListener('click', function() {
      LichSuNgheTrangChu = [];
      try {
        localStorage.removeItem('omni_home_history');
      } catch (Loi) {}
      VePhanLichSuNghe();
      HienThiThongBao(BieuTuong.ThungRac + ' <span>Đã xóa lịch sử nghe</span>', 'info', 1800);
    });
  }

  var NutTaiLaiHot = document.getElementById('btn-refresh-hot');
  if (NutTaiLaiHot) {
    NutTaiLaiHot.addEventListener('click', function() {
      TaiDanhSachThinhHanh(true);
    });
  }
  var NutTaiLaiForYou = document.getElementById('btn-refresh-foryou');
  if (NutTaiLaiForYou) {
    NutTaiLaiForYou.addEventListener('click', function() {
      TaiDanhSachChoBan(true);
    });
  }
  var NutTaiLaiDiscovery = document.getElementById('btn-refresh-discovery');
  if (NutTaiLaiDiscovery) {
    NutTaiLaiDiscovery.addEventListener('click', function() {
      TaiDanhSachKhamPha(true);
    });
  }

  var NutHomeCompact = document.getElementById('btn-home-layout-compact');
  var NutHomeGrid = document.getElementById('btn-home-layout-grid');
  var NutExploreCompact = document.getElementById('btn-layout-compact');
  var NutExploreGrid = document.getElementById('btn-layout-grid');
  var NutLibCompact = document.getElementById('btn-library-layout-compact');
  var NutLibGrid = document.getElementById('btn-library-layout-grid');

  if (NutHomeCompact) { NutHomeCompact.addEventListener('click', function() { DatCheDoHienThi('compact'); }); }
  if (NutHomeGrid) { NutHomeGrid.addEventListener('click', function() { DatCheDoHienThi('grid'); }); }
  if (NutExploreCompact) { NutExploreCompact.addEventListener('click', function() { DatCheDoHienThi('compact'); }); }
  if (NutExploreGrid) { NutExploreGrid.addEventListener('click', function() { DatCheDoHienThi('grid'); }); }
  if (NutLibCompact) { NutLibCompact.addEventListener('click', function() { DatCheDoHienThi('compact'); }); }
  if (NutLibGrid) { NutLibGrid.addEventListener('click', function() { DatCheDoHienThi('grid'); }); }

  var CacNutCuonCarousel = document.querySelectorAll('.home-scroll-btn');
  for (var sc = 0; sc < CacNutCuonCarousel.length; sc = sc + 1) {
    (function(NutCuon) {
      NutCuon.addEventListener('click', function() {
        var IdMucTieu = NutCuon.getAttribute('data-target');
        var KhungCuon = document.getElementById(IdMucTieu);
        if (!KhungCuon) {
          return;
        }
        var LaSangTrai = NutCuon.classList.contains('btn-scroll-left');
        var KhoangCuon = Math.max(300, KhungCuon.clientWidth * 0.75);
        if (LaSangTrai) {
          KhungCuon.scrollBy({ left: -KhoangCuon, behavior: 'smooth' });
        } else {
          KhungCuon.scrollBy({ left: KhoangCuon, behavior: 'smooth' });
        }
      });
    })(CacNutCuonCarousel[sc]);
  }

  var NutPhatTamDung = document.getElementById('btn-play-pause');
  if (NutPhatTamDung) {
    NutPhatTamDung.addEventListener('click', function() {
      if (DangTaiBaiHat) { return; }
      if (!BaiHatDangPhat) {
        if (DanhSachCho && DanhSachCho.length > 0) {
          PhatBaiHat(DanhSachCho[0], DanhSachCho, 0, false);
        }
        return;
      }
      TiepTucHoacPhatBaiHat(BaiHatDangPhat, DanhSachCho, ViTriDangPhat, false);
    });
  }

  var NutTiepTheo = document.getElementById('btn-next');
  if (NutTiepTheo) {
    NutTiepTheo.addEventListener('click', function() {
      PhatBaiTiepTheo();
    });
  }

  var NutTruocDo = document.getElementById('btn-prev');
  if (NutTruocDo) {
    NutTruocDo.addEventListener('click', function() {
      PhatBaiTruocDo();
    });
  }

  var NutTronBai = document.getElementById('btn-shuffle');
  if (NutTronBai) {
    NutTronBai.addEventListener('click', function() {
      CheDoTronBai = !CheDoTronBai;
      if (CheDoTronBai) {
        NutTronBai.innerHTML = BieuTuong.TronBat;
        NutTronBai.classList.add('active');
      } else {
        NutTronBai.innerHTML = BieuTuong.TronTat;
        NutTronBai.classList.remove('active');
      }
      if (GiaoDienHienTai === 'track-detail') { CapNhatGiaoDienTrangChiTiet(BaiHatDangPhat); }
      LuuCauHinhNguoiDung();
      if (window.ChuanBiBaiTiep) { ChuanBiBaiTiep.chuanBi(); }
    });
  }

  var NutLapLai = document.getElementById('btn-repeat');
  if (NutLapLai) {
    NutLapLai.addEventListener('click', function() {
      if (CheDoLapLai === 'off') {
        CheDoLapLai = 'all';
        NutLapLai.innerHTML = BieuTuong.LapTatCa;
        NutLapLai.classList.add('active');
      } else if (CheDoLapLai === 'all') {
        CheDoLapLai = 'one';
        NutLapLai.innerHTML = BieuTuong.LapMotBai;
        NutLapLai.classList.add('active');
      } else {
        CheDoLapLai = 'off';
        NutLapLai.innerHTML = BieuTuong.LapTat;
        NutLapLai.classList.remove('active');
      }
      if (GiaoDienHienTai === 'track-detail') { CapNhatGiaoDienTrangChiTiet(BaiHatDangPhat); }
      LuuCauHinhNguoiDung();
      if (window.ChuanBiBaiTiep) { ChuanBiBaiTiep.chuanBi(); }
    });
  }

  var ThanhKeoTienDo = document.getElementById('seek-slider');
  if (ThanhKeoTienDo) {
    ThanhKeoTienDo.addEventListener('input', function() {
      if (DangTaiBaiHat) { return; }
      DangKeoTienDo = true;
      var TongThoiGian = LayThoiLuongDangPhat();
      var ThoiGianTam = (ThanhKeoTienDo.value / 100) * TongThoiGian;
      CapNhatThanhTienDo(ThoiGianTam);
    });

    ThanhKeoTienDo.addEventListener('change', function() {
      var TongThoiGian = LayThoiLuongDangPhat();
      if (!DangTaiBaiHat && TrinhPhatAmThanhChinh && TrinhPhatAmThanhChinh.getAttribute('src') && TongThoiGian > 0) {
        TrinhPhatAmThanhChinh.currentTime = (ThanhKeoTienDo.value / 100) * TongThoiGian;
      }
      DangKeoTienDo = false;
      CapNhatThanhTienDo();
      LuuTrangThaiPhatNhac();
    });

    ThanhKeoTienDo.addEventListener('contextmenu', function(SuKien) {
      SuKien.preventDefault();
      var Khung = ThanhKeoTienDo.getBoundingClientRect();
      var TiLe = (SuKien.clientX - Khung.left) / Khung.width;
      var TongThoiGian = 0;
      if (TrinhPhatAmThanhChinh && TrinhPhatAmThanhChinh.duration) {
        TongThoiGian = TrinhPhatAmThanhChinh.duration;
      } else if (BaiHatDangPhat && BaiHatDangPhat.duration) {
        TongThoiGian = BaiHatDangPhat.duration;
      }
      var GiayMoc = Math.floor(TiLe * TongThoiGian);
      MoCuaSoMocLapAB(SuKien.clientX, SuKien.clientY, GiayMoc);
    });
  }

  var NutTatTieng = document.getElementById('btn-mute');
  var ThanhKeoAmLuong = document.getElementById('volume-slider');
  if (ThanhKeoAmLuong) {
    ThanhKeoAmLuong.addEventListener('input', function() {
      DatMucAmLuong(ThanhKeoAmLuong.value / 100);
      LuuCauHinhNguoiDung();
    });
  }

  if (NutTatTieng) {
    NutTatTieng.addEventListener('click', function() {
      DatMucAmLuong(MucAmLuong > 0 ? 0 : AmLuongTruocKhiTatTieng);
      LuuCauHinhNguoiDung();
    });
  }

  var NutBatHangCho = document.getElementById('btn-queue-toggle');
  var NutDongHangCho = document.getElementById('btn-queue-close');
  var NutXoaHangCho = document.getElementById('btn-queue-clear');
  var NganHangCho = document.getElementById('queue-drawer');

  if (NutBatHangCho && NganHangCho) {
    NutBatHangCho.addEventListener('click', function() {
      NganHangCho.classList.toggle('open');
      if (NganHangCho.classList.contains('open')) {
        VeDanhSachCho();
      }
    });
  }
  if (NutDongHangCho && NganHangCho) {
    NutDongHangCho.addEventListener('click', function() {
      NganHangCho.classList.remove('open');
    });
  }
  if (NutXoaHangCho) {
    NutXoaHangCho.addEventListener('click', function() {
      DanhSachCho = [];
      ViTriDangPhat = -1;
      XuLyTamDung();
      BaiHatDangPhat = null;
      CapNhatThanhPhatNhacDuoiCung(null);
      VeDanhSachCho();
      LuuTrangThaiPhatNhac();
    });
  }

  var NutBaChamPlayer = document.getElementById('player-btn-more');
  if (NutBaChamPlayer) {
    NutBaChamPlayer.addEventListener('click', function(SuKien) {
      SuKien.stopPropagation();
      var Menu = document.getElementById('player-more-menu');
      if (Menu && Menu.style.display === 'block') {
        DongMenuTuyChonThanhPhat();
      } else {
        MoMenuTuyChonThanhPhat();
      }
    });
  }

  var MenuPlayerFav = document.getElementById('player-menu-fav');
  if (MenuPlayerFav) {
    MenuPlayerFav.addEventListener('click', function() {
      DongMenuTuyChonThanhPhat();
      if (BaiHatDangPhat) {
        DaoTrangThaiYeuThich(BaiHatDangPhat);
      }
    });
  }

  var MenuPlayerAddPlaylist = document.getElementById('player-menu-add-playlist');
  if (MenuPlayerAddPlaylist) {
    MenuPlayerAddPlaylist.addEventListener('click', function() {
      DongMenuTuyChonThanhPhat();
      if (BaiHatDangPhat) {
        MoCuaSoThemVaoDanhSachPhat(BaiHatDangPhat);
      }
    });
  }

  var MenuPlayerEdit = document.getElementById('player-menu-edit');
  if (MenuPlayerEdit) {
    MenuPlayerEdit.addEventListener('click', function() {
      DongMenuTuyChonThanhPhat();
      if (BaiHatDangPhat) {
        MoCuaSoChinhSuaBaiHat(BaiHatDangPhat);
      }
    });
  }

  var MenuPlayerDownload = document.getElementById('player-menu-download');
  if (MenuPlayerDownload) {
    MenuPlayerDownload.addEventListener('click', function() {
      DongMenuTuyChonThanhPhat();
      if (BaiHatDangPhat) {
        HienThiThongBao('Đang tải bài hát...', 'info', 1800);
        GiaoDienUngDung.taiBaiHat(BaiHatDangPhat).then(function() {
          HienThiThongBao(BieuTuong.ThanhCong + ' <span>Đã tải bài hát về máy</span>', 'success', 2000);
        }).catch(function(Loi) {
          HienThiThongBao('Lỗi tải bài: ' + XoaKyTuHTML(DinhDangLoi(Loi)), 'error', 2500);
        });
      }
    });
  }

  var MenuPlayerCopyUrl = document.getElementById('player-menu-copy-url');
  if (MenuPlayerCopyUrl) {
    MenuPlayerCopyUrl.addEventListener('click', function() {
      DongMenuTuyChonThanhPhat();
      if (BaiHatDangPhat && BaiHatDangPhat.url) {
        navigator.clipboard.writeText(BaiHatDangPhat.url);
        HienThiThongBao(BieuTuong.LienKet + ' <span>Đã sao chép liên kết</span>', 'success', 1800);
      }
    });
  }

  var MenuPlayerCopyTitle = document.getElementById('player-menu-copy-title');
  if (MenuPlayerCopyTitle) {
    MenuPlayerCopyTitle.addEventListener('click', function() {
      DongMenuTuyChonThanhPhat();
      if (BaiHatDangPhat) {
        navigator.clipboard.writeText(BaiHatDangPhat.title + ' - ' + BaiHatDangPhat.artist);
        HienThiThongBao(BieuTuong.SaoChep + ' <span>Đã sao chép tên bài hát</span>', 'success', 1800);
      }
    });
  }

  var FloatMenuFav = document.getElementById('track-menu-fav');
  if (FloatMenuFav) {
    FloatMenuFav.addEventListener('click', function() {
      DongMenuTroiBaiHat();
      if (BaiHatMenuTroi) {
        DaoTrangThaiYeuThich(BaiHatMenuTroi);
      }
    });
  }
  var FloatMenuAdd = document.getElementById('track-menu-add-playlist');
  if (FloatMenuAdd) {
    FloatMenuAdd.addEventListener('click', function() {
      DongMenuTroiBaiHat();
      if (BaiHatMenuTroi) {
        MoCuaSoThemVaoDanhSachPhat(BaiHatMenuTroi);
      }
    });
  }
  var FloatMenuEdit = document.getElementById('track-menu-edit');
  if (FloatMenuEdit) {
    FloatMenuEdit.addEventListener('click', function() {
      DongMenuTroiBaiHat();
      if (BaiHatMenuTroi) {
        MoCuaSoChinhSuaBaiHat(BaiHatMenuTroi);
      }
    });
  }
  var FloatMenuCopyUrl = document.getElementById('track-menu-copy-url');
  if (FloatMenuCopyUrl) {
    FloatMenuCopyUrl.addEventListener('click', function() {
      DongMenuTroiBaiHat();
      if (BaiHatMenuTroi && BaiHatMenuTroi.url) {
        navigator.clipboard.writeText(BaiHatMenuTroi.url);
        HienThiThongBao(BieuTuong.LienKet + ' <span>Đã sao chép liên kết</span>', 'success', 1800);
      }
    });
  }
  var FloatMenuCopyTitle = document.getElementById('track-menu-copy-title');
  if (FloatMenuCopyTitle) {
    FloatMenuCopyTitle.addEventListener('click', function() {
      DongMenuTroiBaiHat();
      if (BaiHatMenuTroi) {
        navigator.clipboard.writeText(BaiHatMenuTroi.title + ' - ' + BaiHatMenuTroi.artist);
        HienThiThongBao(BieuTuong.SaoChep + ' <span>Đã sao chép tên bài hát</span>', 'success', 1800);
      }
    });
  }
  var FloatMenuDelete = document.getElementById('track-menu-delete');
  if (FloatMenuDelete) {
    FloatMenuDelete.addEventListener('click', function() {
      DongMenuTroiBaiHat();
      if (BaiHatMenuTroi && LaThuVienTrongMenuTroi) {
        GiaoDienUngDung.xoaBaiHat(BaiHatMenuTroi.id, BaiHatMenuTroi.source).then(function() {
          HienThiThongBao(BieuTuong.ThungRac + ' <span>Đã xóa khỏi thư viện</span>', 'info', 1800);
          DocDuLieuThuVien();
        });
      }
    });
  }

  var NutQuayLaiTrangChiTiet = document.getElementById('btn-track-page-back');
  if (NutQuayLaiTrangChiTiet) {
    NutQuayLaiTrangChiTiet.addEventListener('click', function() {
      DongTrangChiTietBaiHat();
    });
  }

  var NutPhatTrangChiTiet = document.getElementById('track-page-btn-play-pause');
  if (NutPhatTrangChiTiet) {
    NutPhatTrangChiTiet.addEventListener('click', function() {
      if (NutPhatTamDung) { NutPhatTamDung.click(); }
    });
  }

  var NutTruocTrangChiTiet = document.getElementById('track-page-btn-prev');
  if (NutTruocTrangChiTiet) {
    NutTruocTrangChiTiet.addEventListener('click', function() {
      PhatBaiTruocDo();
    });
  }
  var NutTiepTrangChiTiet = document.getElementById('track-page-btn-next');
  if (NutTiepTrangChiTiet) {
    NutTiepTrangChiTiet.addEventListener('click', function() {
      PhatBaiTiepTheo();
    });
  }
  var NutTronTrangChiTiet = document.getElementById('track-page-btn-shuffle');
  if (NutTronTrangChiTiet) {
    NutTronTrangChiTiet.addEventListener('click', function() {
      if (NutTronBai) { NutTronBai.click(); }
    });
  }
  var NutLapTrangChiTiet = document.getElementById('track-page-btn-repeat');
  if (NutLapTrangChiTiet) {
    NutLapTrangChiTiet.addEventListener('click', function() {
      if (NutLapLai) { NutLapLai.click(); }
    });
  }
  var NutYeuThichTrangChiTiet = document.getElementById('track-page-btn-fav');
  if (NutYeuThichTrangChiTiet) {
    NutYeuThichTrangChiTiet.addEventListener('click', function() {
      if (BaiHatDangPhat) {
        DaoTrangThaiYeuThich(BaiHatDangPhat);
      }
    });
  }
  var NutAddPlaylistTrangChiTiet = document.getElementById('track-page-btn-add-playlist');
  if (NutAddPlaylistTrangChiTiet) {
    NutAddPlaylistTrangChiTiet.addEventListener('click', function() {
      if (BaiHatDangPhat) {
        MoCuaSoThemVaoDanhSachPhat(BaiHatDangPhat);
      }
    });
  }
  var NutSuaTrangChiTiet = document.getElementById('track-page-btn-edit');
  if (NutSuaTrangChiTiet) {
    NutSuaTrangChiTiet.addEventListener('click', function() {
      if (BaiHatDangPhat) {
        MoCuaSoChinhSuaBaiHat(BaiHatDangPhat);
      }
    });
  }
  var NutTaiTrangChiTiet = document.getElementById('track-page-btn-download');
  if (NutTaiTrangChiTiet) {
    NutTaiTrangChiTiet.addEventListener('click', function() {
      if (BaiHatDangPhat) {
        HienThiThongBao('Đang tải bài hát...', 'info', 1800);
        GiaoDienUngDung.taiBaiHat(BaiHatDangPhat).then(function() {
          HienThiThongBao(BieuTuong.ThanhCong + ' <span>Đã tải bài hát về máy</span>', 'success', 2000);
        }).catch(function(Loi) {
          HienThiThongBao('Lỗi tải bài hát: ' + XoaKyTuHTML(DinhDangLoi(Loi)), 'error', 2500);
        });
      }
    });
  }

  var AnhBiaTrangChiTiet = document.getElementById('track-page-artwork-wrap');
  if (AnhBiaTrangChiTiet) {
    AnhBiaTrangChiTiet.addEventListener('click', function() {
      if (BaiHatDangPhat) {
        var DuongDan = GiaiQuyetDuongDanAnhBia(BaiHatDangPhat, 800);
        if (DuongDan) {
          MoTrinhXemAnh(DuongDan, BaiHatDangPhat.title);
        }
      }
    });
    AnhBiaTrangChiTiet.addEventListener('keydown', function(SuKien) {
      if (SuKien.key === 'Enter' || SuKien.key === ' ') {
        SuKien.preventDefault();
        AnhBiaTrangChiTiet.click();
      }
    });
  }

  var ThanhTuaTrangChiTiet = document.getElementById('track-page-seek-slider');
  if (ThanhTuaTrangChiTiet && ThanhKeoTienDo) {
    ['input', 'change'].forEach(function(TenSuKien) {
      ThanhTuaTrangChiTiet.addEventListener(TenSuKien, function() {
        ThanhKeoTienDo.value = ThanhTuaTrangChiTiet.value;
        ThanhKeoTienDo.dispatchEvent(new Event(TenSuKien));
      });
    });
  }
  var ThanhVolTrangChiTiet = document.getElementById('track-page-volume-slider');
  if (ThanhVolTrangChiTiet && ThanhKeoAmLuong) {
    ThanhVolTrangChiTiet.addEventListener('input', function() {
      ThanhKeoAmLuong.value = ThanhVolTrangChiTiet.value;
      ThanhKeoAmLuong.dispatchEvent(new Event('input'));
    });
  }
  var NutMuteTrangChiTiet = document.getElementById('track-page-btn-mute');
  if (NutMuteTrangChiTiet && NutTatTieng) {
    NutMuteTrangChiTiet.addEventListener('click', function() { NutTatTieng.click(); });
  }
  var NutMenuTrangChiTiet = document.getElementById('track-page-btn-more');
  var MenuTrangChiTiet = document.getElementById('track-page-menu');
  if (NutMenuTrangChiTiet && MenuTrangChiTiet) {
    NutMenuTrangChiTiet.addEventListener('click', function() {
      var DangAn = MenuTrangChiTiet.classList.contains('hidden');
      MenuTrangChiTiet.classList.toggle('hidden', !DangAn);
      NutMenuTrangChiTiet.setAttribute('aria-expanded', String(DangAn));
      if (DangAn) { MenuTrangChiTiet.querySelector('button').focus(); }
    });
    MenuTrangChiTiet.addEventListener('click', function(SuKien) {
      if (SuKien.target.closest('button')) { DongMenuTrangChiTiet(); }
    });
    MenuTrangChiTiet.addEventListener('keydown', function(SuKien) {
      if (SuKien.key !== 'ArrowDown' && SuKien.key !== 'ArrowUp') { return; }
      SuKien.preventDefault();
      var NutMenu = Array.from(MenuTrangChiTiet.querySelectorAll('button'));
      var ViTriNut = NutMenu.indexOf(document.activeElement);
      NutMenu[(ViTriNut + (SuKien.key === 'ArrowDown' ? 1 : -1) + NutMenu.length) % NutMenu.length].focus();
    });
  }
  document.querySelectorAll('#master-player-bar .track-cover-wrapper, #master-player-bar .track-info').forEach(function(PhanTu) {
    PhanTu.tabIndex = 0;
    PhanTu.setAttribute('role', 'button');
    PhanTu.setAttribute('aria-label', 'Mở màn hình bài đang nghe');
    PhanTu.addEventListener('click', function() { MoTrangChiTietBaiHat(); });
    PhanTu.addEventListener('keydown', function(SuKien) {
      if (SuKien.key === 'Enter' || SuKien.key === ' ') {
        SuKien.preventDefault();
        MoTrangChiTietBaiHat();
      }
    });
  });

  var NutDongModalSua = document.getElementById('btn-modal-close');
  var NutHuyModalSua = document.getElementById('btn-modal-cancel');
  var NutChonFileModalSua = document.getElementById('btn-choose-file');
  var NutLuuModalSua = document.getElementById('btn-modal-save');

  if (NutDongModalSua) { NutDongModalSua.addEventListener('click', DongCuaSoChinhSuaBaiHat); }
  if (NutHuyModalSua) { NutHuyModalSua.addEventListener('click', DongCuaSoChinhSuaBaiHat); }
  if (NutChonFileModalSua) {
    NutChonFileModalSua.addEventListener('click', function() {
      GiaoDienUngDung.chonTepHinhAnh().then(function(KetQuaAnh) {
        if (KetQuaAnh && KetQuaAnh.base64) {
          AnhBiaTuyChonBase64 = KetQuaAnh.base64;
          var KhungXemTruoc = document.getElementById('modal-cover-preview');
          if (KhungXemTruoc) {
            KhungXemTruoc.src = KetQuaAnh.base64;
            KhungXemTruoc.style.display = 'block';
          }
        }
      });
    });
  }
  if (NutLuuModalSua) {
    NutLuuModalSua.addEventListener('click', function() {
      if (!DuLieuBaiHatDangSua) {
        return;
      }
      var OTieuDe = document.getElementById('modal-track-title');
      var ONgheSi = document.getElementById('modal-track-artist');
      var OUrlAnh = document.getElementById('modal-cover-url');

      var DuLieuCapNhat = {
        title: (function() { if (OTieuDe && OTieuDe.value && OTieuDe.value.trim()) { return OTieuDe.value.trim(); } return DuLieuBaiHatDangSua.title; })(),
        artist: (function() { if (ONgheSi && ONgheSi.value && ONgheSi.value.trim()) { return ONgheSi.value.trim(); } return DuLieuBaiHatDangSua.artist; })()
      };
      if (AnhBiaTuyChonBase64) {
        DuLieuCapNhat.customCoverBase64 = AnhBiaTuyChonBase64;
      } else if (OUrlAnh && OUrlAnh.value && OUrlAnh.value.trim()) {
        DuLieuCapNhat.cover = OUrlAnh.value.trim();
      }

      var BaiHatDaSua = DuLieuBaiHatDangSua;
      GiaoDienUngDung.chinhSuaBaiHat(BaiHatDaSua.id, BaiHatDaSua.source, DuLieuCapNhat).then(function(BaiHatDaLuu) {
        HienThiThongBao(BieuTuong.ThanhCong + ' <span>Đã cập nhật bài hát</span>', 'success', 1800);
        DongCuaSoChinhSuaBaiHat();
        DocDuLieuThuVien();
        if (BaiHatDangPhat && BaiHatDangPhat.id === BaiHatDaSua.id && BaiHatDangPhat.source === BaiHatDaSua.source) {
          if (DuLieuCapNhat.cover) { delete BaiHatDangPhat.customCoverBase64; }
          BaiHatDangPhat = Object.assign(BaiHatDangPhat, DuLieuCapNhat);
          if (BaiHatDaLuu && BaiHatDaLuu.discordCoverUrl) { BaiHatDangPhat.discordCoverUrl = BaiHatDaLuu.discordCoverUrl; }
          CapNhatThanhPhatNhacDuoiCung(BaiHatDangPhat);
          if (GiaoDienHienTai === 'track-detail') { CapNhatGiaoDienTrangChiTiet(BaiHatDangPhat); }
          LuuTrangThaiPhatNhac();
        }
      }).catch(function(Loi) {
        HienThiThongBao('Lỗi lưu bài hát: ' + XoaKyTuHTML(DinhDangLoi(Loi)), 'error', 2500);
      });
    });
  }

  var NutDongCaiDat = document.getElementById('btn-settings-close');
  var NutXongCaiDat = document.getElementById('btn-settings-done');
  if (NutDongCaiDat) { NutDongCaiDat.addEventListener('click', DongCuaSoCaiDat); }
  if (NutXongCaiDat) { NutXongCaiDat.addEventListener('click', DongCuaSoCaiDat); }

  var CongTacHuyHieu = document.getElementById('badge-toggle-input');
  if (CongTacHuyHieu) {
    CongTacHuyHieu.addEventListener('change', function() {
      ApDungHienThiNguon(CongTacHuyHieu.checked);
      LuuCauHinhNguoiDung();
    });
  }

  var CongTacChuyenBai = document.getElementById('crossfade-toggle-input');
  if (CongTacChuyenBai) {
    CongTacChuyenBai.addEventListener('change', function() {
      ApDungCaiDatChuyenNhac();
      LuuCauHinhNguoiDung();
    });
  }

  var ThanhKeoChuyenBai = document.getElementById('crossfade-duration-slider');
  if (ThanhKeoChuyenBai) {
    ThanhKeoChuyenBai.addEventListener('input', function() {
      CapNhatBieuDoChuyenNhac();
      LuuCauHinhNguoiDung();
    });
  }

  var NutDongModalThemPlaylist = document.getElementById('btn-add-playlist-modal-close');
  var NutHuyModalThemPlaylist = document.getElementById('btn-add-playlist-cancel');
  var NutXacNhanThemPlaylist = document.getElementById('btn-add-playlist-confirm');
  var NutTaoNhanhPlaylist = document.getElementById('btn-create-playlist-quick');

  if (NutDongModalThemPlaylist) { NutDongModalThemPlaylist.addEventListener('click', DongCuaSoThemVaoDanhSachPhat); }
  if (NutHuyModalThemPlaylist) { NutHuyModalThemPlaylist.addEventListener('click', DongCuaSoThemVaoDanhSachPhat); }
  if (NutTaoNhanhPlaylist) { NutTaoNhanhPlaylist.addEventListener('click', XuLyTaoNhanhDanhSachPhat); }

  if (NutXacNhanThemPlaylist) {
    NutXacNhanThemPlaylist.addEventListener('click', function() {
      if (!BaiHatThemVaoPlaylistHienTai || DanhSachPhatDuocChonTrongModal.length === 0) {
        DongCuaSoThemVaoDanhSachPhat();
        return;
      }
      var CacLoiHua = [];
      for (var i = 0; i < DanhSachPhatDuocChonTrongModal.length; i = i + 1) {
        var MaPl = DanhSachPhatDuocChonTrongModal[i];
        var Playlist = TimDanhSachPhatTheoId(MaPl);
        if (Playlist) {
          if (!Playlist.tracks) { Playlist.tracks = []; }
          var DaCo = false;
          for (var t = 0; t < Playlist.tracks.length; t = t + 1) {
            if (Playlist.tracks[t].id === BaiHatThemVaoPlaylistHienTai.id && Playlist.tracks[t].source === BaiHatThemVaoPlaylistHienTai.source) {
              DaCo = true;
              break;
            }
          }
          if (!DaCo) {
            Playlist.tracks.push(BaiHatThemVaoPlaylistHienTai);
            CacLoiHua.push(GiaoDienUngDung.luuDanhSachPhat(Playlist));
          }
        }
      }
      Promise.all(CacLoiHua).then(function() {
        HienThiThongBao(BieuTuong.ThanhCong + ' <span>Đã thêm bài hát vào danh sách phát</span>', 'success', 1800);
        DongCuaSoThemVaoDanhSachPhat();
        DocDanhSachPhatNguoiDung();
      });
    });
  }

  var NutDongModalSuaPlaylist = document.getElementById('btn-edit-playlist-modal-close');
  var NutHuyModalSuaPlaylist = document.getElementById('btn-edit-playlist-cancel');
  var NutChonAnhPlaylist = document.getElementById('btn-playlist-choose-file');
  var NutXoaAnhPlaylist = document.getElementById('btn-playlist-remove-cover');
  var NutLuuModalSuaPlaylist = document.getElementById('btn-edit-playlist-save');

  if (NutDongModalSuaPlaylist) { NutDongModalSuaPlaylist.addEventListener('click', DongCuaSoChinhSuaDanhSachPhat); }
  if (NutHuyModalSuaPlaylist) { NutHuyModalSuaPlaylist.addEventListener('click', DongCuaSoChinhSuaDanhSachPhat); }

  if (NutChonAnhPlaylist) {
    NutChonAnhPlaylist.addEventListener('click', function() {
      GiaoDienUngDung.chonTepHinhAnh().then(function(KetQuaAnh) {
        if (KetQuaAnh && KetQuaAnh.base64) {
          AnhBiaPlaylistTuyChonBase64 = KetQuaAnh.base64;
          var KhungXemTruoc = document.getElementById('modal-playlist-cover-preview');
          if (KhungXemTruoc) {
            KhungXemTruoc.src = KetQuaAnh.base64;
            KhungXemTruoc.style.display = 'block';
          }
        }
      });
    });
  }

  if (NutXoaAnhPlaylist) {
    NutXoaAnhPlaylist.addEventListener('click', function() {
      AnhBiaPlaylistTuyChonBase64 = '';
      var KhungXemTruoc = document.getElementById('modal-playlist-cover-preview');
      if (KhungXemTruoc) {
        KhungXemTruoc.src = '';
        KhungXemTruoc.style.display = 'none';
      }
      var OUrl = document.getElementById('modal-playlist-cover-url');
      if (OUrl) { OUrl.value = ''; }
    });
  }

  if (NutLuuModalSuaPlaylist) {
    NutLuuModalSuaPlaylist.addEventListener('click', function() {
      if (!DuLieuDanhSachPhatDangSua) {
        return;
      }
      var ONhapTen = document.getElementById('modal-playlist-name');
      var ONhapMoTa = document.getElementById('modal-playlist-desc');
      var ONhapUrl = document.getElementById('modal-playlist-cover-url');

      if (ONhapTen && ONhapTen.value && ONhapTen.value.trim()) {
        DuLieuDanhSachPhatDangSua.name = ONhapTen.value.trim();
      }
      if (ONhapMoTa) {
        DuLieuDanhSachPhatDangSua.description = ONhapMoTa.value.trim();
      }
      if (AnhBiaPlaylistTuyChonBase64 !== null) {
        DuLieuDanhSachPhatDangSua.customCoverBase64 = AnhBiaPlaylistTuyChonBase64;
      }
      if (ONhapUrl && ONhapUrl.value && ONhapUrl.value.trim()) {
        DuLieuDanhSachPhatDangSua.cover = ONhapUrl.value.trim();
      }

      GiaoDienUngDung.luuDanhSachPhat(DuLieuDanhSachPhatDangSua).then(function() {
        HienThiThongBao(BieuTuong.ThanhCong + ' <span>Đã lưu danh sách phát</span>', 'success', 1800);
        DongCuaSoChinhSuaDanhSachPhat();
        DocDanhSachPhatNguoiDung();
      });
    });
  }

  var NutHuyXoaPlaylist = document.getElementById('btn-confirm-delete-cancel');
  var NutXacNhanXoaPlaylist = document.getElementById('btn-confirm-delete-ok');
  var ModalXoaPlaylist = document.getElementById('confirm-delete-playlist-modal');
  ModalXoaPlaylist.addEventListener('click', function(SuKien) { if (SuKien.target === ModalXoaPlaylist) { DongCuaSoXacNhanXoaDanhSachPhat(); } });
  ModalXoaPlaylist.addEventListener('keydown', function(SuKien) {
    if (SuKien.key === 'Escape') { SuKien.preventDefault(); SuKien.stopPropagation(); DongCuaSoXacNhanXoaDanhSachPhat(); }
    if (SuKien.key === 'Tab' && !DangXoaPlaylist) { SuKien.preventDefault(); (document.activeElement === NutHuyXoaPlaylist ? NutXacNhanXoaPlaylist : NutHuyXoaPlaylist).focus(); }
  });

  if (NutHuyXoaPlaylist) { NutHuyXoaPlaylist.addEventListener('click', DongCuaSoXacNhanXoaDanhSachPhat); }
  if (NutXacNhanXoaPlaylist) {
    NutXacNhanXoaPlaylist.addEventListener('click', function() {
      if (DangXoaPlaylist) { return; }
      if (!DanhSachPhatDangXacNhanXoa) {
        DongCuaSoXacNhanXoaDanhSachPhat();
        return;
      }
      var IdXoa = DanhSachPhatDangXacNhanXoa.id;
      DangXoaPlaylist = true; NutXacNhanXoaPlaylist.disabled = true; NutHuyXoaPlaylist.disabled = true;
      ModalXoaPlaylist.setAttribute('aria-busy', 'true'); NutXacNhanXoaPlaylist.textContent = 'Đang xóa…';
      GiaoDienUngDung.xoaDanhSachPhat(IdXoa).then(function(DaXoa) {
        DanhSachPhatNguoiDung = DanhSachPhatNguoiDung.filter(function(Playlist) { return Playlist.id !== IdXoa; });
        DanhSachPhatDuocChonTrongModal = DanhSachPhatDuocChonTrongModal.filter(function(Id) { return Id !== IdXoa; });
        if (PlaylistTruocKhiMoTrangChiTiet === IdXoa) { PlaylistTruocKhiMoTrangChiTiet = null; GiaoDienTruocKhiMoTrangChiTiet = 'home'; }
        DangXoaPlaylist = false;
        DongCuaSoXacNhanXoaDanhSachPhat();
        if (MaDanhSachPhatHienTai === IdXoa) { if (GiaoDienHienTai === 'playlist') { ChuyenDoiGiaoDien('home', null); } else { MaDanhSachPhatHienTai = null; } }
        VeDanhSachPhatThanhBen(); LuuTrangThaiPhatNhac();
        HienThiThongBao(BieuTuong.ThungRac + ' <span>' + (DaXoa === false ? 'Danh sách phát không còn tồn tại' : 'Đã xóa danh sách phát') + '</span>', 'info', 1800);
      }).catch(function(Loi) { HienThiThongBao('Chưa xóa được playlist: ' + XoaKyTuHTML(DinhDangLoi(Loi)), 'error', 3500); }).finally(function() {
        DangXoaPlaylist = false; NutXacNhanXoaPlaylist.disabled = false; NutHuyXoaPlaylist.disabled = false;
        ModalXoaPlaylist.removeAttribute('aria-busy'); NutXacNhanXoaPlaylist.textContent = 'Xóa luôn';
      });
    });
  }

  var NutDongXemAnh = document.getElementById('btn-close-image-viewer');
  var NenXemAnh = document.getElementById('image-viewer-backdrop');
  if (NutDongXemAnh) { NutDongXemAnh.addEventListener('click', DongTrinhXemAnh); }
  if (NenXemAnh) {
    NenXemAnh.addEventListener('click', function(SuKien) {
      if (SuKien.target === NenXemAnh) { DongTrinhXemAnh(); }
    });
  }
  var AnhTrongTrinhXem = document.getElementById('image-viewer-img');
  if (AnhTrongTrinhXem) {
    AnhTrongTrinhXem.addEventListener('click', function(SuKien) {
      SuKien.stopPropagation();
      DaoPhongToAnh(SuKien);
    });
    AnhTrongTrinhXem.addEventListener('keydown', function(SuKien) {
      if (SuKien.key === 'Enter' || SuKien.key === ' ') {
        SuKien.preventDefault();
        AnhTrongTrinhXem.click();
      }
    });
    AnhTrongTrinhXem.addEventListener('pointermove', function(SuKien) {
      if (!AnhTrongTrinhXem.classList.contains('zoomed')) { return; }
      var Khung = document.getElementById('image-viewer-container').getBoundingClientRect();
      var X = Math.min(100, Math.max(0, (SuKien.clientX - Khung.left) / Khung.width * 100));
      var Y = Math.min(100, Math.max(0, (SuKien.clientY - Khung.top) / Khung.height * 100));
      AnhTrongTrinhXem.style.transformOrigin = X + '% ' + Y + '%';
    });
  }
  var CuaSoXemAnh = document.getElementById('image-viewer-modal');
  if (CuaSoXemAnh) {
    CuaSoXemAnh.addEventListener('keydown', function(SuKien) {
      if (SuKien.key === 'Escape') {
        SuKien.preventDefault();
        SuKien.stopPropagation();
        DongTrinhXemAnh();
      } else if (SuKien.key === 'Tab') {
        var CacNut = Array.from(CuaSoXemAnh.querySelectorAll('button, [tabindex="0"]')).filter(function(Nut) { return Nut.getClientRects().length > 0; });
        if (!CacNut.length) { return; }
        SuKien.preventDefault();
        var ViTriNut = CacNut.indexOf(document.activeElement);
        CacNut[(ViTriNut + (SuKien.shiftKey ? -1 : 1) + CacNut.length) % CacNut.length].focus();
      }
    });
  }
  window.addEventListener('resize', function() {
    if (CuaSoXemAnh && CuaSoXemAnh.style.display === 'flex') { DatKichThuocAnhXem(); }
  });
  document.addEventListener('visibilitychange', CapNhatHieuUngSong);

  var NutDongMocAB = document.getElementById('btn-ab-popup-close');
  var NutDatMocAB = document.getElementById('btn-ab-set-point');
  var NutXoaMocAB = document.getElementById('btn-ab-clear');

  if (NutDongMocAB) { NutDongMocAB.addEventListener('click', DongCuaSoMocLapAB); }
  if (NutDatMocAB) {
    NutDatMocAB.addEventListener('click', function() {
      if (!BaiHatDangPhat) {
        DongCuaSoMocLapAB();
        return;
      }
      var Khoa = LayKhoaBaiHat(BaiHatDangPhat);
      var DoanHienTai = MocLapABMap[Khoa];
      if (!DoanHienTai || DoanHienTai.start === null) {
        MocLapABMap[Khoa] = { start: ThoiGianMocABMucTieu, end: null };
        HienThiThongBao('Đã đặt mốc A tại ' + DinhDangThoiGian(ThoiGianMocABMucTieu, false), 'info', 1800);
      } else if (DoanHienTai.end === null) {
        if (ThoiGianMocABMucTieu > DoanHienTai.start) {
          DoanHienTai.end = ThoiGianMocABMucTieu;
          HienThiThongBao('Đã đặt mốc B tại ' + DinhDangThoiGian(ThoiGianMocABMucTieu, false) + ' - Bắt đầu lặp A-B', 'success', 2000);
        } else {
          DoanHienTai.start = ThoiGianMocABMucTieu;
          HienThiThongBao('Đã cập nhật lại mốc A tại ' + DinhDangThoiGian(ThoiGianMocABMucTieu, false), 'info', 1800);
        }
      } else {
        MocLapABMap[Khoa] = { start: ThoiGianMocABMucTieu, end: null };
        HienThiThongBao('Đã đặt mốc A mới tại ' + DinhDangThoiGian(ThoiGianMocABMucTieu, false), 'info', 1800);
      }
      CapNhatGiaoDienDauMocAB();
      DongCuaSoMocLapAB();
    });
  }
  if (NutXoaMocAB) {
    NutXoaMocAB.addEventListener('click', function() {
      if (BaiHatDangPhat) {
        var Khoa = LayKhoaBaiHat(BaiHatDangPhat);
        delete MocLapABMap[Khoa];
      }
      CapNhatGiaoDienDauMocAB();
      DongCuaSoMocLapAB();
      HienThiThongBao('Đã xóa đoạn lặp A-B', 'info', 1800);
    });
  }

  document.addEventListener('click', function(SuKien) {
    if (!SuKien.target.closest('#track-page-menu') && !SuKien.target.closest('#track-page-btn-more')) {
      DongMenuTrangChiTiet();
    }
    if (!SuKien.target.closest('#player-more-menu') && !SuKien.target.closest('#player-btn-more')) {
      DongMenuTuyChonThanhPhat();
    }
    if (!SuKien.target.closest('#track-floating-menu') && !SuKien.target.closest('.btn-card-menu')) {
      DongMenuTroiBaiHat();
    }
    if (DangMoCuaSoMocAB && !SuKien.target.closest('#ab-loop-popup') && !SuKien.target.closest('#seek-slider')) {
      DongCuaSoMocLapAB();
    }
  });

  document.addEventListener('keydown', function(SuKien) {
    if (SuKien.key !== 'Escape' || GiaoDienHienTai !== 'track-detail') { return; }
    if (MenuTrangChiTiet && !MenuTrangChiTiet.classList.contains('hidden')) {
      DongMenuTrangChiTiet();
      NutMenuTrangChiTiet.focus();
    } else if (document.getElementById('image-viewer-modal').style.display === 'flex') {
      DongTrinhXemAnh();
    } else if (!document.getElementById('edit-modal').classList.contains('hidden')) {
      DongCuaSoChinhSuaBaiHat();
    } else if (!document.getElementById('add-to-playlist-modal').classList.contains('hidden')) {
      DongCuaSoThemVaoDanhSachPhat();
    } else if (!document.querySelector('.modal-overlay:not(.hidden)[style*="flex"]')) {
      DongTrangChiTietBaiHat();
    }
  });

  try {
    var TiepTucLuu = localStorage.getItem('omni_home_continue');
    if (TiepTucLuu) {
      TiepTucNgheTrangChu = JSON.parse(TiepTucLuu);
    }
    var LichSuLuu = localStorage.getItem('omni_home_history');
    if (LichSuLuu) {
      LichSuNgheTrangChu = JSON.parse(LichSuLuu);
    }
  } catch (Loi) {}

  var KhoiTaoGu = GoiYAmNhac.khoiTao();
  Promise.allSettled([DocDuLieuThuVien(), DocDanhSachPhatNguoiDung(), KhoiTaoGu]).then(function() { VeToanBoTrangChu(); });
  KhoiPhucPhienLamViec();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', KhoiTaoUngDung);
} else {
  KhoiTaoUngDung();
}
