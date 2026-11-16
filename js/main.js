/* Portafolio · Christian Valle — lógica del sitio
   (idioma ES/EN, transiciones, selectores, galería, pantalla completa, zoom y contacto).
   Sin dependencias ni compilación: se puede abrir directamente index.html. */
/* ------------------------------------------------------------------
   Motor de plantillas mínimo (sin dependencias).
   Lee la plantilla de <template id="tpl">, enlaza {{ valores }},
   <sc-if> (condicional) y <sc-for> (listas) y vuelve a pintar
   cuando cambia el estado.
------------------------------------------------------------------- */
(function () {
'use strict';

var RE = /\{\{\s*([^}]+?)\s*\}\}/g;
var ONE = /^\{\{\s*([^}]+?)\s*\}\}$/;

function get(scope, path) {
  if (path === 'true') return true;
  if (path === 'false') return false;
  var parts = path.split('.');
  var v = scope;
  for (var i = 0; i < parts.length; i++) {
    if (v == null) return undefined;
    v = v[parts[i]];
  }
  return v;
}
function str(v) { return v == null || v === false ? '' : String(v); }
function interp(tpl, scope) {
  var m = ONE.exec(tpl);
  if (m) return get(scope, m[1]);
  return tpl.replace(RE, function (_, p) { return str(get(scope, p)); });
}

function setSrc(el, src) {
  var SS = window.__SRCSET || {};
  var s = str(src);
  if (SS[s]) { el.setAttribute('srcset', SS[s]); if (el.dataset.sizes) el.setAttribute('sizes', el.dataset.sizes); }
  else el.removeAttribute('srcset');
  el.setAttribute('src', s);
}

function compile(root) {
  var binds = [];

  function walk(node) {
    if (node.nodeType === 3) {
      if (node.nodeValue.indexOf('{{') >= 0) {
        var t = node.nodeValue, last;
        binds.push(function (sc) { var v = str(interp(t, sc)); if (v !== last) { last = v; node.nodeValue = v; } });
      }
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase();

    if (tag === 'sc-if' || tag === 'sc-for') {
      var anchor = document.createComment(tag);
      var frag = document.createDocumentFragment();
      while (node.firstChild) frag.appendChild(node.firstChild);
      var expr = (tag === 'sc-if' ? node.getAttribute('value') : node.getAttribute('list')) || '';
      var as = node.getAttribute('as') || 'item';
      node.parentNode.replaceChild(anchor, node);
      if (tag === 'sc-if') {
        var mounted = null, upd = null;
        binds.push(function (sc) {
          var on = !!interp(expr, sc);
          if (on && !mounted) {
            var c = frag.cloneNode(true);
            upd = compile(c);
            mounted = Array.prototype.slice.call(c.childNodes);
            upd(sc);
            anchor.parentNode.insertBefore(c, anchor);
          } else if (on && upd) {
            upd(sc);
          } else if (!on && mounted) {
            mounted.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
            mounted = null; upd = null;
          }
        });
      } else {
        var inst = [];
        binds.push(function (sc) {
          var list = interp(expr, sc) || [];
          while (inst.length > list.length) {
            var gone = inst.pop();
            gone.nodes.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
          }
          for (var i = 0; i < list.length; i++) {
            var s2 = Object.create(sc); s2[as] = list[i];
            if (!inst[i]) {
              var c2 = frag.cloneNode(true);
              var u2 = compile(c2);
              var nodes = Array.prototype.slice.call(c2.childNodes);
              u2(s2);
              anchor.parentNode.insertBefore(c2, anchor);
              inst[i] = { nodes: nodes, upd: u2 };
            } else {
              inst[i].upd(s2);
            }
          }
        });
      }
      return;
    }

    var attrs = Array.prototype.slice.call(node.attributes);
    attrs.forEach(function (a) {
      var name = a.name, val = a.value;
      if (name === 'hint-placeholder-val' || name === 'hint-placeholder-count') { node.removeAttribute(name); return; }
      if (val.indexOf('{{') < 0) return;
      node.removeAttribute(name);
      if (name.indexOf('on') === 0) {
        var evt = name.slice(2).toLowerCase(), fn = null;
        node.addEventListener(evt, function (e) { if (typeof fn === 'function') fn(e); });
        binds.push(function (sc) { fn = interp(val, sc); });
        return;
      }
      var last = {};
      binds.push(function (sc) {
        var v = interp(val, sc);
        if (v === last) return;
        last = v;
        if (name === 'data-bind-src') { setSrc(node, v); return; }
        if (v === undefined || v === null) { node.removeAttribute(name); return; }
        node.setAttribute(name, typeof v === 'boolean' ? String(v) : str(v));
      });
    });
    var kids = Array.prototype.slice.call(node.childNodes);
    kids.forEach(walk);
  }

  Array.prototype.slice.call(root.childNodes).forEach(walk);
  return function update(scope) { for (var i = 0; i < binds.length; i++) binds[i](scope); };
}

/* Clase base: estado + render agrupado en un microtask */
function DCLogic() {}
DCLogic.prototype.setState = function (patch) {
  var p = typeof patch === 'function' ? patch(this.state) : patch;
  for (var k in p) this.state[k] = p[k];
  var self = this;
  if (!self._queued) {
    self._queued = true;
    Promise.resolve().then(function () { self._queued = false; self._render(); });
  }
};

function mount(Comp, host, props) {
  var tpl = document.getElementById('tpl');
  var c = new Comp();
  c.props = props || {};
  var frag = tpl.content.cloneNode(true);
  var upd = compile(frag);
  c._render = function () { upd(c.renderVals()); };
  upd(c.renderVals());
  host.appendChild(frag);
  return c;
}

window.DCLogic = DCLogic;
window.DCMount = mount;
})();

(function () {
'use strict';
window.__SRCSET = {
"img/teatro-san-miguel/render-1.webp": "img/teatro-san-miguel/render-1-1200.webp 1200w, img/teatro-san-miguel/render-1.webp 1599w",
"img/teatro-san-miguel/render-2.webp": "img/teatro-san-miguel/render-2-1200.webp 1200w, img/teatro-san-miguel/render-2.webp 1599w",
"img/teatro-san-miguel/render-3.webp": "img/teatro-san-miguel/render-3-1200.webp 1200w, img/teatro-san-miguel/render-3.webp 1599w",
"img/teatro-san-miguel/render-4.webp": "img/teatro-san-miguel/render-4-1200.webp 1200w, img/teatro-san-miguel/render-4.webp 1599w",
"img/teatro-san-miguel/nivel-01.webp": "img/teatro-san-miguel/nivel-01-1600.webp 1600w, img/teatro-san-miguel/nivel-01.webp 3500w",
"img/teatro-san-miguel/nivel-01-en.webp": "img/teatro-san-miguel/nivel-01-en-1600.webp 1600w, img/teatro-san-miguel/nivel-01-en.webp 3500w",
"img/teatro-san-miguel/nivel-00.webp": "img/teatro-san-miguel/nivel-00-1600.webp 1600w, img/teatro-san-miguel/nivel-00.webp 3500w",
"img/teatro-san-miguel/nivel-00-en.webp": "img/teatro-san-miguel/nivel-00-en-1600.webp 1600w, img/teatro-san-miguel/nivel-00-en.webp 3500w",
"img/teatro-san-miguel/nivel-m01.webp": "img/teatro-san-miguel/nivel-m01-1600.webp 1600w, img/teatro-san-miguel/nivel-m01.webp 3500w",
"img/teatro-san-miguel/nivel-m01-en.webp": "img/teatro-san-miguel/nivel-m01-en-1600.webp 1600w, img/teatro-san-miguel/nivel-m01-en.webp 3500w",
"img/teatro-san-miguel/nivel-m02.webp": "img/teatro-san-miguel/nivel-m02-1600.webp 1600w, img/teatro-san-miguel/nivel-m02.webp 3500w",
"img/teatro-san-miguel/nivel-m02-en.webp": "img/teatro-san-miguel/nivel-m02-en-1600.webp 1600w, img/teatro-san-miguel/nivel-m02-en.webp 3500w",
"img/teatro-san-miguel/seccion-a.webp": "img/teatro-san-miguel/seccion-a-1600.webp 1600w, img/teatro-san-miguel/seccion-a.webp 3500w",
"img/teatro-san-miguel/seccion-a-en.webp": "img/teatro-san-miguel/seccion-a-en-1600.webp 1600w, img/teatro-san-miguel/seccion-a-en.webp 3500w",
"img/teatro-san-miguel/seccion-b.webp": "img/teatro-san-miguel/seccion-b-1600.webp 1600w, img/teatro-san-miguel/seccion-b.webp 3500w",
"img/teatro-san-miguel/seccion-b-en.webp": "img/teatro-san-miguel/seccion-b-en-1600.webp 1600w, img/teatro-san-miguel/seccion-b-en.webp 3500w",
"img/casa-mabel/render-1.webp": "img/casa-mabel/render-1-1200.webp 1200w, img/casa-mabel/render-1.webp 1800w",
"img/casa-mabel/render-2.webp": "img/casa-mabel/render-2-1200.webp 1200w, img/casa-mabel/render-2.webp 1800w",
"img/casa-mabel/render-3.webp": "img/casa-mabel/render-3-1200.webp 1200w, img/casa-mabel/render-3.webp 1800w",
"img/casa-mabel/render-4.webp": "img/casa-mabel/render-4-1200.webp 1200w, img/casa-mabel/render-4.webp 1800w",
"img/casa-mabel/render-5.webp": "img/casa-mabel/render-5-1200.webp 1200w, img/casa-mabel/render-5.webp 1800w",
"img/casa-mabel/planta.webp": "img/casa-mabel/planta-1600.webp 1600w, img/casa-mabel/planta.webp 3500w",
"img/casa-mabel/planta-en.webp": "img/casa-mabel/planta-en-1600.webp 1600w, img/casa-mabel/planta-en.webp 3500w",
"img/casa-mabel/seccion-a.webp": "img/casa-mabel/seccion-a-1600.webp 1600w, img/casa-mabel/seccion-a.webp 3500w",
"img/casa-mabel/seccion-a-en.webp": "img/casa-mabel/seccion-a-en-1600.webp 1600w, img/casa-mabel/seccion-a-en.webp 3500w",
"img/casa-mabel/seccion-b.webp": "img/casa-mabel/seccion-b-1600.webp 1600w, img/casa-mabel/seccion-b.webp 3500w",
"img/casa-mabel/seccion-b-en.webp": "img/casa-mabel/seccion-b-en-1600.webp 1600w, img/casa-mabel/seccion-b-en.webp 3500w",
"img/casa-arroyo/render-1.webp": "img/casa-arroyo/render-1-1200.webp 1200w, img/casa-arroyo/render-1.webp 1440w",
"img/casa-arroyo/render-2.webp": "img/casa-arroyo/render-2-1200.webp 1200w, img/casa-arroyo/render-2.webp 1440w",
"img/casa-arroyo/render-3.webp": "img/casa-arroyo/render-3-1200.webp 1200w, img/casa-arroyo/render-3.webp 1260w",
"img/casa-arroyo/render-4.webp": "img/casa-arroyo/render-4-1200.webp 1200w, img/casa-arroyo/render-4.webp 1440w",
"img/casa-arroyo/planta-alta.webp": "img/casa-arroyo/planta-alta-1600.webp 1600w, img/casa-arroyo/planta-alta.webp 3500w",
"img/casa-arroyo/planta-alta-en.webp": "img/casa-arroyo/planta-alta-en-1600.webp 1600w, img/casa-arroyo/planta-alta-en.webp 3500w",
"img/casa-arroyo/planta-baja.webp": "img/casa-arroyo/planta-baja-1600.webp 1600w, img/casa-arroyo/planta-baja.webp 3500w",
"img/casa-arroyo/planta-baja-en.webp": "img/casa-arroyo/planta-baja-en-1600.webp 1600w, img/casa-arroyo/planta-baja-en.webp 3500w",
"img/casa-arroyo/seccion-a.webp": "img/casa-arroyo/seccion-a-1600.webp 1600w, img/casa-arroyo/seccion-a.webp 3500w",
"img/casa-arroyo/seccion-a-en.webp": "img/casa-arroyo/seccion-a-en-1600.webp 1600w, img/casa-arroyo/seccion-a-en.webp 3500w",
"img/casa-arroyo/seccion-b.webp": "img/casa-arroyo/seccion-b-1600.webp 1600w, img/casa-arroyo/seccion-b.webp 3500w",
"img/casa-arroyo/seccion-b-en.webp": "img/casa-arroyo/seccion-b-en-1600.webp 1600w, img/casa-arroyo/seccion-b-en.webp 3500w",
"img/casa-arroyo/seccion-c.webp": "img/casa-arroyo/seccion-c-1600.webp 1600w, img/casa-arroyo/seccion-c.webp 3500w",
"img/casa-arroyo/seccion-c-en.webp": "img/casa-arroyo/seccion-c-en-1600.webp 1600w, img/casa-arroyo/seccion-c-en.webp 3500w",
"img/casa-guayabo/render-1.webp": "img/casa-guayabo/render-1-1200.webp 1200w, img/casa-guayabo/render-1.webp 1800w",
"img/casa-guayabo/render-2.webp": "img/casa-guayabo/render-2-1200.webp 1200w, img/casa-guayabo/render-2.webp 1800w",
"img/casa-guayabo/render-3.webp": "img/casa-guayabo/render-3-1200.webp 1200w, img/casa-guayabo/render-3.webp 1800w",
"img/casa-guayabo/render-4.webp": "img/casa-guayabo/render-4-1200.webp 1200w, img/casa-guayabo/render-4.webp 1440w",
"img/casa-guayabo/render-5.webp": "img/casa-guayabo/render-5-1200.webp 1200w, img/casa-guayabo/render-5.webp 1440w",
"img/casa-guayabo/render-6.webp": "img/casa-guayabo/render-6-1200.webp 1200w, img/casa-guayabo/render-6.webp 1440w",
"img/casa-guayabo/nivel-01.webp": "img/casa-guayabo/nivel-01-1600.webp 1600w, img/casa-guayabo/nivel-01.webp 3500w",
"img/casa-guayabo/nivel-01-en.webp": "img/casa-guayabo/nivel-01-en-1600.webp 1600w, img/casa-guayabo/nivel-01-en.webp 3500w",
"img/casa-guayabo/nivel-00.webp": "img/casa-guayabo/nivel-00-1600.webp 1600w, img/casa-guayabo/nivel-00.webp 3500w",
"img/casa-guayabo/nivel-00-en.webp": "img/casa-guayabo/nivel-00-en-1600.webp 1600w, img/casa-guayabo/nivel-00-en.webp 3500w",
"img/casa-guayabo/nivel-m01.webp": "img/casa-guayabo/nivel-m01-1600.webp 1600w, img/casa-guayabo/nivel-m01.webp 3500w",
"img/casa-guayabo/nivel-m01-en.webp": "img/casa-guayabo/nivel-m01-en-1600.webp 1600w, img/casa-guayabo/nivel-m01-en.webp 3500w",
"img/casa-guayabo/seccion-a.webp": "img/casa-guayabo/seccion-a-1600.webp 1600w, img/casa-guayabo/seccion-a.webp 3500w",
"img/casa-guayabo/seccion-a-en.webp": "img/casa-guayabo/seccion-a-en-1600.webp 1600w, img/casa-guayabo/seccion-a-en.webp 3500w",
"img/casa-guayabo/seccion-b.webp": "img/casa-guayabo/seccion-b-1600.webp 1600w, img/casa-guayabo/seccion-b.webp 3500w",
"img/casa-guayabo/seccion-b-en.webp": "img/casa-guayabo/seccion-b-en-1600.webp 1600w, img/casa-guayabo/seccion-b-en.webp 3500w",
"img/casa-guayabo/seccion-c.webp": "img/casa-guayabo/seccion-c-1600.webp 1600w, img/casa-guayabo/seccion-c.webp 3500w",
"img/casa-guayabo/seccion-c-en.webp": "img/casa-guayabo/seccion-c-en-1600.webp 1600w, img/casa-guayabo/seccion-c-en.webp 3500w",
"img/teatro-san-miguel/intro.webp": "img/teatro-san-miguel/intro-1200.webp 1200w, img/teatro-san-miguel/intro.webp 1599w",
"img/casa-mabel/intro.webp": "img/casa-mabel/intro-1200.webp 1200w, img/casa-mabel/intro.webp 1600w",
"img/casa-arroyo/intro.webp": "img/casa-arroyo/intro-1200.webp 1200w, img/casa-arroyo/intro.webp 1440w",
"img/casa-guayabo/intro.webp": "img/casa-guayabo/intro-1200.webp 1200w, img/casa-guayabo/intro.webp 1600w"
};
window.__SMALL = {
"img/teatro-san-miguel/render-1.webp": "img/teatro-san-miguel/render-1-1200.webp",
"img/teatro-san-miguel/render-2.webp": "img/teatro-san-miguel/render-2-1200.webp",
"img/teatro-san-miguel/render-3.webp": "img/teatro-san-miguel/render-3-1200.webp",
"img/teatro-san-miguel/render-4.webp": "img/teatro-san-miguel/render-4-1200.webp",
"img/teatro-san-miguel/nivel-01.webp": "img/teatro-san-miguel/nivel-01-1600.webp",
"img/teatro-san-miguel/nivel-01-en.webp": "img/teatro-san-miguel/nivel-01-en-1600.webp",
"img/teatro-san-miguel/nivel-00.webp": "img/teatro-san-miguel/nivel-00-1600.webp",
"img/teatro-san-miguel/nivel-00-en.webp": "img/teatro-san-miguel/nivel-00-en-1600.webp",
"img/teatro-san-miguel/nivel-m01.webp": "img/teatro-san-miguel/nivel-m01-1600.webp",
"img/teatro-san-miguel/nivel-m01-en.webp": "img/teatro-san-miguel/nivel-m01-en-1600.webp",
"img/teatro-san-miguel/nivel-m02.webp": "img/teatro-san-miguel/nivel-m02-1600.webp",
"img/teatro-san-miguel/nivel-m02-en.webp": "img/teatro-san-miguel/nivel-m02-en-1600.webp",
"img/teatro-san-miguel/seccion-a.webp": "img/teatro-san-miguel/seccion-a-1600.webp",
"img/teatro-san-miguel/seccion-a-en.webp": "img/teatro-san-miguel/seccion-a-en-1600.webp",
"img/teatro-san-miguel/seccion-b.webp": "img/teatro-san-miguel/seccion-b-1600.webp",
"img/teatro-san-miguel/seccion-b-en.webp": "img/teatro-san-miguel/seccion-b-en-1600.webp",
"img/casa-mabel/render-1.webp": "img/casa-mabel/render-1-1200.webp",
"img/casa-mabel/render-2.webp": "img/casa-mabel/render-2-1200.webp",
"img/casa-mabel/render-3.webp": "img/casa-mabel/render-3-1200.webp",
"img/casa-mabel/render-4.webp": "img/casa-mabel/render-4-1200.webp",
"img/casa-mabel/render-5.webp": "img/casa-mabel/render-5-1200.webp",
"img/casa-mabel/planta.webp": "img/casa-mabel/planta-1600.webp",
"img/casa-mabel/planta-en.webp": "img/casa-mabel/planta-en-1600.webp",
"img/casa-mabel/seccion-a.webp": "img/casa-mabel/seccion-a-1600.webp",
"img/casa-mabel/seccion-a-en.webp": "img/casa-mabel/seccion-a-en-1600.webp",
"img/casa-mabel/seccion-b.webp": "img/casa-mabel/seccion-b-1600.webp",
"img/casa-mabel/seccion-b-en.webp": "img/casa-mabel/seccion-b-en-1600.webp",
"img/casa-arroyo/render-1.webp": "img/casa-arroyo/render-1-1200.webp",
"img/casa-arroyo/render-2.webp": "img/casa-arroyo/render-2-1200.webp",
"img/casa-arroyo/render-3.webp": "img/casa-arroyo/render-3-1200.webp",
"img/casa-arroyo/render-4.webp": "img/casa-arroyo/render-4-1200.webp",
"img/casa-arroyo/planta-alta.webp": "img/casa-arroyo/planta-alta-1600.webp",
"img/casa-arroyo/planta-alta-en.webp": "img/casa-arroyo/planta-alta-en-1600.webp",
"img/casa-arroyo/planta-baja.webp": "img/casa-arroyo/planta-baja-1600.webp",
"img/casa-arroyo/planta-baja-en.webp": "img/casa-arroyo/planta-baja-en-1600.webp",
"img/casa-arroyo/seccion-a.webp": "img/casa-arroyo/seccion-a-1600.webp",
"img/casa-arroyo/seccion-a-en.webp": "img/casa-arroyo/seccion-a-en-1600.webp",
"img/casa-arroyo/seccion-b.webp": "img/casa-arroyo/seccion-b-1600.webp",
"img/casa-arroyo/seccion-b-en.webp": "img/casa-arroyo/seccion-b-en-1600.webp",
"img/casa-arroyo/seccion-c.webp": "img/casa-arroyo/seccion-c-1600.webp",
"img/casa-arroyo/seccion-c-en.webp": "img/casa-arroyo/seccion-c-en-1600.webp",
"img/casa-guayabo/render-1.webp": "img/casa-guayabo/render-1-1200.webp",
"img/casa-guayabo/render-2.webp": "img/casa-guayabo/render-2-1200.webp",
"img/casa-guayabo/render-3.webp": "img/casa-guayabo/render-3-1200.webp",
"img/casa-guayabo/render-4.webp": "img/casa-guayabo/render-4-1200.webp",
"img/casa-guayabo/render-5.webp": "img/casa-guayabo/render-5-1200.webp",
"img/casa-guayabo/render-6.webp": "img/casa-guayabo/render-6-1200.webp",
"img/casa-guayabo/nivel-01.webp": "img/casa-guayabo/nivel-01-1600.webp",
"img/casa-guayabo/nivel-01-en.webp": "img/casa-guayabo/nivel-01-en-1600.webp",
"img/casa-guayabo/nivel-00.webp": "img/casa-guayabo/nivel-00-1600.webp",
"img/casa-guayabo/nivel-00-en.webp": "img/casa-guayabo/nivel-00-en-1600.webp",
"img/casa-guayabo/nivel-m01.webp": "img/casa-guayabo/nivel-m01-1600.webp",
"img/casa-guayabo/nivel-m01-en.webp": "img/casa-guayabo/nivel-m01-en-1600.webp",
"img/casa-guayabo/seccion-a.webp": "img/casa-guayabo/seccion-a-1600.webp",
"img/casa-guayabo/seccion-a-en.webp": "img/casa-guayabo/seccion-a-en-1600.webp",
"img/casa-guayabo/seccion-b.webp": "img/casa-guayabo/seccion-b-1600.webp",
"img/casa-guayabo/seccion-b-en.webp": "img/casa-guayabo/seccion-b-en-1600.webp",
"img/casa-guayabo/seccion-c.webp": "img/casa-guayabo/seccion-c-1600.webp",
"img/casa-guayabo/seccion-c-en.webp": "img/casa-guayabo/seccion-c-en-1600.webp",
"img/teatro-san-miguel/intro.webp": "img/teatro-san-miguel/intro-1200.webp",
"img/casa-mabel/intro.webp": "img/casa-mabel/intro-1200.webp",
"img/casa-arroyo/intro.webp": "img/casa-arroyo/intro-1200.webp",
"img/casa-guayabo/intro.webp": "img/casa-guayabo/intro-1200.webp"
};
var DCLogic = window.DCLogic;
class Portfolio extends DCLogic {
state = { menu: false, screen: 'bio', sel: -1, view: 0, lang: null, contact: false, copied: false, fade: false, dir: 1, splash: false, shot: 0, ready: true, blank: false };
detectLang() {
try {
const saved = localStorage.getItem('portfolio-lang');
if (saved === 'es' || saved === 'en') return saved;
} catch (e) {}
let nl = '';
try { nl = (navigator.language || '').toLowerCase(); } catch (e) {}
return nl.indexOf('es') === 0 ? 'es' : 'en';
}
chooseLang(l) {
try { localStorage.setItem('portfolio-lang', l); } catch (e) {}
this.setState({ lang: l });
}
openLightbox(opener) {
const d = this._lb;
if (!d || this._lbOpen || !d.srcs || !d.srcs.length) return;
this._lbOpen = true; this._lbT = Date.now();
const self = this, rm = this.reduced(), es = d.lang !== 'en';
const L = (a, b) => (es ? a : b);
const HI = this._hi || {};
const n = d.srcs.length;
let idx = Math.max(0, Math.min(d.idx || 0, n - 1));
let sc = 1, px = 0, py = 0, fw = 0, fh = 0, ratio = 5830 / 3230, fsOn = false, closing = false, tick = 0, lastToggle = 0;
const prevFocus = document.activeElement;
const prevHtml = document.documentElement.style.overflow, prevBody = document.body.style.overflow;
const mk = (tag, cls, attrs) => { const el = document.createElement(tag); if (cls) el.className = cls; if (attrs) { for (const k in attrs) el.setAttribute(k, attrs[k]); } return el; };
const root = mk('div', 'lb', { role: 'dialog', 'aria-modal': 'true', 'aria-label': L('Vista ampliada', 'Enlarged view'), tabindex: '-1' });
root.style.setProperty('--acc', d.accent || '#8FA9C4');
root.style.opacity = rm ? '1' : '0';
const stage = mk('div', 'lb-stage');
const img = mk('img', 'lb-img', { alt: '', draggable: 'false' });
stage.appendChild(img); root.appendChild(stage);
const btn = (cls, label, text) => { const b = mk('button', 'lb-btn ' + cls, { type: 'button', 'aria-label': label, title: label }); b.textContent = text; return b; };
const tools = mk('div', 'lb-tools');
const bOut = btn('lb-out', L('Alejar', 'Zoom out'), '−');
const bIn = btn('lb-in', L('Acercar', 'Zoom in'), '+');
const bFit = btn('lb-fit', L('Ajustar a la pantalla', 'Fit to screen'), L('Ajustar', 'Fit'));
tools.appendChild(bOut); tools.appendChild(bIn); tools.appendChild(bFit); root.appendChild(tools);
const bClose = btn('lb-close', L('Cerrar', 'Close'), '×'); root.appendChild(bClose);
let bPrev = null, bNext = null;
if (n > 1) { bPrev = btn('lb-nav lb-prev', L('Imagen anterior', 'Previous image'), '‹'); bNext = btn('lb-nav lb-next', L('Imagen siguiente', 'Next image'), '›'); root.appendChild(bPrev); root.appendChild(bNext); }
const cap = mk('div', 'lb-cap', { 'aria-live': 'polite' });
const capName = mk('span', 'lb-name'), capCount = mk('span', 'lb-count');
cap.appendChild(capName); if (n > 1) cap.appendChild(capCount); root.appendChild(cap);
const W = () => stage.clientWidth, H = () => stage.clientHeight;
const layout = () => { const w = W(), h = H(), m = 16; const aw = Math.max(w - 2 * m, 20), ah = Math.max(h - 2 * m, 20); if (aw / ah > ratio) { fh = ah; fw = ah * ratio; } else { fw = aw; fh = aw / ratio; } img.style.width = fw + 'px'; img.style.height = fh + 'px'; };
const clampPos = () => { const w = W(), h = H(), iw = fw * sc, ih = fh * sc; px = iw <= w ? (w - iw) / 2 : Math.min(0, Math.max(w - iw, px)); py = ih <= h ? (h - ih) / 2 : Math.min(0, Math.max(h - ih, py)); };
const apply = (anim) => { clampPos(); if (anim && !rm) img.classList.add('anim'); else img.classList.remove('anim'); img.style.transform = 'translate(' + px + 'px,' + py + 'px) scale(' + sc + ')'; if (sc > 1.001) stage.classList.add('zoomed'); else stage.classList.remove('zoomed'); bOut.setAttribute('aria-disabled', sc <= 1.001 ? 'true' : 'false'); bIn.setAttribute('aria-disabled', sc >= 3.999 ? 'true' : 'false'); };
const fit = (anim) => { sc = 1; px = 0; py = 0; apply(anim); };
const zoomAt = (cx, cy, f, anim) => { const ns = Math.max(1, Math.min(4, sc * f)); const k = ns / sc; px = cx - (cx - px) * k; py = cy - (cy - py) * k; sc = ns; apply(anim); };
const toggleZoom = (clientX, clientY) => { lastToggle = Date.now(); const r = stage.getBoundingClientRect(); if (sc > 1.001) fit(true); else zoomAt(clientX - r.left, clientY - r.top, 2, true); };
const names = d.names || [];
const show = (i, instant) => {
idx = (i + n) % n;
const my = ++tick;
const hi = d.srcs[idx], low = (window.__SMALL || {})[hi] || hi;
capName.textContent = names[idx] || ''; capCount.textContent = (idx + 1) + ' / ' + n;
try { self.setState({ shot: idx }); } catch (e) {}
const swap = () => {
if (my !== tick || closing) return;
img.onload = () => { if (my === tick && img.naturalWidth > 1) { ratio = img.naturalWidth / img.naturalHeight; layout(); apply(false); } };
img.src = low; layout(); fit(false); img.style.opacity = '1';
if (hi !== low) { const t = new Image(); t.onload = () => { if (my === tick && !closing) img.src = hi; }; t.src = hi; }
[idx + 1, idx - 1].forEach((j) => { const h2 = d.srcs[(j + n) % n]; if (h2) { const t2 = new Image(); t2.src = h2; } });
};
if (instant || rm) swap(); else { img.style.opacity = '0'; setTimeout(swap, 140); }
};
const close = () => {
if (closing) return; closing = true; tick++;
document.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', onResize); document.removeEventListener('fullscreenchange', onFs);
try { if (document.fullscreenElement) { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => {}); } } catch (e) {}
const fin = () => {
try { root.remove(); } catch (e) {}
document.documentElement.style.overflow = prevHtml; document.body.style.overflow = prevBody;
self._lbOpen = false;
try { self.setState({ shot: idx }); } catch (e) {}
try { if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true }); } catch (e) {}
};
if (rm) fin(); else { root.style.opacity = '0'; setTimeout(fin, 230); }
};
const onResize = () => { layout(); apply(false); };
const onFs = () => { if (document.fullscreenElement === root) fsOn = true; else if (fsOn) { close(); return; } setTimeout(onResize, 50); };
const onKey = (e) => {
if (e.ctrlKey || e.metaKey || e.altKey) return;
const k = e.key;
if (k === 'Tab') {
const fl = Array.prototype.slice.call(root.querySelectorAll('button')); if (!fl.length) return;
const first = fl[0], last = fl[fl.length - 1], act = document.activeElement;
if (e.shiftKey && (act === first || act === root)) { e.preventDefault(); last.focus(); }
else if (!e.shiftKey && act === last) { e.preventDefault(); first.focus(); }
else if (!root.contains(act)) { e.preventDefault(); first.focus(); }
return;
}
let handled = true;
if (k === 'Escape') close();
else if (k === 'ArrowLeft') { if (n > 1) show(idx - 1); }
else if (k === 'ArrowRight') { if (n > 1) show(idx + 1); }
else if (k === '+' || k === '=') zoomAt(W() / 2, H() / 2, 1.5, true);
else if (k === '-' || k === '_') zoomAt(W() / 2, H() / 2, 1 / 1.5, true);
else if (k === '0') fit(true);
else if (k === 'ArrowUp' || k === 'ArrowDown') { /* blocked: the page behind must not react */ }
else handled = false;
if (handled) { e.preventDefault(); e.stopImmediatePropagation(); }
};
bOut.addEventListener('click', () => zoomAt(W() / 2, H() / 2, 1 / 1.5, true));
bIn.addEventListener('click', () => zoomAt(W() / 2, H() / 2, 1.5, true));
bFit.addEventListener('click', () => fit(true));
bClose.addEventListener('click', close);
if (bPrev) bPrev.addEventListener('click', () => show(idx - 1));
if (bNext) bNext.addEventListener('click', () => show(idx + 1));
stage.addEventListener('wheel', (e) => {
e.preventDefault();
const r = stage.getBoundingClientRect();
const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : (e.deltaMode === 1 ? 0.05 : 0.0018)));
zoomAt(e.clientX - r.left, e.clientY - r.top, f, false);
}, { passive: false });
stage.addEventListener('dblclick', (e) => { if (Date.now() - self._lbT < 450 || Date.now() - lastToggle < 500) return; toggleZoom(e.clientX, e.clientY); });
const ptrs = new Map(); let g = null, pinch = null, lastTap = null;
stage.addEventListener('pointerdown', (e) => {
if (e.pointerType === 'mouse' && e.button !== 0) return;
try { stage.setPointerCapture(e.pointerId); } catch (er) {}
ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
if (ptrs.size === 2) {
const v = Array.from(ptrs.values()), r = stage.getBoundingClientRect(), a = v[0], b = v[1];
pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, sc0: sc, px0: px, py0: py, cx0: (a.x + b.x) / 2 - r.left, cy0: (a.y + b.y) / 2 - r.top };
g = null;
} else if (ptrs.size === 1) {
g = { x: e.clientX, y: e.clientY, px0: px, py0: py, moved: false, onImg: e.target === img, type: e.pointerType };
}
});
stage.addEventListener('pointermove', (e) => {
if (!ptrs.has(e.pointerId)) return;
ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
if (pinch && ptrs.size >= 2) {
const v = Array.from(ptrs.values()), r = stage.getBoundingClientRect(), a = v[0], b = v[1];
const dist = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top;
const ns = Math.max(1, Math.min(4, pinch.sc0 * dist / pinch.d0)), k = ns / pinch.sc0;
px = cx - (pinch.cx0 - pinch.px0) * k; py = cy - (pinch.cy0 - pinch.py0) * k; sc = ns; apply(false);
return;
}
if (g && ptrs.size === 1) {
const dx = e.clientX - g.x, dy = e.clientY - g.y;
if (Math.abs(dx) + Math.abs(dy) > 5) g.moved = true;
if (sc > 1.001 && g.moved) { px = g.px0 + dx; py = g.py0 + dy; stage.classList.add('dragging'); apply(false); }
else if (sc <= 1.001 && g.moved && g.type !== 'mouse' && (g.pull || (dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.2))) { g.pull = Math.max(0, dy); img.classList.remove('anim'); img.style.transform = 'translate(' + px + 'px,' + (py + g.pull) + 'px) scale(1)'; root.style.transition = 'none'; root.style.opacity = String(Math.max(0.35, 1 - g.pull / 500)); }
}
});
const up = (e) => {
if (!ptrs.has(e.pointerId)) return;
ptrs.delete(e.pointerId); stage.classList.remove('dragging');
try { stage.releasePointerCapture(e.pointerId); } catch (er) {}
if (pinch) { if (ptrs.size < 2) pinch = null; g = null; return; }
if (!g) return;
const gg = g; g = null;
if (gg.pull !== undefined) { root.style.transition = ''; if (gg.pull > 90 && e.type !== 'pointercancel') { close(); } else { root.style.opacity = '1'; apply(true); } return; }
if (e.type === 'pointercancel') return;
const dx = e.clientX - gg.x, dy = e.clientY - gg.y;
if (sc <= 1.001 && gg.moved && n > 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { show(idx + (dx < 0 ? 1 : -1)); return; }
if (!gg.moved) {
if (!gg.onImg) { close(); return; }
if (gg.type !== 'mouse') {
const now = Date.now();
if (lastTap && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) { lastTap = null; toggleZoom(e.clientX, e.clientY); } else { lastTap = { t: now, x: e.clientX, y: e.clientY }; }
}
}
};
stage.addEventListener('pointerup', up);
stage.addEventListener('pointercancel', up);
document.addEventListener('keydown', onKey, true);
window.addEventListener('resize', onResize);
document.addEventListener('fullscreenchange', onFs);
document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
document.body.appendChild(root);
layout(); show(idx, true);
if (!rm) { requestAnimationFrame(() => requestAnimationFrame(() => { root.style.opacity = '1'; })); }
try { root.focus({ preventScroll: true }); } catch (e) {}
try { if (root.requestFullscreen) { const pr = root.requestFullscreen(); if (pr && pr.catch) pr.catch(() => {}); } } catch (e) {}
}
reduced() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
loadImg(url) {
return new Promise((res) => {
if (!url || String(url).indexOf('data:') === 0) { res(); return; }
let d = false; const fin = () => { if (!d) { d = true; res(); } };
try { const im = new Image(); im.onload = () => { if (im.decode) { im.decode().then(fin, fin); } else { fin(); } }; im.onerror = fin; im.src = url; } catch (e) { fin(); }
setTimeout(fin, 4000);
});
}
whenShown(tok) {
return new Promise((res) => {
const t0 = Date.now();
const ok = (im) => !im || (im.complete && im.naturalWidth > 1);
const chk = () => {
if (tok !== this._tok) { res(false); return; }
let a = null, s = null;
try { a = document.querySelector('.viewer > img'); s = document.querySelector('.proj-overlay img'); } catch (e) {}
if ((ok(a) && ok(s)) || Date.now() - t0 > 2500) { res(true); return; }
setTimeout(chk, 30);
};
setTimeout(chk, 30);
});
}
enter(j, dir) {
if (this._busy) return;
this._busy = true;
const tok = this._tok = (this._tok || 0) + 1;
const rm = this.reduced();
const urls = (this._urls && this._urls[j]) || [];
const start = () => {
try { window.scrollTo(0, 0); } catch (e) {}
this.setState({ sel: j, view: 0, shot: 0, ready: false, blank: true, fade: dir ? 'pre' : false, splash: false });
Promise.all([this.loadImg(urls[0]), this.loadImg(urls[1])]).then(() => {
if (tok !== this._tok) return null;
this.setState({ blank: false });
return this.whenShown(tok);
}).then((ok) => {
if (!ok || tok !== this._tok) return;
if (!dir) { this.setState({ ready: true }); this._busy = false; return; }
this.setState({ ready: true, splash: rm ? false : 'in' });
setTimeout(() => {
if (tok !== this._tok) return;
this.setState({ fade: false, splash: rm ? false : 'out' });
setTimeout(() => { if (tok !== this._tok) return; this.setState({ splash: false }); this._busy = false; }, rm ? 450 : 600);
}, rm ? 60 : 750);
});
};
if (dir) { this.setState({ fade: 'out', dir }); setTimeout(() => { if (tok === this._tok) start(); }, rm ? 180 : 350); } else { start(); }
}
leave(scr) {
this._tok = (this._tok || 0) + 1; this._busy = false;
this.setState(scr ? { screen: scr, sel: -1, fade: false, splash: false, ready: true } : { sel: -1, fade: false, splash: false, ready: true });
setTimeout(() => { if (this.state.sel < 0) this.setState({ blank: true }); }, 800);
}
renderVals() {
const { screen, sel, view, contact, copied, fade, dir, splash, ready, blank } = this.state;
if (!this._esc) {
this._esc = true;
try {
let sw = null;
document.addEventListener('pointerdown', (e) => { const v = e.target && e.target.closest ? e.target.closest('.viewer') : null; if (!v || e.target.closest('button') || (e.pointerType === 'mouse' && e.button !== 0)) { sw = null; return; } sw = { x: e.clientX, y: e.clientY }; });
const endSwipe = (e) => { if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null; const st = this.state; const n = this._swipeN || 0; if (n < 2 || st.sel < 0 || st.contact || Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return; this.setState({ shot: (st.shot + (dx < 0 ? 1 : n - 1)) % n }); };
document.addEventListener('pointerup', endSwipe);
document.addEventListener('pointercancel', () => { sw = null; });
} catch (e) {}
try { document.addEventListener('keydown', (e) => { const st = this.state; const n = this.nShots || 0; if (n > 1 && st.sel >= 0 && st.view === 0 && !st.contact && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) this.setState({ shot: (st.shot + (e.key === 'ArrowRight' ? 1 : n - 1)) % n }); }); } catch (e) {}
try { document.addEventListener('keydown', (e) => { const st = this.state; if (st.screen === 'contents' && st.view === 1 && !st.contact && (st.sel === 0 || st.sel === 1 || st.sel === 2 || st.sel === 3)) { const k = e.key; const up = k === 'ArrowUp' || (st.sel !== 0 && k === 'ArrowLeft'); const dn = k === 'ArrowDown' || (st.sel !== 0 && k === 'ArrowRight'); if (up || dn) { e.preventDefault(); const nx = Math.max(0, Math.min((st.sel === 0 || st.sel === 3) ? 5 : (st.sel === 1 ? 2 : 4), st.shot + (up ? -1 : 1))); if (nx !== st.shot) this.setState({ shot: nx }); } } }); } catch (e) {}
try {
document.addEventListener('pointerdown', (e) => { this._pd = { x: e.clientX, y: e.clientY }; }, true);
document.addEventListener('click', (e) => { try { const t = e.target; if (!t || !t.closest || this._lbOpen) return; const st = this.state; if (st.sel < 0 || st.contact) return; const ex = t.closest('.v-expand'); const v = t.closest('.viewer'); if (!ex && !v) return; if (!ex) { if (t.closest('button')) return; if (this._pd && Math.hypot(e.clientX - this._pd.x, e.clientY - this._pd.y) > 10) return; } this.openLightbox(ex || v); } catch (er) {} });
} catch (e) {}
try { document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.state.contact) this.setState({ contact: false, copied: false }); else if (e.key === 'Escape' && this.state.menu) this.setState({ menu: false }); }); } catch (e) {}
}
const lang = this.state.lang || this.detectLang();
try { document.documentElement.lang = lang; } catch (e) {}
const t = (es, en) => (lang === 'es' ? es : en);
const data = [
{ title: 'Teatro San Miguel', sub1: t('Centro cultural y teatro', 'Cultural centre and theatre'), sub2: t('Proyecto académico · 2024', 'Academic project · 2024'), quote: t('Un edificio que se eleva para regalarle una plaza a la ciudad', 'A building that lifts itself up to give the city a public square'), tone: '#1B2A41', accent: '#C2665F' },
{ title: 'Casa Mabel', sub1: t('Remodelación de vivienda', 'House renovation'), sub2: 'ArchitectoSV · 2026', quote: t('Una casa de adobe que crece sin perder su historia', 'An adobe house that grows without losing its history'), tone: '#243952', accent: '#C9A57B' },
{ title: 'Casa Arroyo', sub1: t('Residencia unifamiliar', 'Private residence'), sub2: 'ArchitectoSV · 2025', quote: t('Junto a un antiguo arroyo, una casa pensada para todas las generaciones de la familia', 'Beside an old stream, a home designed for every generation of the family'), tone: '#324A5F', accent: '#9AAFC4' },
{ title: 'Casa Guayabo', sub1: t('Residencia unifamiliar', 'Private residence'), sub2: 'ArchitectoSV · 2025', quote: t('Una casa que desciende en terrazas entre los árboles', 'A home that steps down through the trees'), tone: '#2C4259', accent: '#9DB89A' }
];
const open = sel >= 0;
const ph = {
role: t('[TU ROL]', '[YOUR ROLE]'),
team: t('[INDIVIDUAL / EN EQUIPO]', '[INDIVIDUAL / TEAM]'),
software: t('[SOFTWARE USADO]', '[SOFTWARE USED]'),
program: t('[PROGRAMA]', '[PROGRAMME]'),
challenge: t('[Una frase sobre el problema principal y cómo lo resolviste.]', '[One sentence on the main problem and how you solved it.]')
};
const details = [
{
role: t('Diseño arquitectónico, modelado BIM y visualización', 'Architectural design, BIM modelling and visualisation'),
team: t('Individual', 'Individual'),
software: 'Revit · Lumion',
program: t('Música · Eventos culturales · Arte · Biblioteca · Teatro subterráneo', 'Music · Cultural events · Art · Library · Underground theatre'),
challenge: t('En la esquina donde hoy hay un antiguo cine en desuso, el reto era devolverle ese espacio a la gente. El volumen principal se eleva sobre una estructura en X, la planta baja se libera como una plaza abierta y el teatro baja al subsuelo, manteniendo la vocación escénica del lugar.', 'On a corner occupied by a disused old cinema, the challenge was to give that space back to the people. The main volume is lifted onto an X-shaped structure, the ground floor is freed as an open plaza and the theatre moves underground, keeping the site\'s stage tradition alive.')
},
{
role: t('Diseño arquitectónico, modelado BIM, instalación hidráulica y visualización', 'Architectural design, BIM modelling, plumbing design and visualisation'),
team: t('En equipo (ArchitectoSV)', 'Team project (ArchitectoSV)'),
software: 'Revit · D5 Render',
program: t('Nuevas habitaciones · Cocina remodelada · Cocina exterior · Garaje independiente · Zona de descanso con hamacas', 'New bedrooms · Remodelled kitchen · Outdoor kitchen · Detached garage · Hammock lounge area'),
challenge: t('Ampliar y modernizar una casa antigua con muros de adobe sin comprometer su estructura ni su carácter colonial. Cada intervención se planteó respetando los muros originales, y lo nuevo se resolvió como volúmenes sencillos que acompañan a la casa sin competir con ella.', 'Extending and modernising an old house with adobe walls without compromising its structure or its colonial character. Every intervention respected the original walls, and the new parts were designed as simple volumes that sit alongside the house without competing with it.')
},
{
role: t('Diseño arquitectónico, modelado BIM, instalación hidráulica y visualización', 'Architectural design, BIM modelling, plumbing design and visualisation'),
team: t('En equipo (ArchitectoSV)', 'Team project (ArchitectoSV)'),
software: 'Revit · D5 Render',
program: t('Garaje para dos vehículos · Cuatro habitaciones (una en planta baja y tres en planta alta, incluida la principal) · Áreas sociales · Gimnasio y sauna en un mismo espacio', 'Double garage · Four bedrooms (one on the ground floor and three upstairs, including the master suite) · Living areas · Gym and sauna in a single space'),
challenge: t('Diseñar una casa amplia para una familia de varias generaciones, en contacto directo y constante con los clientes. La clave fue situar una habitación en planta baja para un familiar mayor que no puede subir escaleras, sin perder la privacidad de las tres habitaciones de la planta alta.', 'Designing a spacious home for a multi-generational family, in close and constant contact with the clients. The key was placing a ground-floor bedroom for an elderly family member who cannot use the stairs, while keeping the privacy of the three bedrooms upstairs.')
},
{
role: t('Diseño arquitectónico, modelado BIM, instalación hidráulica y visualización', 'Architectural design, BIM modelling, plumbing design and visualisation'),
team: t('En equipo (ArchitectoSV)', 'Team project (ArchitectoSV)'),
software: 'Revit · D5 Render',
program: t('7 habitaciones · 3 salas · Oficina con biblioteca · Sala de cine · Cocina interior y exterior · 2 piscinas · Garaje para 5 vehículos · Cancha de fútbol', '7 bedrooms · 3 living rooms · Office with library · Home cinema · Indoor and outdoor kitchen · 2 swimming pools · 5-car garage · Football pitch'),
challenge: t('Encajar un programa muy amplio en un terreno lleno de árboles y con un fuerte desnivel. La casa se organiza en terrazas que siguen la pendiente, con losas de concreto que vuelan sobre los espacios y grandes ventanales que aseguran una buena ventilación natural.', 'Fitting a very large programme onto a tree-filled site with a steep slope. The house is organised in terraces that follow the terrain, with cantilevered concrete slabs and large windows that ensure good natural ventilation.')
}
];
const infos = [
t('Centro cultural y teatro · 2024', 'Cultural centre and theatre · 2024'),
t('Remodelación de vivienda · 2026', 'House renovation · 2026'),
t('Residencia unifamiliar · 2025', 'Private residence · 2025'),
t('Residencia unifamiliar · 2025', 'Private residence · 2025')
];
const items = data.map((d, i) => ({
...d,
n: String(i + 1),
splashSrc: '',
info: infos[i],
...details[i],
num: '0' + (i + 1),
hasQuote: !!d.quote,
is0: i === 0,
is1: i === 1,
is2: i === 2,
is3: i === 3,
imgLabel: i <= 3 ? '' : t('[IMAGEN 0', '[IMAGE 0') + (i + 1) + ']',
aria: t('Abrir ', 'Open ') + d.title,
imgAlt: t('Imagen del proyecto ', 'Image of the project ') + d.title,
open: () => this.enter(i, 0),
look: open
? (i === sel ? 'flex-grow: 1; flex-basis: 0; margin-left: 0; opacity: 1; pointer-events: none;' : 'flex-grow: 0.0001; flex-basis: 0; margin-left: 0; opacity: 0; pointer-events: none;')
: 'flex-grow: 1; flex-basis: 0; margin-left: ' + (i === 0 ? 0 : 20) + 'px; opacity: 1;',
img: 'background: repeating-linear-gradient(45deg, ' + d.tone + ', ' + d.tone + ' 10px, #0F1C2A 10px, #0F1C2A 20px);'
}));
const ci = Math.max(sel, 0);
const cur = items[ci];
const prev = items[(ci + 3) % 4];
const next = items[(ci + 1) % 4];
const goTo = (j, dir) => this.enter(j, dir);
const copyEmail = () => {
const done = () => { this.setState({ copied: true }); setTimeout(() => this.setState({ copied: false }), 2000); };
const fallback = () => {
try {
const ta = document.createElement('textarea');
ta.value = 'chrisvl23@icloud.com';
document.body.appendChild(ta);
ta.select();
document.execCommand('copy');
document.body.removeChild(ta);
done();
} catch (e) {}
};
try { navigator.clipboard.writeText('chrisvl23@icloud.com').then(done, fallback); } catch (e) { fallback(); }
};
const all = [
{ short: 'Render', label: t('IMAGEN PRINCIPAL', 'MAIN IMAGE'), hint: t('Render o foto de maqueta', 'Render or model photo') },
{ short: ci === 0 ? t('Plantas', 'Floor plans') : ((ci === 1 || ci === 2 || ci === 3) ? t('Planos y secciones', 'Plans and sections') : t('Planta o sección', 'Plan or section')), label: t('PLANTA O SECCIÓN', 'PLAN OR SECTION'), hint: t('Un plano que explique cómo se organiza', 'A drawing that explains the layout') },
{ short: t('Modelo BIM', 'BIM model'), label: t('CAPTURA DEL MODELO BIM', 'BIM MODEL SCREENSHOT'), hint: t('Una vista del modelo', 'A view of the model') }
];
const views = all.map((v, i) => ({
...v,
pressed: i === view,
look: i === view ? 'border: 2px solid #CCC9DC; color: #CCC9DC;' : 'border: 1px solid #324A5F; color: #9AA3B5;',
pick: () => this.setState({ view: i, shot: ((ci === 0 || ci === 2 || ci === 3) && i === 1) ? 1 : 0 })
}));
const IMGS = [
[['img/teatro-san-miguel/render-1.webp', 'img/teatro-san-miguel/render-2.webp', 'img/teatro-san-miguel/render-3.webp', 'img/teatro-san-miguel/render-4.webp'], lang === 'en' ? ['img/teatro-san-miguel/nivel-01-en.webp', 'img/teatro-san-miguel/nivel-00-en.webp', 'img/teatro-san-miguel/nivel-m01-en.webp', 'img/teatro-san-miguel/nivel-m02-en.webp', 'img/teatro-san-miguel/seccion-a-en.webp', 'img/teatro-san-miguel/seccion-b-en.webp'] : ['img/teatro-san-miguel/nivel-01.webp', 'img/teatro-san-miguel/nivel-00.webp', 'img/teatro-san-miguel/nivel-m01.webp', 'img/teatro-san-miguel/nivel-m02.webp', 'img/teatro-san-miguel/seccion-a.webp', 'img/teatro-san-miguel/seccion-b.webp'], []],
[['img/casa-mabel/render-1.webp', 'img/casa-mabel/render-2.webp', 'img/casa-mabel/render-3.webp', 'img/casa-mabel/render-4.webp', 'img/casa-mabel/render-5.webp'], lang === 'en' ? ['img/casa-mabel/planta-en.webp', 'img/casa-mabel/seccion-a-en.webp', 'img/casa-mabel/seccion-b-en.webp'] : ['img/casa-mabel/planta.webp', 'img/casa-mabel/seccion-a.webp', 'img/casa-mabel/seccion-b.webp'], []],
[['img/casa-arroyo/render-1.webp', 'img/casa-arroyo/render-2.webp', 'img/casa-arroyo/render-3.webp', 'img/casa-arroyo/render-4.webp'], lang === 'en' ? ['img/casa-arroyo/planta-alta-en.webp', 'img/casa-arroyo/planta-baja-en.webp', 'img/casa-arroyo/seccion-a-en.webp', 'img/casa-arroyo/seccion-b-en.webp', 'img/casa-arroyo/seccion-c-en.webp'] : ['img/casa-arroyo/planta-alta.webp', 'img/casa-arroyo/planta-baja.webp', 'img/casa-arroyo/seccion-a.webp', 'img/casa-arroyo/seccion-b.webp', 'img/casa-arroyo/seccion-c.webp'], []],
[['img/casa-guayabo/render-1.webp', 'img/casa-guayabo/render-2.webp', 'img/casa-guayabo/render-3.webp', 'img/casa-guayabo/render-4.webp', 'img/casa-guayabo/render-5.webp', 'img/casa-guayabo/render-6.webp'], lang === 'en' ? ['img/casa-guayabo/nivel-01-en.webp', 'img/casa-guayabo/nivel-00-en.webp', 'img/casa-guayabo/nivel-m01-en.webp', 'img/casa-guayabo/seccion-a-en.webp', 'img/casa-guayabo/seccion-b-en.webp', 'img/casa-guayabo/seccion-c-en.webp'] : ['img/casa-guayabo/nivel-01.webp', 'img/casa-guayabo/nivel-00.webp', 'img/casa-guayabo/nivel-m01.webp', 'img/casa-guayabo/seccion-a.webp', 'img/casa-guayabo/seccion-b.webp', 'img/casa-guayabo/seccion-c.webp'], []]
];
const tabs = views.filter((v, i) => i === 0 || IMGS[ci][i].length > 0);
const CV_ES = 'cv/christian-valle-cv-es.pdf';
const CV_EN = 'cv/christian-valle-cv-en.pdf';
const shots = IMGS[ci][view];
const SPLASH = ['img/teatro-san-miguel/intro.webp', 'img/casa-mabel/intro.webp', 'img/casa-arroyo/intro.webp', 'img/casa-guayabo/intro.webp'];
this._urls = IMGS.map((p, k) => [p[0][0], SPLASH[k]]);
const BLANK0 = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const splashPic = blank ? BLANK0 : (SPLASH[ci] || cur.splashSrc);
const nShots = shots.length;
this.nShots = view === 0 ? nShots : 0;
this._swipeN = nShots;
const isPlan = (ci === 0 || ci === 1 || ci === 2 || ci === 3) && view === 1;
const LV0 = [
{ ti: t('Biblioteca y salas de música', 'Library and music rooms'), tx: t('El volumen elevado reúne la biblioteca, con zonas de lectura junto a la fachada, y diez salas de ensayo musical con salas de reuniones. En el centro, un vacío abre la vista hacia la plaza de abajo.', 'The raised volume houses the library, with reading areas along the façade, and ten music rehearsal rooms with meeting rooms. At its centre, a void opens the view down to the plaza below.') },
{ ti: t('Una plaza abierta a la ciudad', 'A plaza open to the city'), tx: t('A nivel de calle, la planta se libera como una plaza pública con un área verde central. A un lado, las salas de convenciones y los servicios; al otro, una zona de exposiciones temporales con los núcleos de circulación que bajan al teatro.', 'At street level, the ground floor is freed up as a public plaza with a central green area. On one side sit the conference rooms and services; on the other, a temporary exhibition space with the circulation cores leading down to the theatre.') },
{ ti: t('Vestíbulo y grada superior', 'Foyer and upper seating'), tx: t('Bajo la plaza, un vestíbulo con cafetería recibe al público y da acceso a la parte alta de la grada. El escenario y su sala técnica de sonido se leen desde este nivel.', 'Beneath the plaza, a foyer with a café welcomes the audience and leads to the upper part of the seating. The stage and its sound control room can be read from this level.') },
{ ti: t('Escenario y grada inferior', 'Stage and lower seating'), tx: t('El nivel más profundo concentra el escenario, los camerinos y las salas técnicas de sonido, luces y proyección. La grada incluye zonas reservadas para sillas de ruedas, y el espacio bajo las butacas se aprovecha como bodega.', 'The deepest level holds the stage, dressing rooms and the technical rooms for sound, lighting and projection. The seating includes areas reserved for wheelchair users, and the space beneath the seats is used for storage.') },
{ ti: t('Del cielo al escenario', 'From sky to stage'), tx: t('La sección muestra la idea del proyecto: dos volúmenes elevados sobre la estructura en X dejan libre la plaza a nivel de calle, mientras el teatro se hunde dos niveles bajo tierra, con una grada continua que une el vestíbulo con el escenario.', 'The section shows the core idea of the project: two volumes raised on the X-shaped structure leave the street-level plaza free, while the theatre sinks two levels underground, with continuous seating linking the foyer to the stage.') },
{ ti: t('La plaza sobre el teatro', 'The plaza above the theatre'), tx: t('El corte transversal muestra la biblioteca elevada, la plaza abierta con la escalera de caracol que conecta los niveles y, bajo tierra, el teatro flanqueado por los salones técnicos de sonido, luces y proyección.', 'The cross section shows the raised library, the open plaza with the spiral staircase connecting the levels and, underground, the theatre flanked by the technical rooms for sound, lighting and projection.') }
];
const LV1 = [
{ ti: t('La casa original y su ampliación', 'The original house and its extension'), tx: t('La vivienda se organiza alrededor de un jardín frontal y un corredor que une las nuevas habitaciones, la cocina remodelada y las zonas sociales. El garaje se separa en un volumen sencillo junto a la calle, y la antigua bodega del fondo se transforma en un pabellón de descanso con sala y terraza de hamacas.', 'The home is arranged around a front garden and a corridor linking the new bedrooms, the remodelled kitchen and the living areas. The garage sits apart as a simple volume by the road, and the old storeroom at the back becomes a rest pavilion with a lounge and a hammock terrace.') },
{ ti: t('De la cocina exterior a la terraza', 'From the outdoor kitchen to the terrace'), tx: t('El corte atraviesa la cocina exterior, la cocina y el comedor hasta la terraza posterior. Las cubiertas inclinadas de teja reinterpretan la casa colonial original y unen los espacios interiores con los exteriores.', 'The section runs through the outdoor kitchen, the kitchen and the dining room to the rear terrace. The pitched tiled roofs reinterpret the original colonial house and connect the indoor spaces with the outdoors.') },
{ ti: t('Habitaciones y zona social', 'Bedrooms and living area'), tx: t('En el sentido largo de la casa, el corte muestra el baño, las dos habitaciones, la sala y el comedor bajo una misma cubierta. Los muros existentes se conservaron y las nuevas aberturas se ajustaron a la estructura de adobe.', 'Along the length of the house, the section shows the bathroom, the two bedrooms, the living room and the dining room under a single roof. The existing walls were kept, and the new openings were adapted to the adobe structure.') }
];
const LV2 = [
{ ti: t('Tres habitaciones en torno a un vacío', 'Three bedrooms around a void'), tx: t('La planta alta reúne la habitación principal, con baño y vestidor propios, y otras dos habitaciones con baño completo. Un pasillo rodea el vacío sobre la sala, que conecta visualmente los dos niveles, y una terraza se abre sobre el garaje.', 'The first floor brings together the master bedroom, with its own bathroom and walk-in wardrobe, and two further bedrooms with full bathrooms. A hallway wraps around the void over the living room, visually linking both levels, and a terrace opens above the garage.') },
{ ti: t('Vivir sin escaleras', 'Living without stairs'), tx: t('La planta baja concentra la vida diaria: sala de doble altura, cocina, comedor, terraza y piscina. Incluye una habitación completa con vestidor y baño para un familiar mayor, que puede vivir sin subir escaleras. Frente a la casa corre el antiguo canal de agua que le da nombre.', 'The ground floor gathers everyday life: a double-height living room, kitchen, dining room, terrace and pool. It includes a full bedroom with walk-in wardrobe and bathroom for an elderly family member, who can live without using the stairs. In front of the house runs the old water channel that gives it its name.') },
{ ti: t('Dos niveles, dos generaciones', 'Two levels, two generations'), tx: t('El corte atraviesa las habitaciones de los dos niveles: arriba, las habitaciones 1 y 2; abajo, la habitación en planta baja y la de huéspedes, hasta llegar a la piscina.', 'The section cuts through the bedrooms on both levels: upstairs, bedrooms 1 and 2; downstairs, the ground-floor bedroom and the guest bedroom, reaching out to the pool.') },
{ ti: t('Del garaje a la terraza', 'From garage to terrace'), tx: t('El garaje para dos vehículos sostiene una terraza ajardinada en la planta alta, junto a la habitación principal. Debajo, la cocina y el comedor se abren al interior de la casa.', 'The double garage supports a planted terrace on the upper floor, next to the master bedroom. Below, the kitchen and dining room open towards the heart of the house.') },
{ ti: t('La sala de doble altura', 'The double-height living room'), tx: t('El corte longitudinal muestra la sala de doble altura, con el balcón de la planta alta asomado sobre ella, entre la cocina a un lado y los servicios y la lavandería al otro.', 'The long section shows the double-height living room, overlooked by the upper-floor balcony, between the kitchen on one side and the bathrooms and laundry on the other.') }
];
const LV3 = [
{ ti: t('Arriba, entre las copas', 'Up among the treetops'), tx: t('El nivel superior reúne una sala de estar abierta a las vistas y dos habitaciones con baño completo, conectadas por un corredor que termina en una amplia terraza.', 'The upper level brings together a living room open to the views and two bedrooms with full bathrooms, linked by a corridor that ends in a large terrace.') },
{ ti: t('El corazón de la casa', 'The heart of the house'), tx: t('El nivel principal se organiza en torno a jardines interiores: cocina interior y exterior, un gran comedor, sala secundaria y sala de cine. Las habitaciones se escalonan siguiendo la pendiente, y cada una cuenta con su propio jardín y terraza para tener privacidad.', 'The main level is arranged around inner gardens: indoor and outdoor kitchens, a large dining room, a second living room and a home cinema. The bedrooms step down with the slope, each with its own garden and terrace for privacy.') },
{ ti: t('Deporte, juego y vida al aire libre', 'Sport, play and outdoor living'), tx: t('Aprovechando el desnivel del terreno, el nivel inferior alberga el gimnasio con sauna y vestidores, el garaje, una zona de juegos, una terraza con zona de asados, la piscina y una cancha de fútbol.', 'Taking advantage of the slope, the lower level houses the gym with sauna and changing rooms, the garage, a play area, a terrace with a barbecue area, the pool and a football pitch.') },
{ ti: t('Habitaciones en dos niveles', 'Bedrooms on two levels'), tx: t('El corte atraviesa el ala de habitaciones: tres habitaciones con su baño en el nivel principal y, encima, otras dos bajo una cubierta de losa de concreto.', 'The section cuts through the bedroom wing: three bedrooms with their bathrooms on the main level and, above them, two more under a concrete slab roof.') },
{ ti: t('La sala de cine', 'The home cinema'), tx: t('La sala de cine baja de forma escalonada para dar a cada fila una buena visión de la pantalla, junto a la sala secundaria y bajo una cubierta propia.', 'The home cinema steps down so every row has a clear view of the screen, next to the second living room and under its own roof.') },
{ ti: t('De la entrada a la sala', 'From the entrance to the living room'), tx: t('El corte recorre la casa desde la entrada cubierta hasta la sala, pasando por la alacena y el comedor. Bajo el nivel principal, aprovechando el desnivel, se ubican la bodega y la lavandería.', 'The section runs through the house from the covered entrance to the living room, past the pantry and the dining room. Below the main level, taking advantage of the slope, sit the storage room and the laundry.') }
];
const LV = ci === 3 ? LV3 : (ci === 2 ? LV2 : (ci === 1 ? LV1 : LV0));
const lvlBtn = (k) => 'border: 1px solid ' + (sh === k ? cur.accent + '; color: ' + cur.accent + '; background: rgba(' + [1, 3, 5].map((i) => parseInt(String(cur.accent).substr(i, 2), 16)).join(',') + ',0.14);' : '#324A5F; color: #9AA3B5;');
const lvlTxt = (k) => sh === k ? 'opacity: 1; visibility: visible;' : 'opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0s linear 0.3s;';
const sh = Math.min(this.state.shot, Math.max(nShots - 1, 0));
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
this._hi = {};
const NM = (ci === 3 && view === 1) ? [t('Nivel 01', 'Level 01'), t('Nivel 00', 'Level 00'), t('Nivel −01', 'Level −01'), t('Sección A', 'Section A'), t('Sección B', 'Section B'), t('Sección C', 'Section C')] : (ci === 2 && view === 1) ? [t('Planta alta', 'First floor'), t('Planta baja', 'Ground floor'), t('Sección A', 'Section A'), t('Sección B', 'Section B'), t('Sección C', 'Section C')] : (ci === 0 && view === 1) ? [t('Nivel 01', 'Level 01'), t('Nivel 00', 'Level 00'), t('Nivel −01', 'Level −01'), t('Nivel −02', 'Level −02'), t('Sección A', 'Section A'), t('Sección B', 'Section B')] : ((ci === 1 && view === 1) ? [t('Planta', 'Plan'), t('Sección A', 'Section A'), t('Sección B', 'Section B')] : shots.map((_, k) => (view === 0 ? 'Render ' : t('Imagen ', 'Image ')) + (k + 1)));
this._lb = { srcs: shots, names: NM, idx: sh, accent: cur.accent, lang };
const ALT = shots.map((_, k) => t((NM[k] || '') + ' del proyecto ' + cur.title, (NM[k] || '') + ' of the ' + cur.title + ' project'));
try { document.documentElement.classList.toggle('no-scroll', !!(this.state.menu || contact)); } catch (e) {}
const thumbLook = (k) => 'border: ' + (sh === k ? '2px solid ' + cur.accent + '; opacity: 1;' : '1px solid #324A5F; opacity: 0.6;');
const show = {};
for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) show['p' + a + 'v' + b] = sel === a && view === b;
const activeLang = 'color: #CCC9DC; font-weight: 500; text-decoration: underline; text-underline-offset: 6px;';
const idleLang = 'color: #9AA3B5; font-weight: 400;';
return {
show,
splashPic,
splashAlt: t('Imagen del proyecto ', 'Image of the project ') + cur.title,
shotAlt0: ALT[0] || '', shotAlt1: ALT[1] || '', shotAlt2: ALT[2] || '', shotAlt3: ALT[3] || '', shotAlt4: ALT[4] || '', shotAlt5: ALT[5] || '',
isPlanView: isPlan && nShots > 0,
tabsLabel: t('Vistas del proyecto', 'Project views'),
menuOpen: !!this.state.menu,
menuLabel: t('Abrir menú', 'Open menu'),
openMenu: () => this.setState({ menu: true }),
closeMenu: () => this.setState({ menu: false }),
mGoBio: () => { this.setState({ menu: false }); this.leave('bio'); },
mGoContents: () => { this.setState({ menu: false }); this.leave('contents'); },
mContact: () => this.setState({ menu: false, contact: true, copied: false }),
curBio: screen === 'bio' ? 'page' : 'false',
curContents: screen === 'contents' ? 'page' : 'false',
noImg: nShots === 0,
hasGallery: nShots > 1 && !isPlan,
canExpand: nShots > 0,
expandLabel: t('Ver a pantalla completa', 'View full screen'),
viewerCls: isPlan ? 'plan' : '',
lvlLook0: lvlBtn(0), lvlLook1: lvlBtn(1), lvlLook2: lvlBtn(2), lvlLook3: lvlBtn(3), lvlLook4: lvlBtn(4), lvlLook5: lvlBtn(5),
lvlTxt0: lvlTxt(0), lvlTxt1: lvlTxt(1), lvlTxt2: lvlTxt(2), lvlTxt3: lvlTxt(3), lvlTxt4: lvlTxt(4), lvlTxt5: lvlTxt(5),
lvlTitle0: (LV[0] || {}).ti, lvlTitle1: (LV[1] || {}).ti, lvlTitle2: (LV[2] || {}).ti, lvlTitle3: (LV[3] || {}).ti, lvlTitle4: (LV[4] || {}).ti, lvlTitle5: (LV[5] || {}).ti,
lvlText0: (LV[0] || {}).tx, lvlText1: (LV[1] || {}).tx, lvlText2: (LV[2] || {}).tx, lvlText3: (LV[3] || {}).tx, lvlText4: (LV[4] || {}).tx, lvlText5: (LV[5] || {}).tx,
shotSrc0: (nShots > 0 && !blank) ? shots[0] : BLANK,
shotLook0: nShots > 0 ? 'opacity: ' + (sh === 0 ? 1 : 0) + ';' : 'display: none;',
thumbOn0: sh === 0,
thumbLook0: nShots > 0 ? thumbLook(0) : 'display: none;',
pickShot0: () => this.setState({ shot: 0 }),
shotSrc1: (nShots > 1 && !blank) ? shots[1] : BLANK,
shotLook1: nShots > 1 ? 'opacity: ' + (sh === 1 ? 1 : 0) + ';' : 'display: none;',
thumbOn1: sh === 1,
thumbLook1: nShots > 1 ? thumbLook(1) : 'display: none;',
pickShot1: () => this.setState({ shot: 1 }),
shotSrc2: (nShots > 2 && !blank) ? shots[2] : BLANK,
shotLook2: nShots > 2 ? 'opacity: ' + (sh === 2 ? 1 : 0) + ';' : 'display: none;',
thumbOn2: sh === 2,
thumbLook2: nShots > 2 ? thumbLook(2) : 'display: none;',
pickShot2: () => this.setState({ shot: 2 }),
shotSrc3: (nShots > 3 && !blank) ? shots[3] : BLANK,
shotLook3: nShots > 3 ? 'opacity: ' + (sh === 3 ? 1 : 0) + ';' : 'display: none;',
thumbOn3: sh === 3,
thumbLook3: nShots > 3 ? thumbLook(3) : 'display: none;',
pickShot3: () => this.setState({ shot: 3 }),
shotSrc4: (nShots > 4 && !blank) ? shots[4] : BLANK,
shotLook4: nShots > 4 ? 'opacity: ' + (sh === 4 ? 1 : 0) + ';' : 'display: none;',
thumbOn4: sh === 4,
thumbLook4: nShots > 4 ? thumbLook(4) : 'display: none;',
pickShot4: () => this.setState({ shot: 4 }),
shotSrc5: (nShots > 5 && !blank) ? shots[5] : BLANK,
shotLook5: nShots > 5 ? 'opacity: ' + (sh === 5 ? 1 : 0) + ';' : 'display: none;',
thumbOn5: sh === 5,
thumbLook5: nShots > 5 ? thumbLook(5) : 'display: none;',
pickShot5: () => this.setState({ shot: 5 }),
shotNext: () => this.setState({ shot: (sh + 1) % Math.max(nShots, 1) }),
shotPrev: () => this.setState({ shot: (sh + nShots - 1) % Math.max(nShots, 1) }),
isRender: view === 0,
notRender: view !== 0,
accent: this.props.accent ?? '#324A5F',
isBio: screen === 'bio',
isContents: screen === 'contents',
isOpen: screen === 'contents' && sel >= 0,
langClass: 'lang-' + lang + (screen === 'contents' && sel >= 0 ? ' is-open' : '') + ' screen-' + screen,
rootLook: screen === 'bio'
? 'height: 100vh; padding: clamp(16px, 3.5vh, 40px) clamp(20px, 3.9vw, 56px);'
: (open ? 'height: 100vh; padding: 40px 56px;' : 'height: 100vh; padding: 40px 56px;'),
titleLook: open ? 'height: 0; opacity: 0;' : 'height: 98.4px; opacity: 1;',
boxLook: open ? 'margin-top: 20px; height: calc(100vh - 144px);' : 'margin-top: 32px; height: min(640px, calc(100vh - 262px));',
prevName: prev.title,
prevAccent: prev.accent,
nextName: next.title,
nextAccent: next.accent,
goPrev: () => goTo((ci + 3) % 4, -1),
goNext: () => goTo((ci + 1) % 4, 1),
contactOpen: contact,
openContact: () => this.setState({ contact: true, copied: false }),
closeContact: () => this.setState({ contact: false, copied: false }),
closeIfBackdrop: (e) => { if (!e || e.target === e.currentTarget) this.setState({ contact: false, copied: false }); },
copyEmail,
copyLabel: copied ? t('Copiado', 'Copied') : t('Copiar', 'Copy'),
closeLabel: t('Cerrar', 'Close'),
navContact: contact ? 'border: 1px solid #CCC9DC;' : 'border: 1px solid transparent;',
photoAlt: t('Render de la fachada de una vivienda de dos plantas con arcos, tejas y portón de hierro, en tonos azules', 'Render of the façade of a two-storey house with arches, tiled roof and wrought-iron gate, in blue tones'),
isEs: lang === 'es',
isEn: lang === 'en',
setEs: () => this.chooseLang('es'),
setEn: () => this.chooseLang('en'),
esLook: lang === 'es' ? activeLang : idleLang,
enLook: lang === 'en' ? activeLang : idleLang,
navBio: screen === 'bio' ? 'border: 1px solid #CCC9DC;' : 'border: 1px solid transparent;',
navContents: screen === 'contents' ? 'border: 1px solid #CCC9DC;' : 'border: 1px solid transparent;',
goBio: () => this.leave('bio'),
goContents: () => this.leave('contents'),
back: () => this.leave(),
items, cur, views: tabs, view: all[view],
showTabs: tabs.length > 1,
tabsGrid: 'grid-template-columns: repeat(' + tabs.length + ', minmax(0, 1fr));',
cvHref: lang === 'en' ? CV_EN : CV_ES,
cvName: lang === 'en' ? 'christian-valle-cv-en.pdf' : 'christian-valle-cv-es.pdf',
splashLook: splash === 'in' ? 'opacity: 1; transition: opacity 0.45s ease;' : (splash === 'out' ? 'opacity: 0; transition: opacity 0.5s ease;' : 'opacity: 0; transition: none;'),
splashScale: splash === 'in' ? 'transform: scale(1); transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);' : (splash === 'out' ? 'transform: scale(0.88); transition: transform 0.5s ease;' : 'transform: scale(0.9); transition: none;'),
contentLook: (() => {
const rm = this.reduced();
if (fade === 'out') return rm ? 'opacity: 0; transition: opacity 0.15s ease-in-out;' : 'opacity: 0; transform: scale(1.06); transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;';
if (fade === 'pre') return rm ? 'opacity: 0; transition: none;' : 'opacity: 0; transform: scale(0.94); transition: none;';
if (!ready) return 'opacity: 0; transition: none;';
return rm ? 'opacity: 1; transition: opacity 0.2s ease-in-out;' : 'opacity: 1; transform: none; transition: opacity 0.4s ease-in-out, transform 0.4s ease-in-out;';
})(),
stripsLook: open ? 'visibility: hidden; transition: visibility 0s linear 1.1s;' : 'visibility: visible; transition: none;',
detailLook: open ? 'opacity: 1; transition-delay: 0.45s; pointer-events: auto;' : 'opacity: 0; transition-delay: 0s; pointer-events: none;'
};
}
}
function start() { window.portfolio = window.DCMount(Portfolio, document.getElementById('app'), { accent: '#324A5F' }); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
