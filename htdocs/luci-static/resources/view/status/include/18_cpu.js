'use strict';
'require baseclass';
'require fs';

document.head.append(E('style', {'type': 'text/css'},
`
.cpu-status-view-mode-entry {
	display: inline-block;
	cursor: pointer;
	margin: 2px 4px 2px 0 !important;
	padding: 3px 5px;
	border: 1px solid;
	border-color: transparent;
	-webkit-border-radius: 4px;
	-moz-border-radius: 4px;
	border-radius: 4px;
	opacity: 0.7;
	background-color: rgba(100 100 100 / 0.2);
}
.cpu-status-view-mode-entry:hover {
	opacity: 0.9;
}
.cpu-status-view-mode-entry:active {
	opacity: 1.0;
}
.cpu-status-view-mode-entry-checked {
	border: 1px solid;
	opacity: 1.0;
}
.cpu-status-view-mode-entry-checked:hover {
	opacity: 1.0;
}
.cpu-status-pie {
	padding-bottom: 18px;
}
.cpu-status-pie-legend {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 6px 18px;
	margin: 18px 0 0 calc(-1 * var(--cpu-pie-shift, 0px));
	padding: 0;
	font-size: 13px;
}
.cpu-status-pie-legend span {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}
.cpu-status-pie-legend i {
	display: inline-block;
	width: 11px;
	height: 11px;
	border-radius: 3px;
}
.cpu-status-pie-grid {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-evenly;
	gap: 22px 4px;
	/* undo the shift made to align with the title: the rings are centered in the whole card */
	margin-left: calc(-1 * var(--cpu-pie-shift, 0px));
}

.cpu-status-pie-item {
	width: 116px;
	text-align: center;
}
.cpu-status-pie-item svg {
	display: block;
	margin: 0 auto;
}
.cpu-status-pie-track {
	stroke: rgba(128, 128, 128, 0.18);
}
.cpu-status-pie-item svg text {
	fill: currentColor;
	text-shadow: none;
}
.cpu-status-pie-num {
	font-size: 12px;
	font-weight: 600;
}
.cpu-status-pie-name {
	font-size: 11px;
	opacity: 0.7;
}
.cpu-status-pie-sub {
	min-height: 36px;
	margin-top: 8px;
	font-size: 12px;
	line-height: 1.5;
	opacity: 0.7;
}
.cpu-status-pie-lens {
	position: fixed;
	z-index: 10000;
	display: none;
	pointer-events: none;
}
.cpu-status-pie-lens-glass {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	overflow: hidden;
	border-radius: 50%;
	background: #fff;
	box-shadow: 0 0 0 2px rgba(128, 128, 128, 0.85), 0 4px 14px rgba(0, 0, 0, 0.35);
}
.cpu-status-pie-lens-mark {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 12px;
	height: 12px;
	border-radius: 50%;
	border: 1px solid rgba(0, 0, 0, 0.6);
	box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
	transform: translate(-50%, -50%);
	box-sizing: border-box;
}
.cpu-status-pie-lens-caption {
	padding: 4px 9px;
	border-radius: 8px;
	border: 1px solid rgba(128, 128, 128, 0.45);
	background: #fff;
	box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
	color: #333;
	font-size: 12px;
	line-height: 1.5;
	white-space: nowrap;
	position: absolute;
	left: 50%;
	top: calc(100% + 6px);
	transform: translateX(-50%);
}
.cpu-status-pie-lens-up .cpu-status-pie-lens-caption {
	top: auto;
	bottom: calc(100% + 6px);
}
.cpu-status-pie-lens-caption div {
	display: flex;
	align-items: center;
	gap: 6px;
}
.cpu-status-pie-lens-caption .dim {
	opacity: 0.55;
}
.cpu-status-pie-lens-caption i {
	display: inline-block;
	width: 9px;
	height: 9px;
	border-radius: 2px;
}
.cpu-status-pie-big {
	width: auto;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 14px;
}
.cpu-status-pie-big svg {
	margin: 0;
}
.cpu-status-pie-big svg .cpu-status-pie-num {
	font-size: 20px;
}
.cpu-status-pie-big svg .cpu-status-pie-name {
	font-size: 12px;
}
.cpu-status-pie-list {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 4px 16px;
	font-size: 13px;
	white-space: nowrap;
}
.cpu-status-pie-list div {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 0 -6px;
	padding: 1px 6px;
	border-radius: 5px;
}
.cpu-status-pie-list-hl div {
	opacity: 0.45;
}
.cpu-status-pie-list-hl div.on {
	opacity: 1;
	background: rgba(128, 128, 128, 0.18);
}
@media (max-width: 900px) {
	.cpu-status-pie-list {
		gap: 4px 12px;
		font-size: 11px;
	}
}
.cpu-status-pie-list i {
	display: inline-block;
	width: 11px;
	height: 11px;
	border-radius: 3px;
}
`));

// Shift the card content so that the text of the first view mode entry (and the
// legend below it) starts exactly where the text of the card title starts, in any
// theme. Done once the node is in the page and measurable.
let alignMargin = null;
function alignWithTitle(root, tries) {
	tries = tries || 0;
	// The card is rebuilt on every refresh: apply the last known shift at once so
	// the content does not jump, and only re-measure afterwards.
	if(tries === 0 && alignMargin !== null) {
		root.style.marginLeft = alignMargin + 'px';
		root.style.setProperty('--cpu-pie-shift', alignMargin + 'px');
	};
	let chip = root.querySelector('.cpu-status-view-mode-entry');
	if(!root.isConnected || !chip) {
		if(tries < 40) setTimeout(() => alignWithTitle(root, tries + 1), 50);
		return;
	};
	let title = null;
	for(let n = root.parentElement; n && !title; n = n.parentElement) {
		title = Array.from(n.children).find(c =>
			c !== root && /^(H1|H2|H3|H4|LEGEND)$/.test(c.tagName));
	};
	if(!title) return;
	let range = document.createRange();
	range.selectNodeContents(title);
	let titleLeft = range.getBoundingClientRect().left;
	let cs        = getComputedStyle(chip);
	let textLeft  = chip.getBoundingClientRect().left +
		parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
	let current   = parseFloat(root.style.marginLeft) || 0;
	let delta     = titleLeft - textLeft;
	if(Math.abs(delta) > 0.5) root.style.marginLeft = (current + delta) + 'px';
	alignMargin = parseFloat(root.style.marginLeft) || 0;
	root.style.setProperty('--cpu-pie-shift', alignMargin + 'px');
}

// Rings used by all four views. Only the busy part of a ring is drawn (idle is
// left blank). Slices are named and ordered as in top: usr sys nic idle io irq sirq, the
// colors are assigned so that neighbouring slices have contrasting hues.
const pie = {
	slices: [
		[ 'loadUser', 'usr',  '#3b82f6' ],
		[ 'loadSys',  'sys',  '#ec4899' ],
		[ 'loadNice', 'nic',  '#14b8a6' ],
		[ 'loadIdle', 'idle', '#9ca3af' ],
		[ 'loadIo',   'io',   '#f59e0b' ],
		[ 'loadIrq',  'irq',  '#a855f7' ],
		[ 'loadSirq', 'sirq', '#22c55e' ],
	],
	// Single color ring of the views without details
	busyColor: '#3b82f6',
	// Geometry of the rings: one CPU, and the total (big)
	// (caption: list of all values below the magnifier; the total has them next to it)
	small   : { size: 116, radius: 41, width: 18, caption: true  },
	big     : { size: 160, radius: 58, width: 22, caption: false },
	// Magnifier shown while hovering over a ring: diameter in px, zoom factor
	// along the ring, width of the band inside the magnifier (1 = the same as
	// the ring itself, 3 = three times wider), extra px around the ring in which
	// the magnifier is still shown.
	lensSize: 120,
	lensZoom: 8,
	lensBand: 2,
	lensPad : 8,
	lens    : null,
	pointer : null,
	lastSeen: 0,
	hlLabels: null,
	installed: false,

	svgEl(tag, attrs) {
		let el = document.createElementNS('http://www.w3.org/2000/svg', tag);
		for(let [k, v] of Object.entries(attrs || {})) {
			el.setAttribute(k, v);
		};
		return el;
	},
	makeSvg(size) {
		return this.svgEl('svg', {
			'width'  : size,
			'height' : size,
			'viewBox': `0 0 ${size} ${size}`,
		});
	},
	swatch(color) {
		return E('i', { 'style': 'background:' + color });
	},
	// All parameters of one CPU in the order of top. The busy ones get their
	// position on the ring (from/to, in % of the full circle), idle takes the rest.
	rows(cpuLoadObj) {
		let rows = this.slices.map(([key, label, color]) => ({
			label, color, value: cpuLoadObj[key] || 0, idle: (key == 'loadIdle'),
		}));
		let from = 0;
		for(let r of rows) {
			if(r.idle) continue;
			r.from = from;
			r.to   = from += r.value;
		};
		let idle = rows.find(r => r.idle);
		idle.from = from;
		idle.to   = 100;
		return rows;
	},
	// Track and busy slices of a ring centered at (M, M). gap = [ gap between
	// slices, minimal slice length to get a gap, minimal drawn length ] in px.
	drawRing(svg, M, R, W, rows, gap) {
		let C = 2 * Math.PI * R;
		svg.append(this.svgEl('circle', {
			'class'       : 'cpu-status-pie-track',
			'cx'          : M,
			'cy'          : M,
			'r'           : R,
			'fill'        : 'none',
			'stroke-width': W,
		}));
		for(let r of rows) {
			if(r.idle || !(r.value > 0)) continue;
			let len = C * r.value / 100;
			svg.append(this.svgEl('circle', {
				'cx'               : M,
				'cy'               : M,
				'r'                : R,
				'fill'             : 'none',
				'stroke'           : r.color,
				'stroke-width'     : W,
				'stroke-dasharray' : `${Math.max(len - ((len > gap[1]) ? gap[0] : 0), gap[2])} ${C}`,
				'stroke-dashoffset': -(C * r.from / 100),
				'transform'        : `rotate(-90 ${M} ${M})`,
			}));
		};
	},
	svgText(cls, x, y, text) {
		let el = this.svgEl('text', { 'class': cls, 'x': x, 'y': y, 'text-anchor': 'middle' });
		el.textContent = text;
		return el;
	},
	// rows: null while the load is being calculated. With a magnifier the slices
	// are separated by a small gap.
	makeDonut(geo, name, rows, loadAvg, magnifier) {
		let M   = geo.size / 2;
		let svg = this.makeSvg(geo.size);
		this.drawRing(svg, M, geo.radius, geo.width, rows || [],
			(magnifier) ? [ 1.2, 2.2, 0.6 ] : [ 0, 0, 0.6 ]);
		if(rows && magnifier) this.attachLens(svg, rows, geo);
		svg.append(
			this.svgText('cpu-status-pie-num', M, M - ((geo === this.big) ? 4 : 1),
				(rows && !isNaN(loadAvg)) ? loadAvg + '%' : '-'),
			this.svgText('cpu-status-pie-name', M, M + ((geo === this.big) ? 16 : 14), name)
		);
		return svg;
	},
	// Legend, once below all the rings
	makeLegend() {
		return E('div', { 'class': 'cpu-status-pie-legend' },
			this.slices.map(([, label, color]) =>
				E('span', {}, [ this.swatch(color), label ])));
	},
	// All parameters with their values, in one row under the total
	makeList(rows) {
		let list = E('div', { 'class': 'cpu-status-pie-list' },
			rows.map(r => E('div', { 'data-label': r.label }, [
				this.swatch(r.color),
				`${r.label} ${r.value.toFixed(1)}%`,
			])));
		this.markList(list);
		return list;
	},
	// While the magnifier is shown, the parameters it shows are emphasised in the
	// list (the card is rebuilt on every refresh, hence also done when it is made)
	markList(list) {
		list.classList.toggle('cpu-status-pie-list-hl', !!this.hlLabels);
		for(let e of list.children) {
			e.classList.toggle('on', !!this.hlLabels && this.hlLabels.includes(e.dataset.label));
		};
	},
	// The two largest parameters, under the ring of a CPU
	makeTop(rows) {
		return E('div', { 'class': 'cpu-status-pie-sub' },
			(rows || [])
				.filter(r => !r.idle && r.value >= 0.5)
				.sort((a, b) => b.value - a.value)
				.slice(0, 2)
				.map(r => E('div', {}, `${r.label} ${r.value.toFixed(1)}%`)));
	},
	// cfg.big: the total (a big ring), cfg.detail: slices, magnifier and values
	// instead of a single busy ring.
	makeItem(cfg, name, cpuLoadObj, cpuLoadFlag) {
		let geo  = (cfg.big) ? this.big : this.small;
		let rows = null;
		if(cpuLoadFlag) {
			rows = (cfg.detail) ? this.rows(cpuLoadObj) : [{
				label: _('Load'), color: this.busyColor,
				value: cpuLoadObj.loadAvg, from: 0, to: cpuLoadObj.loadAvg,
			}];
		};
		return E('div', {
				'class': 'cpu-status-pie-item' + ((cfg.big) ? ' cpu-status-pie-big' : ''),
				'title': (cpuLoadFlag) ? '' : _('Calculating') + '...',
			},
			[
				this.makeDonut(geo, name, rows, cpuLoadObj.loadAvg, cfg.detail),
				(!cfg.detail) ? null : (cfg.big) ? ((rows) ? this.makeList(rows) : null) : this.makeTop(rows),
			].filter(e => e)
		);
	},

	// Magnifier. The card is rebuilt on every refresh, so nothing is bound to the
	// rings themselves: the pointer position is tracked on the document and the
	// ring below it is looked up in the current DOM.
	attachLens(svg, rows, geo) {
		svg._pie = { rows, geo, sig: [ geo.radius, geo.width ].concat(rows.map(r => r.value)).join() };
		this.installGlobal();
	},
	installGlobal() {
		if(this.installed) return;
		this.installed = true;
		let raf  = null;
		let hide = () => {
			this.pointer = null;
			this.hideLens();
		};
		let schedule = () => {
			if(raf) return;
			raf = requestAnimationFrame(() => { raf = null; this.update(); });
		};
		document.addEventListener('mousemove', ev => {
			this.pointer = { x: ev.clientX, y: ev.clientY };
			schedule();
		}, true);
		document.documentElement.addEventListener('mouseleave', hide);
		window.addEventListener('blur', hide);
		window.addEventListener('scroll', schedule, true);
		setInterval(() => { if(this.pointer) this.update(); }, 100);
	},
	parseColor(str) {
		if(!/^rgba?\(/.test(str || '')) return null;
		let m = str.match(/[\d.]+/g);
		if(!m || m.length < 3) return null;
		return [ Number(m[0]), Number(m[1]), Number(m[2]), (m.length > 3) ? Number(m[3]) : 1 ];
	},
	// Text color and a solid background color of the page behind the element,
	// so the magnifier looks right in any theme (light or dark).
	themeColors(el) {
		let text = this.parseColor(getComputedStyle(el).color) || [ 0, 0, 0, 1 ];
		let luma = (0.299 * text[0] + 0.587 * text[1] + 0.114 * text[2]) / 255;
		let bg   = (luma > 0.5) ? [ 30, 30, 30 ] : [ 255, 255, 255 ];
		let layers = [];
		for(let n = el; n && n.nodeType === 1; n = n.parentElement) {
			let c = this.parseColor(getComputedStyle(n).backgroundColor);
			if(c && c[3] > 0) layers.push(c);
			if(c && c[3] >= 1) break;
		};
		for(let i = layers.length - 1; i >= 0; i--) {
			let a = layers[i][3];
			bg = bg.map((v, j) => v * (1 - a) + layers[i][j] * a);
		};
		return {
			bg  : `rgb(${bg.map(v => Math.round(v)).join(',')})`,
			text: `rgb(${text.slice(0, 3).join(',')})`,
		};
	},
	getLens() {
		if(!this.lens) {
			let L       = this.lensSize;
			let view    = E('div', { 'style': 'position:absolute;left:0;top:0;width:100%;height:100%' });
			let glass   = E('div', { 'class': 'cpu-status-pie-lens-glass' },
				[ view, E('div', { 'class': 'cpu-status-pie-lens-mark' }) ]);
			let caption = E('div', { 'class': 'cpu-status-pie-lens-caption' });
			let box     = E('div', {
				'class': 'cpu-status-pie-lens',
				'style': `width:${L}px;height:${L}px`,
			}, [ glass, caption ]);
			document.body.append(box);
			this.lens = { box, glass, view, caption, key: null, rowsKey: null, shown: false };
		};
		return this.lens;
	},
	hideLens() {
		this.hlLabels = null;
		document.querySelectorAll('.cpu-status-pie-list').forEach(l => this.markList(l));
		if(this.lens) {
			this.lens.box.style.display = 'none';
			this.lens.shown = false;
		};
	},
	// The magnified ring is stretched along the ring only: radius and arc
	// length are multiplied by the zoom, the width of the band is set separately.
	zoomGeometry(geo) {
		let Wz = geo.width * this.lensBand,
		    Rz = geo.radius * this.lensZoom;
		return { Wz, Rz, Mz: Rz + Wz / 2 + 2 };
	},
	makeZoomed(rows, geo) {
		let { Wz, Rz, Mz } = this.zoomGeometry(geo);
		let z = this.makeSvg(2 * Mz);
		this.drawRing(z, Mz, Rz, Wz, rows, [ 2, 6, 1 ]);
		z.style.cssText = 'position:absolute;display:block;max-width:none;margin:0';
		return z;
	},
	update() {
		let p = this.pointer;
		if(!p) return this.hideLens();
		let L = this.lensSize, Z = this.lensZoom;
		let svgs = Array.from(document.querySelectorAll('.cpu-status-pie-item svg'))
			.filter(s => s._pie);
		let now = Date.now();
		if(!svgs.length) {
			// The card may be in the middle of being rebuilt
			if(now - this.lastSeen > 600) this.hideLens();
			return;
		};
		this.lastSeen = now;

		let hit = null;
		for(let svg of svgs) {
			let rect = svg.getBoundingClientRect();
			if(!rect.width) continue;
			let geo = svg._pie.geo, M = geo.size / 2, k = rect.width / geo.size;
			let dx  = (p.x - rect.left) / k - M,
			    dy  = (p.y - rect.top) / k - M;
			let d   = Math.hypot(dx, dy);
			if(Math.abs(d - geo.radius) <= geo.width / 2 + this.lensPad) {
				hit = { svg, dx, dy, d };
				break;
			};
		};
		if(!hit) return this.hideLens();

		let info = hit.svg._pie;
		let R    = info.geo.radius;
		let lens = this.getLens();
		let { Rz, Mz } = this.zoomGeometry(info.geo);

		if(!lens.shown) {
			let theme = this.themeColors(hit.svg);
			lens.glass.style.background   = theme.bg;
			lens.caption.style.background = theme.bg;
			lens.caption.style.color      = theme.text;
		};
		if(lens.key !== info.sig || !lens.zoomed || !lens.zoomed.isConnected) {
			lens.key    = info.sig;
			lens.zoomed = this.makeZoomed(info.rows, info.geo);
			lens.view.textContent = '';
			lens.view.append(lens.zoomed);
		};

		// Position on the ring, clockwise from 12 o'clock
		let angle = Math.atan2(hit.dx, -hit.dy);
		let pos   = angle / (2 * Math.PI) * 100;
		if(pos < 0) pos += 100;
		// The same point in the magnified ring (the distance from the ring is not magnified)
		let rz = Rz + (hit.d - R);
		lens.zoomed.style.left = (L / 2 - (Mz + rz * Math.sin(angle))) + 'px';
		lens.zoomed.style.top  = (L / 2 - (Mz - rz * Math.cos(angle))) + 'px';

		// Slices within the visible section of the ring
		let half = (L / 2 / Z) / R / (2 * Math.PI) * 100;
		let near = info.rows.filter(r => r.value > 0 &&
			[ -100, 0, 100 ].some(s => (r.from + s < pos + half) && (r.to + s > pos - half)))
			.map(r => r.label);
		// The list always shows every parameter, those in the magnifier are emphasised
		let rowsKey = info.sig + '#' + near.join();
		lens.caption.style.display = (info.geo.caption) ? '' : 'none';
		if(!info.geo.caption) {
			this.hlLabels = near;
			let list = hit.svg.closest('.cpu-status-pie-item').querySelector('.cpu-status-pie-list');
			if(list) this.markList(list);
		};
		if(info.geo.caption && rowsKey !== lens.rowsKey) {
			lens.rowsKey = rowsKey;
			lens.caption.textContent = '';
			info.rows.forEach(r => lens.caption.append(
				E('div', { 'class': near.includes(r.label) ? '' : 'dim' }, [
					this.swatch(r.color),
					`${r.label} ${r.value.toFixed(1)}%`,
				])
			));
		};

		// The magnifier is centered on the pointer, the list of slices is below it
		lens.box.style.display = 'block';
		lens.shown = true;
		let left = Math.min(Math.max(4, p.x - L / 2), window.innerWidth - L - 4),
		    top  = Math.min(Math.max(4, p.y - L / 2), window.innerHeight - L - 4);
		lens.box.style.left = left + 'px';
		lens.box.style.top  = top + 'px';
		let capH = (info.geo.caption) ? lens.caption.offsetHeight : 0;
		lens.box.classList.toggle('cpu-status-pie-lens-up',
			(top + L + 6 + capH > window.innerHeight - 4) && (top - 6 - capH > 4));
	},
};

// A view of the rings. total: only the total (a big ring) or only the CPUs, one
// ring each. detail: slices with legend/values and magnifier, or just the load.
const pieView = (total, detail) => ({
	makeTable() {
		this.grid  = E('div', { 'class': 'cpu-status-pie-grid' });
		this.table = E('div', { 'class': 'cpu-status-pie' },
			(detail && !total) ? [ this.grid, pie.makeLegend() ] : [ this.grid ]);
	},
	append(cpuNum, cpuLoadObj, cpuLoadFlag) {
		if((cpuNum == Infinity) != total) return;
		this.grid.append(
			pie.makeItem({ big: total, detail },
				(total) ? _('Total load') : _('CPU') + ' ' + cpuNum,
				cpuLoadObj, cpuLoadFlag));
	},
});

return baseclass.extend({
	title             : _('CPU Load'),

	viewName          : 'cpu_status',

	availableViewModes: {
		0: [ 'allCPUs', _('Load') ],
		1: [ 'allCPUsDetail', _('Detailed load') ],
		2: [ 'eachCPU', _('Load of each CPU') ],
		3: [ 'eachCPUDetail', _('Detailed load of each CPU') ],
	},

	viewMode          : 0,

	lastStatArray     : null,

	restoreSettingsFromLocalStorage() {
		let viewModeLocal = localStorage.getItem(`luci-app-${this.viewName}-viewMode`);
		if(viewModeLocal) {
			this.viewMode = Number(viewModeLocal);
		};
	},

	saveSettingsToLocalStorage(viewMode) {
		if(this.viewMode != viewMode) {
			localStorage.setItem(
				`luci-app-${this.viewName}-viewMode`, String(viewMode));
		};
	},

	parseProcData(data) {
		let cpuStatArray   = [];
		let statItemsArray = data.trim().split('\n').filter(s => s.startsWith('cpu'));

		for(let str of statItemsArray) {
			let arr = str.split(/\s+/).slice(0, 8);
			arr[0]  = (arr[0] == 'cpu') ? Infinity : arr[0].replace('cpu', '');
			cpuStatArray.push(arr.map(e => Number(e)));
		};

		cpuStatArray.sort((a, b) => a[0] - b[0]);

		return cpuStatArray;
	},

	calcCPULoad(cpuStatArray) {
		let retArray = [];
		cpuStatArray.forEach((c, i) => {
			let loadUser = 0,
			    loadNice = 0,
			    loadSys  = 0,
			    loadIdle = 0,
			    loadIo   = 0,
			    loadIrq  = 0,
			    loadSirq = 0,
			    loadAvg  = 0;
			if(this.lastStatArray !== null && this.lastStatArray.cpuNum == c.cpuNum) {
				let user = c[1] - this.lastStatArray[i][1],
				    nice = c[2] - this.lastStatArray[i][2],
				    sys  = c[3] - this.lastStatArray[i][3],
				    idle = c[4] - this.lastStatArray[i][4],
				    io   = c[5] - this.lastStatArray[i][5],
				    irq  = c[6] - this.lastStatArray[i][6],
				    sirq = c[7] - this.lastStatArray[i][7];
				let sum  = user + nice + sys + idle + io + irq + sirq;
				loadUser = Number((100 * user / sum).toFixed(1));
				loadNice = Number((100 * nice / sum).toFixed(1));
				loadSys  = Number((100 * sys / sum).toFixed(1));
				loadIdle = Number((100 * idle / sum).toFixed(1));
				loadIo   = Number((100 * io / sum).toFixed(1));
				loadIrq  = Number((100 * irq / sum).toFixed(1));
				loadSirq = Number((100 * sirq / sum).toFixed(1));
				loadAvg  = Math.round(100 * (user + nice + sys + io + irq + sirq) / sum);
			};
			retArray.push(
				{cpuNum: c[0], loadUser, loadNice, loadSys, loadIdle, loadIo, loadIrq, loadSirq, loadAvg});
		});
		return retArray;
	},

	allCPUs          : pieView(true,  false),

	allCPUsDetail    : pieView(true,  true),

	eachCPU          : pieView(false, false),

	eachCPUDetail    : pieView(false, true),

	makeCPUTable(cpuLoadArray) {
		let currentView = (this.availableViewModes[this.viewMode] !== undefined) ?
			this[this.availableViewModes[this.viewMode][0]] :
			this[this.availableViewModes[0][0]];
		currentView.makeTable();
		cpuLoadArray.forEach((c, i) => {
			currentView.append(c.cpuNum, c, (this.lastStatArray !== null));
		});
		return currentView.table;
	},

	load() {
		this.restoreSettingsFromLocalStorage();
		return L.resolveDefault(fs.read('/proc/stat'), null);
	},

	render(cpuData) {
		if(!cpuData) return;

		let cpuStatArray = this.parseProcData(cpuData);

		// For single-core CPU
		if(cpuStatArray.length == 2) {
			cpuStatArray = cpuStatArray.slice(1, 2);
			delete this.availableViewModes[2];
			delete this.availableViewModes[3];
			if(this.viewMode > 1) this.viewMode = 0;
		};
		// A stored mode that does not exist (any more)
		if(this.availableViewModes[this.viewMode] === undefined) this.viewMode = 0;

		let cpuLoadArray = this.calcCPULoad(cpuStatArray);
		let cpuTable = this.makeCPUTable(cpuLoadArray);

		let viewModeSelectFunc = value => {
			this.saveSettingsToLocalStorage(value);
			this.viewMode = value;
			viewModeEntries.forEach(i => {
				i.classList.remove('cpu-status-view-mode-entry-checked');
			});
			viewModeEntries[value].classList.add('cpu-status-view-mode-entry-checked');
			let newTable = this.makeCPUTable(cpuLoadArray);
			cpuTable.replaceWith(newTable);
			cpuTable = newTable;
		};

		let viewModeSelectOnClick = ev => {
			viewModeSelectFunc(ev.target.dataset.value);
			ev.target.blur();
		};

		let viewModeEntries = [];

		for(let [i, v] of Object.entries(this.availableViewModes)) {
			viewModeEntries.push(
				E('span', {
					'class'     : 'cpu-status-view-mode-entry',
					'data-value': i,
					'click'     : viewModeSelectOnClick,
				}, v[1])
			);
		};

		viewModeSelectFunc(this.viewMode);

		this.lastStatArray = cpuStatArray;

		let root = E('div', { 'class': 'cbi-section' }, [
			E('div', { 'style': 'margin-bottom:1em' },
				viewModeEntries
			),
			cpuTable,
		]);
		alignWithTitle(root);
		return root;
	},
});
