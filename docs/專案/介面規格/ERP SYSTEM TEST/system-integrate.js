// NEXORA GRID — 系統整合層（路由 + 視圖散開／合攏轉場）
// 三層 Dock 的葉節點呼叫 window.nxNavigate({module,page,label})：
//   · module==='home'  → 首頁儀表板
//   · 帶 page（主檔頁）→ 主檔視圖，交給 NXMaster 引擎渲染該頁
//   · 其餘（舊模組子項）→ toast 提示後續階段
// 視圖切換時，畫面的「框框」向外散開、淡出 → 合攏、淡入；TopBar 不動。
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var views = { home: $('#view-home'), master: $('#view-master'), purchase: $('#view-purchase') };
  var host = $('#nx-master-host');
  var purchaseHost = $('#nx-purchase-host');
  var EASE = 'cubic-bezier(.34,.05,.2,1)';
  var PUSH = 120;

  function framesOf(view) {
    return Array.prototype.slice.call(view.querySelectorAll('.card, .nx-frame, .nx-page-head'));
  }
  function setScatter(view, scattered, instant) {
    var vr = view.getBoundingClientRect();
    var cx = vr.left + vr.width / 2, cy = vr.top + vr.height / 2;
    framesOf(view).forEach(function (elm) {
      elm.style.transition = instant ? 'none' : ('transform .44s ' + EASE + ', opacity .4s ease');
      if (scattered) {
        var r = elm.getBoundingClientRect();
        var dx = (r.left + r.width / 2) - cx, dy = (r.top + r.height / 2) - cy;
        var m = Math.hypot(dx, dy) || 1;
        elm.style.transform = 'translate(' + (dx / m * PUSH).toFixed(1) + 'px,' + (dy / m * PUSH).toFixed(1) + 'px) scale(.9)';
        elm.style.opacity = '0';
      } else { elm.style.transform = ''; elm.style.opacity = ''; }
    });
  }
  function finalize(view) {
    framesOf(view).forEach(function (elm) { elm.style.transition = 'none'; elm.style.transform = ''; elm.style.opacity = ''; });
  }

  var tid = 0;
  // name: 'home'|'master'；render：可選，於切換中段填入新內容（主檔頁）
  function showView(name, render) {
    var next = views[name]; if (!next) return;
    var cur = [views.home, views.master, views.purchase].filter(function (v) { return v && !v.hidden; })[0];

    if (reduce) {
      if (render) render();
      Object.keys(views).forEach(function (k) { if (views[k]) views[k].hidden = (k !== name); });
      return;
    }

    var myid = ++tid;
    var same = (cur === next);
    if (cur) setScatter(cur, true, false);
    setTimeout(function () {
      if (myid !== tid) return;
      if (cur && !same) { cur.hidden = true; finalize(cur); }
      if (render) render();
      next.hidden = false;
      setScatter(next, true, true);
      void next.offsetWidth;
      setScatter(next, false, false);
      setTimeout(function () { if (myid === tid) finalize(next); }, 560);
    }, cur ? 300 : 0);
  }
  window.nxShowView = showView;

  /* ---------- 導覽 ---------- */
  window.nxNavigate = function (arg, label2) {
    // 相容：(key, label) 舊簽名
    var moduleKey, pageId, label;
    if (arg && typeof arg === 'object') { moduleKey = arg.module; pageId = arg.page; label = arg.label; }
    else { moduleKey = arg; label = label2; }

    if (pageId) {
      if (window.NXPurchase && window.NXPurchase.has(pageId)) {
        showView('purchase', function () { if (purchaseHost) window.NXPurchase.render(pageId, purchaseHost); });
        return;
      }
      showView('master', function () { if (window.NXMaster && host) window.NXMaster.render(pageId, host); });
      return;
    }
    if (moduleKey === 'home' || moduleKey === undefined) { showView('home'); return; }
    // 其他模組（首頁以外、非主檔頁）：提示後續階段
    if (window.NXMaster) window.NXMaster.toast('「' + (label || moduleKey) + '」屬後續階段，本次未實作', true);
  };

  /* ---------- 點品牌字樣回首頁 ---------- */
  var home = $('#home-btn');
  if (home) home.addEventListener('click', function () { showView('home'); });
})();
