(function (root) {
  'use strict';

  var frequencies = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  var labels = ['31 Hz', '63 Hz', '125 Hz', '250 Hz', '500 Hz', '1 kHz', '2 kHz', '4 kHz', '8 kHz', '16 kHz'];
  var presets = { original: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], gentle: [0, 0, 0, 0, 0, 0, -1, -2, -1.5, 0] };
  var settings = Object.create(null), saved = Object.create(null), revisions = Object.create(null);
  var timers = new Map(), graphs = new Map(), bindings = new Map(), saveStates = Object.create(null);
  var activeTrack = null, initialized = false, opener = null;

  function el(id) { return document.getElementById(id); }
  function key(track) { return track ? JSON.stringify([track.source, track.id]) : ''; }
  function normalize(value) {
    return {
      enabled: !value || value.enabled !== false,
      gainsDb: frequencies.map(function (_, i) {
        var gain = Number(value && value.gainsDb && value.gainsDb[i]);
        return Number.isFinite(gain) ? Math.max(-12, Math.min(12, gain)) : 0;
      })
    };
  }
  function get(trackKey) { return normalize(settings[trackKey]); }
  function decibels(value) { return (value > 0 ? '+' : '') + value.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' dB'; }
  function error(failure) { root.HienThiThongBao(root.XoaKyTuHTML(String(failure && failure.message || failure)), 'error', 4000); }

  function smooth(param, value, context) {
    var time = context.currentTime, previous = param.value;
    param.cancelScheduledValues(time);
    param.setValueAtTime(previous, time);
    param.setTargetAtTime(value, time, 0.015);
  }

  function applyGraph(graph) {
    var setting = get(graph.trackKey), gains = setting.enabled ? setting.gainsDb : frequencies.map(function () { return 0; });
    // Calculate the combined response, rather than adding all band gains.
    graph.response.fill(1);
    graph.filters.forEach(function (filter, i) {
      graph.measure[i].gain.value = gains[i];
      graph.measure[i].getFrequencyResponse(graph.testFrequencies, graph.magnitude, graph.phase);
      graph.response.forEach(function (_, j) { graph.response[j] *= graph.magnitude[j]; });
    });
    var peak = Math.max.apply(null, graph.response), boosting = gains.some(function (gain) { return gain > 0; });
    graph.headroomDb = boosting ? Math.max(0, 20 * Math.log10(Math.max(1, peak))) + 1 : 0;
    smooth(graph.preamp.gain, Math.pow(10, -graph.headroomDb / 20), graph.context);
    graph.filters.forEach(function (filter, i) { smooth(filter.gain, gains[i], graph.context); });
    graph.gainsDb = gains.slice();
  }

  function applyKey(trackKey) {
    graphs.forEach(function (graph) { if (graph.trackKey === trackKey) { applyGraph(graph); } });
  }

  function connect(context, audio, source, analyser) {
    if (graphs.has(audio)) { return; }
    var preamp = context.createGain(), filters = [], measure = [];
    frequencies.forEach(function (frequency) {
      [filters, measure].forEach(function (list) {
        var filter = context.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = Math.min(frequency, context.sampleRate * 0.49);
        filter.Q.value = Math.SQRT2;
        list.push(filter);
      });
    });
    var testFrequencies = new Float32Array(256), upper = context.sampleRate * 0.49;
    testFrequencies.forEach(function (_, i) { testFrequencies[i] = 10 * Math.pow(upper / 10, i / 255); });
    var graph = {
      context: context, preamp: preamp, filters: filters, measure: measure,
      trackKey: bindings.get(audio) || '', testFrequencies: testFrequencies,
      response: new Float32Array(256), magnitude: new Float32Array(256), phase: new Float32Array(256)
    };
    applyGraph(graph);
    source.connect(preamp);
    var tail = preamp;
    filters.forEach(function (filter) { tail.connect(filter); tail = filter; });
    tail.connect(context.destination);
    if (analyser) { tail.connect(analyser); }
    graphs.set(audio, graph);
    render();
  }

  function save(trackKey) {
    clearTimeout(timers.get(trackKey)); timers.delete(trackKey);
    var revision = revisions[trackKey] || 0, value = get(trackKey);
    saveStates[trackKey] = 'saving'; render();
    return root.GiaoDienUngDung.luuEQBaiHat(trackKey, value).then(function () {
      saved[trackKey] = normalize(value);
      if (revisions[trackKey] === revision) { saveStates[trackKey] = 'saved'; }
    }).catch(function (failure) {
      if (revisions[trackKey] === revision) {
        settings[trackKey] = normalize(saved[trackKey]);
        saveStates[trackKey] = 'error'; applyKey(trackKey);
      }
      error(failure);
    }).finally(render);
  }

  function edit(value, immediate) {
    var trackKey = key(activeTrack); if (!trackKey) { return; }
    settings[trackKey] = normalize(value);
    revisions[trackKey] = (revisions[trackKey] || 0) + 1;
    saveStates[trackKey] = 'pending'; applyKey(trackKey); render();
    clearTimeout(timers.get(trackKey));
    if (immediate) { save(trackKey); }
    else { timers.set(trackKey, setTimeout(function () { save(trackKey); }, 400)); }
  }

  function select(track, audio, visible) {
    var trackKey = key(track);
    if (audio) {
      bindings.set(audio, trackKey);
      var graph = graphs.get(audio);
      if (graph) { graph.trackKey = trackKey; applyGraph(graph); }
    }
    if (visible !== false) {
      var previous = key(activeTrack);
      if (previous && previous !== trackKey && timers.has(previous)) { save(previous); }
      activeTrack = track; render();
    }
  }

  function render() {
    if (!initialized) { return; }
    var trackKey = key(activeTrack), setting = get(trackKey), changed = setting.gainsDb.some(function (gain) { return gain !== 0; });
    document.querySelectorAll('[data-eq-open]').forEach(function (button) {
      button.disabled = !trackKey;
      button.classList.toggle('active', !!trackKey && setting.enabled && changed);
      button.title = trackKey ? 'EQ riêng: ' + activeTrack.title : 'Chọn một bài để chỉnh EQ';
    });
    el('eq-track-title').textContent = activeTrack ? activeTrack.title : 'Chọn bài hát để chỉnh EQ';
    el('eq-track-artist').textContent = activeTrack ? activeTrack.artist : 'Mỗi bài có một bộ chỉnh riêng.';
    el('eq-enabled').checked = setting.enabled;
    el('eq-enabled').disabled = !trackKey;
    el('eq-reset').disabled = !trackKey;
    var preset = Object.keys(presets).find(function (name) {
      return presets[name].every(function (gain, i) { return gain === setting.gainsDb[i]; });
    });
    document.querySelectorAll('[data-eq-preset]').forEach(function (button) {
      var selected = button.dataset.eqPreset === preset;
      button.disabled = !trackKey;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    el('eq-preset-description').textContent = preset === 'gentle' ? 'Giảm chói · 2 kHz −1 dB, 4 kHz −2 dB, 8 kHz −1,5 dB. Chỉ áp dụng cho bài này.' : preset === 'original' ? 'Bản gốc · Các dải tần ở 0 dB.' : 'Tùy chỉnh · Tự nhớ từng dải tần của bài này.';
    document.querySelectorAll('[data-eq-band]').forEach(function (slider) {
      var index = Number(slider.dataset.eqBand);
      slider.value = setting.gainsDb[index]; slider.disabled = !trackKey || !setting.enabled;
      slider.setAttribute('aria-valuetext', decibels(setting.gainsDb[index]));
      el('eq-value-' + index).textContent = decibels(setting.gainsDb[index]);
    });
    var status = saveStates[trackKey];
    el('eq-save-status').textContent = !trackKey ? '' : status === 'pending' || status === 'saving' ? 'Đang lưu EQ cho bài này…' : status === 'error' ? 'Chưa lưu được. Đã trở về mức chỉnh trước.' : 'Tự nhớ mức chỉnh riêng cho bài này.';
    var headroom = 0;
    graphs.forEach(function (graph) { if (graph.trackKey === trackKey) { headroom = graph.headroomDb; } });
    el('eq-headroom').textContent = setting.enabled && headroom > 0.1 ? 'Âm lượng đầu vào giảm ' + headroom.toFixed(1).replace('.', ',') + ' dB để hạn chế méo tiếng khi tăng EQ.' : '0 dB giữ nguyên · Kéo lên để tăng, kéo xuống để giảm.';
    if (el('eq-settings-status')) { el('eq-settings-status').textContent = activeTrack ? 'Đang chỉnh riêng: ' + activeTrack.title : 'Phát một bài rồi mở EQ để chỉnh.'; }
  }

  function close() {
    el('eq-modal').hidden = true; el('eq-modal').setAttribute('aria-hidden', 'true');
    document.querySelectorAll('[data-eq-open]').forEach(function (button) { button.setAttribute('aria-expanded', 'false'); });
    if (opener && opener.isConnected) { opener.focus({ preventScroll: true }); }
  }

  function open(button) {
    if (!activeTrack) { return; }
    opener = button; render();
    el('eq-modal').hidden = false; el('eq-modal').setAttribute('aria-hidden', 'false');
    button.setAttribute('aria-expanded', 'true'); el('eq-close').focus();
  }

  function init() {
    if (initialized) { return; } initialized = true;
    frequencies.forEach(function (_, i) {
      var band = document.createElement('label'); band.className = 'eq-band'; band.htmlFor = 'eq-band-' + i;
      var value = document.createElement('output'); value.id = 'eq-value-' + i; value.htmlFor = 'eq-band-' + i;
      var slider = document.createElement('input'); slider.type = 'range'; slider.id = 'eq-band-' + i;
      slider.min = -12; slider.max = 12; slider.step = 0.5; slider.value = 0; slider.dataset.eqBand = i;
      slider.setAttribute('aria-label', labels[i]); slider.setAttribute('aria-orientation', 'vertical');
      var name = document.createElement('span'); name.textContent = labels[i];
      slider.addEventListener('input', function () { var value = get(key(activeTrack)); value.gainsDb[i] = Number(this.value); edit(value, false); });
      slider.addEventListener('change', function () { var trackKey = key(activeTrack); if (trackKey && timers.has(trackKey)) { save(trackKey); } });
      band.append(value, slider, name); el('eq-bands').appendChild(band);
    });
    document.querySelectorAll('[data-eq-open]').forEach(function (button) { button.addEventListener('click', function () { open(button); }); });
    el('eq-close').addEventListener('click', close);
    el('eq-modal').addEventListener('click', function (event) { if (event.target === this) { close(); } });
    el('eq-enabled').addEventListener('change', function () { var value = get(key(activeTrack)); value.enabled = this.checked; edit(value, true); });
    el('eq-reset').addEventListener('click', function () { edit(normalize(null), true); });
    document.querySelectorAll('[data-eq-preset]').forEach(function (button) {
      button.addEventListener('click', function () { edit({ enabled: true, gainsDb: presets[button.dataset.eqPreset].slice() }, true); });
    });
    document.addEventListener('keydown', function (event) {
      if (el('eq-modal').hidden) { return; }
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
      if (event.key === 'Tab') {
        var items = Array.from(el('eq-modal').querySelectorAll('button:not(:disabled), input:not(:disabled)'));
        var first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }, true);
    root.addEventListener('pagehide', function () { Array.from(timers.keys()).forEach(save); });
    render();
  }

  root.EqualizerBaiHat = {
    khoiTao: init, ketNoi: connect, chonBai: select,
    apDungCauHinh: function (config) {
      var stored = config.trackEqualizers || {};
      Object.keys(stored).forEach(function (trackKey) {
        if (!revisions[trackKey]) { settings[trackKey] = normalize(stored[trackKey]); saved[trackKey] = normalize(stored[trackKey]); }
      });
      graphs.forEach(applyGraph); render();
    },
    layTrangThai: function (audio) {
      var graph = graphs.get(audio);
      return graph ? { key: graph.trackKey, gainsDb: graph.gainsDb.slice(), headroomDb: graph.headroomDb } : null;
    }
  };
})(window);
