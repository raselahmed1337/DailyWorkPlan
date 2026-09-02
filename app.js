// ========== CONSTANTS ==========
const STORAGE_KEY = 'scholarsync_ultimate';
const POMODORO_WORK = 25 * 60;
const POMODORO_BREAK = 5 * 60;
const EMAIL_TEMPLATES = {
  cold: { name: 'Cold Email', subject: 'Prospective PhD Student — Research Inquiry', body: 'Dear Professor {{LAST_NAME}},\n\nI am a prospective PhD student interested in your research on {{RESEARCH_AREA}}.\n\nBest regards,\n{{YOUR_NAME}}' },
  followup: { name: 'Follow-Up', subject: 'Following Up — PhD Inquiry', body: 'Dear Professor {{LAST_NAME}},\n\nFollowing up on my email from {{ORIGINAL_DATE}}.\n\nBest regards,\n{{YOUR_NAME}}' },
  lor: { name: 'LOR Request', subject: 'Letter of Recommendation Request', body: 'Dear Professor {{LAST_NAME}},\n\nWould you be willing to provide a letter of recommendation?\n\nBest regards,\n{{YOUR_NAME}}' },
  thanks: { name: 'Thank You', subject: 'Thank You — Our Meeting', body: 'Dear Professor {{LAST_NAME}},\n\nThank you for meeting with me today.\n\nBest regards,\n{{YOUR_NAME}}' }
};
const DEFAULT_DOCS = ['Statement of Purpose', 'CV / Resume', 'Transcripts', 'Letter of Rec. #1', 'Letter of Rec. #2', 'Research Proposal'];

// ========== UTILITIES ==========
function uid() { return crypto.randomUUID(); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]; }); }
function fmtDate(d) { if (!d) return '—'; return new Date(d + (d.length === 10 ? 'T00:00' : '')).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
function daysUntil(d) { if (!d) return null; var t = new Date(d + (d.length === 10 ? 'T00:00' : '')).getTime(); var n = new Date(); n.setHours(0,0,0,0); return Math.round((t - n.getTime()) / 86400000); }
function minutesUntil(dt) { return dt ? Math.round((new Date(dt).getTime() - Date.now()) / 60000) : null; }

function parseNotesToTasks(notes, meetingTitle) {
  if (!notes) return [];
  return notes.split('\n').map(function(l) { return l.trim().replace(/^[-*\u2022]\s*/, '').replace(/^\[\s*\]\s*/, ''); }).filter(Boolean).map(function(t) {
    return { id: uid(), title: t, deadline: addDays(7), done: false, source: 'Meeting: ' + meetingTitle, priority: 'medium', importance: true, urgency: false, tags: [] };
  });
}

// ========== STATE ==========
var defaultState = {
  applications: [], emails: [], meetings: [], study: [], goals: [], tasks: [],
  professors: [], funding: [], inbox: [], papers: [], conferences: [], journal: [],
  notifications: [], tags: [],
  settings: { theme: 'system', remindersEnabled: false, streak: { current: 0, longest: 0, lastStudyDate: null } }
};

var State = {
  data: JSON.parse(JSON.stringify(defaultState)),
  currentView: 'dashboard',
  calendarDate: new Date(),
  activeTagFilter: null,

  init: function() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        var parsed = JSON.parse(saved);
        this.data = Object.assign(JSON.parse(JSON.stringify(defaultState)), parsed);
        var keys = ['tasks','professors','funding','inbox','papers','conferences','journal','notifications','tags'];
        for (var i = 0; i < keys.length; i++) {
          if (!Array.isArray(this.data[keys[i]])) this.data[keys[i]] = [];
        }
        if (!this.data.settings.streak) this.data.settings.streak = { current: 0, longest: 0, lastStudyDate: null };
      } catch(e) { this.loadTemplate(); }
    } else {
      this.loadTemplate();
    }
    this.updateStreak();
  },

  loadTemplate: function() {
    this.data = {
      applications: [
        { id: uid(), university: 'ETH Zurich', program: 'PhD in Computer Science', deadline: '2026-12-15', status: 'preparing', notes: 'Prof. Smith lab', documents: DEFAULT_DOCS.map(function(d) { return { name: d, done: false }; }), tags: ['target'] },
        { id: uid(), university: 'MIT', program: 'PhD in EECS', deadline: '2026-12-01', status: 'target', notes: '', documents: DEFAULT_DOCS.map(function(d) { return { name: d, done: false }; }), tags: ['dream'] }
      ],
      emails: [{ id: uid(), professor: 'Dr. Jane Smith', university: 'ETH Zurich', dateSent: todayISO(), status: 'awaiting', followUpDate: addDays(7) }],
      meetings: [{ id: uid(), title: 'Advisor Meeting', date: addDays(2) + 'T14:00', with: 'Prof. Johnson', agenda: 'Discuss research proposal', notes: '- Draft summary\n- Email Prof. X' }],
      study: [
        { id: uid(), topic: 'Read: Attention Is All You Need', duration: 60, date: todayISO(), done: false, pomodoros: 0, tags: ['transformers'] },
        { id: uid(), topic: 'IELTS Writing Practice', duration: 45, date: addDays(-1), done: true, pomodoros: 2, tags: ['ielts'] },
        { id: uid(), topic: 'Deep Learning fundamentals', duration: 90, date: addDays(-2), done: true, pomodoros: 3, tags: ['study'] }
      ],
      goals: [
        { id: uid(), title: 'Finalize university shortlist (8-10)', deadline: addDays(14), done: false, priority: 'high', tags: ['planning'] },
        { id: uid(), title: 'Secure 2 Letters of Recommendation', deadline: addDays(30), done: false, priority: 'high', tags: ['lor'] }
      ],
      tasks: [
        { id: uid(), title: 'Update CV with recent projects', deadline: addDays(3), done: false, source: 'Manual', priority: 'high', importance: true, urgency: true, tags: ['cv'] },
        { id: uid(), title: 'Read 2 papers on transformers', deadline: addDays(5), done: false, source: 'Manual', priority: 'medium', importance: true, urgency: false, tags: ['reading'] }
      ],
      professors: [{ id: uid(), name: 'Dr. Jane Smith', university: 'ETH Zurich', lab: 'AI Lab', researchArea: 'Medical Imaging', papersRead: 2, status: 'contacted', notes: 'Very responsive.', tags: ['medical-ai'] }],
      funding: [{ id: uid(), name: 'ETH Excellence Scholarship', amount: 'CHF 12,000/yr', deadline: '2026-11-30', status: 'preparing', requirements: 'Research proposal', tags: ['scholarship'] }],
      inbox: [{ id: uid(), content: 'Check out Mamba architecture paper', tag: 'paper', date: todayISO() }],
      papers: [{ id: uid(), title: 'Attention Is All You Need', authors: 'Vaswani et al.', year: 2017, venue: 'NeurIPS', rating: 5, status: 'finished', takeaways: 'Introduced transformer architecture', url: '', tags: ['transformers'] }],
      conferences: [{ id: uid(), name: 'NeurIPS 2026', venue: 'Vancouver', startDate: '2026-12-05', endDate: '2026-12-10', submissionDeadline: '2026-05-15', status: 'planning', paperTitle: '', tags: ['ai'] }],
      journal: [{ id: uid(), date: addDays(-7), content: 'Focused on transformer architectures this week.', prompts: { learned: 'Self-attention mechanism', blocking: 'Need more math', priority: 'Finish paper reading' } }],
      notifications: [],
      tags: ['target','dream','transformers','ielts','study','planning','lor','cv','reading'],
      settings: { theme: 'system', remindersEnabled: false, streak: { current: 0, longest: 0, lastStudyDate: null } }
    };
    this.save();
  },

  save: function() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); },

  updateStreak: function() {
    var today = todayISO();
    var yesterday = addDays(-1);
    var streak = this.data.settings.streak;
    var studiedToday = this.data.study.some(function(s) { return s.date === today && s.done; });
    if (studiedToday && streak.lastStudyDate !== today) {
      if (streak.lastStudyDate === yesterday) streak.current += 1;
      else streak.current = 1;
      streak.lastStudyDate = today;
      if (streak.current > streak.longest) streak.longest = streak.current;
      this.save();
    } else if (!studiedToday && streak.lastStudyDate && streak.lastStudyDate < yesterday) {
      streak.current = 0;
      this.save();
    }
  },

  addNotification: function(title, body) {
    this.data.notifications.unshift({ id: uid(), title: title, body: body, date: new Date().toISOString(), read: false });
    this.data.notifications = this.data.notifications.slice(0, 50);
    this.save();
  }
};

// ========== SERVICES ==========
var Toast = {
  show: function(message, type) {
    type = type || 'info';
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() { toast.style.opacity = '0'; toast.style.transform = 'translateX(120%)'; setTimeout(function() { toast.remove(); }, 300); }, 3000);
  }
};

var Modal = {
  open: function(opts) {
    document.getElementById('modalTitle').textContent = opts.title;
    document.getElementById('modalBody').innerHTML = opts.body;
    var form = document.getElementById('modalForm');
    var deleteBtn = document.getElementById('modalDelete');
    form.onsubmit = function(e) { e.preventDefault(); opts.onSubmit(new FormData(form)); Modal.close(); };
    if (opts.onDelete) { deleteBtn.classList.remove('hidden'); deleteBtn.onclick = function() { opts.onDelete(); Modal.close(); }; }
    else { deleteBtn.classList.add('hidden'); }
    document.getElementById('modal').showModal();
  },
  close: function() { document.getElementById('modal').close(); }
};

var Notifier = {
  requestPermission: function() {
    if (!('Notification' in window)) { Toast.show('Notifications not supported', 'warning'); return Promise.resolve(false); }
    return Notification.requestPermission().then(function(perm) {
      State.data.settings.remindersEnabled = perm === 'granted';
      State.save();
      return perm === 'granted';
    });
  },
  send: function(title, body) {
    if (State.data.settings.remindersEnabled && Notification.permission === 'granted') new Notification(title, { body: body });
    State.addNotification(title, body);
    App.renderNotifCenter();
  },
  showBanner: function(title, meta) {
    document.getElementById('reminderTitle').textContent = title;
    document.getElementById('reminderMeta').textContent = meta;
    document.getElementById('reminderBanner').classList.remove('hidden');
  },
  hideBanner: function() { document.getElementById('reminderBanner').classList.add('hidden'); },
  startChecker: function() { this.check(); var self = this; setInterval(function() { self.check(); }, 60000); },
  check: function() {
    var now = Date.now();
    var upcoming = State.data.meetings.find(function(m) { var diff = new Date(m.date).getTime() - now; return diff > 0 && diff <= 900000; });
    if (upcoming) { this.showBanner('Meeting in ' + minutesUntil(upcoming.date) + ' min', upcoming.title + ' with ' + upcoming.with); return; }
    var urgent = State.data.applications.find(function(a) { var d = daysUntil(a.deadline); return d !== null && d >= 0 && d <= 7 && ['target','preparing'].indexOf(a.status) >= 0; });
    if (urgent) this.showBanner('App due in ' + daysUntil(urgent.deadline) + ' days', urgent.university);
  }
};

var Pomodoro = {
  secondsLeft: POMODORO_WORK, totalSeconds: POMODORO_WORK, isRunning: false, isBreak: false, studyId: null, intervalId: null,
  start: function(studyId) {
    var study = State.data.study.find(function(s) { return s.id === studyId; });
    if (!study) return;
    this.studyId = studyId; this.secondsLeft = POMODORO_WORK; this.totalSeconds = POMODORO_WORK;
    this.isBreak = false; this.isRunning = true;
    document.getElementById('pomodoroStudyTitle').textContent = study.topic;
    document.getElementById('pomodoroWidget').classList.remove('hidden');
    this.updateDisplay(); this.tick();
  },
  tick: function() {
    var self = this;
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(function() {
      if (!self.isRunning) return;
      self.secondsLeft--;
      self.updateDisplay();
      if (self.secondsLeft <= 0) self.complete();
    }, 1000);
  },
  complete: function() {
    if (!this.isBreak) {
      var study = State.data.study.find(function(s) { return s.id === Pomodoro.studyId; });
      if (study) { study.pomodoros = (study.pomodoros || 0) + 1; State.save(); State.updateStreak(); }
      Toast.show('Pomodoro complete! Take a break.', 'success');
      this.isBreak = true; this.secondsLeft = POMODORO_BREAK; this.totalSeconds = POMODORO_BREAK;
      document.getElementById('pomodoroStudyTitle').textContent = 'Break time';
    } else {
      Toast.show('Break over!', 'info');
      this.isBreak = false; this.secondsLeft = POMODORO_WORK; this.totalSeconds = POMODORO_WORK;
      var s2 = State.data.study.find(function(s) { return s.id === Pomodoro.studyId; });
      if (s2) document.getElementById('pomodoroStudyTitle').textContent = s2.topic;
      this.isRunning = false;
      document.getElementById('pomodoroPlay').textContent = 'Start';
    }
    this.updateDisplay();
  },
  toggle: function() {
    this.isRunning = !this.isRunning;
    document.getElementById('pomodoroPlay').textContent = this.isRunning ? 'Pause' : 'Resume';
    if (this.isRunning) this.tick();
  },
  reset: function() {
    this.isRunning = false; this.isBreak = false;
    this.secondsLeft = POMODORO_WORK; this.totalSeconds = POMODORO_WORK;
    document.getElementById('pomodoroPlay').textContent = 'Start';
    this.updateDisplay();
  },
  close: function() {
    this.isRunning = false;
    if (this.intervalId) clearInterval(this.intervalId);
    document.getElementById('pomodoroWidget').classList.add('hidden');
  },
  updateDisplay: function() {
    var mins = Math.floor(this.secondsLeft / 60);
    var secs = this.secondsLeft % 60;
    document.getElementById('pomodoroTime').textContent = String(mins).padStart(2,'0') + ':' + String(secs).padStart(2,'0');
    var progress = this.secondsLeft / this.totalSeconds;
    var circ = 2 * Math.PI * 45;
    document.getElementById('pomodoroRing').style.strokeDashoffset = circ * (1 - progress);
    var study = State.data.study.find(function(s) { return s.id === Pomodoro.studyId; });
    document.getElementById('pomodoroCount').textContent = study ? (study.pomodoros || 0) : 0;
  }
};

var Confetti = {
  canvas: null, ctx: null, particles: [], animating: false,
  init: function() { this.canvas = document.getElementById('confettiCanvas'); if (this.canvas) this.ctx = this.canvas.getContext('2d'); this.resize(); var self = this; window.addEventListener('resize', function() { self.resize(); }); },
  resize: function() { if (!this.canvas) return; this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; },
  burst: function() {
    if (!this.canvas) return;
    var colors = ['#667eea','#764ba2','#f59e0b','#10b981','#ef4444','#4f46e5'];
    for (var i = 0; i < 80; i++) {
      this.particles.push({ x: window.innerWidth/2, y: window.innerHeight/2, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.8)*15, size: Math.random()*8+4, color: colors[Math.floor(Math.random()*colors.length)], rot: Math.random()*360, rs: (Math.random()-0.5)*10, life: 1 });
    }
    if (!this.animating) this.animate();
  },
  animate: function() {
    var self = this;
    this.animating = true;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach(function(p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.rot += p.rs; p.life -= 0.012;
      self.ctx.save(); self.ctx.translate(p.x, p.y); self.ctx.rotate(p.rot * Math.PI / 180);
      self.ctx.fillStyle = p.color; self.ctx.globalAlpha = Math.max(0, p.life);
      self.ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size); self.ctx.restore();
    });
    this.particles = this.particles.filter(function(p) { return p.life > 0; });
    if (this.particles.length > 0) requestAnimationFrame(function() { self.animate(); });
    else { this.animating = false; this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
  }
};

var Tags = {
  render: function(tags, onClick) {
    if (!tags || tags.length === 0) return '';
    var html = '<div class="tags-container">';
    for (var i = 0; i < tags.length; i++) {
      var t = esc(tags[i]);
      html += '<span class="tag"' + (onClick ? ' onclick="' + onClick + "('" + t + "')\"" : '') + '>#' + t + '</span>';
    }
    return html + '</div>';
  },
  input: function(name, value) {
    name = name || 'tags';
    value = value || [];
    return '<div class="form-group"><label>Tags (comma-separated)</label><input name="' + name + '" value="' + esc(value.join(', ')) + '" placeholder="urgent, paper, eth"></div>';
  },
  parse: function(str) {
    if (!str) return [];
    return str.split(',').map(function(t) { return t.trim().toLowerCase().replace(/^#/, ''); }).filter(Boolean);
  },
  sync: function() {
    var all = new Set(State.data.tags || []);
    var collections = ['applications','emails','meetings','study','goals','tasks','professors','funding','papers','conferences'];
    collections.forEach(function(c) {
      (State.data[c] || []).forEach(function(item) { (item.tags || []).forEach(function(t) { all.add(t); }); });
    });
    State.data.tags = Array.from(all).sort();
    State.save();
  }
};

var CommandPalette = {
  isOpen: false, selectedIndex: 0, items: [],
  open: function() {
    this.isOpen = true;
    document.getElementById('commandPalette').showModal();
    document.getElementById('commandInput').value = '';
    document.getElementById('commandInput').focus();
    this.selectedIndex = 0;
    this.render('');
  },
  close: function() {
    this.isOpen = false;
    document.getElementById('commandPalette').close();
  },
  render: function(query) {
    this.items = this.buildItems();
    var q = query.toLowerCase();
    var filtered = this.items;
    if (q) {
      filtered = this.items.map(function(item) {
        var score = item.title.toLowerCase().indexOf(q) >= 0 ? 2 : (item.meta && item.meta.toLowerCase().indexOf(q) >= 0 ? 1 : 0);
        return Object.assign({}, item, { score: score });
      }).filter(function(item) { return item.score > 0; }).sort(function(a, b) { return b.score - a.score; }).slice(0, 30);
    } else {
      filtered = filtered.slice(0, 20);
    }
    var results = document.getElementById('commandResults');
    if (filtered.length === 0) { results.innerHTML = '<div class="command-empty">No results found</div>'; return; }
    var groups = {};
    filtered.forEach(function(item, idx) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(Object.assign({}, item, { _idx: idx }));
    });
    var html = '';
    var globalIdx = 0;
    for (var g in groups) {
      html += '<div class="command-group"><div class="command-group-title">' + esc(g) + '</div>';
      groups[g].forEach(function(item) {
        var sel = globalIdx === CommandPalette.selectedIndex ? ' selected' : '';
        html += '<div class="command-item' + sel + '" data-gidx="' + globalIdx + '" onclick="CommandPalette.execute(' + globalIdx + ')">';
        html += '<div class="command-item-icon">' + item.icon + '</div>';
        html += '<div class="command-item-content"><div class="command-item-title">' + esc(item.title) + '</div>';
        if (item.meta) html += '<div class="command-item-meta">' + esc(item.meta) + '</div>';
        html += '</div></div>';
        globalIdx++;
      });
      html += '</div>';
    }
    results.innerHTML = html;
  },
  buildItems: function() {
    var items = [];
    items.push({ group: 'Actions', icon: '+', title: 'New Task', action: function() { App.addTask(); } });
    items.push({ group: 'Actions', icon: '+', title: 'New Application', action: function() { App.addApplication(); } });
    items.push({ group: 'Actions', icon: '+', title: 'Log Email', action: function() { App.addEmail(); } });
    items.push({ group: 'Actions', icon: '+', title: 'Schedule Meeting', action: function() { App.addMeeting(); } });
    items.push({ group: 'Actions', icon: '+', title: 'Add Study Block', action: function() { App.addStudy(); } });
    items.push({ group: 'Actions', icon: '+', title: 'Add Paper', action: function() { App.addPaper(); } });
    items.push({ group: 'Actions', icon: '+', title: 'Add Goal', action: function() { App.addGoal(); } });
    var views = ['dashboard','calendar','applications','professors','papers','conferences','funding','emails','meetings','tasks','matrix','study','journal','goals','inbox'];
    var icons = { dashboard:'D', calendar:'C', applications:'A', professors:'P', papers:'R', conferences:'N', funding:'F', emails:'E', meetings:'M', tasks:'T', matrix:'X', study:'S', journal:'J', goals:'G', inbox:'I' };
    views.forEach(function(v) {
      items.push({ group: 'Go to', icon: icons[v], title: v.charAt(0).toUpperCase() + v.slice(1), action: function() { App.switchView(v); } });
    });
    State.data.tasks.forEach(function(t) { items.push({ group: 'Tasks', icon: t.done ? 'V' : 'O', title: t.title, meta: t.deadline ? 'Due ' + fmtDate(t.deadline) : '', action: function() { App.switchView('tasks'); } }); });
    State.data.applications.forEach(function(a) { items.push({ group: 'Applications', icon: 'A', title: a.university, meta: a.program, action: function() { App.switchView('applications'); } }); });
    items.push({ group: 'System', icon: 'S', title: 'Export Backup', action: function() { document.getElementById('exportBtn').click(); } });
    items.push({ group: 'System', icon: 'T', title: 'Toggle Theme', action: function() { document.getElementById('themeToggle').click(); } });
    return items;
  },
  execute: function(index) {
    if (index >= 0 && index < this.items.length) {
      this.close();
      this.items[index].action();
    }
  },
  navigate: function(dir) {
    this.selectedIndex += dir;
    if (this.selectedIndex < 0) this.selectedIndex = this.items.length - 1;
    if (this.selectedIndex >= this.items.length) this.selectedIndex = 0;
    document.querySelectorAll('.command-item').forEach(function(el) {
      el.classList.toggle('selected', parseInt(el.dataset.gidx) === CommandPalette.selectedIndex);
    });
    var sel = document.querySelector('.command-item.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
};

// ========== VIEWS ==========
var Views = {
  dashboard: function() {
    var apps = State.data.applications;
    var submitted = apps.filter(function(a) { return ['submitted','interview','accepted'].indexOf(a.status) >= 0; }).length;
    var awaiting = State.data.emails.filter(function(e) { return e.status === 'awaiting'; }).length;
    var pending = State.data.tasks.filter(function(t) { return !t.done; }).length;
    var streak = State.data.settings.streak;
    var allEvents = [];
    State.data.meetings.forEach(function(m) { allEvents.push({ type: 'meeting', title: m.title, date: m.date, meta: 'with ' + m.with }); });
    State.data.goals.filter(function(g) { return !g.done; }).forEach(function(g) { allEvents.push({ type: 'goal', title: g.title, date: g.deadline + 'T23:59', meta: 'Goal' }); });
    apps.filter(function(a) { return ['target','preparing'].indexOf(a.status) >= 0; }).forEach(function(a) { allEvents.push({ type: 'app', title: a.university, date: a.deadline + 'T23:59', meta: a.program }); });
    State.data.tasks.filter(function(t) { return !t.done && t.deadline; }).forEach(function(t) { allEvents.push({ type: 'task', title: t.title, date: t.deadline + 'T23:59', meta: 'Task' }); });
    allEvents = allEvents.filter(function(e) { return new Date(e.date).getTime() > Date.now(); }).sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    var next = allEvents[0];
    var weekAgo = addDays(-7);
    var weekStudy = State.data.study.filter(function(s) { return s.date >= weekAgo && s.done; });
    var weekMins = weekStudy.reduce(function(sum, s) { return sum + s.duration; }, 0);

    var html = '';
    if (streak.current > 0) html += '<div class="streak-card"><div class="streak-fire">🔥</div><div class="streak-info"><strong>' + streak.current + ' day streak</strong><small>Longest: ' + streak.longest + ' days</small></div></div>';
    if (next) {
      var mins = minutesUntil(next.date);
      var cd = mins < 60 ? 'in ' + mins + ' min' : mins < 1440 ? 'in ' + Math.floor(mins/60) + 'h' : 'in ' + Math.floor(mins/1440) + 'd';
      html += '<div class="upnext-card"><h3>Up Next</h3><div class="upnext-title">' + esc(next.title) + '</div><div class="upnext-meta">' + esc(next.meta) + ' • ' + fmtDate(next.date.slice(0,10)) + '</div><span class="countdown">' + cd + '</span></div>';
    }
    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-icon">🎓</div><div><div class="stat-value">' + submitted + '/' + apps.length + '</div><div class="stat-label">Applications</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon warning">📧</div><div><div class="stat-value">' + awaiting + '</div><div class="stat-label">Awaiting Reply</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon success">📄</div><div><div class="stat-value">' + State.data.papers.length + '</div><div class="stat-label">Papers</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon">✅</div><div><div class="stat-value">' + pending + '</div><div class="stat-label">Open Tasks</div></div></div>';
    html += '</div>';

    html += '<div class="grid-2"><div class="card"><div class="card-head"><div><h3>Upcoming Deadlines</h3></div></div><div class="list">';
    if (allEvents.length === 0) {
      html += '<div class="empty"><span class="empty-illustration">✨</span><div class="empty-title">All clear!</div></div>';
    } else {
      allEvents.slice(0, 6).forEach(function(e) {
        var d = daysUntil(e.date.slice(0,10));
        var cls = d <= 3 ? 'danger' : d <= 7 ? 'warning' : 'primary';
        var icon = e.type === 'meeting' ? '🤝' : e.type === 'goal' ? '🎯' : e.type === 'task' ? '✅' : '🎓';
        html += '<div class="list-item"><div style="font-size:20px">' + icon + '</div><div class="list-item-content"><div class="list-item-title">' + esc(e.title) + '</div><div class="list-item-meta">' + esc(e.meta) + '</div></div><span class="badge ' + cls + '">' + d + 'd</span></div>';
      });
    }
    html += '</div></div>';

    html += '<div class="card"><div class="card-head"><div><h3>Today Study</h3></div><button class="btn btn-sm btn-ghost" onclick="App.switchView(\'study\')">All</button></div><div class="list">';
    var todayStudy = State.data.study.filter(function(s) { return s.date === todayISO(); });
    if (todayStudy.length === 0) {
      html += '<div class="empty"><span class="empty-illustration">📚</span><div class="empty-title">No study planned</div></div>';
    } else {
      todayStudy.forEach(function(s) {
        html += '<div class="list-item"><input type="checkbox" ' + (s.done ? 'checked' : '') + ' onchange="App.toggleStudy(\'' + s.id + '\')"><div class="list-item-content"><div class="list-item-title" style="' + (s.done ? 'text-decoration:line-through;opacity:0.6' : '') + '">' + esc(s.topic) + '</div><div class="list-item-meta">' + s.duration + ' min</div></div>';
        if (!s.done) html += '<button class="pomodoro-start" onclick="Pomodoro.start(\'' + s.id + '\')">Focus</button>';
        html += '</div>';
      });
    }
    html += '</div></div></div>';

    // Heatmap
    html += this.renderHeatmap();

    // Study chart
    html += '<div class="charts-grid"><div class="chart-card"><h3>Study Hours (7 Days)</h3><small>Minutes per day</small>';
    var last7 = [];
    for (var i = 6; i >= 0; i--) {
      var dd = new Date(); dd.setDate(dd.getDate() - i);
      var iso = dd.toISOString().slice(0,10);
      var m = State.data.study.filter(function(s) { return s.date === iso && s.done; }).reduce(function(sum, s) { return sum + s.duration; }, 0);
      last7.push({ mins: m, label: dd.toLocaleDateString(undefined, { weekday: 'short' }) });
    }
    var maxM = Math.max(60, Math.max.apply(null, last7.map(function(d) { return d.mins; })));
    html += '<svg class="chart-svg" viewBox="0 0 360 210"><line x1="20" y1="180" x2="350" y2="180" stroke="var(--border)" stroke-width="1"/>';
    last7.forEach(function(d, idx) {
      var h = (d.mins / maxM) * 150;
      var x = 30 + idx * 55;
      html += '<rect x="' + x + '" y="' + (180-h) + '" width="40" height="' + h + '" fill="var(--primary)" rx="4" opacity="0.85"/>';
      html += '<text x="' + (x+20) + '" y="' + (175-h) + '" text-anchor="middle" font-size="10" font-weight="600" fill="var(--text)">' + d.mins + 'm</text>';
      html += '<text x="' + (x+20) + '" y="195" text-anchor="middle" font-size="9" fill="var(--text-muted)">' + d.label + '</text>';
    });
    html += '</svg></div>';

    // Predictions
    html += '<div class="chart-card"><h3>Predictions</h3><small>Based on your pace</small>';
    var activeApps = apps.filter(function(a) { return ['target','preparing'].indexOf(a.status) >= 0; }).length;
    html += '<div class="prediction-item"><span class="prediction-icon">🎓</span><div class="prediction-text">' + submitted + ' submitted, ' + activeApps + ' in progress</div></div>';
    html += '<div class="prediction-item"><span class="prediction-icon">📚</span><div class="prediction-text">' + Math.round(weekMins/7) + ' min/day avg study</div></div>';
    html += '<div class="prediction-item"><span class="prediction-icon">🔥</span><div class="prediction-text">' + streak.current + ' day streak</div></div>';
    html += '</div></div>';

    return html;
  },

  renderHeatmap: function() {
    var today = new Date();
    var dateMap = {};
    State.data.study.filter(function(s) { return s.done; }).forEach(function(s) { dateMap[s.date] = (dateMap[s.date] || 0) + s.duration; });
    var cells = '';
    for (var i = 364; i >= 0; i--) {
      var d = new Date(today); d.setDate(d.getDate() - i);
      var iso = d.toISOString().slice(0,10);
      var mins = dateMap[iso] || 0;
      var level = mins >= 240 ? 4 : mins >= 120 ? 3 : mins >= 60 ? 2 : mins > 0 ? 1 : 0;
      cells += '<div class="heatmap-cell level-' + level + '" data-tooltip="' + fmtDate(iso) + ': ' + mins + ' min"></div>';
    }
    var totalH = Math.round(Object.values(dateMap).reduce(function(a,b) { return a+b; }, 0) / 60);
    var activeD = Object.keys(dateMap).length;
    return '<div class="heatmap-card"><div class="heatmap-head"><div><h3>Study Activity</h3><small>' + activeD + ' active days</small></div><div class="heatmap-stats"><span><strong>' + totalH + 'h</strong> total</span><span><strong>' + State.data.settings.streak.current + '</strong> streak</span></div></div><div class="heatmap-wrapper"><div class="heatmap">' + cells + '</div></div><div class="heatmap-legend"><span>Less</span><div class="heatmap-legend-cell" style="background:var(--bg-muted)"></div><div class="heatmap-legend-cell" style="background:#9be9a8"></div><div class="heatmap-legend-cell" style="background:#40c463"></div><div class="heatmap-legend-cell" style="background:#30a14e"></div><div class="heatmap-legend-cell" style="background:#216e39"></div><span>More</span></div></div>';
  },

  calendar: function() {
    var d = State.calendarDate;
    var year = d.getFullYear(), month = d.getMonth();
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var monthName = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    var eventsByDate = {};
    State.data.meetings.forEach(function(m) { var k = m.date.slice(0,10); if (!eventsByDate[k]) eventsByDate[k] = []; eventsByDate[k].push({ type: 'meeting', title: m.title }); });
    State.data.applications.forEach(function(a) { if (a.deadline) { if (!eventsByDate[a.deadline]) eventsByDate[a.deadline] = []; eventsByDate[a.deadline].push({ type: 'deadline', title: a.university }); } });
    State.data.study.forEach(function(s) { if (!eventsByDate[s.date]) eventsByDate[s.date] = []; eventsByDate[s.date].push({ type: 'study', title: s.topic }); });
    var prevLast = new Date(year, month, 0).getDate();
    var cells = '';
    for (var i = firstDay - 1; i >= 0; i--) cells += '<div class="calendar-day other-month"><div class="calendar-day-num">' + (prevLast - i) + '</div></div>';
    var today = todayISO();
    for (var day = 1; day <= daysInMonth; day++) {
      var ds = year + '-' + String(month+1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
      var evts = eventsByDate[ds] || [];
      cells += '<div class="calendar-day' + (ds === today ? ' today' : '') + '" onclick="App.showDayDetail(\'' + ds + '\')"><div class="calendar-day-num">' + day + '</div>';
      evts.slice(0,3).forEach(function(e) { cells += '<div class="calendar-event ' + e.type + '">' + esc(e.title) + '</div>'; });
      if (evts.length > 3) cells += '<div class="calendar-more">+' + (evts.length-3) + '</div>';
      cells += '</div>';
    }
    var total = firstDay + daysInMonth;
    var rem = (7 - total % 7) % 7;
    for (var j = 1; j <= rem; j++) cells += '<div class="calendar-day other-month"><div class="calendar-day-num">' + j + '</div></div>';
    var hdrs = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(function(h) { return '<div class="calendar-day-header">' + h + '</div>'; }).join('');
    return '<div class="card"><div class="calendar-controls"><div class="calendar-month">' + monthName + '</div><div class="calendar-nav"><button class="btn btn-ghost btn-sm" onclick="App.changeMonth(-1)">Prev</button><button class="btn btn-ghost btn-sm" onclick="App.goToToday()">Today</button><button class="btn btn-ghost btn-sm" onclick="App.changeMonth(1)">Next</button></div></div><div class="calendar-grid">' + hdrs + cells + '</div></div>';
  },

  applications: function() {
    var statuses = [{id:'target',label:'Target'},{id:'preparing',label:'Preparing'},{id:'submitted',label:'Submitted'},{id:'interview',label:'Interview'},{id:'accepted',label:'Accepted'},{id:'rejected',label:'Rejected'}];
    var html = '<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addApplication()">+ Add Application</button></div><div class="kanban">';
    statuses.forEach(function(s) {
      var items = State.data.applications.filter(function(a) { return a.status === s.id; });
      html += '<div class="kanban-col" ondragover="event.preventDefault()" ondrop="App.dropApplication(event,\'' + s.id + '\')"><div class="kanban-col-head"><span>' + s.label + '</span><span class="kanban-col-count">' + items.length + '</span></div>';
      items.forEach(function(a) {
        var docs = a.documents || [];
        var docsDone = docs.filter(function(d) { return d.done; }).length;
        html += '<div class="kanban-card" draggable="true" ondragstart="App.dragApplication(event,\'' + a.id + '\')"><div class="kanban-card-title">' + esc(a.university) + '</div><div class="kanban-card-meta"><span class="badge">' + esc(a.program) + '</span></div>';
        if (docs.length > 0) {
          html += '<div class="doc-checklist"><div class="doc-progress">' + docsDone + '/' + docs.length + ' docs</div>';
          docs.slice(0,3).forEach(function(doc) {
            html += '<div class="doc-item' + (doc.done ? ' done' : '') + '"><input type="checkbox" ' + (doc.done ? 'checked' : '') + ' onchange="App.toggleDoc(\'' + a.id + '\',\'' + esc(doc.name) + '\')"><span>' + esc(doc.name) + '</span></div>';
          });
          html += '</div>';
        }
        html += '<button class="btn btn-sm btn-ghost" style="margin-top:8px;width:100%" onclick="App.editApplication(\'' + a.id + '\')">Edit</button></div>';
      });
      html += '</div>';
    });
    return html + '</div>';
  },

  professors: function() {
    var html = '<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addProfessor()">+ Add Professor</button></div><div class="prof-grid">';
    if (State.data.professors.length === 0) return html + '<div class="empty"><span class="empty-illustration">🔬</span><div class="empty-title">No professors saved</div></div></div>';
    State.data.professors.forEach(function(p) {
      html += '<div class="prof-card"><div class="prof-head"><div class="prof-avatar">' + esc(p.name.charAt(0)) + '</div><div><div class="prof-name">' + esc(p.name) + '</div><div class="prof-uni">' + esc(p.university) + '</div></div></div>';
      html += '<div class="prof-details"><span>🔬 ' + esc(p.researchArea || '—') + '</span><span>📄 ' + (p.papersRead || 0) + ' papers</span></div>';
      html += Tags.render(p.tags);
      html += '<div class="prof-actions" style="margin-top:10px"><button class="btn btn-sm btn-ghost" onclick="App.editProfessor(\'' + p.id + '\')">Edit</button><button class="btn btn-sm btn-primary" onclick="App.emailProfessor(\'' + p.id + '\')">Email</button></div></div>';
    });
    return html + '</div>';
  },

  papers: function() {
    var html = '<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addPaper()">+ Add Paper</button></div><div class="paper-grid">';
    if (State.data.papers.length === 0) return html + '<div class="empty"><span class="empty-illustration">📄</span><div class="empty-title">No papers tracked</div></div></div>';
    State.data.papers.forEach(function(p) {
      var stars = '';
      for (var i = 0; i < 5; i++) stars += i < (p.rating || 0) ? '★' : '☆';
      html += '<div class="paper-card"><div class="paper-title">' + esc(p.title) + '</div><div class="paper-authors">' + esc(p.authors) + ' • ' + p.year + '</div><div class="paper-meta"><span class="badge ' + (p.status === 'finished' ? 'success' : 'warning') + '">' + esc(p.status) + '</span><span class="paper-stars">' + stars + '</span></div>';
      html += Tags.render(p.tags);
      if (p.takeaways) html += '<div class="paper-takeaways">' + esc(p.takeaways) + '</div>';
      html += '<div class="paper-actions"><button class="btn btn-sm btn-ghost" onclick="App.editPaper(\'' + p.id + '\')">Edit</button></div></div>';
    });
    return html + '</div>';
  },

  conferences: function() {
    var html = '<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addConference()">+ Add Conference</button></div><div class="conf-list">';
    if (State.data.conferences.length === 0) return html + '<div class="empty"><span class="empty-illustration">🎤</span><div class="empty-title">No conferences</div></div></div>';
    State.data.conferences.forEach(function(c) {
      var sd = new Date(c.startDate);
      html += '<div class="conf-item"><div class="conf-date-box"><div class="month">' + sd.toLocaleDateString(undefined,{month:'short'}) + '</div><div class="day">' + sd.getDate() + '</div></div><div class="conf-info"><div class="conf-name">' + esc(c.name) + '</div><div class="conf-venue">' + esc(c.venue) + '</div><span class="badge ' + (c.status === 'accepted' ? 'success' : 'warning') + '">' + esc(c.status) + '</span><button class="btn btn-sm btn-ghost" style="margin-top:8px" onclick="App.editConference(\'' + c.id + '\')">Edit</button></div></div>';
    });
    return html + '</div>';
  },

  funding: function() {
    var html = '<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addFunding()">+ Add Funding</button></div>';
    if (State.data.funding.length === 0) return html + '<div class="empty"><span class="empty-illustration">💰</span><div class="empty-title">No funding tracked</div></div>';
    State.data.funding.forEach(function(f) {
      var d = daysUntil(f.deadline);
      html += '<div class="funding-item"><div class="funding-amount">' + esc(f.amount || '—') + '</div><div class="funding-info"><div class="funding-name">' + esc(f.name) + '</div><div class="funding-meta">Due ' + fmtDate(f.deadline) + (d !== null && d <= 7 ? ' • ' + d + 'd left' : '') + '</div><span class="badge ' + (f.status === 'awarded' ? 'success' : 'warning') + '">' + esc(f.status) + '</span></div><button class="btn btn-sm btn-ghost" onclick="App.editFunding(\'' + f.id + '\')">Edit</button></div>';
    });
    return html;
  },

  emails: function() {
    var html = '<div style="display:flex;justify-content:space-between;margin-bottom:20px"><button class="btn btn-ghost" onclick="App.openTemplates()">Templates</button><button class="btn btn-primary" onclick="App.addEmail()">+ Log Email</button></div><div class="card"><div class="list">';
    if (State.data.emails.length === 0) return html + '<div class="empty"><span class="empty-illustration">📧</span><div class="empty-title">No emails</div></div></div></div>';
    State.data.emails.forEach(function(e) {
      var overdue = e.status === 'awaiting' && daysUntil(e.followUpDate) < 0;
      html += '<div class="list-item"' + (overdue ? ' style="border-color:var(--danger)"' : '') + '><div style="font-size:20px">📧</div><div class="list-item-content"><div class="list-item-title">' + esc(e.professor) + ' <span class="badge ' + (e.status === 'replied' ? 'success' : 'warning') + '">' + e.status + '</span></div><div class="list-item-meta">' + esc(e.university) + ' • Follow-up ' + fmtDate(e.followUpDate) + (overdue ? ' • OVERDUE' : '') + '</div></div><button class="btn btn-sm btn-ghost" onclick="App.editEmail(\'' + e.id + '\')">Edit</button></div>';
    });
    return html + '</div></div>';
  },

  meetings: function() {
    var upcoming = State.data.meetings.filter(function(m) { return new Date(m.date).getTime() >= Date.now() - 86400000; }).sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    var html = '<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addMeeting()">+ Schedule Meeting</button></div><div class="card"><div class="list">';
    if (upcoming.length === 0) return html + '<div class="empty"><span class="empty-illustration">🤝</span><div class="empty-title">No meetings</div></div></div></div>';
    upcoming.forEach(function(m) {
      var soon = minutesUntil(m.date) > 0 && minutesUntil(m.date) <= 60;
      html += '<div class="list-item"' + (soon ? ' style="border-color:var(--warning)"' : '') + '><div style="font-size:20px">🤝</div><div class="list-item-content"><div class="list-item-title">' + esc(m.title) + (soon ? ' <span class="badge warning">Soon</span>' : '') + '</div><div class="list-item-meta">with ' + esc(m.with) + ' • ' + fmtDate(m.date.slice(0,10)) + '</div></div><button class="btn btn-sm btn-ghost" onclick="App.editMeeting(\'' + m.id + '\')">Edit</button></div>';
    });
    return html + '</div></div>';
  },

  tasks: function() {
    var filter = State.activeTagFilter;
    var pending = State.data.tasks.filter(function(t) { return !t.done && (!filter || (t.tags || []).indexOf(filter) >= 0); }).sort(function(a, b) { return (a.deadline || '9999').localeCompare(b.deadline || '9999'); });
    var done = State.data.tasks.filter(function(t) { return t.done; });
    var html = '<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div>' + (filter ? '<span class="tag" onclick="App.clearTagFilter()">#' + esc(filter) + ' x</span>' : '') + '</div><button class="btn btn-primary" onclick="App.addTask()">+ Add Task</button></div>';
    html += '<div class="card"><div class="card-head"><div><h3>Pending</h3><small>' + pending.length + ' open</small></div></div>';
    if (pending.length === 0) html += '<div class="empty"><span class="empty-illustration">✅</span><div class="empty-title">No pending tasks</div></div>';
    pending.forEach(function(t) {
      var d = daysUntil(t.deadline);
      html += '<div class="task-item"' + (d < 0 ? ' style="border-color:var(--danger)"' : '') + '><input type="checkbox" onchange="App.toggleTask(\'' + t.id + '\')"><div style="flex:1"><div class="task-item-title">' + esc(t.title) + '</div><div class="task-item-meta">Due ' + fmtDate(t.deadline) + (d < 0 ? ' • OVERDUE' : '') + '</div>' + Tags.render(t.tags, 'App.filterByTag') + '</div><button class="btn btn-sm btn-ghost" onclick="App.editTask(\'' + t.id + '\')">Edit</button></div>';
    });
    html += '</div>';
    if (done.length > 0) {
      html += '<div class="card" style="margin-top:16px"><div class="card-head"><h3>Done (' + done.length + ')</h3></div>';
      done.forEach(function(t) { html += '<div class="task-item done"><input type="checkbox" checked onchange="App.toggleTask(\'' + t.id + '\')"><div style="flex:1"><div class="task-item-title">' + esc(t.title) + '</div></div></div>'; });
      html += '</div>';
    }
    return html;
  },

  matrix: function() {
    var tasks = State.data.tasks.filter(function(t) { return !t.done; });
    var q1 = tasks.filter(function(t) { return t.urgency && t.importance; });
    var q2 = tasks.filter(function(t) { return !t.urgency && t.importance; });
    var q3 = tasks.filter(function(t) { return t.urgency && !t.importance; });
    var q4 = tasks.filter(function(t) { return !t.urgency && !t.importance; });
    function renderQ(title, sub, icon, items, cls) {
      var h = '<div class="matrix-quadrant ' + cls + '"><div class="matrix-head"><span class="matrix-icon">' + icon + '</span><div><div class="matrix-title">' + title + '</div><div class="matrix-subtitle">' + sub + '</div></div></div>';
      if (items.length === 0) h += '<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:20px">Empty</div>';
      items.forEach(function(t) { h += '<div class="matrix-task" onclick="App.editTask(\'' + t.id + '\')">' + esc(t.title) + '</div>'; });
      return h + '</div>';
    }
    return '<div style="margin-bottom:16px"><button class="btn btn-primary" onclick="App.addTask()">+ Add Task</button></div><div class="matrix">' + renderQ('Do First','Urgent & Important','🔴',q1,'q1') + renderQ('Schedule','Important','🔵',q2,'q2') + renderQ('Delegate','Urgent','🟡',q3,'q3') + renderQ('Eliminate','Neither','⚪',q4,'q4') + '</div>';
  },

  study: function() {
    var today = State.data.study.filter(function(s) { return s.date === todayISO(); });
    var totalMin = today.reduce(function(sum, s) { return sum + (s.done ? s.duration : 0); }, 0);
    var html = '<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div class="stat-card" style="padding:12px"><div><div class="stat-value">' + totalMin + ' min</div><div class="stat-label">Today</div></div></div><button class="btn btn-primary" onclick="App.addStudy()">+ Add Study</button></div><div class="card"><div class="list">';
    if (today.length === 0) html += '<div class="empty"><span class="empty-illustration">📚</span><div class="empty-title">No study planned</div></div>';
    today.forEach(function(s) {
      html += '<div class="list-item"><input type="checkbox" ' + (s.done ? 'checked' : '') + ' onchange="App.toggleStudy(\'' + s.id + '\')"><div class="list-item-content"><div class="list-item-title" style="' + (s.done ? 'text-decoration:line-through;opacity:0.6' : '') + '">' + esc(s.topic) + '</div><div class="list-item-meta">' + s.duration + ' min</div></div>';
      if (!s.done) html += '<button class="pomodoro-start" onclick="Pomodoro.start(\'' + s.id + '\')">Focus</button>';
      html += '<button class="btn btn-sm btn-ghost" onclick="App.editStudy(\'' + s.id + '\')">Edit</button></div>';
    });
    return html + '</div></div>';
  },

  journal: function() {
    var entries = State.data.journal.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
    var html = '<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addJournal()">+ New Entry</button></div><div class="journal-list">';
    if (entries.length === 0) return html + '<div class="empty"><span class="empty-illustration">📓</span><div class="empty-title">No entries yet</div></div></div>';
    entries.forEach(function(e) {
      html += '<div class="journal-entry"><div class="journal-date">' + fmtDate(e.date) + '</div><div class="journal-content">' + esc(e.content) + '</div>';
      if (e.prompts) {
        html += '<div class="journal-prompts">';
        if (e.prompts.learned) html += '<div class="journal-prompt"><strong>Learned</strong>' + esc(e.prompts.learned) + '</div>';
        if (e.prompts.blocking) html += '<div class="journal-prompt"><strong>Blocking</strong>' + esc(e.prompts.blocking) + '</div>';
        if (e.prompts.priority) html += '<div class="journal-prompt"><strong>Priority</strong>' + esc(e.prompts.priority) + '</div>';
        html += '</div>';
      }
      html += '<div style="margin-top:10px;display:flex;gap:6px"><button class="btn btn-sm btn-ghost" onclick="App.editJournal(\'' + e.id + '\')">Edit</button><button class="btn btn-sm btn-danger" onclick="App.deleteJournal(\'' + e.id + '\')">Delete</button></div></div>';
    });
    return html + '</div>';
  },

  goals: function() {
    var html = '<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addGoal()">+ Add Goal</button></div><div class="card"><div class="list">';
    if (State.data.goals.length === 0) return html + '<div class="empty"><span class="empty-illustration">🎯</span><div class="empty-title">No goals</div></div></div></div>';
    State.data.goals.forEach(function(g) {
      var d = daysUntil(g.deadline);
      html += '<div class="list-item"' + (d < 0 && !g.done ? ' style="border-color:var(--danger)"' : '') + '><input type="checkbox" ' + (g.done ? 'checked' : '') + ' onchange="App.toggleGoal(\'' + g.id + '\')"><div class="list-item-content"><div class="list-item-title" style="' + (g.done ? 'text-decoration:line-through;opacity:0.6' : '') + '">' + esc(g.title) + '</div><div class="list-item-meta">Due ' + fmtDate(g.deadline) + (d < 0 && !g.done ? ' • OVERDUE' : '') + '</div></div><button class="btn btn-sm btn-ghost" onclick="App.editGoal(\'' + g.id + '\')">Edit</button></div>';
    });
    return html + '</div></div>';
  },

  inbox: function() {
    var html = '<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.openQuickCapture()">Quick Capture</button></div>';
    if (State.data.inbox.length === 0) return html + '<div class="empty"><span class="empty-illustration">📥</span><div class="empty-title">Inbox zero!</div></div>';
    State.data.inbox.forEach(function(i) {
      html += '<div class="inbox-item"><div style="flex:1"><div class="inbox-content">' + esc(i.content) + '</div><div style="margin-top:4px">' + (i.tag ? '<span class="inbox-tag">' + esc(i.tag) + '</span> ' : '') + '<span class="inbox-date">' + fmtDate(i.date) + '</span></div></div><div class="inbox-actions"><button class="btn btn-sm btn-ghost" onclick="App.convertInbox(\'' + i.id + '\',\'task\')">Task</button><button class="btn btn-sm btn-ghost" onclick="App.convertInbox(\'' + i.id + '\',\'study\')">Study</button><button class="btn btn-sm btn-ghost" onclick="App.deleteInbox(\'' + i.id + '\')">x</button></div></div>';
    });
    return html;
  }
};

// ========== MAIN APP ==========
var App = {
  init: function() {
    State.init();
    Confetti.init();
    this.applyTheme();
    this.bindEvents();
    this.render();
    Notifier.startChecker();
    this.updateInboxBadge();
    this.renderNotifCenter();
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    Tags.sync();
  },

  applyTheme: function() {
    var t = State.data.settings.theme;
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    document.getElementById('themeToggle').textContent = t === 'dark' ? '☀️' : '🌙';
  },

  updateInboxBadge: function() {
    var b = document.getElementById('inboxBadge');
    var c = State.data.inbox.length;
    if (c > 0) { b.textContent = c; b.classList.remove('hidden'); } else b.classList.add('hidden');
  },

  renderNotifCenter: function() {
    var list = document.getElementById('notifList');
    var count = document.getElementById('notifCount');
    var unread = State.data.notifications.filter(function(n) { return !n.read; }).length;
    if (unread > 0) { count.textContent = unread; count.classList.remove('hidden'); } else count.classList.add('hidden');
    if (State.data.notifications.length === 0) { list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px">No notifications</div>'; return; }
    list.innerHTML = State.data.notifications.slice(0, 20).map(function(n) { return '<div class="notif-item' + (n.read ? '' : ' unread') + '" onclick="App.markNotifRead(\'' + n.id + '\')"><div class="notif-item-title">' + esc(n.title) + '</div><div class="notif-item-meta">' + esc(n.body) + '</div></div>'; }).join('');
  },

  markNotifRead: function(id) {
    var n = State.data.notifications.find(function(x) { return x.id === id; });
    if (n) { n.read = true; State.save(); this.renderNotifCenter(); }
  },

  bindEvents: function() {
    var self = this;
    document.querySelectorAll('.nav-link').forEach(function(link) {
      link.addEventListener('click', function(e) { e.preventDefault(); self.switchView(link.dataset.view); });
    });
    document.getElementById('themeToggle').addEventListener('click', function() {
      var c = State.data.settings.theme;
      State.data.settings.theme = c === 'dark' ? 'light' : c === 'light' ? 'system' : 'dark';
      State.save(); self.applyTheme();
    });
    document.getElementById('notifPermission').addEventListener('click', function() {
      Notifier.requestPermission().then(function(g) { if (g) Toast.show('Reminders enabled!', 'success'); });
    });
    document.getElementById('dismissReminder').addEventListener('click', function() { Notifier.hideBanner(); });
    document.getElementById('closeModal').addEventListener('click', function() { Modal.close(); });
    document.getElementById('closeTemplates').addEventListener('click', function() { document.getElementById('templatesModal').close(); });
    document.getElementById('closeQuickCapture').addEventListener('click', function() { document.getElementById('quickCaptureModal').close(); });
    document.getElementById('quickCaptureBtn').addEventListener('click', function() { self.openQuickCapture(); });
    document.getElementById('searchBtn').addEventListener('click', function() { CommandPalette.open(); });
    document.getElementById('quickCaptureForm').addEventListener('submit', function(e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      State.data.inbox.unshift({ id: uid(), content: fd.get('content'), tag: fd.get('tag'), date: todayISO() });
      State.save(); document.getElementById('quickCaptureModal').close(); e.target.reset();
      self.updateInboxBadge(); Toast.show('Captured!', 'success');
      if (State.currentView === 'inbox') self.render();
    });
    document.getElementById('pomodoroPlay').addEventListener('click', function() { Pomodoro.toggle(); });
    document.getElementById('pomodoroReset').addEventListener('click', function() { Pomodoro.reset(); });
    document.getElementById('pomodoroClose').addEventListener('click', function() { Pomodoro.close(); });
    document.getElementById('exportBtn').addEventListener('click', function() {
      var blob = new Blob([JSON.stringify(State.data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'scholarsync-' + todayISO() + '.json'; a.click(); Toast.show('Exported', 'success');
    });
    document.getElementById('importBtn').addEventListener('click', function() { document.getElementById('fileInput').click(); });
    document.getElementById('fileInput').addEventListener('change', function(e) {
      var file = e.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        try { State.data = JSON.parse(ev.target.result); State.save(); self.render(); Toast.show('Imported', 'success'); }
        catch(err) { Toast.show('Invalid file', 'error'); }
      };
      reader.readAsText(file); e.target.value = '';
    });
    document.getElementById('fabMain').addEventListener('click', function() { document.getElementById('fab').classList.toggle('open'); });
    document.querySelectorAll('.fab-item').forEach(function(item) {
      item.addEventListener('click', function() {
        document.getElementById('fab').classList.remove('open');
        var a = item.dataset.action;
        if (a === 'task') self.addTask();
        else if (a === 'email') self.addEmail();
        else if (a === 'meeting') self.addMeeting();
        else if (a === 'study') self.addStudy();
        else if (a === 'paper') self.addPaper();
        else if (a === 'goal') self.addGoal();
      });
    });
    document.getElementById('notifCenterBtn').addEventListener('click', function(e) {
      e.stopPropagation();
      document.getElementById('notifDropdown').classList.toggle('hidden');
    });
    document.getElementById('markAllRead').addEventListener('click', function() {
      State.data.notifications.forEach(function(n) { n.read = true; });
      State.save(); self.renderNotifCenter();
    });
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.notif-wrapper')) document.getElementById('notifDropdown').classList.add('hidden');
      if (!e.target.closest('.fab')) document.getElementById('fab').classList.remove('open');
    });
    document.addEventListener('keydown', function(e) {
      if (e.target.matches('input, textarea, select')) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); CommandPalette.isOpen ? CommandPalette.close() : CommandPalette.open(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') { e.preventDefault(); self.openQuickCapture(); }
      if (e.key === 'Escape') { Modal.close(); CommandPalette.close(); }
      if (CommandPalette.isOpen) {
        if (e.key === 'ArrowDown') { e.preventDefault(); CommandPalette.navigate(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); CommandPalette.navigate(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); CommandPalette.execute(CommandPalette.selectedIndex); }
      }
    });
    document.getElementById('commandInput').addEventListener('input', function(e) { CommandPalette.selectedIndex = 0; CommandPalette.render(e.target.value); });
  },

  openQuickCapture: function() { document.getElementById('quickCaptureModal').showModal(); },

  switchView: function(view) {
    State.currentView = view;
    document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.toggle('active', l.dataset.view === view); });
    var titles = { dashboard:'Dashboard', calendar:'Calendar', applications:'Applications', professors:'Professors', papers:'Papers', conferences:'Conferences', funding:'Funding', emails:'Emails', meetings:'Meetings', tasks:'Tasks', matrix:'Priority Matrix', study:'Study', journal:'Journal', goals:'Goals', inbox:'Inbox' };
    document.getElementById('viewTitle').textContent = titles[view] || view;
    document.getElementById('viewSubtitle').textContent = '';
    this.render();
  },

  render: function() { document.getElementById('viewContainer').innerHTML = Views[State.currentView](); },

  changeMonth: function(delta) { State.calendarDate.setMonth(State.calendarDate.getMonth() + delta); this.render(); },
  goToToday: function() { State.calendarDate = new Date(); this.render(); },

  showDayDetail: function(dateStr) {
    var events = [];
    State.data.meetings.filter(function(m) { return m.date.startsWith(dateStr); }).forEach(function(m) { events.push('Meeting: ' + m.title); });
    State.data.study.filter(function(s) { return s.date === dateStr; }).forEach(function(s) { events.push('Study: ' + s.topic); });
    var body = events.length > 0 ? events.map(function(e) { return '<div style="padding:8px 0;border-bottom:1px solid var(--border)">' + esc(e) + '</div>'; }).join('') : '<div class="empty">Nothing scheduled</div>';
    Modal.open({ title: fmtDate(dateStr), body: body, onSubmit: function() {} });
    document.getElementById('modalDelete').classList.add('hidden');
    var submitBtn = document.querySelector('#modalForm button[type="submit"]');
    if (submitBtn) submitBtn.classList.add('hidden');
  },

  filterByTag: function(tag) { State.activeTagFilter = tag; this.switchView('tasks'); },
  clearTagFilter: function() { State.activeTagFilter = null; this.render(); },

  // ===== APPLICATIONS =====
  addApplication: function() {
    Modal.open({
      title: 'Add Application',
      body: '<div class="form-group"><label>University</label><input name="university" required></div><div class="form-group"><label>Program</label><input name="program" required></div><div class="form-row"><div class="form-group"><label>Deadline</label><input name="deadline" type="date"></div><div class="form-group"><label>Status</label><select name="status"><option value="target">Target</option><option value="preparing">Preparing</option><option value="submitted">Submitted</option><option value="interview">Interview</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option></select></div></div><div class="form-group"><label>Notes</label><textarea name="notes" rows="3"></textarea></div>' + Tags.input(),
      onSubmit: function(fd) {
        State.data.applications.push({ id: uid(), university: fd.get('university'), program: fd.get('program'), deadline: fd.get('deadline'), status: fd.get('status'), notes: fd.get('notes'), documents: DEFAULT_DOCS.map(function(d) { return { name: d, done: false }; }), tags: Tags.parse(fd.get('tags')) });
        Tags.sync(); State.save(); App.render(); Toast.show('Added', 'success');
      }
    });
  },
  editApplication: function(id) {
    var a = State.data.applications.find(function(x) { return x.id === id; });
    if (!a) return;
    Modal.open({
      title: 'Edit Application',
      body: '<div class="form-group"><label>University</label><input name="university" value="' + esc(a.university) + '" required></div><div class="form-group"><label>Program</label><input name="program" value="' + esc(a.program) + '" required></div><div class="form-row"><div class="form-group"><label>Deadline</label><input name="deadline" type="date" value="' + (a.deadline || '') + '"></div><div class="form-group"><label>Status</label><select name="status">' + ['target','preparing','submitted','interview','accepted','rejected'].map(function(s) { return '<option value="' + s + '"' + (a.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div></div><div class="form-group"><label>Notes</label><textarea name="notes" rows="3">' + esc(a.notes) + '</textarea></div>' + Tags.input('tags', a.tags),
      onSubmit: function(fd) { Object.assign(a, { university: fd.get('university'), program: fd.get('program'), deadline: fd.get('deadline'), status: fd.get('status'), notes: fd.get('notes'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); App.render(); },
      onDelete: function() { State.data.applications = State.data.applications.filter(function(x) { return x.id !== id; }); State.save(); App.render(); }
    });
  },
  dragApplication: function(e, id) { e.dataTransfer.setData('text/plain', id); },
  dropApplication: function(e, status) { e.preventDefault(); var id = e.dataTransfer.getData('text/plain'); var a = State.data.applications.find(function(x) { return x.id === id; }); if (a) { a.status = status; State.save(); App.render(); } },
  toggleDoc: function(appId, docName) { var a = State.data.applications.find(function(x) { return x.id === appId; }); if (!a) return; var d = a.documents.find(function(x) { return x.name === docName; }); if (d) { d.done = !d.done; State.save(); App.render(); } },

  // ===== PROFESSORS =====
  addProfessor: function() {
    Modal.open({
      title: 'Add Professor',
      body: '<div class="form-group"><label>Name</label><input name="name" required></div><div class="form-row"><div class="form-group"><label>University</label><input name="university" required></div><div class="form-group"><label>Lab</label><input name="lab"></div></div><div class="form-group"><label>Research Area</label><input name="researchArea"></div><div class="form-group"><label>Notes</label><textarea name="notes" rows="3"></textarea></div>' + Tags.input(),
      onSubmit: function(fd) { State.data.professors.push({ id: uid(), name: fd.get('name'), university: fd.get('university'), lab: fd.get('lab'), researchArea: fd.get('researchArea'), papersRead: 0, status: 'researching', notes: fd.get('notes'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); App.render(); Toast.show('Added', 'success'); }
    });
  },
  editProfessor: function(id) {
    var p = State.data.professors.find(function(x) { return x.id === id; });
    if (!p) return;
    Modal.open({
      title: 'Edit Professor',
      body: '<div class="form-group"><label>Name</label><input name="name" value="' + esc(p.name) + '" required></div><div class="form-row"><div class="form-group"><label>University</label><input name="university" value="' + esc(p.university) + '" required></div><div class="form-group"><label>Lab</label><input name="lab" value="' + esc(p.lab || '') + '"></div></div><div class="form-group"><label>Research Area</label><input name="researchArea" value="' + esc(p.researchArea || '') + '"></div><div class="form-group"><label>Notes</label><textarea name="notes" rows="3">' + esc(p.notes || '') + '</textarea></div>' + Tags.input('tags', p.tags),
      onSubmit: function(fd) { Object.assign(p, { name: fd.get('name'), university: fd.get('university'), lab: fd.get('lab'), researchArea: fd.get('researchArea'), notes: fd.get('notes'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); App.render(); },
      onDelete: function() { State.data.professors = State.data.professors.filter(function(x) { return x.id !== id; }); State.save(); App.render(); }
    });
  },
  emailProfessor: function(id) { var p = State.data.professors.find(function(x) { return x.id === id; }); if (p) this.addEmail(p.name, p.university); },

  // ===== PAPERS =====
  addPaper: function() {
    Modal.open({
      title: 'Add Paper',
      body: '<div class="form-group"><label>Title</label><input name="title" required></div><div class="form-group"><label>Authors</label><input name="authors" required></div><div class="form-row"><div class="form-group"><label>Year</label><input name="year" type="number" value="2026"></div><div class="form-group"><label>Venue</label><input name="venue"></div></div><div class="form-row"><div class="form-group"><label>Rating</label><select name="rating"><option value="5">5</option><option value="4">4</option><option value="3" selected>3</option><option value="2">2</option><option value="1">1</option></select></div><div class="form-group"><label>Status</label><select name="status"><option value="to_read">To Read</option><option value="reading">Reading</option><option value="finished">Finished</option><option value="cited">Cited</option></select></div></div><div class="form-group"><label>Takeaways</label><textarea name="takeaways" rows="3"></textarea></div>' + Tags.input(),
      onSubmit: function(fd) { State.data.papers.push({ id: uid(), title: fd.get('title'), authors: fd.get('authors'), year: Number(fd.get('year')), venue: fd.get('venue'), rating: Number(fd.get('rating')), status: fd.get('status'), takeaways: fd.get('takeaways'), url: '', tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); App.render(); Toast.show('Added', 'success'); }
    });
  },
  editPaper: function(id) {
    var p = State.data.papers.find(function(x) { return x.id === id; });
    if (!p) return;
    Modal.open({
      title: 'Edit Paper',
      body: '<div class="form-group"><label>Title</label><input name="title" value="' + esc(p.title) + '" required></div><div class="form-group"><label>Authors</label><input name="authors" value="' + esc(p.authors) + '" required></div><div class="form-row"><div class="form-group"><label>Year</label><input name="year" type="number" value="' + p.year + '"></div><div class="form-group"><label>Rating</label><select name="rating">' + [5,4,3,2,1].map(function(r) { return '<option value="' + r + '"' + (p.rating === r ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></div></div><div class="form-group"><label>Takeaways</label><textarea name="takeaways" rows="3">' + esc(p.takeaways || '') + '</textarea></div>' + Tags.input('tags', p.tags),
      onSubmit: function(fd) { Object.assign(p, { title: fd.get('title'), authors: fd.get('authors'), year: Number(fd.get('year')), rating: Number(fd.get('rating')), takeaways: fd.get('takeaways'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); App.render(); },
      onDelete: function() { State.data.papers = State.data.papers.filter(function(x) { return x.id !== id; }); State.save(); App.render(); }
    });
  },

  // ===== CONFERENCES =====
  addConference: function() {
    Modal.open({
      title: 'Add Conference',
      body: '<div class="form-group"><label>Name</label><input name="name" required></div><div class="form-group"><label>Venue</label><input name="venue" required></div><div class="form-row"><div class="form-group"><label>Start</label><input name="startDate" type="date" required></div><div class="form-group"><label>End</label><input name="endDate" type="date" required></div></div><div class="form-group"><label>Submission Deadline</label><input name="submissionDeadline" type="date"></div><div class="form-group"><label>Status</label><select name="status"><option value="planning">Planning</option><option value="submitted">Submitted</option><option value="accepted">Accepted</option></select></div>',
      onSubmit: function(fd) { State.data.conferences.push({ id: uid(), name: fd.get('name'), venue: fd.get('venue'), startDate: fd.get('startDate'), endDate: fd.get('endDate'), submissionDeadline: fd.get('submissionDeadline'), status: fd.get('status'), paperTitle: '', tags: [] }); State.save(); App.render(); Toast.show('Added', 'success'); }
    });
  },
  editConference: function(id) {
    var c = State.data.conferences.find(function(x) { return x.id === id; });
    if (!c) return;
    Modal.open({
      title: 'Edit Conference',
      body: '<div class="form-group"><label>Name</label><input name="name" value="' + esc(c.name) + '" required></div><div class="form-group"><label>Venue</label><input name="venue" value="' + esc(c.venue) + '" required></div><div class="form-row"><div class="form-group"><label>Start</label><input name="startDate" type="date" value="' + c.startDate + '"></div><div class="form-group"><label>End</label><input name="endDate" type="date" value="' + c.endDate + '"></div></div><div class="form-group"><label>Status</label><select name="status">' + ['planning','submitted','accepted','rejected'].map(function(s) { return '<option value="' + s + '"' + (c.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>',
      onSubmit: function(fd) { Object.assign(c, { name: fd.get('name'), venue: fd.get('venue'), startDate: fd.get('startDate'), endDate: fd.get('endDate'), status: fd.get('status') }); State.save(); App.render(); },
      onDelete: function() { State.data.conferences = State.data.conferences.filter(function(x) { return x.id !== id; }); State.save(); App.render(); }
    });
  },

  // ===== FUNDING =====
  addFunding: function() {
    Modal.open({
      title: 'Add Funding',
      body: '<div class="form-group"><label>Name</label><input name="name" required></div><div class="form-row"><div class="form-group"><label>Amount</label><input name="amount"></div><div class="form-group"><label>Deadline</label><input name="deadline" type="date" required></div></div><div class="form-group"><label>Status</label><select name="status"><option value="researching">Researching</option><option value="preparing">Preparing</option><option value="submitted">Submitted</option><option value="awarded">Awarded</option></select></div>',
      onSubmit: function(fd) { State.data.funding.push({ id: uid(), name: fd.get('name'), amount: fd.get('amount'), deadline: fd.get('deadline'), status: fd.get('status'), requirements: '', tags: [] }); State.save(); App.render(); Toast.show('Added', 'success'); }
    });
  },
  editFunding: function(id) {
    var f = State.data.funding.find(function(x) { return x.id === id; });
    if (!f) return;
    Modal.open({
      title: 'Edit Funding',
      body: '<div class="form-group"><label>Name</label><input name="name" value="' + esc(f.name) + '" required></div><div class="form-row"><div class="form-group"><label>Amount</label><input name="amount" value="' + esc(f.amount || '') + '"></div><div class="form-group"><label>Deadline</label><input name="deadline" type="date" value="' + f.deadline + '"></div></div><div class="form-group"><label>Status</label><select name="status">' + ['researching','preparing','submitted','awarded','rejected'].map(function(s) { return '<option value="' + s + '"' + (f.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>',
      onSubmit: function(fd) { Object.assign(f, { name: fd.get('name'), amount: fd.get('amount'), deadline: fd.get('deadline'), status: fd.get('status') }); State.save(); App.render(); },
      onDelete: function() { State.data.funding = State.data.funding.filter(function(x) { return x.id !== id; }); State.save(); App.render(); }
    });
  },

  // ===== EMAILS =====
  addEmail: function(profName, uniName) {
    Modal.open({
      title: 'Log Email',
      body: '<div class="form-group"><label>Professor</label><input name="professor" value="' + esc(profName || '') + '" required></div><div class="form-group"><label>University</label><input name="university" value="' + esc(uniName || '') + '" required></div><div class="form-row"><div class="form-group"><label>Date Sent</label><input name="dateSent" type="date" value="' + todayISO() + '"></div><div class="form-group"><label>Follow-up</label><input name="followUpDate" type="date" value="' + addDays(7) + '"></div></div><div class="form-group"><label>Status</label><select name="status"><option value="awaiting">Awaiting</option><option value="replied">Replied</option><option value="no_response">No Response</option></select></div>',
      onSubmit: function(fd) { State.data.emails.push({ id: uid(), professor: fd.get('professor'), university: fd.get('university'), dateSent: fd.get('dateSent'), followUpDate: fd.get('followUpDate'), status: fd.get('status') }); State.save(); App.render(); Toast.show('Logged', 'success'); }
    });
  },
  editEmail: function(id) {
    var e = State.data.emails.find(function(x) { return x.id === id; });
    if (!e) return;
    Modal.open({
      title: 'Edit Email',
      body: '<div class="form-group"><label>Professor</label><input name="professor" value="' + esc(e.professor) + '" required></div><div class="form-group"><label>University</label><input name="university" value="' + esc(e.university) + '" required></div><div class="form-row"><div class="form-group"><label>Date Sent</label><input name="dateSent" type="date" value="' + e.dateSent + '"></div><div class="form-group"><label>Follow-up</label><input name="followUpDate" type="date" value="' + e.followUpDate + '"></div></div><div class="form-group"><label>Status</label><select name="status">' + ['awaiting','replied','no_response'].map(function(s) { return '<option value="' + s + '"' + (e.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>',
      onSubmit: function(fd) { Object.assign(e, { professor: fd.get('professor'), university: fd.get('university'), dateSent: fd.get('dateSent'), followUpDate: fd.get('followUpDate'), status: fd.get('status') }); State.save(); App.render(); },
      onDelete: function() { State.data.emails = State.data.emails.filter(function(x) { return x.id !== id; }); State.save(); App.render(); }
    });
  },
  openTemplates: function() {
    var body = document.getElementById('templatesBody');
    var html = '<div class="template-tabs">';
    var keys = Object.keys(EMAIL_TEMPLATES);
    keys.forEach(function(k, i) { html += '<button type="button" class="template-tab' + (i === 0 ? ' active' : '') + '" data-t="' + k + '">' + EMAIL_TEMPLATES[k].name + '</button>'; });
    html += '</div>';
    keys.forEach(function(k, i) {
      html += '<div class="template-content' + (i === 0 ? ' active' : '') + '" data-c="' + k + '"><div class="form-group"><label>Subject</label><input type="text" value="' + esc(EMAIL_TEMPLATES[k].subject) + '" readonly></div><div class="form-group"><label>Body</label><div class="template-preview">' + esc(EMAIL_TEMPLATES[k].body) + '</div></div><button type="button" class="btn btn-primary" onclick="App.copyTemplate(\'' + k + '\')">Copy</button></div>';
    });
    body.innerHTML = html;
    body.querySelectorAll('.template-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        body.querySelectorAll('.template-tab').forEach(function(t) { t.classList.remove('active'); });
        body.querySelectorAll('.template-content').forEach(function(c) { c.classList.remove('active'); });
        tab.classList.add('active');
        body.querySelector('[data-c="' + tab.dataset.t + '"]').classList.add('active');
      });
    });
    document.getElementById('templatesModal').showModal();
  },
  copyTemplate: function(key) { var t = EMAIL_TEMPLATES[key]; navigator.clipboard.writeText('Subject: ' + t.subject + '\n\n' + t.body).then(function() { Toast.show('Copied!', 'success'); }); },

  // ===== MEETINGS =====
  addMeeting: function() {
    Modal.open({
      title: 'Schedule Meeting',
      body: '<div class="form-group"><label>Title</label><input name="title" required></div><div class="form-group"><label>With</label><input name="with" required></div><div class="form-group"><label>Date & Time</label><input name="date" type="datetime-local" required></div><div class="form-group"><label>Agenda</label><textarea name="agenda" rows="2"></textarea></div><div class="form-group"><label>Notes</label><textarea name="notes" rows="3"></textarea></div>',
      onSubmit: function(fd) { State.data.meetings.push({ id: uid(), title: fd.get('title'), with: fd.get('with'), date: fd.get('date'), agenda: fd.get('agenda'), notes: fd.get('notes') }); State.save(); App.render(); Toast.show('Scheduled', 'success'); }
    });
  },
  editMeeting: function(id) {
    var m = State.data.meetings.find(function(x) { return x.id === id; });
    if (!m) return;
    Modal.open({
      title: 'Edit Meeting',
      body: '<div class="form-group"><label>Title</label><input name="title" value="' + esc(m.title) + '" required></div><div class="form-group"><label>With</label><input name="with" value="' + esc(m.with) + '" required></div><div class="form-group"><label>Date & Time</label><input name="date" type="datetime-local" value="' + m.date + '" required></div><div class="form-group"><label>Agenda</label><textarea name="agenda" rows="2">' + esc(m.agenda || '') + '</textarea></div><div class="form-group"><label>Notes</label><textarea name="notes" rows="3">' + esc(m.notes || '') + '</textarea></div>',
      onSubmit: function(fd) {
        var newNotes = fd.get('notes'); var oldNotes = m.notes || '';
        Object.assign(m, { title: fd.get('title'), with: fd.get('with'), date: fd.get('date'), agenda: fd.get('agenda'), notes: newNotes });
        if (newNotes && newNotes !== oldNotes) {
          var fresh = parseNotesToTasks(newNotes, m.title).filter(function(t) { return !State.data.tasks.some(function(x) { return x.title === t.title; }); });
          if (fresh.length > 0) { State.data.tasks.push.apply(State.data.tasks, fresh); Toast.show(fresh.length + ' tasks created', 'success'); }
        }
        State.save(); App.render();
      },
      onDelete: function() { State.data.meetings = State.data.meetings.filter(function(x) { return x.id !== id; }); State.save(); App.render(); }
    });
  },

  // ===== TASKS =====
  addTask: function() {
    Modal.open({
      title: 'Add Task',
      body: '<div class="form-group"><label>Task</label><input name="title" required></div><div class="form-group"><label>Deadline</label><input name="deadline" type="date" value="' + addDays(7) + '"></div><div class="form-row"><div class="form-group"><label><input type="checkbox" name="importance" checked> Important</label></div><div class="form-group"><label><input type="checkbox" name="urgency"> Urgent</label></div></div>' + Tags.input(),
      onSubmit: function(fd) { State.data.tasks.push({ id: uid(), title: fd.get('title'), deadline: fd.get('deadline'), done: false, source: 'Manual', priority: 'medium', importance: fd.has('importance'), urgency: fd.has('urgency'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); App.render(); Toast.show('Added', 'success'); }
    });
  },
  editTask: function(id) {
    var t = State.data.tasks.find(function(x) { return x.id === id; });
    if (!t) return;
    Modal.open({
      title: 'Edit Task',
      body: '<div class="form-group"><label>Task</label><input name="title" value="' + esc(t.title) + '" required></div><div class="form-group"><label>Deadline</label><input name="deadline" type="date" value="' + (t.deadline || '') + '"></div><div class="form-row"><div class="form-group"><label><input type="checkbox" name="importance"' + (t.importance ? ' checked' : '') + '> Important</label></div><div class="form-group"><label><input type="checkbox" name="urgency"' + (t.urgency ? ' checked' : '') + '> Urgent</label></div></div>' + Tags.input('tags', t.tags),
      onSubmit: function(fd) { Object.assign(t, { title: fd.get('title'), deadline: fd.get('deadline'), importance: fd.has('importance'), urgency: fd.has('urgency'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); App.render(); },
      onDelete: function() { State.data.tasks = State.data.tasks.filter(function(x) { return x.id !== id; }); State.save(); App.render(); }
    });
  },
  toggleTask: function(id) { var t = State.data.tasks.find(function(x) { return x.id === id; }); if (t) { t.done = !t.done; State.save(); App.render(); if (t.done) { Toast.show('Done!', 'success'); Confetti.burst(); } } },

  // ===== STUDY =====
  addStudy: function() {
    Modal.open({
      title: 'Add Study',
      body: '<div class="form-group"><label>Topic</label><input name="topic" required></div><div class="form-row"><div class="form-group"><label>Duration (min)</label><input name="duration" type="number" min="5" value="60" required></div><div class="form-group"><label>Date</label><input name="date" type="date" value="' + todayISO() + '" required></div></div>' + Tags.input(),
      onSubmit: function(fd) { State.data.study.push({ id: uid(), topic: fd.get('topic'), duration: Number(fd.get('duration')), date: fd.get('date'), done: false, pomodoros: 0, tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); App.render(); State.updateStreak(); Toast.show('Added', 'success'); }
    });
  },
  editStudy: function(id) {
    var s = State.data.study.find(function(x) { return x.id === id; });
    if (!s) return;
    Modal.open({
      title: 'Edit Study',
      body: '<div class="form-group"><label>Topic</label><input name="topic" value="' + esc(s.topic) + '" required></div><div class="form-row"><div class="form-group"><label>Duration</label><input name="duration" type="number" min="5" value="' + s.duration + '" required></div><div class="form-group"><label>Date</label><input name="date" type="date" value="' + s.date + '" required></div></div>',
      onSubmit: function(fd) { Object.assign(s, { topic: fd.get('topic'), duration: Number(fd.get('duration')), date: fd.get('date') }); State.save(); App.render(); },
      onDelete: function() { State.data.study = State.data.study.filter(function(x) { return x.id !== id; }); State.save(); App.render(); }
    });
  },
  toggleStudy: function(id) { var s = State.data.study.find(function(x) { return x.id === id; }); if (s) { s.done = !s.done; State.save(); State.updateStreak(); App.render(); if (s.done) Confetti.burst(); } },

  // ===== JOURNAL =====
  addJournal: function() {
    Modal.open({
      title: 'New Journal Entry',
      body: '<div class="form-group"><label>Date</label><input name="date" type="date" value="' + todayISO() + '" required></div><div class="form-group"><label>What did you learn?</label><textarea name="learned" rows="2"></textarea></div><div class="form-group"><label>What is blocking you?</label><textarea name="blocking" rows="2"></textarea></div><div class="form-group"><label>Priority for next week?</label><textarea name="priority" rows="2"></textarea></div><div class="form-group"><label>Full Reflection</label><textarea name="content" rows="4"></textarea></div>',
      onSubmit: function(fd) { State.data.journal.push({ id: uid(), date: fd.get('date'), content: fd.get('content'), prompts: { learned: fd.get('learned'), blocking: fd.get('blocking'), priority: fd.get('priority') } }); State.save(); App.render(); Toast.show('Saved!', 'success'); Confetti.burst(); }
    });
  },
  editJournal: function(id) {
    var e = State.data.journal.find(function(x) { return x.id === id; });
    if (!e) return;
    Modal.open({
      title: 'Edit Journal',
      body: '<div class="form-group"><label>Date</label><input name="date" type="date" value="' + e.date + '" required></div><div class="form-group"><label>Learned</label><textarea name="learned" rows="2">' + esc(e.prompts ? e.prompts.learned || '' : '') + '</textarea></div><div class="form-group"><label>Blocking</label><textarea name="blocking" rows="2">' + esc(e.prompts ? e.prompts.blocking || '' : '') + '</textarea></div><div class="form-group"><label>Priority</label><textarea name="priority" rows="2">' + esc(e.prompts ? e.prompts.priority || '' : '') + '</textarea></div><div class="form-group"><label>Reflection</label><textarea name="content" rows="4">' + esc(e.content) + '</textarea></div>',
      onSubmit: function(fd) { Object.assign(e, { date: fd.get('date'), content: fd.get('content'), prompts: { learned: fd.get('learned'), blocking: fd.get('blocking'), priority: fd.get('priority') } }); State.save(); App.render(); },
      onDelete: function() { State.data.journal = State.data.journal.filter(function(x) { return x.id !== id; }); State.save(); App.render(); }
    });
  },
  deleteJournal: function(id) { State.data.journal = State.data.journal.filter(function(x) { return x.id !== id; }); State.save(); App.render(); },

  // ===== GOALS =====
  addGoal: function() {
    Modal.open({
      title: 'Add Goal',
      body: '<div class="form-group"><label>Goal</label><input name="title" required></div><div class="form-group"><label>Deadline</label><input name="deadline" type="date" required></div>' + Tags.input(),
      onSubmit: function(fd) { State.data.goals.push({ id: uid(), title: fd.get('title'), deadline: fd.get('deadline'), done: false, priority: 'medium', tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); App.render(); Toast.show('Added', 'success'); }
    });
  },
  editGoal: function(id) {
    var g = State.data.goals.find(function(x) { return x.id === id; });
    if (!g) return;
    Modal.open({
      title: 'Edit Goal',
      body: '<div class="form-group"><label>Goal</label><input name="title" value="' + esc(g.title) + '" required></div><div class="form-group"><label>Deadline</label><input name="deadline" type="date" value="' + g.deadline + '" required></div>' + Tags.input('tags', g.tags),
      onSubmit: function(fd) { Object.assign(g, { title: fd.get('title'), deadline: fd.get('deadline'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); App.render(); },
      onDelete: function() { State.data.goals = State.data.goals.filter(function(x) { return x.id !== id; }); State.save(); App.render(); }
    });
  },
  toggleGoal: function(id) { var g = State.data.goals.find(function(x) { return x.id === id; }); if (g) { g.done = !g.done; State.save(); App.render(); if (g.done) { Toast.show('Goal achieved!', 'success'); Confetti.burst(); } } },

  // ===== INBOX =====
  convertInbox: function(id, type) {
    var item = State.data.inbox.find(function(i) { return i.id === id; });
    if (!item) return;
    if (type === 'task') State.data.tasks.push({ id: uid(), title: item.content, deadline: addDays(7), done: false, source: 'Inbox', priority: 'medium', importance: true, urgency: false, tags: [] });
    else if (type === 'study') State.data.study.push({ id: uid(), topic: item.content, duration: 60, date: todayISO(), done: false, pomodoros: 0, tags: [] });
    State.data.inbox = State.data.inbox.filter(function(i) { return i.id !== id; });
    State.save(); this.updateInboxBadge(); this.render(); Toast.show('Converted', 'success');
  },
  deleteInbox: function(id) { State.data.inbox = State.data.inbox.filter(function(i) { return i.id !== id; }); State.save(); this.updateInboxBadge(); this.render(); }
};

// ========== BOOT ==========
document.addEventListener('DOMContentLoaded', function() { App.init(); });