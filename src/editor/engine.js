/* Mesin editor tulisan (contenteditable): satu kolom, menu "/", toolbar saat teks dipilih, shortcut markdown,
   tautan, gambar (pilih, hapus, teks alt), tempel & seret berkas. Tanpa library.

   React tidak boleh mengelola isi <div contenteditable> (peramban yang mengubahnya), jadi bagian ini tetap imperatif
   dan dibungkus satu fungsi: createEditor(els, host) → API. Semua yang berkaitan dengan state aplikasi (simpan,
   draf, dialog, status) ada di pages/Write.jsx; mesin ini hanya memberi tahu lewat `host`:
     host.changed()            isi berubah (untuk simpan otomatis & hitung kata)
     host.toast(msg, opts)     pesan singkat
     host.openImages(tab)      minta dialog gambar dibuka
     host.isPreviewing()       true saat mode pratinjau
   Aturan editor yang tak butuh DOM ada di lib/core/composer.js (menu "/", shortcut markdown, validasi tautan). */
import * as U from '../lib/core/text.js';
import * as C from '../lib/core/composer.js';
import * as images from '../lib/services/images.js';
import { sanitize } from '../lib/services/html.js';

const MAXI = images.MAX_PER_POST;

export function createEditor(els, host) {
  const { ed, title } = els,
    body = document.body;
  let disposed = false; // gambar yang selesai diproses setelah halaman ditinggalkan tidak boleh memanggil host
  const changed = () => {
    if (!disposed) host.changed();
  };
  const off = []; // pelepas semua pendengar peristiwa
  const on = (t, type, fn, opts) => {
    t.addEventListener(type, fn, opts);
    off.push(() => t.removeEventListener(type, fn, opts));
  };
  const sel = () => getSelection();
  let selFig = null,
    imgAnchor = null,
    linkRange = null,
    selRaf = 0;
  const slash = { open: false, idx: 0, items: [], block: null, off: null };

  try {
    document.execCommand('defaultParagraphSeparator', false, 'p');
  } catch (e) {}

  /* =====================================================================
     Seleksi & blok
     ===================================================================== */
  function topBlock(n) {
    while (n && n.parentNode !== ed) n = n.parentNode;
    return n && n.nodeType === 1 ? n : null;
  }
  function curBlock() {
    const s = sel();
    if (!s.rangeCount) return null;
    const n = s.anchorNode;
    if (!n || !ed.contains(n)) return null;
    if (n === ed) return ed.children[Math.min(s.anchorOffset, ed.children.length - 1)] || null;
    return topBlock(n);
  }
  function placeCaret(el, end) {
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(!end);
    const s = sel();
    s.removeAllRanges();
    s.addRange(r);
  }
  function caretEndOf(input) {
    input.focus();
    const l = input.value.length;
    input.setSelectionRange(l, l);
  }
  function atEnd(b) {
    const s = sel();
    if (!s.rangeCount) return false;
    const r = document.createRange();
    r.selectNodeContents(b);
    r.setStart(s.anchorNode, s.anchorOffset);
    return r.toString() === '';
  }
  function atStart(b) {
    const s = sel();
    if (!s.rangeCount) return false;
    const r = document.createRange();
    r.selectNodeContents(b);
    r.setEnd(s.anchorNode, s.anchorOffset);
    return r.toString() === '';
  }
  function newP() {
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    return p;
  }
  function closestIn(n, tag) {
    while (n && n !== ed) {
      if (n.nodeType === 1 && n.tagName === tag) return n;
      n = n.parentNode;
    }
    return null;
  }

  /* browser kadang menaruh teks/div langsung di akar editor: rapikan jadi <p> */
  function normalize() {
    if (!ed.firstChild || (!ed.children.length && !ed.textContent)) {
      ed.innerHTML = '<p><br></p>';
      placeCaret(ed.firstChild, false);
      return;
    }
    const s = sel(),
      an = s.anchorNode,
      ao = s.anchorOffset;
    let moved = false;
    Array.prototype.slice.call(ed.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        if (!n.nodeValue.trim()) {
          if (n.nodeValue.length) n.remove();
          return;
        }
        const p = document.createElement('p');
        ed.insertBefore(p, n);
        p.appendChild(n);
        moved = true;
      } else if (n.nodeType === 1 && /^(A|STRONG|EM|B|I|SPAN|U)$/.test(n.tagName)) {
        const p2 = document.createElement('p');
        ed.insertBefore(p2, n);
        p2.appendChild(n);
        moved = true;
      } else if (n.nodeType === 1 && n.tagName === 'DIV') {
        const p3 = document.createElement('p');
        while (n.firstChild) p3.appendChild(n.firstChild);
        if (!p3.firstChild) p3.innerHTML = '<br>';
        ed.replaceChild(p3, n);
        moved = true;
      } else if (n.nodeType === 1 && n.tagName === 'BR') {
        n.remove();
      }
    });
    if (moved && an && document.contains(an)) {
      try {
        const r = document.createRange();
        r.setStart(an, Math.min(ao, an.nodeType === 3 ? an.length : an.childNodes.length));
        r.collapse(true);
        s.removeAllRanges();
        s.addRange(r);
      } catch (e) {}
    }
  }

  /* =====================================================================
     Perintah blok & inline
     ===================================================================== */
  const fmt = (tag) => document.execCommand('formatBlock', false, '<' + tag + '>');
  function toggleBlock(tag) {
    const b = curBlock();
    fmt(b && b.tagName.toLowerCase() === tag ? 'p' : tag);
  }
  function insertHr() {
    const b = curBlock();
    if (!b) return;
    const hr = document.createElement('hr');
    hr.setAttribute('contenteditable', 'false');
    if (!b.textContent.trim() && b.tagName === 'P') {
      b.parentNode.insertBefore(hr, b);
      placeCaret(b, false);
    } else {
      const p = newP();
      b.after(hr);
      hr.after(p);
      placeCaret(p, false);
    }
  }
  function runCmd(id) {
    if (id === 'image') {
      host.openImages('up');
      return;
    }
    ed.focus();
    if (/^(h2|h3|quote|ul|ol|p|hr)$/.test(id)) {
      const s0 = sel();
      if (s0.rangeCount && closestIn(s0.anchorNode, 'FIGCAPTION')) return;
    } // keterangan gambar hanya mendukung format sebaris
    switch (id) {
      case 'bold':
        document.execCommand('bold');
        break;
      case 'italic':
        document.execCommand('italic');
        break;
      case 'h2':
        toggleBlock('h2');
        break;
      case 'h3':
        toggleBlock('h3');
        break;
      case 'quote':
        toggleBlock('blockquote');
        break;
      case 'ul':
        document.execCommand('insertUnorderedList');
        break;
      case 'ol':
        document.execCommand('insertOrderedList');
        break;
      case 'p':
        fmt('p');
        break;
      case 'hr':
        insertHr();
        break;
      case 'link':
        openLink();
        return;
      default:
        break;
    }
    normalize();
    changed();
    refreshTools();
  }

  /* =====================================================================
     Menu "/"
     ===================================================================== */
  const slashEl = els.slash;
  function openSlash(block, q) {
    const items = C.filterCommands(q);
    if (!items.length) {
      closeSlash();
      return;
    }
    slash.block = block;
    slash.items = items;
    if (!slash.open || slash.idx >= items.length) slash.idx = 0;
    slash.open = true;
    slashEl.hidden = false;
    slashEl.innerHTML =
      '<p class="mono h">tambah blok</p>' +
      items
        .map(
          (i, n) =>
            '<button type="button" role="option" id="sl-' +
            i.id +
            '" data-id="' +
            i.id +
            '" aria-selected="' +
            (n === slash.idx) +
            '"><span><b>' +
            i.n +
            '</b><small>' +
            i.d +
            '</small></span>' +
            (i.k ? '<span class="kbd">' + i.k + '</span>' : '') +
            '</button>'
        )
        .join('');
    const r = block.getBoundingClientRect(),
      h = slashEl.offsetHeight;
    let top = r.bottom + 6;
    if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 6);
    slashEl.style.top = top + 'px';
    slashEl.style.left = Math.max(8, Math.min(r.left, innerWidth - slashEl.offsetWidth - 8)) + 'px';
    ed.setAttribute('aria-activedescendant', 'sl-' + items[slash.idx].id);
  }
  function closeSlash() {
    if (!slash.open) return;
    slash.open = false;
    slashEl.hidden = true;
    ed.removeAttribute('aria-activedescendant');
  }
  function moveSlash(d) {
    slash.idx = (slash.idx + d + slash.items.length) % slash.items.length;
    Array.prototype.forEach.call(slashEl.querySelectorAll('button'), (b, n) => {
      b.setAttribute('aria-selected', n === slash.idx);
      if (n === slash.idx) b.scrollIntoView({ block: 'nearest' });
    });
    ed.setAttribute('aria-activedescendant', 'sl-' + slash.items[slash.idx].id);
  }
  function pickSlash(id) {
    const b = slash.block;
    closeSlash();
    if (!b) return;
    b.innerHTML = '<br>';
    placeCaret(b, false);
    runCmd(id);
  }
  on(slashEl, 'mousedown', (e) => e.preventDefault());
  on(slashEl, 'click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (b) pickSlash(b.dataset.id);
  });
  function checkSlash() {
    const b = curBlock();
    if (!b || b.tagName !== 'P') {
      closeSlash();
      return;
    }
    const q = C.slashQuery(b.textContent);
    if (q === null) {
      if (slash.off === b) slash.off = null;
      closeSlash();
      return;
    }
    if (slash.off === b) return;
    openSlash(b, q);
  }

  /* shortcut markdown: "## ", "> ", "- ", "1. " di awal paragraf */
  function md() {
    const b = curBlock();
    if (!b || b.tagName !== 'P') return;
    const cmd = C.markdownShortcut(b.textContent);
    if (cmd) {
      b.innerHTML = '<br>';
      placeCaret(b, false);
      runCmd(cmd);
    }
  }

  /* =====================================================================
     Toolbar saat teks dipilih + tautan
     ===================================================================== */
  const tb = els.seltb,
    fb = els.fmtbar,
    pop = els.linkpop,
    linkIn = els.linkIn;
  [tb, fb].forEach((el) => {
    on(el, 'mousedown', (e) => e.preventDefault());
    on(el, 'click', (e) => {
      const b = e.target.closest('[data-cmd]');
      if (b) runCmd(b.dataset.cmd);
    });
  });
  const hideSelTb = () => {
    tb.hidden = true;
  };
  function showSelTb(range) {
    const rects = range.getClientRects(),
      first = rects[0] || range.getBoundingClientRect(),
      all = range.getBoundingClientRect();
    tb.hidden = false;
    const w = tb.offsetWidth,
      h = tb.offsetHeight;
    const left = Math.max(8, Math.min(innerWidth - w - 8, all.left + all.width / 2 - w / 2));
    let top = first.top - h - 10;
    if (top < 8) top = (rects[rects.length - 1] || all).bottom + 10;
    tb.style.left = left + 'px';
    tb.style.top = top + 'px';
  }
  const state = (cmd) => {
    try {
      return document.queryCommandState(cmd);
    } catch (e) {
      return false;
    }
  };
  function refreshTools(b) {
    b = b || curBlock();
    const s = sel();
    const pressed = {
      bold: state('bold'),
      italic: state('italic'),
      h2: !!b && /^H[23]$/.test(b.tagName),
      quote: !!b && b.tagName === 'BLOCKQUOTE',
      ul: !!b && b.tagName === 'UL',
      link: !!(s.anchorNode && closestIn(s.anchorNode, 'A'))
    };
    [tb, fb].forEach((el) =>
      Array.prototype.forEach.call(el.querySelectorAll('[data-cmd]'), (x) => {
        x.setAttribute('aria-pressed', !!pressed[x.dataset.cmd]);
      })
    );
  }

  on(document, 'selectionchange', () => {
    if (selRaf) return;
    selRaf = requestAnimationFrame(() => {
      selRaf = 0;
      if (host.isPreviewing()) return;
      const s = sel(),
        inside = s.rangeCount && ed.contains(s.anchorNode) && ed.contains(s.focusNode);
      const b = inside ? curBlock() : null;
      if (inside && selFig) selectFig(null);
      Array.prototype.forEach.call(ed.querySelectorAll(':scope > .cur'), (x) => {
        if (x !== b) x.classList.remove('cur');
      });
      if (b) b.classList.add('cur');
      if (inside && !s.isCollapsed && s.toString().trim()) showSelTb(s.getRangeAt(0));
      else if (pop.hidden) hideSelTb();
      if (inside) refreshTools(b);
    });
  });

  function openLink() {
    const s = sel();
    if (!s.rangeCount || !ed.contains(s.anchorNode) || s.isCollapsed) {
      host.toast('Pilih teks dulu, lalu tambahkan tautan.');
      return;
    }
    linkRange = s.getRangeAt(0).cloneRange();
    const a = closestIn(s.anchorNode, 'A'),
      r = linkRange.getBoundingClientRect();
    pop.hidden = false;
    pop.classList.remove('bad');
    pop.removeAttribute('data-msg');
    linkIn.value = a ? a.getAttribute('href') : '';
    els.linkOff.hidden = !a;
    pop.style.left = Math.max(8, Math.min(innerWidth - pop.offsetWidth - 8, r.left)) + 'px';
    pop.style.top = Math.min(innerHeight - 120, r.bottom + 10) + 'px';
    hideSelTb();
    linkIn.focus();
    linkIn.select();
  }
  function closeLink(restore) {
    if (pop.hidden) return;
    pop.hidden = true;
    if (restore && linkRange) {
      ed.focus();
      const s = sel();
      s.removeAllRanges();
      s.addRange(linkRange);
    }
  }
  function badLink(msg) {
    pop.classList.add('bad');
    pop.setAttribute('data-msg', msg);
    linkIn.focus();
  }
  function applyLink() {
    const link = C.normalizeLink(linkIn.value);
    if (!link.ok) {
      badLink(link.msg);
      return;
    }
    closeLink(true);
    document.execCommand('createLink', false, link.href);
    changed();
    refreshTools();
  }
  on(linkIn, 'keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyLink();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeLink(true);
    } else pop.classList.remove('bad');
  });
  on(els.linkOk, 'click', applyLink);
  on(els.linkOff, 'click', () => {
    closeLink(true);
    document.execCommand('unlink');
    changed();
    refreshTools();
  });
  on(document, 'mousedown', (e) => {
    if (!pop.hidden && !pop.contains(e.target)) closeLink(false);
  });

  /* =====================================================================
     Isi: kata, kosong, judul
     ===================================================================== */
  function plainWords() {
    // hitung kata dari paragraf saja (keterangan gambar tidak dihitung)
    const texts = [];
    Array.prototype.forEach.call(ed.children, (c) => {
      if (c.tagName !== 'FIGURE') texts.push(c.innerText || '');
    });
    return C.countWords(texts);
  }
  function updateEmpty() {
    const empty =
      !ed.textContent.replace(/​/g, '').trim() &&
      ed.children.length <= 1 &&
      !ed.querySelector('hr,ul,ol,figure');
    ed.dataset.empty = empty;
    body.classList.toggle('hint-on', empty);
  }
  function grow() {
    title.style.height = 'auto';
    title.style.height = title.scrollHeight + 'px';
  }
  const focusBodyStart = () => {
    ed.focus();
    placeCaret(ed.firstElementChild || ed, false);
  };
  on(title, 'input', () => {
    if (/\n/.test(title.value)) title.value = title.value.replace(/\n+/g, ' ');
    grow();
    changed();
  });
  on(title, 'keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      focusBodyStart();
    } else if (
      e.key === 'ArrowDown' &&
      title.selectionStart === title.value.length &&
      !e.shiftKey
    ) {
      e.preventDefault();
      focusBodyStart();
    }
    typingOn(e);
  });
  on(window, 'resize', grow);

  /* =====================================================================
     Papan ketik di editor
     ===================================================================== */
  on(ed, 'keydown', (e) => {
    typingOn(e);
    if (slash.open) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSlash(1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSlash(-1);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        pickSlash(slash.items[slash.idx].id);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        slash.off = slash.block;
        closeSlash();
        return;
      }
    }
    if (selFig && figKey(e)) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && !e.shiftKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openLink();
      return;
    }
    const s = sel(),
      b = curBlock();
    if (!b) return;
    if (b.tagName === 'FIGURE') {
      // kursor di keterangan gambar
      const cap = closestIn(s.anchorNode, 'FIGCAPTION');
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        goAfter(b);
        return;
      }
      if (cap && s.isCollapsed && !e.shiftKey) {
        if (e.key === 'ArrowDown' && atEnd(cap)) {
          e.preventDefault();
          goAfter(b);
          return;
        }
        if (
          (e.key === 'ArrowUp' && atStart(cap)) ||
          (e.key === 'Backspace' && atStart(cap) && !cap.textContent)
        ) {
          e.preventDefault();
          sel().removeAllRanges();
          selectFig(b);
          return;
        }
      }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !mod && !e.isComposing) {
      if (b.tagName === 'P' && b.textContent.trim() === '---') {
        e.preventDefault();
        b.innerHTML = '<br>';
        placeCaret(b, false);
        insertHr();
        normalize();
        changed();
        return;
      }
      if (/^(H2|H3|BLOCKQUOTE)$/.test(b.tagName) && s.isCollapsed && atEnd(b)) {
        e.preventDefault();
        const p = newP();
        b.after(p);
        placeCaret(p, false);
        changed();
        return;
      }
    }
    if (e.key === 'Backspace' && s.isCollapsed && atStart(b)) {
      if (/^(H2|H3|BLOCKQUOTE)$/.test(b.tagName)) {
        e.preventDefault();
        fmt('p');
        changed();
        return;
      }
      const prev = b.previousElementSibling;
      if (prev && prev.tagName === 'HR' && b.tagName === 'P') {
        e.preventDefault();
        prev.remove();
        changed();
        return;
      }
      if (prev && prev.tagName === 'FIGURE' && b.tagName === 'P') {
        e.preventDefault();
        sel().removeAllRanges();
        selectFig(prev);
        return;
      } // Backspace lagi untuk menghapus gambar
      if (
        b === ed.firstElementChild &&
        b.tagName === 'P' &&
        !b.textContent &&
        ed.children.length === 1
      ) {
        e.preventDefault();
        caretEndOf(title);
        return;
      }
    }
    if (
      e.key === 'ArrowUp' &&
      s.isCollapsed &&
      b === ed.firstElementChild &&
      atStart(b) &&
      !e.shiftKey
    ) {
      e.preventDefault();
      caretEndOf(title);
    } else if (
      e.key === 'ArrowUp' &&
      s.isCollapsed &&
      !e.shiftKey &&
      atStart(b) &&
      b.previousElementSibling &&
      b.previousElementSibling.tagName === 'FIGURE'
    ) {
      e.preventDefault();
      sel().removeAllRanges();
      selectFig(b.previousElementSibling);
    }
  });
  on(ed, 'input', (e) => {
    normalize();
    if (e.inputType === 'insertText' && C.isSpaceKey(e.data)) md();
    checkSlash();
    changed();
  });
  on(ed, 'paste', (e) => {
    const cd = e.clipboardData || window.clipboardData,
      pics = Array.prototype.filter.call((cd && cd.files) || [], (f) => /^image\//.test(f.type));
    if (pics.length) {
      e.preventDefault();
      addFiles(pics, curBlock());
      return;
    }
    e.preventDefault();
    let t = cd.getData('text/plain');
    if (!t) return;
    t = t.replace(/\r\n?/g, '\n');
    if (closestIn(sel().anchorNode, 'FIGCAPTION')) {
      document.execCommand('insertText', false, t.replace(/\s+/g, ' ').trim());
      changed();
      return;
    }
    if (/^https?:\/\/\S+$/.test(t.trim()) && !sel().isCollapsed) {
      document.execCommand('createLink', false, t.trim());
      changed();
      return;
    }
    if (t.indexOf('\n') === -1) document.execCommand('insertText', false, t);
    else
      document.execCommand(
        'insertHTML',
        false,
        t
          .split(/\n{2,}/)
          .map((p) => '<p>' + U.esc(p.trim()).replace(/\n/g, '<br>') + '</p>')
          .join('')
      );
    normalize();
    changed();
  });
  const hasFiles = (e) => {
    const dt = e.dataTransfer;
    return !!dt && Array.prototype.indexOf.call(dt.types || [], 'Files') > -1;
  };
  function blockAt(x, y) {
    // blok tempat berkas dilepas
    let r = null;
    if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(x, y);
    else if (document.caretPositionFromPoint) {
      const cp = document.caretPositionFromPoint(x, y);
      if (cp) {
        r = document.createRange();
        r.setStart(cp.offsetNode, cp.offset);
      }
    }
    const n = r && r.startContainer,
      b = n && ed.contains(n) ? topBlock(n.nodeType === 1 ? n : n.parentNode) : null;
    return b || ed.lastElementChild;
  }
  on(ed, 'dragover', (e) => {
    if (hasFiles(e)) {
      e.preventDefault();
      body.classList.add('dragging');
    }
  });
  ['dragleave', 'dragend'].forEach((n) => on(ed, n, () => body.classList.remove('dragging')));
  on(ed, 'drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    body.classList.remove('dragging');
    const pics = Array.prototype.filter.call(e.dataTransfer.files, (f) => /^image\//.test(f.type));
    if (!pics.length) {
      host.toast('Hanya gambar yang bisa disisipkan.', { err: true });
      return;
    }
    addFiles(pics, blockAt(e.clientX, e.clientY));
  });
  on(ed, 'click', (e) => {
    // klik pemisah: pindah kursor ke paragraf setelahnya
    if (e.target.tagName === 'HR') {
      let n = e.target.nextElementSibling;
      if (!n) {
        n = newP();
        ed.appendChild(n);
      }
      placeCaret(n, false);
    }
  });
  on(ed, 'focusin', () => body.classList.add('ed-focus'));
  on(ed, 'focusout', (e) => {
    body.classList.remove('ed-focus');
    closeSlash();
    if (!(e.relatedTarget && els.altpop.contains(e.relatedTarget))) selectFig(null);
  });
  on(els.main, 'mousedown', (e) => {
    // klik area kosong di bawah editor: kursor ke akhir
    if (e.target === els.main || e.target === els.col) {
      const r = ed.getBoundingClientRect();
      if (e.clientY > r.bottom - 4) {
        e.preventDefault();
        ed.focus();
        let l = ed.lastElementChild;
        if (!l || l.tagName !== 'P' || l.textContent) {
          l = newP();
          ed.appendChild(l);
        }
        placeCaret(l, true);
      }
    }
  });

  /* mode mengetik: bilah atas memudar, muncul lagi saat kursor digerakkan */
  function typingOn(e) {
    if (e.metaKey || e.ctrlKey || e.altKey || /^(Shift|Control|Alt|Meta|Escape|Tab)$/.test(e.key))
      return;
    if (!body.classList.contains('typing')) body.classList.add('typing');
  }
  let lx = 0,
    ly = 0;
  on(
    window,
    'mousemove',
    (e) => {
      if (Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly) > 6) body.classList.remove('typing');
      lx = e.clientX;
      ly = e.clientY;
    },
    { passive: true }
  );
  on(window, 'pointerdown', () => body.classList.remove('typing'), { passive: true });

  /* bilah format mengikuti papan ketik di iOS */
  if (window.visualViewport) {
    const vv = window.visualViewport,
      posFb = () => {
        fb.style.bottom = Math.max(0, innerHeight - vv.height - vv.offsetTop) + 'px';
      };
    on(vv, 'resize', posFb);
    on(vv, 'scroll', posFb);
  }

  /* =====================================================================
     Gambar: sisip, pilih, hapus, teks alt
     ===================================================================== */
  const imgtb = els.imgtb,
    altpop = els.altpop,
    altIn = els.altIn;
  const figCount = () => ed.querySelectorAll('figure').length;

  function prepFig(f) {
    // figure tak bisa diketik, kecuali keterangannya
    f.setAttribute('contenteditable', 'false');
    const im = f.querySelector('img');
    if (im) im.draggable = false;
    let c = f.querySelector('figcaption');
    if (!c) {
      c = document.createElement('figcaption');
      f.appendChild(c);
    }
    c.setAttribute('contenteditable', 'true');
    c.setAttribute('spellcheck', 'true');
  }
  function makeFig(d) {
    const f = document.createElement('figure'),
      im = document.createElement('img'),
      cap = document.createElement('figcaption');
    im.src = d.src;
    im.alt = d.alt || '';
    if (d.w && d.h) {
      im.setAttribute('width', d.w);
      im.setAttribute('height', d.h);
    }
    if (d.ai) f.setAttribute('data-ai', '1');
    cap.textContent = d.cap || '';
    f.appendChild(im);
    f.appendChild(cap);
    prepFig(f);
    return f;
  }
  const anchorBlock = () =>
    imgAnchor && imgAnchor.parentNode === ed ? imgAnchor : ed.lastElementChild;
  function insertFigure(d, at) {
    // sisipkan sebelum paragraf kosong, atau setelah blok; kursor pindah ke paragraf sesudahnya
    const b = at && at.parentNode === ed ? at : ed.lastElementChild,
      f = makeFig(d);
    let next;
    if (b && b.tagName === 'P' && !b.textContent.trim()) {
      b.parentNode.insertBefore(f, b);
      next = b;
    } else if (b) {
      b.after(f);
      next = f.nextElementSibling;
    } else ed.appendChild(f);
    if (!next || next.tagName !== 'P') {
      next = newP();
      f.after(next);
    }
    placeCaret(next, false);
    updateEmpty();
    return f;
  }
  /* berkas → gambar kecil → figure; satu per satu agar urutannya terjaga */
  function addFiles(files, at, say) {
    say = say || ((m, err) => host.toast(m, err ? { err: true, ms: 5000 } : {}));
    let list = Array.prototype.filter.call(files, (f) => /^image\//.test(f.type));
    const room = MAXI - figCount();
    let done = 0;
    if (!list.length) {
      say('Hanya gambar yang bisa disisipkan.', true);
      return Promise.resolve(0);
    }
    if (room <= 0) {
      say('Maksimal ' + MAXI + ' gambar per tulisan.', true);
      return Promise.resolve(0);
    }
    if (list.length > room) {
      say('Hanya ' + room + ' gambar yang muat; sisanya dilewati.', true);
      list = list.slice(0, room);
    }
    let cur = at;
    return list
      .reduce(
        (p, f) =>
          p.then(() => {
            say('Memproses ' + (f.name || 'gambar') + '…');
            return images.fromFile(f).then(
              (d) => {
                const fig = insertFigure({ src: d.src, w: d.w, h: d.h, alt: '' }, cur);
                cur = fig.nextElementSibling;
                done++;
              },
              (e) => {
                say(e.message, true);
              }
            );
          }),
        Promise.resolve()
      )
      .then(() => {
        if (done) {
          changed();
          say(
            done === 1
              ? 'Gambar ditambahkan. Klik gambar untuk teks alt atau hapus.'
              : done + ' gambar ditambahkan.'
          );
        }
        return done;
      });
  }

  /* pilih gambar: toolbar kecil, Backspace/Delete menghapus */
  function showImgTb(f) {
    const r = f.querySelector('img').getBoundingClientRect();
    imgtb.hidden = false;
    const w = imgtb.offsetWidth,
      h = imgtb.offsetHeight;
    let top = r.top - h - 10;
    if (top < 8) top = Math.min(innerHeight - h - 8, r.top + 10);
    imgtb.style.left =
      Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    imgtb.style.top = top + 'px';
  }
  const closeAlt = () => {
    altpop.hidden = true;
  };
  function selectFig(f) {
    if (selFig && selFig !== f) selFig.classList.remove('sel');
    selFig = f || null;
    if (selFig) {
      selFig.classList.add('sel');
      showImgTb(selFig);
    } else {
      imgtb.hidden = true;
      closeAlt();
    }
  }
  function goAfter(f) {
    // lanjut menulis di paragraf setelah gambar
    let n = f.nextElementSibling;
    if (!n || n.tagName !== 'P') {
      n = newP();
      f.after(n);
    }
    selectFig(null);
    placeCaret(n, false);
  }
  function removeFig(f) {
    const next = f.nextElementSibling,
      prev = f.previousElementSibling;
    let t = next && next.tagName === 'P' ? next : null,
      atEndOf = false;
    f.remove();
    selectFig(null);
    if (!t && prev && prev.tagName === 'P') {
      t = prev;
      atEndOf = true;
    }
    if (!t) {
      t = newP();
      if (prev) prev.after(t);
      else ed.insertBefore(t, ed.firstChild);
    }
    ed.focus();
    placeCaret(t, atEndOf);
    updateEmpty();
    changed();
  }
  function figKey(e) {
    // true = tombol sudah ditangani
    const f = selFig,
      mod = e.metaKey || e.ctrlKey || e.altKey;
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      removeFig(f);
      return true;
    }
    if (e.key === 'Escape') {
      selectFig(null);
      return true;
    }
    if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      goAfter(f);
      return true;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const pv = f.previousElementSibling;
      selectFig(null);
      if (pv && pv.tagName === 'P') placeCaret(pv, true);
      else if (pv && pv.tagName === 'FIGURE') {
        sel().removeAllRanges();
        selectFig(pv);
      } else caretEndOf(title);
      return true;
    }
    if (e.key.length === 1 && !mod) {
      goAfter(f);
      return false;
    } // mengetik: huruf masuk ke paragraf sesudah gambar
    return false;
  }
  on(ed, 'mousedown', (e) => {
    if (e.target.tagName !== 'IMG') return;
    e.preventDefault();
    ed.focus({ preventScroll: true });
    sel().removeAllRanges();
    selectFig(e.target.closest('figure'));
  });
  on(ed, 'click', (e) => {
    // peramban menaruh kursor lagi saat klik dilepas: kosongkan agar gambar tetap terpilih
    if (e.target.tagName === 'IMG' && selFig) sel().removeAllRanges();
  });
  on(imgtb, 'mousedown', (e) => e.preventDefault());
  on(imgtb, 'click', (e) => {
    const b = e.target.closest('[data-img]');
    if (!b || !selFig) return;
    if (b.dataset.img === 'del') removeFig(selFig);
    else openAlt();
  });
  function openAlt() {
    if (!selFig) return;
    const im = selFig.querySelector('img'),
      r = im.getBoundingClientRect();
    altIn.value = im.getAttribute('alt') || '';
    altpop.hidden = false;
    imgtb.hidden = true;
    altpop.style.left = Math.max(8, Math.min(innerWidth - altpop.offsetWidth - 8, r.left)) + 'px';
    altpop.style.top = Math.max(8, Math.min(innerHeight - 70, r.top + 12)) + 'px';
    altIn.focus();
    altIn.select();
  }
  function applyAlt() {
    const f = selFig;
    if (!f) return closeAlt();
    f.querySelector('img').setAttribute(
      'alt',
      altIn.value.replace(/\s+/g, ' ').trim().slice(0, 300)
    );
    closeAlt();
    ed.focus({ preventScroll: true });
    sel().removeAllRanges();
    showImgTb(f);
    changed();
    host.toast('Teks alt disimpan.');
  }
  on(altIn, 'keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyAlt();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeAlt();
      ed.focus({ preventScroll: true });
      if (selFig) showImgTb(selFig);
    }
  });
  on(els.altOk, 'click', applyAlt);
  const figPos = () => {
    if (selFig && !imgtb.hidden) showImgTb(selFig);
  };
  on(window, 'scroll', figPos, { passive: true });
  on(window, 'resize', figPos);

  /* =====================================================================
     API untuk halaman
     ===================================================================== */
  const closeTransient = () => {
    closeSlash();
    hideSelTb();
    closeLink(false);
    selectFig(null);
  };

  return {
    /** isi awal dari HTML tersimpan (disanitasi), lalu siapkan hr & figure */
    load(html) {
      ed.innerHTML = sanitize(html || '') || '<p><br></p>';
      Array.prototype.forEach.call(ed.querySelectorAll('hr'), (h) =>
        h.setAttribute('contenteditable', 'false')
      );
      Array.prototype.forEach.call(ed.querySelectorAll('figure'), prepFig);
      grow();
      updateEmpty();
    },
    getHtml: () => sanitize(ed.innerHTML),
    notifyChanged: changed,
    plainWords,
    updateEmpty,
    grow,
    runCmd,
    closeTransient,
    figCount,
    addFiles,
    insertFigure,
    anchorBlock,
    placeCaret,
    caretEndOf,
    hasFigure: () => !!ed.querySelector('figure'),
    /** dipanggil sebelum dialog gambar dibuka; false bila sudah mencapai batas */
    beginImage() {
      if (figCount() >= MAXI) {
        host.toast('Maksimal ' + MAXI + ' gambar per tulisan.', { err: true });
        return false;
      }
      imgAnchor = curBlock() || ed.lastElementChild;
      closeTransient();
      return true;
    },
    focus(opts) {
      ed.focus(opts);
    },
    focusInitial(hasContent, scroll) {
      // judul kalau kosong, kalau tidak ke akhir tulisan
      if (!hasContent) {
        title.focus();
        return;
      }
      ed.focus();
      const l = ed.lastElementChild;
      if (l) placeCaret(l, true);
      if (scroll)
        setTimeout(() => {
          (l || ed).scrollIntoView({ block: 'center' });
        }, 0);
    },
    dispose() {
      disposed = true;
      off.forEach((f) => f());
      cancelAnimationFrame(selRaf);
      ['typing', 'dragging', 'ed-focus', 'hint-on'].forEach((c) => body.classList.remove(c));
    }
  };
}
