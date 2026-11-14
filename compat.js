/* ============================================================
   SpaceKill124 全站兼容层  compat.js
   ------------------------------------------------------------
   目标：新旧浏览器内核都能正常打开与操作
   1) 补齐老内核缺失的 JS API（Chrome 49+ / Safari 10+ / 国产双核 / 老 Android WebView）
   2) supabase-js 多 CDN 容错加载（jsDelivr → fastly → unpkg → cdnjs），
      全部失败也不阻塞页面，只让登录相关功能给出明确提示，绝不抛 TypeError
   3) 提供 window.__sbReady（Promise）与 window.__needSb() 守卫
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. JS API 补齐 ---------- */
  if (!Array.from) {
    Array.from = function (obj, fn, thisArg) {
      var out = [], i, len;
      if (obj == null) return out;
      if (typeof obj.length === 'number') {
        len = obj.length;
        for (i = 0; i < len; i++) out.push(fn ? fn.call(thisArg, obj[i], i) : obj[i]);
      } else {
        for (i in obj) if (Object.prototype.hasOwnProperty.call(obj, i)) out.push(obj[i]);
      }
      return out;
    };
  }
  if (!Array.prototype.includes) {
    Array.prototype.includes = function (v, from) {
      var len = this.length >>> 0, i = from | 0;
      if (i < 0) i = Math.max(0, len + i);
      for (; i < len; i++) if (this[i] === v || (v !== v && this[i] !== this[i])) return true;
      return false;
    };
  }
  if (!Array.prototype.find) {
    Array.prototype.find = function (fn, thisArg) {
      for (var i = 0; i < this.length; i++) if (fn.call(thisArg, this[i], i, this)) return this[i];
      return undefined;
    };
  }
  if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function (fn, thisArg) {
      for (var i = 0; i < this.length; i++) if (fn.call(thisArg, this[i], i, this)) return i;
      return -1;
    };
  }
  if (!String.prototype.includes) {
    String.prototype.includes = function (s, p) { return this.indexOf(s, p || 0) !== -1; };
  }
  if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (s, p) { return this.substr(p || 0, s.length) === s; };
  }
  if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (s, l) {
      var str = String(this);
      if (l === undefined || l > str.length) l = str.length;
      return str.substring(l - s.length, l) === s;
    };
  }
  if (!String.prototype.padStart) {
    String.prototype.padStart = function (n, pad) {
      var s = String(this); pad = pad === undefined ? ' ' : String(pad);
      if (s.length >= n || !pad) return s;
      var fill = ''; while (fill.length < n - s.length) fill += pad;
      return fill.slice(0, n - s.length) + s;
    };
  }
  if (!String.prototype.trim) {
    String.prototype.trim = function () { return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ''); };
  }
  if (!Object.assign) {
    Object.assign = function (t) {
      for (var i = 1; i < arguments.length; i++) {
        var s = arguments[i]; if (!s) continue;
        for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k];
      }
      return t;
    };
  }
  if (!Object.values) {
    Object.values = function (o) {
      var out = []; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out.push(o[k]);
      return out;
    };
  }
  if (!Object.entries) {
    Object.entries = function (o) {
      var out = []; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out.push([k, o[k]]);
      return out;
    };
  }
  if (!Element.prototype.remove) {
    Element.prototype.remove = function () { if (this.parentNode) this.parentNode.removeChild(this); };
  }
  if (!Element.prototype.closest) {
    Element.prototype.closest = function (sel) {
      var el = this;
      while (el && el.nodeType === 1) {
        var m = el.matches || el.msMatchesSelector || el.webkitMatchesSelector;
        if (m && m.call(el, sel)) return el;
        el = el.parentNode;
      }
      return null;
    };
  }
  if (window.NodeList && !NodeList.prototype.forEach) NodeList.prototype.forEach = Array.prototype.forEach;
  if (window.HTMLCollection && !HTMLCollection.prototype.forEach) HTMLCollection.prototype.forEach = Array.prototype.forEach;
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (cb) { return setTimeout(function () { cb(Date.now()); }, 16); };
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function (id) { clearTimeout(id); };
  }
  if (!window.Promise) {
    /* 极老内核：给一个最小 Promise，避免整页脚本因 Promise 未定义而中断 */
    window.Promise = function (fn) {
      var self = this; self._cbs = []; self._state = 0; self._val = undefined;
      function settle(state, val) {
        if (self._state) return;
        self._state = state; self._val = val;
        setTimeout(function () {
          for (var i = 0; i < self._cbs.length; i++) {
            var c = self._cbs[i];
            var h = state === 1 ? c.ok : c.err;
            if (typeof h === 'function') { try { h(val); } catch (e) {} }
          }
          self._cbs = [];
        }, 0);
      }
      self.then = function (ok, err) {
        self._cbs.push({ ok: ok, err: err });
        if (self._state) settle(self._state, self._val);
        return self;
      };
      self['catch'] = function (err) { return self.then(null, err); };
      try { fn(function (v) { settle(1, v); }, function (e) { settle(2, e); }); }
      catch (e) { settle(2, e); }
    };
    window.Promise.resolve = function (v) { return new window.Promise(function (r) { r(v); }); };
    window.Promise.reject = function (e) { return new window.Promise(function (_, j) { j(e); }); };
    window.Promise.all = function (arr) {
      return new window.Promise(function (res, rej) {
        var out = [], left = arr.length;
        if (!left) return res(out);
        for (var i = 0; i < arr.length; i++) (function (i) {
          arr[i].then(function (v) { out[i] = v; if (--left === 0) res(out); }, rej);
        })(i);
      });
    };
  }

  /* ---------- 2. supabase-js 多 CDN 容错加载 ---------- */
  var SOURCES = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://fastly.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://cdnjs.cloudflare.com/ajax/libs/supabase-js/2.39.0/supabase.min.js',
    'https://cdn.staticfile.org/@supabase/supabase-js/2.39.0/supabase.min.js'
  ];

  var _resolve;
  window.__sbReady = new window.Promise(function (r) { _resolve = r; });
  window.__sbLoadError = null;

  function loadAt(i) {
    if (window.supabase && window.supabase.createClient) { _resolve(true); return; }
    if (i >= SOURCES.length) {
      window.__sbLoadError = 'supabase-js 所有 CDN 源均加载失败';
      if (window.console && console.error) console.error(window.__sbLoadError);
      _resolve(false);
      return;
    }
    var s = document.createElement('script');
    s.src = SOURCES[i];
    s.async = true;
    s.onload = function () {
      if (window.supabase && window.supabase.createClient) _resolve(true);
      else loadAt(i + 1);
    };
    s.onerror = function () {
      if (s.parentNode) s.parentNode.removeChild(s);
      loadAt(i + 1);
    };
    document.head.appendChild(s);
  }

  /* 若页面已用同步 script 引入成功，直接放行 */
  if (window.supabase && window.supabase.createClient) _resolve(true);
  else loadAt(0);

  /* ---------- 3. 守卫：登录相关操作前调用 ---------- */
  window.__needSb = function (client) {
    if (client && client.auth) return true;
    var msg = window.__sbLoadError
      ? '登录服务加载失败（网络或 CDN 被拦截）。\n请检查网络后刷新页面重试。'
      : '登录服务还在加载中，请稍等 2 秒后重试。';
    try { alert(msg); } catch (e) {}
    return false;
  };

  /* 统一的安全调用：client 为空时返回 {data:null,error:{message}} 而不是抛异常 */
  window.__sbCall = function (client, fn) {
    if (!client || !client.auth) {
      return window.Promise.resolve({ data: null, error: { message: '登录服务未就绪，请刷新页面重试' } });
    }
    try { return fn(client); }
    catch (e) { return window.Promise.resolve({ data: null, error: { message: e && e.message ? e.message : String(e) } }); }
  };

  /* ---------- 4. 安全桩客户端 ----------
     当 supabase-js 尚未加载成功时，用它顶替 supabaseClient，
     保证任何 supabaseClient.auth.xxx / .from(x).select() 调用都不会抛
     "Cannot read property 'auth' of null"，只会安静地返回错误对象。 */
  var STUB_ERR = { message: '登录服务未就绪（网络或 CDN 被拦截），请刷新页面重试' };

  function makeStub() {
    var chain = {};
    var methods = ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'in', 'or',
      'and', 'order', 'limit', 'range', 'single', 'maybeSingle', 'match', 'filter',
      'ilike', 'like', 'is', 'not', 'gte', 'lte', 'gt', 'lt', 'contains', 'textSearch',
      'returns', 'abortSignal', 'csv', 'geojson', 'explain', 'head', 'count'];
    for (var i = 0; i < methods.length; i++) {
      chain[methods[i]] = function () { return chain; };
    }
    chain.then = function (ok) {
      var res = { data: null, error: STUB_ERR, count: 0, status: 0, statusText: 'stub' };
      if (typeof ok === 'function') { try { ok(res); } catch (e) {} }
      return chain;
    };
    chain['catch'] = function () { return chain; };
    chain.select = function () { return chain; };

    var auth = {
      getSession: function () { return window.Promise.resolve({ data: { session: null }, error: null }); },
      getUser: function () { return window.Promise.resolve({ data: { user: null }, error: null }); },
      signOut: function () { return window.Promise.resolve({ error: null }); },
      signInWithOtp: function () { return window.Promise.resolve({ data: null, error: STUB_ERR }); },
      signInWithPassword: function () { return window.Promise.resolve({ data: null, error: STUB_ERR }); },
      verifyOtp: function () { return window.Promise.resolve({ data: null, error: STUB_ERR }); },
      updateUser: function () { return window.Promise.resolve({ data: null, error: STUB_ERR }); },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; },
      resetPasswordForEmail: function () { return window.Promise.resolve({ data: null, error: STUB_ERR }); }
    };

    return {
      __stub: true,
      auth: auth,
      from: function () { return chain; },
      rpc: function () { return chain; },
      storage: { from: function () { return chain; } },
      channel: function () { return { on: function () { return this; }, subscribe: function () { return this; }, unsubscribe: function () {} }; },
      removeChannel: function () {}
    };
  }
  window.__sbStub = makeStub;

  /* 统一初始化：真实客户端可用就用真实的，否则用桩；就绪后自动替换 */
  window.__sbInit = function (url, key, current) {
    if (current && !current.__stub) return current;
    if (window.supabase && window.supabase.createClient) {
      try { return window.supabase.createClient(url, key); } catch (e) {}
    }
    return current && current.__stub ? current : makeStub();
  };
})();
