/*!
 * eoffice-bridge.js — ให้ระบบที่อยู่ "ต่างโดเมน" กับ EN-MSU Smart Office (เช่น DWMS บน GitHub Pages)
 * เปิดลิงก์ / ฟอร์ม / window.open ภายในกรอบ EN-MSU Smart Office แทนการเปิดแท็บใหม่หรือหลุดออกจากหน้าครอบ
 *
 * วิธีใช้: ใส่บรรทัดนี้ใน <head> ของทุกหน้าในระบบนั้น (เช่น ทุกหน้าของ DWMS)
 *   <script src="eoffice-bridge.js"></script>
 * ถ้าหน้าไม่ได้เปิดผ่าน EN-MSU Smart Office สคริปต์นี้จะไม่ทำอะไรเลย ใช้งานตามปกติได้
 */
(function(){
  if (window.top === window) return;                 // ไม่ได้อยู่ในกรอบ EN-MSU Smart Office
  var ALLOWED_PARENT = ['https://eng.msu.ac.th'];    // โดเมนที่วาง EN-MSU Smart Office (เพิ่มได้)

  var parentOrigin = null, systems = [];
  try { parentOrigin = new URL(document.referrer).origin; } catch (e) {}
  if (ALLOWED_PARENT.indexOf(parentOrigin) < 0) parentOrigin = null;

  function post(msg){ if (parentOrigin) window.parent.postMessage(msg, parentOrigin); }

  window.addEventListener('message', function(e){
    if (ALLOWED_PARENT.indexOf(e.origin) < 0 || !e.data || e.data.eoffice !== 'hello') return;
    parentOrigin = e.origin;
    systems = (e.data.systems || []).map(function(u){ var x = new URL(u); return x.origin + x.pathname.replace(/\/+$/, ''); });
    post({ eoffice:'location', url: location.href, title: document.title });
  });

  function abs(u){ try { return new URL(u, location.href); } catch (e) { return null; } }
  function otherSystem(u){                           // เป็นระบบอื่นใน EN-MSU Smart Office หรือไม่
    var p = u.origin + u.pathname;
    return u.origin !== location.origin && systems.some(function(b){ return p === b || p.indexOf(b + '/') === 0; });
  }
  function keep(u){ return u && /^https?:$/.test(u.protocol) && (u.origin === location.origin || otherSystem(u)); }
  function namedFrame(t){ try { return !!document.querySelector('iframe[name="' + CSS.escape(t) + '"],frame[name="' + CSS.escape(t) + '"]'); } catch (e) { return false; } }
  function leaks(t){ t = (t || '').trim().toLowerCase(); return t && t !== '_self' && !namedFrame(t); }
  function baseTarget(){ var b = document.querySelector('base[target]'); return b ? b.getAttribute('target') : ''; }
  function go(u){ if (otherSystem(u)) post({ eoffice:'navigate', url: u.href }); else location.href = u.href; }

  document.addEventListener('click', function(e){
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.hasAttribute('download')) return;
    var u = abs(a.href);
    if (!keep(u) || (!leaks(a.getAttribute('target') || baseTarget()) && !otherSystem(u))) return;
    e.preventDefault(); go(u);
  }, true);

  function fixForm(f, sub){
    var t = (sub && sub.getAttribute('formtarget')) || f.getAttribute('target') || baseTarget();
    var u = abs((sub && sub.getAttribute('formaction')) || f.action || location.href);
    if (leaks(t) && u && u.origin === location.origin){ f.setAttribute('target', '_self'); if (sub) sub.removeAttribute('formtarget'); }
  }
  document.addEventListener('submit', function(e){ fixForm(e.target, e.submitter); }, true);
  var origSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function(){ fixForm(this); return origSubmit.call(this); };

  var origOpen = window.open;
  window.open = function(url, name){
    var u = url && abs(url);
    if (u && keep(u) && !namedFrame(name || '')){ go(u); return window; }
    return origOpen.apply(window, arguments);
  };

  window.addEventListener('load', function(){ post({ eoffice:'location', url: location.href, title: document.title }); });
})();
