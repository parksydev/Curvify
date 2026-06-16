const UI = {
  elements: {},

  init() {
    this.elements = {
      algebraList: document.getElementById('algebraList'),
      algebraEmpty: document.getElementById('algebraEmpty'),
      algebraPanel: document.getElementById('algebraPanel'),
      btnCloseAlgebra: document.getElementById('btnCloseAlgebra'),
      btnShowAlgebra: document.getElementById('btnShowAlgebra'),
      toolStatus: document.getElementById('toolStatus'),
      commandInput: document.getElementById('commandInput'),
      canvas: document.getElementById('graphCanvas'),
      chkGrid: document.getElementById('chkGrid'),
      chkAxes: document.getElementById('chkAxes'),
      chkAlgebra: document.getElementById('chkAlgebra'),
      helpDialog: document.getElementById('helpDialog'),
      aboutDialog: document.getElementById('aboutDialog'),
      coordBadge: document.getElementById('coordBadge'),
      graphicsPanel: document.getElementById('graphicsPanel'),
      btnToolFunction: document.getElementById('btnToolFunction'),
      fitMethodSelect: document.getElementById('fitMethodSelect'),
    };

    this._bindMenus();
    this._bindCoordMode();
    this._bindFitMethod();
    this._bindToolbar();
    this._bindAlgebraPanel();
    this._bindViewOptions();
    if (typeof InputPanel !== 'undefined') InputPanel.init();
    this.refreshAlgebra();
    this.updateUndoRedo();
    this.setTool(App.tool);
    this.populateFitMethodSelect();
    this.onCoordModeChange(App.coordMode);
  },

  _bindFitMethod() {
    this.elements.fitMethodSelect.addEventListener('change', () => {
      const id = this.elements.fitMethodSelect.value;
      FitModels.setMethod(id);
      const hasSketch = App.objects.some(
        (o) => o.type === 'function-sketch' || o.type === 'polar-sketch'
      );
      if (hasSketch) {
        FitModels.refitAll();
        this.refreshAlgebra();
        Render.request();
        showInfo(`근사 방법: ${FitModels._methodLabel(id)}`);
      }
    });
  },

  populateFitMethodSelect() {
    const sel = this.elements.fitMethodSelect;
    const current = FitModels.getMethod();
    const options = FitModels.getOptions();
    sel.innerHTML = '';
    for (const opt of options) {
      const el = document.createElement('option');
      el.value = opt.id;
      el.textContent = opt.label;
      sel.appendChild(el);
    }
    sel.value = options.some((o) => o.id === current) ? current : 'auto';
  },

  _appendFitMeta(label, obj) {
    if (!obj.equation) return;
    const sub = document.createElement('div');
    sub.className = 'obj-sub';
    const r2 =
      obj.equation.rSquared !== undefined
        ? ` · R²=${obj.equation.rSquared.toFixed(3)}`
        : '';
    sub.textContent = `근사: ${obj.equation.methodLabel || '—'}${r2}`;
    label.appendChild(sub);
  },

  _bindCoordMode() {
    document.querySelectorAll('[data-coord]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setCoordMode(btn.dataset.coord);
      });
    });
  },

  onCoordModeChange(mode) {
    document.querySelectorAll('[data-coord]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.coord === mode);
    });

    const isPolar = mode === 'polar';
    if (this.elements.coordBadge) {
      this.elements.coordBadge.textContent = isPolar ? '극좌표 (r, θ)' : '직교좌표 (x, y)';
      this.elements.coordBadge.classList.toggle('polar', isPolar);
    }
    if (this.elements.graphicsPanel) {
      this.elements.graphicsPanel.classList.toggle('mode-polar', isPolar);
    }
    if (this.elements.btnToolFunction) {
      this.elements.btnToolFunction.title = isPolar ? '극곡선 그리기 (F)' : '함수 그리기 (F)';
      const ic = this.elements.btnToolFunction.querySelector('.icon-cartesian');
      const ip = this.elements.btnToolFunction.querySelector('.icon-polar');
      if (ic) ic.hidden = isPolar;
      if (ip) ip.hidden = !isPolar;
    }

    if (typeof InputPanel !== 'undefined') InputPanel.onCoordModeChange();

    const labels = {
      move: '이동',
      function: isPolar ? '극곡선 그리기' : '함수 그리기',
      point: '점',
      input: '입력',
    };
    if (labels[App.tool]) this.elements.toolStatus.textContent = labels[App.tool];

    this.populateFitMethodSelect();
    this.refreshAlgebra();
    Render.request();
  },

  _bindMenus() {
    document.querySelectorAll('.menu').forEach((menu) => {
      const trigger = menu.querySelector('.menu-trigger');
      const dropdown = menu.querySelector('.menu-dropdown');

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = menu.classList.contains('open');
        document.querySelectorAll('.menu.open').forEach((m) => {
          m.classList.remove('open');
          m.querySelector('.menu-dropdown').hidden = true;
        });
        if (!open) {
          menu.classList.add('open');
          dropdown.hidden = false;
        }
      });

      dropdown.querySelectorAll('button[data-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.handleAction(btn.dataset.action);
          menu.classList.remove('open');
          dropdown.hidden = true;
        });
      });

      dropdown.querySelectorAll('button[data-tool]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.setTool(btn.dataset.tool);
          menu.classList.remove('open');
          dropdown.hidden = true;
        });
      });

      dropdown.querySelectorAll('button[data-coord]').forEach((btn) => {
        btn.addEventListener('click', () => {
          setCoordMode(btn.dataset.coord);
          menu.classList.remove('open');
          dropdown.hidden = true;
        });
      });
    });

    document.addEventListener('click', () => {
      document.querySelectorAll('.menu.open').forEach((m) => {
        m.classList.remove('open');
        m.querySelector('.menu-dropdown').hidden = true;
      });
    });
  },

  _bindToolbar() {
    document.querySelectorAll('.toolbar .tool-btn[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => this.setTool(btn.dataset.tool));
    });

    document.querySelectorAll('[data-action]').forEach((el) => {
      if (el.closest('.menu-dropdown')) return;
      if (!el.dataset.action) return;
      if (el.classList.contains('tool-btn') && el.closest('.toolbar')) {
        el.addEventListener('click', () => this.handleAction(el.dataset.action));
      }
    });

    document.querySelectorAll('.toolbar [data-action]').forEach((btn) => {
      btn.addEventListener('click', () => this.handleAction(btn.dataset.action));
    });
  },

  _bindAlgebraPanel() {
    document.getElementById('btnCloseAlgebra').addEventListener('click', () => {
      this.elements.algebraPanel.classList.add('collapsed');
      this.elements.btnShowAlgebra.hidden = false;
      this.elements.chkAlgebra.checked = false;
      setTimeout(() => Render.resize(), 220);
    });

    this.elements.btnShowAlgebra.addEventListener('click', () => {
      this.elements.algebraPanel.classList.remove('collapsed');
      this.elements.btnShowAlgebra.hidden = true;
      this.elements.chkAlgebra.checked = true;
      setTimeout(() => Render.resize(), 220);
    });
  },

  _bindViewOptions() {
    this.elements.chkGrid.addEventListener('change', () => {
      App.view.showGrid = this.elements.chkGrid.checked;
      Render.request();
    });
    this.elements.chkAxes.addEventListener('change', () => {
      App.view.showAxes = this.elements.chkAxes.checked;
      Render.request();
    });
    this.elements.chkAlgebra.addEventListener('change', () => {
      if (this.elements.chkAlgebra.checked) {
        this.elements.algebraPanel.classList.remove('collapsed');
        this.elements.btnShowAlgebra.hidden = true;
      } else {
        this.elements.algebraPanel.classList.add('collapsed');
        this.elements.btnShowAlgebra.hidden = false;
      }
      setTimeout(() => Render.resize(), 220);
    });
  },

  setTool(tool) {
    App.tool = tool;
    const isPolar = Coords.isPolar();
    const labels = {
      move: '이동',
      function: isPolar ? '극곡선 그리기' : '함수 그리기',
      point: '점',
      input: '입력',
    };
    this.elements.toolStatus.textContent = labels[tool] || tool;

    document.querySelectorAll('.tool-btn[data-tool]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });

    const canvas = this.elements.canvas;
    canvas.className = '';
    canvas.classList.add(`tool-${tool}`);

    if (tool === 'function') {
      if (Coords.isPolar()) PolarSketch.startNew();
      else Sketch.startNewFunction();
    }
    if (tool === 'input' && typeof InputPanel !== 'undefined') InputPanel.focus();
  },

  handleAction(action) {
    switch (action) {
      case 'undo':
        undo();
        break;
      case 'redo':
        redo();
        break;
      case 'delete':
        if (App.selectedId) {
          const deletedId = App.selectedId;
          const obj = findObject(deletedId);
          if (obj?.type === 'function-sketch' && obj.id === Sketch.activeSketchId) {
            Sketch.activeSketchId = null;
          }
          if (obj?.type === 'polar-sketch' && obj.id === PolarSketch.activeSketchId) {
            PolarSketch.activeSketchId = null;
          }
          removeObject(deletedId);
          if (typeof InputPanel !== 'undefined' && InputPanel.editingId === deletedId) {
            InputPanel.cancelEdit();
          }
          this.refreshAlgebra();
          Render.request();
        }
        break;
      case 'edit-object':
        this.editSelectedObject();
        break;
      case 'clear-input-functions':
        this.clearInputFunctions();
        break;
      case 'new':
        this.newDocument();
        break;
      case 'export-png':
        this.exportPng();
        break;
      case 'zoom-in':
        App.unitScale *= 1.15;
        Render.request();
        break;
      case 'zoom-out':
        App.unitScale /= 1.15;
        Render.request();
        break;
      case 'zoom-fit':
        this.zoomFit();
        break;
      case 'help':
        this.elements.helpDialog.showModal();
        break;
      case 'about':
        this.elements.aboutDialog.showModal();
        break;
      default:
        break;
    }
  },

  newDocument() {
    App.objects = [];
    App.selectedId = null;
    Sketch.activeSketchId = null;
    Sketch.currentStroke = [];
    PolarSketch.activeSketchId = null;
    PolarSketch.currentStroke = [];
    initHistory();
    this.refreshAlgebra();
    Render.request();
    showInfo('새 문서를 만들었습니다.');
  },

  exportPng() {
    const link = document.createElement('a');
    link.download = 'graph.png';
    link.href = Render.exportPng();
    link.click();
  },

  zoomFit() {
    if (App.objects.length === 0) {
      App.panX = 0;
      App.panY = 0;
      App.unitScale = 50;
      Render.request();
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    const extend = (x, y) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    };

    for (const obj of App.objects) {
      if (obj.type === 'function-sketch' && obj.points?.length) {
        obj.points.forEach((p) => extend(p.x, p.y));
      } else if (obj.type === 'polar-sketch' && obj.polarPoints?.length) {
        obj.polarPoints.forEach((p) => {
          const c = Coords.polarPointToCartesian(p);
          extend(c.x, c.y);
        });
      } else if (obj.type === 'point') {
        extend(obj.x, obj.y);
      } else if (obj.type === 'function-explicit' && obj.evaluate) {
        const vb = getVisibleBounds();
        const samples = 200;
        for (let i = 0; i <= samples; i++) {
          const x = vb.minX + ((vb.maxX - vb.minX) * i) / samples;
          const y = obj.evaluate(x);
          if (Number.isFinite(y)) extend(x, y);
        }
      } else if (obj.type === 'polar-explicit' && obj.evaluate) {
        for (let i = 0; i <= 400; i++) {
          const theta = (i / 400) * Math.PI * 2;
          let r = obj.evaluate(theta);
          if (!Number.isFinite(r)) continue;
          let t = theta;
          if (r < 0) {
            r = -r;
            t += Math.PI;
          }
          const c = Coords.toCartesian(r, t);
          extend(c.x, c.y);
        }
      }
    }

    if (!Number.isFinite(minX)) return;

    const pad = 0.15;
    const rangeX = (maxX - minX) || 4;
    const rangeY = (maxY - minY) || 4;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    App.panX = cx;
    App.panY = cy;

    const scaleX = (App.canvas.clientWidth * (1 - pad)) / rangeX;
    const scaleY = (App.canvas.clientHeight * (1 - pad)) / rangeY;
    App.unitScale = Math.min(scaleX, scaleY, 500);
    Render.request();
  },

  newDocument() {
    App.objects = [];
    App.selectedId = null;
    Sketch.activeSketchId = null;
    Sketch.currentStroke = [];
    PolarSketch.activeSketchId = null;
    PolarSketch.currentStroke = [];
    if (typeof InputPanel !== 'undefined') InputPanel.cancelEdit();
    initHistory();
    this.refreshAlgebra();
    Render.request();
    showInfo('새 문서를 만들었습니다.');
  },

  _isInputEditable(obj) {
    return obj && ['function-explicit', 'polar-explicit', 'point'].includes(obj.type);
  },

  _nameConflict(name, excludeId, type) {
    if (type === 'point') {
      return App.objects.some((o) => o.id !== excludeId && o.type === 'point' && o.name === name);
    }
    return App.objects.some((o) => o.id !== excludeId && o.name === name && o.type !== 'point');
  },

  editSelectedObject() {
    if (!App.selectedId) {
      showWarning('수정할 객체를 대수 목록에서 선택하세요.');
      return;
    }
    const obj = findObject(App.selectedId);
    if (!this._isInputEditable(obj)) {
      showWarning('입력으로 정의된 객체만 수정할 수 있습니다.');
      return;
    }
    if (typeof InputPanel !== 'undefined') InputPanel.loadFromObject(obj);
  },

  clearInputFunctions() {
    const targets = App.objects.filter(
      (o) => o.type === 'function-explicit' || o.type === 'polar-explicit'
    );
    if (targets.length === 0) {
      showInfo('초기화할 입력 함수가 없습니다.');
      return;
    }
    const removeIds = new Set(targets.map((o) => o.id));
    App.objects = App.objects.filter((o) => !removeIds.has(o.id));
    if (App.selectedId && removeIds.has(App.selectedId)) App.selectedId = null;
    if (typeof InputPanel !== 'undefined' && InputPanel.editingId && removeIds.has(InputPanel.editingId)) {
      InputPanel.cancelEdit();
    }
    pushHistory();
    this.refreshAlgebra();
    Render.request();
    showInfo(`입력 함수 ${targets.length}개를 초기화했습니다.`);
  },

  submitCommand(cmd, editingId = null) {
    const input = (cmd || this.elements.commandInput?.value || '').trim();
    if (!input) return false;

    const result = Parser.parse(input);
    if (!result.ok) {
      showError(result.error);
      return false;
    }

    const existing = editingId ? findObject(editingId) : null;
    if (editingId && !existing) {
      showError('수정 대상을 찾을 수 없습니다.');
      if (typeof InputPanel !== 'undefined') InputPanel.cancelEdit();
      return false;
    }

    if (result.type === 'point') {
      if (this._nameConflict(result.name, editingId, 'point')) {
        showError(`점 ${result.name}이(가) 이미 있습니다.`);
        return false;
      }
      if (existing) {
        const patch = {
          name: result.name,
          x: result.x,
          y: result.y,
          displayLatex: result.displayLatex,
        };
        if (result.polar) patch.polar = result.polar;
        updateObject(existing.id, patch);
        if (!result.polar) {
          const updated = findObject(existing.id);
          if (updated) delete updated.polar;
        }
      } else {
        if (App.objects.some((o) => o.type === 'point' && o.name === result.name)) {
          showError(`점 ${result.name}이(가) 이미 있습니다.`);
          return false;
        }
        const pt = {
          id: generateId(),
          type: 'point',
          name: result.name,
          x: result.x,
          y: result.y,
          color: '#e11d48',
        };
        if (result.polar) pt.polar = result.polar;
        pt.displayLatex = result.displayLatex;
        addObject(pt);
      }
    } else if (result.type === 'polar-explicit') {
      if (this._nameConflict(result.name, editingId, 'polar-explicit')) {
        showError(`이름 '${result.name}'이(가) 이미 사용 중입니다.`);
        return false;
      }
      const compiled = Parser.compilePolarExpression(result.expr);
      if (existing) {
        updateObject(existing.id, {
          name: result.name,
          expr: result.expr,
          display: result.display,
          displayLatex: result.displayLatex,
          exprLatex: result.exprLatex,
          evaluate: compiled.evaluate,
          _exprSource: result.expr,
        });
      } else {
        if (App.objects.some((o) => o.name === result.name && o.type !== 'point')) {
          showError(`이름 '${result.name}'이(가) 이미 사용 중입니다.`);
          return false;
        }
        addObject({
          id: generateId(),
          type: 'polar-explicit',
          name: result.name,
          expr: result.expr,
          display: result.display,
          displayLatex: result.displayLatex,
          exprLatex: result.exprLatex,
          evaluate: compiled.evaluate,
          _exprSource: result.expr,
          color: '#7c3aed',
        });
      }
    } else if (result.type === 'function-explicit') {
      if (this._nameConflict(result.name, editingId, 'function-explicit')) {
        showError(`이름 '${result.name}'이(가) 이미 사용 중입니다.`);
        return false;
      }
      const compiled = Parser.compileExpression(result.expr);
      if (existing) {
        updateObject(existing.id, {
          name: result.name,
          expr: result.expr,
          display: result.display,
          displayLatex: result.displayLatex,
          exprLatex: result.exprLatex,
          evaluate: compiled.evaluate,
          _exprSource: result.expr,
        });
      } else {
        if (App.objects.some((o) => o.name === result.name && o.type !== 'point')) {
          showError(`이름 '${result.name}'이(가) 이미 사용 중입니다.`);
          return false;
        }
        addObject({
          id: generateId(),
          type: 'function-explicit',
          name: result.name,
          expr: result.expr,
          display: result.display,
          displayLatex: result.displayLatex,
          exprLatex: result.exprLatex,
          evaluate: compiled.evaluate,
          _exprSource: result.expr,
          color: '#2563eb',
        });
      }
    }

    if (!cmd && this.elements.commandInput) this.elements.commandInput.value = '';
    App.selectedId = existing ? existing.id : App.selectedId;
    this.refreshAlgebra();
    Render.request();
    showInfo(existing ? '객체를 수정했습니다.' : '객체를 추가했습니다.');
    return true;
  },

  refreshAlgebra() {
    const list = this.elements.algebraList;
    list.innerHTML = '';

    for (const obj of App.objects) {
      const item = document.createElement('div');
      item.className = 'algebra-item';
      item.role = 'listitem';
      if (obj.id === App.selectedId) item.classList.add('selected');
      if (typeof InputPanel !== 'undefined' && InputPanel.editingId === obj.id) {
        item.classList.add('editing');
      }

      const icon = document.createElement('span');
      icon.className = 'obj-icon';
      icon.style.background = obj.color || '#2563eb';

      const label = document.createElement('div');
      label.className = 'obj-label';

      const latexEl = document.createElement('div');
      latexEl.className = 'obj-latex';

      if (obj.type === 'function-sketch') {
        Latex.renderOrPlain(
          latexEl,
          obj.equationDisplayLatex ||
            Latex.fnCartesian(obj.name, obj.equationDisplay?.replace(/^[^=]+=\s*/, '') || '\\cdots')
        );
        label.appendChild(latexEl);
        this._appendFitMeta(label, obj);
        if (obj.minX !== undefined && Number.isFinite(obj.minX)) {
          const sub = document.createElement('div');
          sub.className = 'obj-sub';
          sub.textContent = `x ∈ [${obj.minX?.toFixed(2)}, ${obj.maxX?.toFixed(2)}]`;
          label.appendChild(sub);
        }
      } else if (obj.type === 'polar-sketch') {
        Latex.renderOrPlain(
          latexEl,
          obj.equationDisplayLatex ||
            Latex.fnPolar(obj.name, obj.equationDisplay?.replace(/^[^=]+=\s*/, '') || '\\cdots')
        );
        label.appendChild(latexEl);
        this._appendFitMeta(label, obj);
        if (obj.minTheta !== undefined && Number.isFinite(obj.minTheta)) {
          const sub = document.createElement('div');
          sub.className = 'obj-sub';
          sub.textContent = `θ ∈ [${Coords.formatTheta(obj.minTheta)}, ${Coords.formatTheta(obj.maxTheta)}]`;
          label.appendChild(sub);
        }
      } else if (obj.type === 'function-explicit') {
        Latex.renderOrPlain(latexEl, obj.displayLatex || Latex.fnCartesian(obj.name, obj.expr));
        label.appendChild(latexEl);
      } else if (obj.type === 'polar-explicit') {
        Latex.renderOrPlain(latexEl, obj.displayLatex || Latex.fnPolar(obj.name, obj.expr));
        label.appendChild(latexEl);
      } else if (obj.type === 'point') {
        Latex.renderOrPlain(
          latexEl,
          obj.displayLatex ||
            (obj.polar && Coords.isPolar()
              ? Latex.pointPolar(obj.name, obj.polar.r, obj.polar.theta)
              : Latex.pointCartesian(obj.name, obj.x, obj.y))
        );
        label.appendChild(latexEl);
      }

      item.appendChild(icon);
      item.appendChild(label);

      if (this._isInputEditable(obj)) {
        const actions = document.createElement('div');
        actions.className = 'algebra-item-actions';

        const btnEdit = document.createElement('button');
        btnEdit.type = 'button';
        btnEdit.className = 'algebra-action';
        btnEdit.title = '수정';
        btnEdit.setAttribute('aria-label', `${obj.name} 수정`);
        btnEdit.textContent = '✎';
        btnEdit.addEventListener('click', (e) => {
          e.stopPropagation();
          App.selectedId = obj.id;
          if (typeof InputPanel !== 'undefined') InputPanel.loadFromObject(obj);
          this.refreshAlgebra();
        });

        actions.appendChild(btnEdit);
        item.appendChild(actions);
      }

      item.addEventListener('click', () => {
        App.selectedId = obj.id;
        this.refreshAlgebra();
        Render.request();
      });

      item.addEventListener('dblclick', (e) => {
        if (e.target.closest('.algebra-action')) return;
        if (!this._isInputEditable(obj)) return;
        App.selectedId = obj.id;
        if (typeof InputPanel !== 'undefined') InputPanel.loadFromObject(obj);
        this.refreshAlgebra();
      });

      list.appendChild(item);
    }
  },

  _fmt(n) {
    if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
    return n.toFixed(3).replace(/\.?0+$/, '');
  },

  updateUndoRedo() {
    const canUndo = App.historyIndex > 0;
    const canRedo = App.historyIndex < App.history.length - 1;
    document.querySelectorAll('[data-action="undo"]').forEach((b) => {
      b.disabled = !canUndo;
    });
    document.querySelectorAll('[data-action="redo"]').forEach((b) => {
      b.disabled = !canRedo;
    });
  },

  selectAt(mathPos, threshold = 0.35) {
    let best = null;
    let bestDist = threshold;

    for (const obj of App.objects) {
      if (obj.type === 'point') {
        const d = Math.hypot(obj.x - mathPos.x, obj.y - mathPos.y);
        if (d < bestDist) {
          bestDist = d;
          best = obj;
        }
      } else if (obj.type === 'function-sketch' && obj.points?.length) {
        for (const p of obj.points) {
          const d = Math.hypot(p.x - mathPos.x, p.y - mathPos.y);
          if (d < bestDist) {
            bestDist = d;
            best = obj;
          }
        }
      } else if (obj.type === 'polar-sketch' && obj.polarPoints?.length) {
        for (const p of obj.polarPoints) {
          const c = Coords.polarPointToCartesian(p);
          const d = Math.hypot(c.x - mathPos.x, c.y - mathPos.y);
          if (d < bestDist) {
            bestDist = d;
            best = obj;
          }
        }
      }
    }

    App.selectedId = best ? best.id : null;
    this.refreshAlgebra();
    Render.request();
  },
};
