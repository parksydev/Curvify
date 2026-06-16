/* GeoGebra-style structured input bar + symbol pad */
const InputPanel = {
  history: [],
  historyIndex: -1,
  maxHistory: 40,
  editingId: null,

  init() {
    this.el = {
      dock: document.getElementById('inputDock'),
      typeSelect: document.getElementById('inputTypeSelect'),
      nameInput: document.getElementById('inputName'),
      prefix: document.getElementById('inputPrefix'),
      expr: document.getElementById('commandInput'),
      preview: document.getElementById('inputPreview'),
      previewIcon: document.getElementById('inputPreviewIcon'),
      btnSubmit: document.getElementById('btnInputSubmit'),
      btnCancel: document.getElementById('btnInputCancel'),
      btnPadToggle: document.getElementById('btnPadToggle'),
      pad: document.getElementById('inputPad'),
      padGrid: document.getElementById('inputPadGrid'),
      templateSelect: document.getElementById('inputTemplateSelect'),
      btnHistoryPrev: document.getElementById('btnInputHistoryPrev'),
      btnHistoryNext: document.getElementById('btnInputHistoryNext'),
      btnClear: document.getElementById('btnInputClear'),
      syntaxDialog: document.getElementById('syntaxDialog'),
      btnSyntax: document.getElementById('btnInputSyntax'),
    };

    this._buildPad();
    this._bindEvents();
    this._syncModeUI();
    this._updatePreview();
    this._updateEditUI();
  },

  types: {
    cartesian: [
      { id: 'function', label: '함수 f(x)', nameDefault: 'f', prefix: '=', prefixLatex: '(x)=' },
      { id: 'point', label: '점 A', nameDefault: 'A', prefix: '=', prefixLatex: '' },
    ],
    polar: [
      { id: 'polar', label: '극함수 r(θ)', nameDefault: 'r', prefix: '=', prefixLatex: '(\\theta)=' },
      { id: 'point-polar', label: '점 (r;θ)', nameDefault: 'A', prefix: '=', prefixLatex: '' },
      { id: 'point', label: '점 (x,y)', nameDefault: 'A', prefix: '=', prefixLatex: '' },
    ],
  },

  templates: {
    cartesian: {
      function: [
        { label: '— 템플릿 —', value: '' },
        { label: 'x²', value: 'x^{2}' },
        { label: '분수', value: '\\frac{x}{2}' },
        { label: 'sin', value: '\\sin(x)' },
        { label: 'cos', value: '\\cos(x)' },
        { label: 'e^x', value: 'e^{x}' },
        { label: 'ln', value: '\\ln(x)' },
        { label: '√x', value: '\\sqrt{x}' },
        { label: '|x|', value: '\\left|x\\right|' },
        { label: '2.5x', value: '2.5\\,x' },
      ],
      point: [
        { label: '— 템플릿 —', value: '' },
        { label: '(0,0)', value: '(0,\\,0)' },
        { label: '(1.5, 2.5)', value: '(1.5,\\,2.5)' },
      ],
    },
    polar: {
      polar: [
        { label: '— 템플릿 —', value: '' },
        { label: '마카로니', value: '1+\\cos(\\theta)' },
        { label: '원', value: '2' },
        { label: '장미', value: '\\sin(3\\theta)' },
        { label: '나선', value: '\\theta' },
      ],
      'point-polar': [
        { label: '— 템플릿 —', value: '' },
        { label: '(1;0°)', value: '(1;\\,0^{\\circ})' },
        { label: '(2;45°)', value: '(2;\\,45^{\\circ})' },
        { label: '(1;π/4)', value: '(1;\\,\\frac{\\pi}{4})' },
      ],
      point: [
        { label: '— 템플릿 —', value: '' },
        { label: '(1,0)', value: '(1,\\,0)' },
      ],
    },
  },

  padKeys: [
    { keys: ['7', '8', '9', 'x^2', 'sin', 'cos', 'tan'], row: 'num' },
    { keys: ['4', '5', '6', 'cdot', 'sqrt', 'ln', 'log'], row: 'num' },
    { keys: ['1', '2', '3', 'frac', 'pi', 'theta', 'e'], row: 'num' },
    { keys: ['0', '.', '+', '-', '(', ')', '←'], row: 'num' },
    { keys: ['x', 'theta', 'abs'], row: 'var' },
  ],

  padLatex: {
    '7': '7', '8': '8', '9': '9', '4': '4', '5': '5', '6': '6',
    '1': '1', '2': '2', '3': '3', '0': '0', '.': '.', '+': '+', '-': '-',
    '(': '(', ')': ')',
    x: 'x', 'x^2': 'x^{2}', theta: '\\theta',
    sin: '\\sin\\left(x\\right)', cos: '\\cos\\left(x\\right)', tan: '\\tan\\left(x\\right)',
    sqrt: '\\sqrt{x}', ln: '\\ln\\left(x\\right)', log: '\\log\\left(x\\right)',
    cdot: ' \\cdot ', frac: '\\frac{}{}', pi: '\\pi', e: 'e', abs: '\\left|x\\right|',
  },

  _buildPad() {
    const grid = this.el.padGrid;
    grid.innerHTML = '';
    for (const row of this.padKeys) {
      for (const key of row.keys) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `pad-key pad-${row.row}`;
        btn.dataset.insert = key;
        if (key === '←') {
          btn.textContent = '⌫';
          btn.title = '지우기';
          btn.dataset.action = 'backspace';
        } else if (key === 'frac') {
          btn.textContent = 'a/b';
          btn.title = '분수 \\frac{}{}';
        } else if (key === 'cdot') {
          btn.textContent = '·';
          btn.title = '곱하기 \\cdot';
        } else if (key === 'x^2') {
          btn.textContent = 'x²';
          btn.title = 'x^{2}';
        } else if (key === 'theta') {
          btn.textContent = 'θ';
          btn.title = '\\theta';
        } else {
          btn.textContent = key;
          btn.title = this.padLatex[key] || key;
        }
        grid.appendChild(btn);
      }
    }
  },

  _bindEvents() {
    this.el.typeSelect.addEventListener('change', () => {
      if (this.editingId) this.cancelEdit();
      this._syncModeUI();
      this._updatePreview();
    });

    this.el.nameInput.addEventListener('input', () => {
      this.el.nameInput.dataset.auto = '0';
      const meta = this.getTypeOptions().find((o) => o.id === this.getInputType());
      if (meta) this._renderPrefixLatex(meta, this.getInputType());
      this._updatePreview();
    });
    this.el.expr.addEventListener('input', () => this._updatePreview());
    this.el.expr.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.editingId) {
        e.preventDefault();
        this.cancelEdit();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submit();
      } else if (e.key === 'ArrowUp' && e.ctrlKey) {
        e.preventDefault();
        this.historyPrev();
      } else if (e.key === 'ArrowDown' && e.ctrlKey) {
        e.preventDefault();
        this.historyNext();
      }
    });

    this.el.btnSubmit.addEventListener('click', () => this.submit());
    if (this.el.btnCancel) {
      this.el.btnCancel.addEventListener('click', () => this.cancelEdit());
    }
    this.el.btnPadToggle.addEventListener('click', () => this.togglePad());
    this.el.btnClear.addEventListener('click', () => {
      if (this.editingId) {
        this.cancelEdit();
        return;
      }
      this.el.expr.value = '';
      this._updatePreview();
      this.el.expr.focus();
    });
    this.el.btnHistoryPrev.addEventListener('click', () => this.historyPrev());
    this.el.btnHistoryNext.addEventListener('click', () => this.historyNext());
    this.el.btnSyntax.addEventListener('click', () => this.el.syntaxDialog.showModal());

    this.el.templateSelect.addEventListener('change', () => {
      const v = this.el.templateSelect.value;
      if (v) {
        this.insertAtCursor(v);
        this.el.templateSelect.value = '';
      }
    });

    this.el.padGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.pad-key');
      if (!btn) return;
      if (btn.dataset.action === 'backspace') {
        this.backspace();
        return;
      }
      const ins = btn.dataset.insert;
      if (ins === 'x' && Coords.isPolar() && this.getInputType() === 'polar') {
        this.insertAtCursor('θ');
      } else if (ins === 'θ' && !Coords.isPolar() && this.getInputType() === 'function') {
        this.insertAtCursor('x');
      } else if (ins) {
        this.insertAtCursor(ins === 'pi' ? 'pi' : ins);
      }
    });
  },

  onCoordModeChange() {
    this._syncModeUI();
    this._updatePreview();
  },

  getInputType() {
    return this.el.typeSelect.value;
  },

  getTypeOptions() {
    return Coords.isPolar() ? this.types.polar : this.types.cartesian;
  },

  _syncModeUI(preserveFields = false) {
    const options = this.getTypeOptions();
    const prev = this.el.typeSelect.value;
    this.el.typeSelect.innerHTML = '';
    for (const opt of options) {
      const el = document.createElement('option');
      el.value = opt.id;
      el.textContent = opt.label;
      this.el.typeSelect.appendChild(el);
    }
    const valid = options.some((o) => o.id === prev);
    const selected = valid ? prev : options[0].id;
    this.el.typeSelect.value = selected;

    const meta = options.find((o) => o.id === selected) || options[0];
    if (!preserveFields && (!valid || this.el.nameInput.dataset.auto === '1')) {
      this.el.nameInput.value = meta.nameDefault;
      this.el.nameInput.dataset.auto = '1';
    }

    this.el.prefix.textContent = meta.prefix;
    this._renderPrefixLatex(meta, selected);

    const placeholders = {
      function: 'x^{2} + \\frac{1}{2}\\sin(x)',
      point: '(3,\\,4)',
      polar: '1 + \\cos(\\theta)',
      'point-polar': '(2;\\,45^{\\circ})',
    };
    this.el.expr.placeholder = placeholders[selected] || '';

    const mode = Coords.isPolar() ? 'polar' : 'cartesian';
    const tplKey = selected === 'polar' ? 'polar' : selected;
    const tpls =
      this.templates[mode][tplKey] || this.templates[mode].function || [];
    this.el.templateSelect.innerHTML = '';
    for (const t of tpls) {
      const o = document.createElement('option');
      o.value = t.value;
      o.textContent = t.label;
      this.el.templateSelect.appendChild(o);
    }

    this.el.nameInput.placeholder =
      selected.includes('point') ? 'A' : selected === 'polar' ? 'r' : 'f';
  },

  _renderPrefixLatex(meta, typeId) {
    const name = this.el.nameInput.value.trim() || meta.nameDefault;
    let tex = '';
    if (typeId === 'function') tex = `${name}${meta.prefixLatex || '(x)='}`;
    else if (typeId === 'polar') tex = `${name}${meta.prefixLatex || '(\\theta)='}`;
    else tex = `${name}=`;
    const wrap = this.el.prefix;
    wrap.dataset.latex = tex;
    if (typeof katex !== 'undefined' && tex) {
      try {
        katex.render(tex, wrap, { throwOnError: false, displayMode: false });
        return;
      } catch (_) {
        /* fall through */
      }
    }
    wrap.textContent = typeId === 'point' || typeId === 'point-polar' ? '=' : meta.prefix;
  },

  buildCommand() {
    const type = this.getInputType();
    const name = this.el.nameInput.value.trim();
    const expr = this.el.expr.value.trim();
    if (!expr) return '';

    if (type === 'function') {
      const fn = (name || 'f').toLowerCase();
      return `${fn}(x) = ${expr}`;
    }
    if (type === 'polar') {
      const fn = (name || 'r').toLowerCase();
      if (expr.includes('=')) return expr;
      return `${fn}(θ) = ${expr}`;
    }
    if (type === 'point-polar') {
      const pt = (name || 'A').toUpperCase();
      const body = expr.startsWith('(') ? expr : `(${expr})`;
      return `${pt} = ${body}`;
    }
    if (type === 'point') {
      const pt = (name || 'A').toUpperCase();
      const body = expr.startsWith('(') ? expr : `(${expr})`;
      return `${pt} = ${body}`;
    }
    return expr;
  },

  _updatePreview() {
    const cmd = this.buildCommand();
    const el = this.el.preview;
    const icon = this.el.previewIcon;

    if (!cmd) {
      el.textContent = '';
      el.className = 'input-preview katex-preview';
      el.title = '';
      icon.textContent = '○';
      icon.className = 'input-preview-icon';
      Latex.render(el, '\\text{LaTeX 수식을 입력하세요}');
      return;
    }

    const check = Parser.validate(cmd);
    if (check.ok && check.displayLatex) {
      Latex.render(el, check.displayLatex);
      el.className = 'input-preview katex-preview ok';
      icon.textContent = '✓';
      icon.className = 'input-preview-icon ok';
      el.title = check.display || '';
    } else if (check.ok) {
      Latex.renderOrPlain(el, check.display || cmd);
      el.className = 'input-preview katex-preview ok';
      icon.textContent = '✓';
      icon.className = 'input-preview-icon ok';
    } else {
      el.textContent = check.error || '오류';
      el.className = 'input-preview katex-preview err';
      icon.textContent = '!';
      icon.className = 'input-preview-icon err';
      el.title = check.error || '';
    }
  },

  insertAtCursor(text) {
    const type = this.getInputType();
    const mapped = this.padLatex[text];
    if (mapped) text = mapped;

    const input = this.el.expr;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const before = input.value.slice(0, start);
    const after = input.value.slice(end);
    input.value = before + text + after;
    const pos = start + text.length;
    input.setSelectionRange(pos, pos);
    input.focus();
    this._updatePreview();
  },

  backspace() {
    const input = this.el.expr;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    if (start !== end) {
      input.value = input.value.slice(0, start) + input.value.slice(end);
      input.setSelectionRange(start, start);
    } else if (start > 0) {
      input.value = input.value.slice(0, start - 1) + input.value.slice(start);
      input.setSelectionRange(start - 1, start - 1);
    }
    input.focus();
    this._updatePreview();
  },

  togglePad() {
    const open = this.el.dock.classList.toggle('pad-open');
    this.el.btnPadToggle.setAttribute('aria-expanded', open);
    this.el.pad.hidden = !open;
    setTimeout(() => Render.resize(), 200);
  },

  pushHistory(cmd) {
    if (!cmd) return;
    if (this.history[this.history.length - 1] !== cmd) {
      this.history.push(cmd);
      if (this.history.length > this.maxHistory) this.history.shift();
    }
    this.historyIndex = this.history.length;
  },

  historyPrev() {
    if (this.history.length === 0) return;
    if (this.historyIndex > 0) this.historyIndex -= 1;
    this._loadFromHistory(this.history[this.historyIndex]);
  },

  historyNext() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex += 1;
      this._loadFromHistory(this.history[this.historyIndex]);
    }
  },

  _loadFromHistory(cmd) {
    this.cancelEdit();
    this.el.expr.value = cmd;
    this._updatePreview();
  },

  _formatPointExpr(obj) {
    if (obj.polar && Coords.isPolar()) {
      return Latex.pointPolarCoords(obj.polar.r, obj.polar.theta);
    }
    return Latex.pointCartesianCoords(obj.x, obj.y);
  },

  _requiredCoordMode(obj) {
    if (obj.type === 'polar-explicit') return 'polar';
    if (obj.type === 'function-explicit') return 'cartesian';
    return App.coordMode;
  },

  loadFromObject(obj) {
    if (!obj || !['function-explicit', 'polar-explicit', 'point'].includes(obj.type)) {
      showWarning('입력으로 정의된 객체만 수정할 수 있습니다.');
      return false;
    }

    const requiredMode = this._requiredCoordMode(obj);
    if (App.coordMode !== requiredMode) {
      setCoordMode(requiredMode);
    }

    this.editingId = obj.id;
    this.el.nameInput.dataset.auto = '0';

    if (obj.type === 'function-explicit') {
      this.el.typeSelect.value = 'function';
      this.el.nameInput.value = obj.name;
      this.el.expr.value = obj.exprLatex || obj.expr || '';
    } else if (obj.type === 'polar-explicit') {
      this.el.typeSelect.value = 'polar';
      this.el.nameInput.value = obj.name;
      this.el.expr.value = obj.exprLatex || obj.expr || '';
    } else if (obj.type === 'point') {
      if (obj.polar && Coords.isPolar()) {
        this.el.typeSelect.value = 'point-polar';
      } else {
        this.el.typeSelect.value = 'point';
      }
      this.el.nameInput.value = obj.name;
      this.el.expr.value = this._formatPointExpr(obj);
    }

    this._syncModeUI(true);
    this._updatePreview();
    this._updateEditUI();
    if (typeof UI !== 'undefined') {
      UI.setTool('input');
      UI.refreshAlgebra();
    }
    return true;
  },

  cancelEdit() {
    if (!this.editingId) return;
    this.editingId = null;
    this.el.expr.value = '';
    this.el.nameInput.dataset.auto = '1';
    this._syncModeUI();
    this._updatePreview();
    this._updateEditUI();
    if (typeof UI !== 'undefined') UI.refreshAlgebra();
  },

  _updateEditUI() {
    const editing = !!this.editingId;
    this.el.btnSubmit.textContent = editing ? '수정' : '입력';
    this.el.btnSubmit.title = editing ? '수정 적용 (Enter)' : '입력 실행 (Enter)';
    if (this.el.btnCancel) this.el.btnCancel.hidden = !editing;
    if (this.el.btnClear) {
      this.el.btnClear.title = editing ? '편집 취소' : '식 지우기';
    }
    if (this.el.dock) this.el.dock.classList.toggle('input-editing', editing);
  },

  submit() {
    const cmd = this.buildCommand();
    if (!cmd) {
      showError('식을 입력하세요.');
      return;
    }
    const check = Parser.validate(cmd);
    if (!check.ok) {
      showError(check.error);
      return;
    }
    const editingId = this.editingId;
    if (!editingId) this.pushHistory(cmd);
    if (typeof UI !== 'undefined') {
      const ok = UI.submitCommand(cmd, editingId);
      if (!ok) return;
    }
    this.editingId = null;
    this.el.expr.value = '';
    this.el.nameInput.dataset.auto = '1';
    this._syncModeUI();
    this._updatePreview();
    this._updateEditUI();
  },

  focus() {
    this.el.expr.focus();
  },
};
