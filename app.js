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

// ========== STATE ==========
const defaultState = {
  applications: [], emails: [], meetings: [], study: [], goals: [], tasks: [],
  professors: [], funding: [], inbox: [], papers: [], conferences: [], journal: [],
  notifications: [], tags: [],
  settings: { theme: 'system', remindersEnabled: false, streak: { current: 0, longest: 0, lastStudyDate: null } }
};

const State = {
  data: structuredClone(defaultState),
  currentView: 'dashboard',
  calendarDate: new Date(),
  activeTagFilter: null,

  init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.data = { ...structuredClone(defaultState), ...parsed };
        ['tasks','professors','funding','inbox','papers','conferences','journal','notifications','tags'].forEach(k => {
          if (!Array.isArray(this.data[k])) this.data[k] = [];
        });
        if (!this.data.settings.streak) this.data.settings.streak = { current: 0, longest: 0, lastStudyDate: null };
      } catch { this.loadTemplate(); }
    } else {
      this.loadTemplate();
    }
    this.updateStreak();
  },

  loadTemplate() {
    this.data = {
      applications: [
        { id: uid(), university: 'ETH Zurich', program: 'PhD in Computer Science', deadline: '2026-12-15', status: 'preparing', notes: 'Prof. Smith lab', documents: DEFAULT_DOCS.map(d => ({ name: d, done: false })), tags: ['target'] },
        { id: uid(), university: 'MIT', program: 'PhD in EECS', deadline: '2026-12-01', status: 'target', notes: '', documents: DEFAULT_DOCS.map(d => ({ name: d, done: false })), tags: ['dream'] }
      ],
      emails: [{ id: uid(), professor: 'Dr. Jane Smith', university: 'ETH Zurich', dateSent: todayISO(), status: 'awaiting', followUpDate: addDays(7) }],
      meetings: [{ id: uid(), title: 'Advisor Meeting', date: addDays(2) + 'T14:00', with: 'Prof. Johnson', agenda: 'Discuss research proposal', notes: '- Draft summary\n- Email Prof. X' }],
      study: [
        { id: uid(), topic: 'Read paper: Attention Is All You Need', duration: 60, date: todayISO(), done: false, pomodoros: 0, tags: ['transformers'] },
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
      professors: [
        { id: uid(), name: 'Dr. Jane Smith', university: 'ETH Zurich', lab: 'AI Lab', researchArea: 'Medical Imaging', papersRead: 2, status: 'contacted', notes: 'Very responsive.', tags: ['medical-ai'] }
      ],
      funding: [{ id: uid(), name: 'ETH Excellence Scholarship', amount: 'CHF 12,000/year', deadline: '2026-11-30', status: 'preparing', requirements: 'Research proposal', tags: ['scholarship'] }],
      inbox: [{ id: uid(), content: 'Check out Mamba architecture paper', tag: 'paper', date: todayISO() }],
      papers: [
        { id: uid(), title: 'Attention Is All You Need', authors: 'Vaswani et al.', year: 2017, venue: 'NeurIPS', rating: 5, status: 'finished', takeaways: 'Introduced transformer architecture\nSelf-attention mechanism\nFoundation for modern NLP', url: '', tags: ['transformers', 'foundational'] }
      ],
      conferences: [
        { id: uid(), name: 'NeurIPS 2026', venue: 'Vancouver, Canada', startDate: '2026-12-05', endDate: '2026-12-10', submissionDeadline: '2026-05-15', status: 'planning', paperTitle: '', tags: ['ai'] }
      ],
      journal: [
        { id: uid(), date: addDays(-7), content: 'This week I focused on understanding transformer architectures. Key insight: self-attention allows the model to weigh the importance of different parts of the input dynamically.', prompts: { learned: 'Transformer self-attention mechanism', blocking: 'Need more math background', priority: 'Finish paper reading' }
      ],
      notifications: [],
      tags: ['target', 'dream', 'transformers', 'ielts', 'study', 'planning', 'lor', 'cv', 'reading', 'medical-ai', 'scholarship', 'ai', 'foundational'],
      settings: { theme: 'system', remindersEnabled: false, streak: { current: 0, longest: 0, lastStudyDate: null } }
    };
    this.save();
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    this.emit();
  },

  subscribe(fn) {},
  emit() {},

  updateStreak() {
    const today = todayISO();
    const yesterday = addDays(-1);
    const streak = this.data.settings.streak;
    const studiedToday = this.data.study.some(s => s.date === today && s.done);
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

  addNotification(title, body, type = 'info') {
    this.data.notifications.unshift({
      id: uid(), title, body, type, date: new Date().toISOString(), read: false
    });
    this.data.notifications = this.data.notifications.slice(0, 50);
    this.save();
  }
};

// ========== UTILITIES ==========
const uid = () => crypto.randomUUID();
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = d => d ? new Date(d + (d.length === 10 ? 'T00:00' : '')).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const daysUntil = d => {
  if (!d) return null;
  const target = new Date(d + (d.length === 10 ? 'T00:00' : '')).getTime();
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((target - now.getTime()) / 86400000);
};
const minutesUntil = (dt) => dt ? Math.round((new Date(dt).getTime() - Date.now()) / 60000) : null;

const parseNotesToTasks = (notes, meetingTitle) => {
  if (!notes) return [];
  return notes.split('\n').map(l => l.trim().replace(/^[-*•]\s*/, '').replace(/^\[\s*\]\s*/, '')).filter(Boolean).map(t => ({
    id: uid(), title: t, deadline: addDays(7), done: false, source: `Meeting: ${meetingTitle}`, priority: 'medium', importance: true, urgency: false, tags: []
  }));
};

// ========== SERVICES ==========
const Notifier = {
  async requestPermission() {
    if (!('Notification' in window)) { Toast.show('Notifications not supported', 'warning'); return false; }
    const perm = await Notification.requestPermission();
    State.data.settings.remindersEnabled = perm === 'granted';
    State.save();
    return perm === 'granted';
  },
  send(title, body) {
    if (State.data.settings.remindersEnabled && Notification.permission === 'granted') new Notification(title, { body });
    State.addNotification(title, body);
    App.renderNotifCenter();
  },
  showBanner(title, meta) {
    document.getElementById('reminderTitle').textContent = title;
    document.getElementById('reminderMeta').textContent = meta;
    document.getElementById('reminderBanner').classList.remove('hidden');
  },
  hideBanner() { document.getElementById('reminderBanner').classList.add('hidden'); },
  startChecker() { this.check(); setInterval(() => this.check(), 60000); },
  check() {
    const now = Date.now();
    const upcomingMeeting = State.data.meetings.find(m => { const diff = new Date(m.date).getTime() - now; return diff > 0 && diff <= 15 * 60 * 1000; });
    if (upcomingMeeting) {
      this.showBanner(`Meeting in ${minutesUntil(upcomingMeeting.date)} min`, `${upcomingMeeting.title} with ${upcomingMeeting.with}`);
      this.send('Meeting Soon', `${upcomingMeeting.title} in ${minutesUntil(upcomingMeeting.date)} minutes`);
      return;
    }
    const urgentApp = State.data.applications.find(a => { const d = daysUntil(a.deadline); return d !== null && d >= 0 && d <= 7 && !['submitted','accepted','rejected'].includes(a.status); });
    if (urgentApp) this.showBanner(`Application due in ${daysUntil(urgentApp.deadline)} days`, urgentApp.university);
  }
};

const Toast = {
  show(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(120%)'; setTimeout(() => toast.remove(), 300); }, 3000);
  }
};

const Modal = {
  open({ title, body, onSubmit, onDelete }) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;
    const form = document.getElementById('modalForm');
    const deleteBtn = document.getElementById('modalDelete');
    form.onsubmit = (e) => { e.preventDefault(); onSubmit(new FormData(form)); this.close(); };
    if (onDelete) { deleteBtn.classList.remove('hidden'); deleteBtn.onclick = () => { onDelete(); this.close(); }; }
    else deleteBtn.classList.add('hidden');
    document.getElementById('modal').showModal();
  },
  close() { document.getElementById('modal').close(); }
};

const Pomodoro = {
  secondsLeft: POMODORO_WORK, totalSeconds: POMODORO_WORK, isRunning: false, isBreak: false, studyId: null, intervalId: null,
  start(studyId) {
    const study = State.data.study.find(s => s.id === studyId);
    if (!study) return;
    this.studyId = studyId; this.secondsLeft = POMODORO_WORK; this.totalSeconds = POMODORO_WORK;
    this.isBreak = false; this.isRunning = true;
    document.getElementById('pomodoroStudyTitle').textContent = study.topic;
    document.getElementById('pomodoroWidget').classList.remove('hidden');
    this.updateDisplay(); this.tick();
  },
  tick() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      if (!this.isRunning) return;
      this.secondsLeft--;
      this.updateDisplay();
      if (this.secondsLeft <= 0) this.complete();
    }, 1000);
  },
  complete() {
    if (!this.isBreak) {
      const study = State.data.study.find(s => s.id === this.studyId);
      if (study) { study.pomodoros = (study.pomodoros || 0) + 1; State.save(); State.updateStreak(); }
      Notifier.send('🍅 Pomodoro Complete!', 'Time for a break.');
      Toast.show('🍅 Pomodoro complete!', 'success');
      this.isBreak = true; this.secondsLeft = POMODORO_BREAK; this.totalSeconds = POMODORO_BREAK;
      document.getElementById('pomodoroStudyTitle').textContent = 'Break time ☕';
    } else {
      Notifier.send('Break over!', 'Ready for another pomodoro?');
      Toast.show('Break over!', 'info');
      this.isBreak = false; this.secondsLeft = POMODORO_WORK; this.totalSeconds = POMODORO_WORK;
      const study = State.data.study.find(s => s.id === this.studyId);
      if (study) document.getElementById('pomodoroStudyTitle').textContent = study.topic;
      this.isRunning = false;
      document.getElementById('pomodoroPlay').textContent = '▶ Start';
    }
    this.updateDisplay();
  },
  toggle() {
    this.isRunning = !this.isRunning;
    document.getElementById('pomodoroPlay').textContent = this.isRunning ? '⏸ Pause' : '▶ Resume';
    if (this.isRunning) this.tick();
  },
  reset() {
    this.isRunning = false; this.isBreak = false;
    this.secondsLeft = POMODORO_WORK; this.totalSeconds = POMODORO_WORK;
    document.getElementById('pomodoroPlay').textContent = '▶ Start';
    this.updateDisplay();
  },
  close() {
    this.isRunning = false;
    if (this.intervalId) clearInterval(this.intervalId);
    document.getElementById('pomodoroWidget').classList.add('hidden');
  },
  updateDisplay() {
    const mins = Math.floor(this.secondsLeft / 60);
    const secs = this.secondsLeft % 60;
    document.getElementById('pomodoroTime').textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    const progress = this.secondsLeft / this.totalSeconds;
    const circumference = 2 * Math.PI * 45;
    document.getElementById('pomodoroRing').style.strokeDashoffset = circumference * (1 - progress);
    const study = State.data.study.find(s => s.id === this.studyId);
    document.getElementById('pomodoroCount').textContent = study?.pomodoros || 0;
  }
};

// ========== CONFETTI ==========
const Confetti = {
  canvas: null, ctx: null, particles: [],
  init() {
    this.canvas = document.getElementById('confettiCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },
  burst() {
    const colors = ['#667eea', '#764ba2', '#f59e0b', '#10b981', '#ef4444', '#4f46e5'];
    for (let i = 0; i < 100; i++) {
      this.particles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.8) * 15,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        life: 1
      });
    }
    if (!this.animating) this.animate();
  },
  animate() {
    this.animating = true;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.rotation += p.rotationSpeed;
      p.life -= 0.01;
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation * Math.PI / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
      this.ctx.restore();
    });
    this.particles = this.particles.filter(p => p.life > 0);
    if (this.particles.length > 0) requestAnimationFrame(() => this.animate());
    else { this.animating = false; this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
  }
};

// ========== TAGS SYSTEM ==========
const Tags = {
  render(tags = [], onClick = null) {
    if (!tags || tags.length === 0) return '';
    return `<div class="tags-container">${tags.map(t => `<span class="tag" ${onClick ? `onclick="${onClick}('${esc(t)}')"` : ''}>#${esc(t)}</span>`).join('')}</div>`;
  },
  input(name = 'tags', value = []) {
    return `<div class="form-group"><label>Tags (comma-separated)</label><input name="${name}" value="${esc(value.join(', '))}" placeholder="urgent, paper, eth-zurich"></div>`;
  },
  parse(str) {
    if (!str) return [];
    return str.split(',').map(t => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean);
  },
  getAll() {
    const all = new Set(State.data.tags || []);
    ['applications','emails','meetings','study','goals','tasks','professors','funding','papers','conferences'].forEach(collection => {
      (State.data[collection] || []).forEach(item => {
        (item.tags || []).forEach(t => all.add(t));
      });
    });
    return Array.from(all).sort();
  },
  sync() {
    State.data.tags = this.getAll();
    State.save();
  }
};

// ========== COMMAND PALETTE ==========
const CommandPalette = {
  isOpen: false, selectedIndex: 0, items: [],
  open() {
    this.isOpen = true;
    document.getElementById('commandPalette').showModal();
    document.getElementById('commandInput').focus();
    this.selectedIndex = 0;
    this.render('');
  },
  close() {
    this.isOpen = false;
    document.getElementById('commandPalette').close();
    document.getElementById('commandInput').value = '';
  },
  render(query) {
    const results = document.getElementById('commandResults');
    this.items = this.buildItems();
    const filtered = query ? this.fuzzySearch(this.items, query) : this.items.slice(0, 20);
    if (filtered.length === 0) {
      results.innerHTML = '<div class="command-empty">No results found</div>';
      return;
    }
    const groups = {};
    filtered.forEach((item, index) => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push({ ...item, index });
    });
    let html = '';
    Object.entries(groups).forEach(([group, items]) => {
      html += `<div class="command-group"><div class="command-group-title">${group}</div>`;
      items.forEach(item => {
        const isSelected = item.index === this.selectedIndex;
        html += `<div class="command-item ${isSelected ? 'selected' : ''}" data-index="${item.index}" onclick="CommandPalette.execute(${item.index})"><div class="command-item-icon">${item.icon}</div><div class="command-item-content"><div class="command-item-title">${item.title}</div>${item.meta ? `<div class="command-item-meta">${item.meta}</div>` : ''}</div>${item.shortcut ? `<div class="command-item-shortcut">${item.shortcut}</div>` : ''}</div>`;
      });
      html += `</div>`;
    });
    results.innerHTML = html;
  },
  buildItems() {
    const items = [];
    items.push(
      { group: 'Quick Actions', icon: '✚', title: 'New Task', action: () => App.addTask() },
      { group: 'Quick Actions', icon: '📧', title: 'Log Email', action: () => App.addEmail() },
      { group: 'Quick Actions', icon: '🤝', title: 'Schedule Meeting', action: () => App.addMeeting() },
      { group: 'Quick Actions', icon: '📚', title: 'Add Study Block', action: () => App.addStudy() },
      { group: 'Quick Actions', icon: '📄', title: 'Add Paper', action: () => App.addPaper() },
      { group: 'Quick Actions', icon: '🎤', title: 'Add Conference', action: () => App.addConference() },
      { group: 'Quick Actions', icon: '🎯', title: 'Add Goal', action: () => App.addGoal() },
      { group: 'Quick Actions', icon: '🎓', title: 'Add Application', action: () => App.addApplication() },
      { group: 'Quick Actions', icon: '📓', title: 'Write Journal Entry', action: () => App.addJournal() }
    );
    ['dashboard','calendar','applications','professors','papers','conferences','funding','emails','meetings','tasks','matrix','study','journal','goals','inbox'].forEach(v => {
      const icons = { dashboard:'📊', calendar:'📅', applications:'🎓', professors:'🔬', papers:'📄', conferences:'🎤', funding:'💰', emails:'📧', meetings:'🤝', tasks:'✅', matrix:'🎯', study:'📚', journal:'📓', goals:'🎯', inbox:'📥' };
      items.push({ group: 'Navigation', icon: icons[v], title: v.charAt(0).toUpperCase() + v.slice(1), action: () => App.switchView(v) });
    });
    State.data.tasks.forEach(t => items.push({ group: 'Tasks', icon: '✅', title: t.title, meta: t.deadline ? `Due ${fmtDate(t.deadline)}` : '', action: () => { App.switchView('tasks'); } }));
    State.data.applications.forEach(a => items.push({ group: 'Applications', icon: '🎓', title: a.university, meta: a.program, action: () => { App.switchView('applications'); } }));
    State.data.professors.forEach(p => items.push({ group: 'Professors', icon: '🔬', title: p.name, meta: p.university, action: () => { App.switchView('professors'); } }));
    State.data.papers.forEach(p => items.push({ group: 'Papers', icon: '📄', title: p.title, meta: p.authors, action: () => { App.switchView('papers'); } }));
    items.push(
      { group: 'System', icon: '💾', title: 'Export Backup', action: () => document.getElementById('exportBtn').click() },
      { group: 'System', icon: '📤', title: 'Share Progress', action: () => App.openShareCard() },
      { group: 'System', icon: '🌙', title: 'Toggle Theme', action: () => document.getElementById('themeToggle').click() }
    );
    return items;
  },
  fuzzySearch(items, query) {
    const q = query.toLowerCase();
    return items.map(item => {
      const titleMatch = item.title.toLowerCase().includes(q);
      const metaMatch = item.meta?.toLowerCase().includes(q);
      const score = titleMatch ? 2 : metaMatch ? 1 : 0;
      return { ...item, score };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 30);
  },
  execute(index) {
    const item = this.items[index];
    if (!item) return;
    this.close();
    setTimeout(() => item.action(), 100);
  },
  navigate(direction) {
    this.selectedIndex += direction;
    if (this.selectedIndex < 0) this.selectedIndex = this.items.length - 1;
    if (this.selectedIndex >= this.items.length) this.selectedIndex = 0;
    document.querySelectorAll('.command-item').forEach((el, i) => {
      el.classList.toggle('selected', parseInt(el.dataset.index) === this.selectedIndex);
    });
    const selected = document.querySelector('.command-item.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }
};

// ========== VIEWS ==========
const Views = {
  dashboard() {
    const apps = State.data.applications;
    const submitted = apps.filter(a => ['submitted','interview','accepted'].includes(a.status)).length;
    const awaitingReply = State.data.emails.filter(e => e.status === 'awaiting').length;
    const tasksPending = State.data.tasks.filter(t => !t.done).length;
    const streak = State.data.settings.streak;

    const allEvents = [
      ...State.data.meetings.map(m => ({ type: 'meeting', title: m.title, date: m.date, meta: `with ${m.with}` })),
      ...State.data.goals.filter(g => !g.done).map(g => ({ type: 'goal', title: g.title, date: g.deadline + 'T23:59', meta: 'Goal' })),
      ...apps.filter(a => !['submitted','accepted','rejected'].includes(a.status)).map(a => ({ type: 'application', title: a.university, date: a.deadline + 'T23:59', meta: a.program })),
      ...State.data.tasks.filter(t => !t.done && t.deadline).map(t => ({ type: 'task', title: t.title, date: t.deadline + 'T23:59', meta: 'Task' })),
      ...State.data.funding.filter(f => !['awarded','rejected'].includes(f.status)).map(f => ({ type: 'funding', title: f.name, date: f.deadline + 'T23:59', meta: f.amount })),
      ...State.data.conferences.filter(c => !['completed','cancelled'].includes(c.status)).map(c => ({ type: 'conference', title: c.name, date: c.submissionDeadline + 'T23:59', meta: c.venue }))
    ].filter(e => new Date(e.date).getTime() > Date.now()).sort((a, b) => new Date(a.date) - new Date(b.date));

    const next = allEvents[0];

    // Weekly review
    const weekAgo = addDays(-7);
    const weekStudy = State.data.study.filter(s => s.date >= weekAgo && s.done);
    const weekMins = weekStudy.reduce((sum, s) => sum + s.duration, 0);
    const weekTasksDone = State.data.tasks.filter(t => t.done).length;

    // Time allocation
    const timeAllocation = this.calcTimeAllocation();

    // Predictions
    const predictions = this.calcPredictions();

    return `
      ${streak.current > 0 ? `<div class="streak-card"><div class="streak-fire">🔥</div><div class="streak-info"><strong>${streak.current} day${streak.current !== 1 ? 's' : ''} streak</strong><small>Longest: ${streak.longest} days</small></div></div>` : ''}
      ${next ? `<div class="upnext-card"><h3>⏰ Up Next</h3><div class="upnext-title">${esc(next.title)}</div><div class="upnext-meta">${esc(next.meta)} • ${fmtDate(next.date.slice(0, 10))}</div><span class="countdown">${this.countdown(next.date)}</span></div>` : ''}
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon">🎓</div><div><div class="stat-value">${submitted}/${apps.length}</div><div class="stat-label">Applications</div></div></div>
        <div class="stat-card"><div class="stat-icon warning">📧</div><div><div class="stat-value">${awaitingReply}</div><div class="stat-label">Awaiting Reply</div></div></div>
        <div class="stat-card"><div class="stat-icon success">📄</div><div><div class="stat-value">${State.data.papers.length}</div><div class="stat-label">Papers Read</div></div></div>
        <div class="stat-card"><div class="stat-icon">✅</div><div><div class="stat-value">${tasksPending}</div><div class="stat-label">Open Tasks</div></div></div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-head"><div><h3>Upcoming Deadlines</h3><small>All time-bound items</small></div></div>
          <div class="list">
            ${allEvents.slice(0, 6).map(e => `<div class="list-item"><div style="font-size:20px">${{meeting:'🤝',goal:'🎯',task:'✅',application:'🎓',funding:'💰',conference:'🎤'}[e.type]}</div><div class="list-item-content"><div class="list-item-title">${esc(e.title)}</div><div class="list-item-meta">${esc(e.meta)} • ${fmtDate(e.date.slice(0, 10))}</div></div><span class="badge ${daysUntil(e.date.slice(0, 10)) <= 3 ? 'danger' : daysUntil(e.date.slice(0, 10)) <= 7 ? 'warning' : 'primary'}">${daysUntil(e.date.slice(0, 10))}d</span></div>`).join('') || '<div class="empty"><span class="empty-illustration">✨</span><div class="empty-title">All clear!</div><div class="empty-subtitle">No upcoming deadlines</div></div>'}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><div><h3>Today's Study</h3><small>${fmtDate(todayISO())}</small></div><button class="btn btn-sm btn-ghost" onclick="App.switchView('study')">View all</button></div>
          <div class="list">
            ${State.data.study.filter(s => s.date === todayISO()).map(s => `<div class="list-item"><input type="checkbox" ${s.done ? 'checked' : ''} onchange="App.toggleStudy('${s.id}')"><div class="list-item-content"><div class="list-item-title" style="${s.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${esc(s.topic)}</div><div class="list-item-meta">${s.duration} min • 🍅 ${s.pomodoros || 0}</div>${Tags.render(s.tags)}</div>${!s.done ? `<button class="pomodoro-start" onclick="Pomodoro.start('${s.id}')">🍅 Focus</button>` : ''}</div>`).join('') || '<div class="empty"><span class="empty-illustration">📚</span><div class="empty-title">No study planned</div><div class="empty-subtitle">Add a study block to get started</div></div>'}
          </div>
        </div>
      </div>
      ${this.renderHeatmap()}
      <div class="charts-grid">
        ${this.renderPieChart(timeAllocation)}
        <div class="chart-card">
          <h3>📚 Study Hours (Last 7 Days)</h3>
          <small>Minutes per day</small>
          ${this.renderStudyChart()}
        </div>
      </div>
      ${this.renderPredictions(predictions)}
    `;
  },

  calcTimeAllocation() {
    const weekAgo = addDays(-7);
    const studyMins = State.data.study.filter(s => s.date >= weekAgo && s.done).reduce((sum, s) => sum + s.duration, 0);
    const meetingCount = State.data.meetings.filter(m => m.date >= weekAgo).length * 60;
    const emailCount = State.data.emails.filter(e => e.dateSent >= weekAgo).length * 15;
    const appCount = State.data.applications.filter(a => a.status === 'preparing').length * 120;
    const total = studyMins + meetingCount + emailCount + appCount || 1;
    return [
      { label: 'Study', value: studyMins, color: '#4f46e5', pct: Math.round(studyMins / total * 100) },
      { label: 'Meetings', value: meetingCount, color: '#10b981', pct: Math.round(meetingCount / total * 100) },
      { label: 'Emails', value: emailCount, color: '#f59e0b', pct: Math.round(emailCount / total * 100) },
      { label: 'Applications', value: appCount, color: '#ef4444', pct: Math.round(appCount / total * 100) }
    ];
  },

  calcPredictions() {
    const apps = State.data.applications;
    const activeApps = apps.filter(a => !['submitted','accepted','rejected'].includes(a.status)).length;
    const submittedApps = apps.filter(a => ['submitted','interview','accepted'].includes(a.status)).length;
    const studyWeek = State.data.study.filter(s => s.date >= addDays(-7) && s.done).reduce((sum, s) => sum + s.duration, 0);
    const avgStudyPerDay = studyWeek / 7;
    
    return [
      { icon: '🎓', text: `At current pace, you'll submit <strong>${Math.min(submittedApps + Math.round(activeApps * 0.6), apps.length)} applications</strong> this cycle` },
      { icon: '📚', text: `Studying <strong>${Math.round(avgStudyPerDay)} min/day</strong> — ${avgStudyPerDay >= 60 ? 'great pace!' : 'try to increase to 60+ min'}` },
      { icon: '🔥', text: `<strong>${State.data.settings.streak.current} day streak</strong> — keep it going!` },
      { icon: '📧', text: `<strong>${State.data.emails.filter(e => e.status === 'awaiting').length} emails</strong> awaiting follow-up` }
    ];
  },

  renderHeatmap() {
    const today = new Date();
    const cells = [];
    const dateMap = {};
    
    State.data.study.filter(s => s.done).forEach(s => {
      if (!dateMap[s.date]) dateMap[s.date] = 0;
      dateMap[s.date] += s.duration;
    });

    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const mins = dateMap[iso] || 0;
      let level = 0;
      if (mins > 0) level = 1;
      if (mins >= 60) level = 2;
      if (mins >= 120) level = 3;
      if (mins >= 240) level = 4;
      cells.push(`<div class="heatmap-cell level-${level}" data-tooltip="${fmtDate(iso)}: ${mins} min" onclick="App.showDayDetail('${iso}')"></div>`);
    }

    const totalHours = Object.values(dateMap).reduce((a, b) => a + b, 0) / 60;
    const activeDays = Object.keys(dateMap).length;

    return `
      <div class="heatmap-card">
        <div class="heatmap-head">
          <div>
            <h3>🟩 Study Activity</h3>
            <small style="font-size:11px;color:var(--text-muted)">${activeDays} active days in the last year</small>
          </div>
          <div class="heatmap-stats">
            <span><strong>${Math.round(totalHours)}h</strong> total</span>
            <span><strong>${State.data.settings.streak.current}</strong> current streak</span>
            <span><strong>${State.data.settings.streak.longest}</strong> longest</span>
          </div>
        </div>
        <div class="heatmap-wrapper">
          <div class="heatmap">${cells.join('')}</div>
        </div>
        <div class="heatmap-legend">
          <span>Less</span>
          <div class="heatmap-legend-cell" style="background:var(--bg-muted)"></div>
          <div class="heatmap-legend-cell" style="background:#9be9a8"></div>
          <div class="heatmap-legend-cell" style="background:#40c463"></div>
          <div class="heatmap-legend-cell" style="background:#30a14e"></div>
          <div class="heatmap-legend-cell" style="background:#216e39"></div>
          <span>More</span>
        </div>
      </div>
    `;
  },

  renderPieChart(data) {
    const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
    let cumulative = 0;
    const paths = data.map(d => {
      const start = cumulative / total;
      cumulative += d.value;
      const end = cumulative / total;
      const startAngle = start * 2 * Math.PI - Math.PI / 2;
      const endAngle = end * 2 * Math.PI - Math.PI / 2;
      const largeArc = end - start > 0.5 ? 1 : 0;
      const x1 = 80 + 60 * Math.cos(startAngle);
      const y1 = 80 + 60 * Math.sin(startAngle);
      const x2 = 80 + 60 * Math.cos(endAngle);
      const y2 = 80 + 60 * Math.sin(endAngle);
      if (d.value === 0) return '';
      if (d.value === total) return `<circle cx="80" cy="80" r="60" fill="${d.color}"/>`;
      return `<path d="M 80 80 L ${x1} ${y1} A 60 60 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${d.color}"/>`;
    }).join('');

    return `
      <div class="chart-card">
        <h3>🥧 Time Allocation (Last 7 Days)</h3>
        <small>Where your time goes</small>
        <div class="pie-chart-wrapper">
          <svg class="pie-chart" viewBox="0 0 160 160">${paths}<circle cx="80" cy="80" r="30" fill="var(--surface)"/></svg>
          <div class="pie-legend">
            ${data.map(d => `<div class="pie-legend-item"><div class="pie-legend-dot" style="background:${d.color}"></div><span class="pie-legend-label">${d.label}</span><span class="pie-legend-value">${d.pct}%</span></div>`).join('')}
          </div>
        </div>
      </div>
    `;
  },

  renderStudyChart() {
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const mins = State.data.study.filter(s => s.date === iso && s.done).reduce((sum, s) => sum + s.duration, 0);
      last7.push({ mins, label: d.toLocaleDateString(undefined, { weekday: 'short' }) });
    }
    const maxMins = Math.max(60, ...last7.map(d => d.mins));
    const bars = last7.map((d, i) => {
      const height = (d.mins / maxMins) * 150;
      const x = 30 + i * 55;
      return `<rect x="${x}" y="${180 - height}" width="40" height="${height}" fill="var(--primary)" rx="4" opacity="0.85"/><text x="${x + 20}" y="${175 - height}" text-anchor="middle" font-size="10" font-weight="600" fill="var(--text)">${d.mins}m</text><text x="${x + 20}" y="195" text-anchor="middle" font-size="9" fill="var(--text-muted)">${d.label}</text>`;
    }).join('');
    return `<svg class="chart-svg" viewBox="0 0 360 210"><line x1="20" y1="180" x2="350" y2="180" stroke="var(--border)" stroke-width="1"/>${bars}</svg>`;
  },

  renderPredictions(predictions) {
    return `
      <div class="predictions-card">
        <h3>📈 Progress Predictions</h3>
        ${predictions.map(p => `<div class="prediction-item"><span class="prediction-icon">${p.icon}</span><div class="prediction-text">${p.text}</div></div>`).join('')}
      </div>
    `;
  },

  countdown(dateStr) {
    const mins = minutesUntil(dateStr);
    if (mins < 60) return `in ${mins} minutes`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `in ${hrs}h ${mins % 60}m`;
    const days = Math.floor(hrs / 24);
    return `in ${days} day${days > 1 ? 's' : ''}`;
  },

  calendar() {
    const d = State.calendarDate;
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const monthName = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const eventsByDate = {};
    const addEvent = (date, type, title) => { if (!date) return; const key = date.slice(0, 10); if (!eventsByDate[key]) eventsByDate[key] = []; eventsByDate[key].push({ type, title }); };
    State.data.meetings.forEach(m => addEvent(m.date, 'meeting', m.title));
    State.data.applications.forEach(a => addEvent(a.deadline, 'deadline', a.university));
    State.data.goals.forEach(g => addEvent(g.deadline, 'goal', g.title));
    State.data.study.forEach(s => addEvent(s.date, 'study', s.topic));
    State.data.funding.forEach(f => addEvent(f.deadline, 'deadline', f.name));
    State.data.conferences.forEach(c => addEvent(c.submissionDeadline, 'deadline', c.name));
    const prevMonthLast = new Date(year, month, 0).getDate();
    let cells = '';
    for (let i = startPad - 1; i >= 0; i--) cells += `<div class="calendar-day other-month"><div class="calendar-day-num">${prevMonthLast - i}</div></div>`;
    const today = todayISO();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const events = eventsByDate[dateStr] || [];
      const isToday = dateStr === today;
      cells += `<div class="calendar-day ${isToday ? 'today' : ''}" onclick="App.showDayDetail('${dateStr}')"><div class="calendar-day-num">${day}</div>${events.slice(0, 3).map(e => `<div class="calendar-event ${e.type}">${esc(e.title)}</div>`).join('')}${events.length > 3 ? `<div class="calendar-more">+${events.length - 3} more</div>` : ''}</div>`;
    }
    const totalCells = startPad + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) cells += `<div class="calendar-day other-month"><div class="calendar-day-num">${i}</div></div>`;
    return `<div class="card"><div class="calendar-controls"><div class="calendar-month">${monthName}</div><div class="calendar-nav"><button class="btn btn-ghost btn-sm" onclick="App.changeMonth(-1)">← Prev</button><button class="btn btn-ghost btn-sm" onclick="App.goToToday()">Today</button><button class="btn btn-ghost btn-sm" onclick="App.changeMonth(1)">Next →</button></div></div><div class="calendar-grid">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="calendar-day-header">${d}</div>`).join('')}${cells}</div></div>`;
  },

  applications() {
    const statuses = [{ id: 'target', label: 'Target List' }, { id: 'preparing', label: 'Preparing Docs' }, { id: 'submitted', label: 'Submitted' }, { id: 'interview', label: 'Interviewing' }, { id: 'accepted', label: 'Accepted' }, { id: 'rejected', label: 'Rejected' }];
    return `<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addApplication()">+ Add Application</button></div><div class="kanban">${statuses.map(s => { const items = State.data.applications.filter(a => a.status === s.id); return `<div class="kanban-col" data-status="${s.id}" ondragover="event.preventDefault()" ondrop="App.dropApplication(event, '${s.id}')"><div class="kanban-col-head"><span>${s.label}</span><span class="kanban-col-count">${items.length}</span></div>${items.map(a => { const docs = a.documents || []; const docsDone = docs.filter(d => d.done).length; return `<div class="kanban-card" draggable="true" data-id="${a.id}" ondragstart="App.dragApplication(event, '${a.id}')"><div class="kanban-card-title">${esc(a.university)}</div><div class="kanban-card-meta"><span class="badge">${esc(a.program)}</span>${a.deadline ? `<span class="badge ${daysUntil(a.deadline) <= 7 ? 'warning' : ''}">${fmtDate(a.deadline)}</span>` : ''}</div>${Tags.render(a.tags)}${docs.length > 0 ? `<div class="doc-checklist"><div class="doc-progress">📄 ${docsDone}/${docs.length} documents</div>${docs.slice(0, 3).map(d => `<div class="doc-item ${d.done ? 'done' : ''}"><input type="checkbox" ${d.done ? 'checked' : ''} onchange="App.toggleDoc('${a.id}', '${esc(d.name)}')"><span>${esc(d.name)}</span></div>`).join('')}</div>` : ''}<button class="btn btn-sm btn-ghost" style="margin-top:8px;width:100%" onclick="App.editApplication('${a.id}')">Edit</button></div>`; }).join('')}</div>`; }).join('')}</div>`;
  },

  professors() {
    return `<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addProfessor()">+ Add Professor</button></div><div class="prof-grid">${State.data.professors.map(p => `<div class="prof-card"><div class="prof-head"><div class="prof-avatar">${esc(p.name.charAt(0))}</div><div><div class="prof-name">${esc(p.name)}</div><div class="prof-uni">${esc(p.university)}${p.lab ? ` • ${esc(p.lab)}` : ''}</div></div></div><div class="prof-details">${p.researchArea ? `<span>🔬 ${esc(p.researchArea)}</span>` : ''}<span>📄 ${p.papersRead || 0} papers read</span><span class="badge ${p.status === 'contacted' ? 'success' : p.status === 'researching' ? 'warning' : ''}">${esc(p.status || 'researching')}</span></div>${Tags.render(p.tags)}<div class="prof-actions"><button class="btn btn-sm btn-ghost" onclick="App.editProfessor('${p.id}')">Edit</button><button class="btn btn-sm btn-primary" onclick="App.emailProfessor('${p.id}')">📧 Email</button></div></div>`).join('') || '<div class="empty"><span class="empty-illustration">🔬</span><div class="empty-title">No professors saved</div><div class="empty-subtitle">Track potential advisors here</div><button class="btn btn-primary" onclick="App.addProfessor()">+ Add Professor</button></div>'}</div>`;
  },

  papers() {
    return `<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addPaper()">+ Add Paper</button></div><div class="paper-grid">${State.data.papers.map(p => `<div class="paper-card"><div class="paper-title">${esc(p.title)}</div><div class="paper-authors">${esc(p.authors)} • ${p.year}${p.venue ? ` • ${esc(p.venue)}` : ''}</div><div class="paper-meta"><span class="badge ${p.status === 'finished' ? 'success' : p.status === 'reading' ? 'primary' : 'warning'}">${esc(p.status)}</span><span class="paper-stars">${'★'.repeat(p.rating || 0)}${'☆'.repeat(5 - (p.rating || 0))}</span></div>${Tags.render(p.tags)}${p.takeaways ? `<div class="paper-takeaways">${esc(p.takeaways)}</div>` : ''}<div class="paper-actions"><button class="btn btn-sm btn-ghost" onclick="App.editPaper('${p.id}')">Edit</button>${p.url ? `<a href="${esc(p.url)}" target="_blank" class="btn btn-sm btn-ghost">🔗 Open</a>` : ''}</div></div>`).join('') || '<div class="empty"><span class="empty-illustration">📄</span><div class="empty-title">No papers tracked</div><div class="empty-subtitle">Build your research library</div><button class="btn btn-primary" onclick="App.addPaper()">+ Add Paper</button></div>'}</div>`;
  },

  conferences() {
    return `<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addConference()">+ Add Conference</button></div><div class="conf-list">${State.data.conferences.map(c => { const startDate = new Date(c.startDate); const d = daysUntil(c.submissionDeadline); const overdue = !['completed','cancelled'].includes(c.status) && d < 0; return `<div class="conf-item" style="${overdue ? 'border-color:var(--danger)' : ''}"><div class="conf-date-box"><div class="month">${startDate.toLocaleDateString(undefined, { month: 'short' })}</div><div class="day">${startDate.getDate()}</div><div class="year">${startDate.getFullYear()}</div></div><div class="conf-info"><div class="conf-name">${esc(c.name)}</div><div class="conf-venue">📍 ${esc(c.venue)}</div><div class="conf-dates">${fmtDate(c.startDate)} — ${fmtDate(c.endDate)}</div><div class="paper-meta"><span class="badge ${c.status === 'accepted' ? 'success' : c.status === 'submitted' ? 'primary' : 'warning'}">${esc(c.status)}</span>${c.submissionDeadline ? `<span class="badge ${overdue ? 'danger' : d <= 30 ? 'warning' : ''}">Submit by ${fmtDate(c.submissionDeadline)}</span>` : ''}</div>${Tags.render(c.tags)}<div style="margin-top:10px"><button class="btn btn-sm btn-ghost" onclick="App.editConference('${c.id}')">Edit</button></div></div></div>`; }).join('') || '<div class="empty"><span class="empty-illustration">🎤</span><div class="empty-title">No conferences tracked</div><div class="empty-subtitle">Track academic conferences here</div><button class="btn btn-primary" onclick="App.addConference()">+ Add Conference</button></div>'}</div>`;
  },

  funding() {
    return `<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div class="stat-card" style="padding:12px 16px"><div><div class="stat-value">${State.data.funding.length}</div><div class="stat-label">Opportunities tracked</div></div></div><button class="btn btn-primary" onclick="App.addFunding()">+ Add Funding</button></div><div>${State.data.funding.map(f => { const d = daysUntil(f.deadline); const overdue = !['awarded','rejected'].includes(f.status) && d < 0; return `<div class="funding-item" style="${overdue ? 'border-color:var(--danger)' : ''}"><div class="funding-amount">${esc(f.amount || '—')}</div><div class="funding-info"><div class="funding-name">${esc(f.name)}</div><div class="funding-meta">Due ${fmtDate(f.deadline)} ${overdue ? '• <span style="color:var(--danger)">Overdue</span>' : d !== null && d <= 7 ? `• <span style="color:var(--warning)">${d} days left</span>` : ''}</div><div style="margin-top:6px"><span class="badge ${f.status === 'awarded' ? 'success' : f.status === 'rejected' ? 'danger' : 'warning'}">${esc(f.status)}</span></div>${Tags.render(f.tags)}</div><button class="btn btn-sm btn-ghost" onclick="App.editFunding('${f.id}')">Edit</button></div>`; }).join('') || '<div class="empty"><span class="empty-illustration">💰</span><div class="empty-title">No funding tracked</div><button class="btn btn-primary" onclick="App.addFunding()">+ Add Funding</button></div>'}</div>`;
  },

  emails() {
    return `<div style="display:flex;justify-content:space-between;margin-bottom:20px"><button class="btn btn-ghost" onclick="App.openTemplates()">📧 Templates</button><button class="btn btn-primary" onclick="App.addEmail()">+ Log Email</button></div><div class="card"><div class="list">${State.data.emails.map(e => { const overdue = e.status === 'awaiting' && daysUntil(e.followUpDate) < 0; return `<div class="list-item" style="${overdue ? 'border-color:var(--danger);background:var(--danger-soft)' : ''}"><div style="font-size:20px">📧</div><div class="list-item-content"><div class="list-item-title">${esc(e.professor)} <span class="badge ${e.status === 'replied' ? 'success' : e.status === 'awaiting' ? 'warning' : ''}">${e.status}</span></div><div class="list-item-meta">${esc(e.university)} • Sent ${fmtDate(e.dateSent)} ${overdue ? '• <strong style="color:var(--danger)">Follow-up overdue!</strong>' : `• Follow-up ${fmtDate(e.followUpDate)}`}</div></div><button class="btn btn-sm btn-ghost" onclick="App.editEmail('${e.id}')">Edit</button></div>`; }).join('') || '<div class="empty"><span class="empty-illustration">📧</span><div class="empty-title">No emails logged</div></div>'}</div></div>`;
  },

  meetings() {
    const upcoming = State.data.meetings.filter(m => new Date(m.date).getTime() >= Date.now() - 86400000).sort((a, b) => new Date(a.date) - new Date(b.date));
    return `<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addMeeting()">+ Schedule Meeting</button></div><div class="card"><div class="list">${upcoming.map(m => { const mins = minutesUntil(m.date); const isSoon = mins > 0 && mins <= 60; return `<div class="list-item" style="${isSoon ? 'border-color:var(--warning);background:var(--warning-soft)' : ''}"><div style="font-size:20px">🤝</div><div class="list-item-content"><div class="list-item-title">${esc(m.title)} ${isSoon ? '<span class="badge warning">Soon</span>' : ''}</div><div class="list-item-meta">with ${esc(m.with)} • ${fmtDate(m.date.slice(0, 10))} at ${m.date.slice(11, 16) || '—'}</div>${m.agenda ? `<div class="list-item-meta" style="margin-top:4px">📝 ${esc(m.agenda)}</div>` : ''}</div><button class="btn btn-sm btn-ghost" onclick="App.editMeeting('${m.id}')">Edit</button></div>`; }).join('') || '<div class="empty"><span class="empty-illustration">🤝</span><div class="empty-title">No meetings scheduled</div></div>'}</div></div>`;
  },

  tasks() {
    const filter = State.activeTagFilter;
    let pending = State.data.tasks.filter(t => !t.done);
    if (filter) pending = pending.filter(t => (t.tags || []).includes(filter));
    pending = pending.sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
    const done = State.data.tasks.filter(t => t.done);
    return `<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div>${filter ? `<span class="tag" onclick="App.clearTagFilter()">Filtered by #${esc(filter)} ×</span>` : ''}</div><button class="btn btn-primary" onclick="App.addTask()">+ Add Task</button></div><div class="card"><div class="card-head"><div><h3>Pending Tasks</h3><small>${pending.length} open</small></div></div><div>${pending.map(t => { const d = daysUntil(t.deadline); const overdue = d !== null && d < 0; return `<div class="task-item" style="${overdue ? 'border-color:var(--danger)' : ''}"><input type="checkbox" ${t.done ? 'checked' : ''} onchange="App.toggleTask('${t.id}')"><div style="flex:1"><div class="task-item-title">${esc(t.title)}</div><div class="task-item-meta">Due ${fmtDate(t.deadline)} ${t.source ? `• <span class="task-source">${esc(t.source)}</span>` : ''} ${overdue ? '• <span style="color:var(--danger)">Overdue</span>' : ''}</div>${Tags.render(t.tags, 'App.filterByTag')}</div><button class="btn btn-sm btn-ghost" onclick="App.editTask('${t.id}')">Edit</button></div>`; }).join('') || '<div class="empty"><span class="empty-illustration">✅</span><div class="empty-title">No pending tasks</div></div>'}</div></div>${done.length > 0 ? `<div class="card" style="margin-top:16px"><div class="card-head"><div><h3>Completed</h3><small>${done.length} done</small></div></div><div>${done.map(t => `<div class="task-item done"><input type="checkbox" checked onchange="App.toggleTask('${t.id}')"><div style="flex:1"><div class="task-item-title">${esc(t.title)}</div></div></div>`).join('')}</div></div>` : ''}`;
  },

  matrix() {
    const tasks = State.data.tasks.filter(t => !t.done);
    const q1 = tasks.filter(t => t.urgency && t.importance);
    const q2 = tasks.filter(t => !t.urgency && t.importance);
    const q3 = tasks.filter(t => t.urgency && !t.importance);
    const q4 = tasks.filter(t => !t.urgency && !t.importance);
    const renderQuadrant = (title, subtitle, icon, tasks, cls) => `<div class="matrix-quadrant ${cls}"><div class="matrix-head"><span class="matrix-icon">${icon}</span><div><div class="matrix-title">${title}</div><div class="matrix-subtitle">${subtitle}</div></div></div>${tasks.map(t => `<div class="matrix-task" onclick="App.editTask('${t.id}')">${esc(t.title)}${t.deadline ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">Due ${fmtDate(t.deadline)}</div>` : ''}</div>`).join('') || '<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:20px">Empty</div>'}</div>`;
    return `<div style="margin-bottom:16px"><button class="btn btn-primary" onclick="App.addTask()">+ Add Task</button></div><div class="matrix">${renderQuadrant('Do First', 'Urgent & Important', '🔴', q1, 'q1')}${renderQuadrant('Schedule', 'Not Urgent, Important', '🔵', q2, 'q2')}${renderQuadrant('Delegate', 'Urgent, Not Important', '🟡', q3, 'q3')}${renderQuadrant('Eliminate', 'Not Urgent, Not Important', '⚪', q4, 'q4')}</div>`;
  },

  study() {
    const today = State.data.study.filter(s => s.date === todayISO());
    const totalMin = today.reduce((sum, s) => sum + (s.done ? s.duration : 0), 0);
    return `<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div class="stat-card" style="padding:12px 16px"><div><div class="stat-value">${totalMin} min</div><div class="stat-label">Studied today</div></div></div><button class="btn btn-primary" onclick="App.addStudy()">+ Add Study Block</button></div><div class="card"><div class="card-head"><div><h3>${fmtDate(todayISO())}</h3><small>${today.filter(s => s.done).length} of ${today.length} completed</small></div></div><div class="list">${today.map(s => `<div class="list-item"><input type="checkbox" ${s.done ? 'checked' : ''} onchange="App.toggleStudy('${s.id}')"><div class="list-item-content"><div class="list-item-title" style="${s.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${esc(s.topic)}</div><div class="list-item-meta">${s.duration} min • 🍅 ${s.pomodoros || 0} pomodoros</div>${Tags.render(s.tags)}</div>${!s.done ? `<button class="pomodoro-start" onclick="Pomodoro.start('${s.id}')">🍅 Focus</button>` : ''}<button class="btn btn-sm btn-ghost" onclick="App.editStudy('${s.id}')">Edit</button></div>`).join('') || '<div class="empty"><span class="empty-illustration">📚</span><div class="empty-title">No study planned</div></div>'}</div></div>`;
  },

  journal() {
    const entries = [...State.data.journal].sort((a, b) => b.date.localeCompare(a.date));
    return `<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addJournal()">+ New Entry</button></div><div class="journal-list">${entries.map(e => `<div class="journal-entry"><div class="journal-date">📓 ${fmtDate(e.date)}</div><div class="journal-content">${esc(e.content)}</div>${e.prompts ? `<div class="journal-prompts">${e.prompts.learned ? `<div class="journal-prompt"><strong>💡 Learned</strong>${esc(e.prompts.learned)}</div>` : ''}${e.prompts.blocking ? `<div class="journal-prompt"><strong>🚧 Blocking</strong>${esc(e.prompts.blocking)}</div>` : ''}${e.prompts.priority ? `<div class="journal-prompt"><strong>🎯 Priority</strong>${esc(e.prompts.priority)}</div>` : ''}</div>` : ''}<div style="margin-top:10px;display:flex;gap:6px"><button class="btn btn-sm btn-ghost" onclick="App.editJournal('${e.id}')">Edit</button><button class="btn btn-sm btn-danger" onclick="App.deleteJournal('${e.id}')">Delete</button></div></div>`).join('') || '<div class="empty"><span class="empty-illustration">📓</span><div class="empty-title">No journal entries yet</div><div class="empty-subtitle">Reflect on your journey</div><button class="btn btn-primary" onclick="App.addJournal()">+ New Entry</button></div>'}</div>`;
  },

  goals() {
    return `<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addGoal()">+ Add Goal</button></div><div class="card"><div class="list">${State.data.goals.map(g => { const d = daysUntil(g.deadline); const overdue = !g.done && d < 0; return `<div class="list-item" style="${overdue ? 'border-color:var(--danger)' : ''}"><input type="checkbox" ${g.done ? 'checked' : ''} onchange="App.toggleGoal('${g.id}')"><div class="list-item-content"><div class="list-item-title" style="${g.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${esc(g.title)}</div><div class="list-item-meta">Due ${fmtDate(g.deadline)} ${overdue ? '• <span style="color:var(--danger)">Overdue</span>' : d !== null && d <= 7 ? `• <span style="color:var(--warning)">${d} days left</span>` : ''}</div>${Tags.render(g.tags)}</div><button class="btn btn-sm btn-ghost" onclick="App.editGoal('${g.id}')">Edit</button></div>`; }).join('') || '<div class="empty"><span class="empty-illustration">🎯</span><div class="empty-title">No goals set</div></div>'}</div></div>`;
  },

  inbox() {
    return `<div style="display:flex;justify-content:space-between;margin-bottom:20px"><div><p style="font-size:12px;color:var(--text-muted);margin-top:4px">Capture ideas. Sort later.</p></div><button class="btn btn-primary" onclick="App.openQuickCapture()">⚡ Quick Capture</button></div><div>${State.data.inbox.map(i => `<div class="inbox-item"><div style="flex:1"><div class="inbox-content">${esc(i.content)}</div><div style="display:flex;gap:6px;margin-top:6px;align-items:center">${i.tag ? `<span class="inbox-tag">${esc(i.tag)}</span>` : ''}<span class="inbox-date">${fmtDate(i.date)}</span></div></div><div class="inbox-actions"><button class="btn btn-sm btn-ghost" onclick="App.convertInbox('${i.id}', 'task')" title="Convert to task">✅</button><button class="btn btn-sm btn-ghost" onclick="App.convertInbox('${i.id}', 'study')" title="Convert to study">📚</button><button class="btn btn-sm btn-ghost" onclick="App.deleteInbox('${i.id}')" title="Delete">×</button></div></div>`).join('') || '<div class="empty"><span class="empty-illustration">📥</span><div class="empty-title">Inbox zero!</div><div class="empty-subtitle">Use Quick Capture (Ctrl+Q) to add items</div></div>'}</div>`;
  }
};

// ========== MAIN APP ==========
const App = {
  init() {
    State.init();
    Confetti.init();
    this.applyTheme();
    this.bindEvents();
    this.render();
    Notifier.startChecker();
    this.updateInboxBadge();
    this.renderNotifCenter();
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    this.updateNotifButton();
    Tags.sync();
  },

  applyTheme() {
    const theme = State.data.settings.theme;
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
  },

  updateNotifButton() {
    const btn = document.getElementById('notifPermission');
    if (State.data.settings.remindersEnabled) { btn.textContent = '🔔 On'; btn.style.background = 'var(--success-soft)'; btn.style.color = 'var(--success)'; }
  },

  updateInboxBadge() {
    const badge = document.getElementById('inboxBadge');
    const count = State.data.inbox.length;
    if (count > 0) { badge.textContent = count; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  },

  renderNotifCenter() {
    const list = document.getElementById('notifList');
    const count = document.getElementById('notifCount');
    const unread = State.data.notifications.filter(n => !n.read).length;
    if (unread > 0) { count.textContent = unread; count.classList.remove('hidden'); }
    else count.classList.add('hidden');
    list.innerHTML = State.data.notifications.slice(0, 20).map(n => `<div class="notif-item ${n.read ? '' : 'unread'}" onclick="App.markNotifRead('${n.id}')"><div class="notif-item-title">${esc(n.title)}</div><div class="notif-item-meta">${esc(n.body)} • ${fmtDate(n.date.slice(0, 10))}</div></div>`).join('') || '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px">No notifications</div>';
  },

  markNotifRead(id) {
    const n = State.data.notifications.find(x => x.id === id);
    if (n) { n.read = true; State.save(); this.renderNotifCenter(); }
  },

  bindEvents() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => { e.preventDefault(); this.switchView(link.dataset.view); });
    });
    document.getElementById('themeToggle').addEventListener('click', () => {
      const curr = State.data.settings.theme;
      State.data.settings.theme = curr === 'dark' ? 'light' : curr === 'light' ? 'system' : 'dark';
      State.save(); this.applyTheme();
    });
    document.getElementById('notifPermission')?.addEventListener('click', async () => {
      const granted = await Notifier.requestPermission();
      if (granted) { Toast.show('Reminders enabled!', 'success'); this.updateNotifButton(); }
    });
    document.getElementById('dismissReminder').addEventListener('click', () => Notifier.hideBanner());
    document.getElementById('closeModal').addEventListener('click', () => Modal.close());
    document.getElementById('closeTemplates').addEventListener('click', () => document.getElementById('templatesModal').close());
    document.getElementById('closeQuickCapture').addEventListener('click', () => document.getElementById('quickCaptureModal').close());
    document.getElementById('quickCaptureBtn').addEventListener('click', () => this.openQuickCapture());
    document.getElementById('searchBtn').addEventListener('click', () => CommandPalette.open());
    document.getElementById('quickCaptureForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      State.data.inbox.unshift({ id: uid(), content: fd.get('content'), tag: fd.get('tag'), date: todayISO() });
      State.save();
      document.getElementById('quickCaptureModal').close();
      e.target.reset();
      this.updateInboxBadge();
      Toast.show('⚡ Captured!', 'success');
      if (State.currentView === 'inbox') this.render();
    });
    document.getElementById('pomodoroPlay').addEventListener('click', () => Pomodoro.toggle());
    document.getElementById('pomodoroReset').addEventListener('click', () => Pomodoro.reset());
    document.getElementById('pomodoroClose').addEventListener('click', () => Pomodoro.close());
    document.getElementById('exportBtn').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(State.data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `scholarsync-backup-${todayISO()}.json`;
      a.click();
      Toast.show('Backup exported', 'success');
    });
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try { State.data = JSON.parse(ev.target.result); State.save(); this.render(); Toast.show('Data imported', 'success'); }
        catch { Toast.show('Invalid backup file', 'error'); }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // FAB
    const fab = document.getElementById('fab');
    document.getElementById('fabMain').addEventListener('click', () => fab.classList.toggle('open'));
    document.querySelectorAll('.fab-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        fab.classList.remove('open');
        const actions = { task: () => this.addTask(), email: () => this.addEmail(), meeting: () => this.addMeeting(), study: () => this.addStudy(), paper: () => this.addPaper(), goal: () => this.addGoal() };
        if (actions[action]) actions[action]();
      });
    });

    // Notification center
    document.getElementById('notifCenterBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('notifDropdown').classList.toggle('hidden');
    });
    document.getElementById('markAllRead').addEventListener('click', () => {
      State.data.notifications.forEach(n => n.read = true);
      State.save();
      this.renderNotifCenter();
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.notif-wrapper')) document.getElementById('notifDropdown').classList.add('hidden');
      if (!e.target.closest('.fab') && !e.target.closest('#fabMain')) document.getElementById('fab').classList.remove('open');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); CommandPalette.isOpen ? CommandPalette.close() : CommandPalette.open(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') { e.preventDefault(); this.openQuickCapture(); }
      if (e.key === 'Escape') { Modal.close(); document.getElementById('templatesModal').close(); document.getElementById('quickCaptureModal').close(); CommandPalette.close(); }
      if (CommandPalette.isOpen) {
        if (e.key === 'ArrowDown') { e.preventDefault(); CommandPalette.navigate(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); CommandPalette.navigate(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); CommandPalette.execute(CommandPalette.selectedIndex); }
      }
    });
    document.getElementById('commandInput').addEventListener('input', (e) => { CommandPalette.selectedIndex = 0; CommandPalette.render(e.target.value); });
    document.getElementById('commandPalette').addEventListener('click', (e) => { if (e.target.id === 'commandPalette') CommandPalette.close(); });
  },

  openQuickCapture() { document.getElementById('quickCaptureModal').showModal(); },

  switchView(view) {
    State.currentView = view;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.view === view));
    const titles = { dashboard: ['Dashboard', 'Your PhD journey at a glance'], calendar: ['Calendar', 'Visual overview'], applications: ['Applications', 'Track university applications'], professors: ['Professors', 'Research potential advisors'], papers: ['Papers', 'Your research library'], conferences: ['Conferences', 'Academic events'], funding: ['Funding', 'Scholarships & grants'], emails: ['Emails', 'Communications'], meetings: ['Meetings', 'Schedule & track'], tasks: ['Tasks', 'Action items'], matrix: ['Priority Matrix', 'Eisenhower method'], study: ['Study', 'Daily blocks'], journal: ['Journal', 'Weekly reflections'], goals: ['Goals', 'Long-term milestones'], inbox: ['Inbox', 'Quick capture'] };
    document.getElementById('viewTitle').textContent = titles[view][0];
    document.getElementById('viewSubtitle').textContent = titles[view][1];
    this.render();
  },

  render() { document.getElementById('viewContainer').innerHTML = Views[State.currentView](); },

  changeMonth(delta) { State.calendarDate.setMonth(State.calendarDate.getMonth() + delta); this.render(); },
  goToToday() { State.calendarDate = new Date(); this.render(); },
  showDayDetail(dateStr) {
    const events = [];
    State.data.meetings.filter(m => m.date.startsWith(dateStr)).forEach(m => events.push({ type: 'meeting', title: m.title, meta: `with ${m.with}` }));
    State.data.applications.filter(a => a.deadline === dateStr).forEach(a => events.push({ type: 'deadline', title: `${a.university} deadline`, meta: a.program }));
    State.data.goals.filter(g => g.deadline === dateStr).forEach(g => events.push({ type: 'goal', title: g.title, meta: 'Goal' }));
    State.data.study.filter(s => s.date === dateStr).forEach(s => events.push({ type: 'study', title: s.topic, meta: `${s.duration} min` }));
    Modal.open({
      title: `📅 ${fmtDate(dateStr)}`,
      body: events.length ? `<div class="list">${events.map(e => `<div class="list-item"><div style="font-size:20px">${{meeting:'🤝',deadline:'📅',goal:'🎯',study:'📚'}[e.type]}</div><div class="list-item-content"><div class="list-item-title">${esc(e.title)}</div><div class="list-item-meta">${esc(e.meta)}</div></div></div>`).join('')}</div>` : '<div class="empty"><span class="empty-illustration">✨</span><div class="empty-title">Nothing scheduled</div></div>',
      onSubmit: () => {}
    });
    document.getElementById('modalDelete').classList.add('hidden');
    document.querySelector('#modalForm button[type="submit"]').classList.add('hidden');
  },

  filterByTag(tag) { State.activeTagFilter = tag; this.switchView('tasks'); },
  clearTagFilter() { State.activeTagFilter = null; this.render(); },

  // ===== APPLICATIONS =====
  addApplication() {
    Modal.open({
      title: 'Add Application',
      body: `<div class="form-group"><label>University</label><input name="university" required></div><div class="form-group"><label>Program</label><input name="program" required></div><div class="form-row"><div class="form-group"><label>Deadline</label><input name="deadline" type="date"></div><div class="form-group"><label>Status</label><select name="status"><option value="target">Target List</option><option value="preparing">Preparing Docs</option><option value="submitted">Submitted</option><option value="interview">Interviewing</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option></select></div></div><div class="form-group"><label>Notes</label><textarea name="notes" rows="3"></textarea></div>${Tags.input('tags')}`,
      onSubmit: (fd) => {
        State.data.applications.push({ id: uid(), university: fd.get('university'), program: fd.get('program'), deadline: fd.get('deadline'), status: fd.get('status'), notes: fd.get('notes'), documents: DEFAULT_DOCS.map(d => ({ name: d, done: false })), tags: Tags.parse(fd.get('tags')) });
        Tags.sync(); State.save(); this.render(); Toast.show('Application added', 'success');
      }
    });
  },
  editApplication(id) {
    const a = State.data.applications.find(x => x.id === id);
    Modal.open({
      title: 'Edit Application',
      body: `<div class="form-group"><label>University</label><input name="university" value="${esc(a.university)}" required></div><div class="form-group"><label>Program</label><input name="program" value="${esc(a.program)}" required></div><div class="form-row"><div class="form-group"><label>Deadline</label><input name="deadline" type="date" value="${a.deadline || ''}"></div><div class="form-group"><label>Status</label><select name="status">${['target','preparing','submitted','interview','accepted','rejected'].map(s => `<option value="${s}" ${a.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div><div class="form-group"><label>Notes</label><textarea name="notes" rows="3">${esc(a.notes)}</textarea></div>${Tags.input('tags', a.tags)}`,
      onSubmit: (fd) => { Object.assign(a, { university: fd.get('university'), program: fd.get('program'), deadline: fd.get('deadline'), status: fd.get('status'), notes: fd.get('notes'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); this.render(); Toast.show('Updated', 'success'); },
      onDelete: () => { State.data.applications = State.data.applications.filter(x => x.id !== id); State.save(); this.render(); }
    });
  },
  dragApplication(e, id) { e.dataTransfer.setData('text/plain', id); e.target.classList.add('dragging'); },
  dropApplication(e, status) { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); const app = State.data.applications.find(a => a.id === id); if (app) { app.status = status; State.save(); this.render(); } },
  toggleDoc(appId, docName) { const app = State.data.applications.find(a => a.id === appId); if (!app) return; const doc = app.documents.find(d => d.name === docName); if (doc) { doc.done = !doc.done; State.save(); this.render(); } },

  // ===== PROFESSORS =====
  addProfessor() {
    Modal.open({
      title: 'Add Professor',
      body: `<div class="form-group"><label>Name</label><input name="name" required></div><div class="form-row"><div class="form-group"><label>University</label><input name="university" required></div><div class="form-group"><label>Lab</label><input name="lab"></div></div><div class="form-group"><label>Research Area</label><input name="researchArea"></div><div class="form-row"><div class="form-group"><label>Papers Read</label><input name="papersRead" type="number" min="0" value="0"></div><div class="form-group"><label>Status</label><select name="status"><option value="researching">Researching</option><option value="contacted">Contacted</option><option value="replied">Replied</option><option value="meeting_scheduled">Meeting Scheduled</option></select></div></div><div class="form-group"><label>Notes</label><textarea name="notes" rows="3"></textarea></div>${Tags.input('tags')}`,
      onSubmit: (fd) => { State.data.professors.push({ id: uid(), name: fd.get('name'), university: fd.get('university'), lab: fd.get('lab'), researchArea: fd.get('researchArea'), papersRead: Number(fd.get('papersRead')) || 0, status: fd.get('status'), notes: fd.get('notes'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); this.render(); Toast.show('Professor added', 'success'); }
    });
  },
  editProfessor(id) {
    const p = State.data.professors.find(x => x.id === id);
    Modal.open({
      title: 'Edit Professor',
      body: `<div class="form-group"><label>Name</label><input name="name" value="${esc(p.name)}" required></div><div class="form-row"><div class="form-group"><label>University</label><input name="university" value="${esc(p.university)}" required></div><div class="form-group"><label>Lab</label><input name="lab" value="${esc(p.lab || '')}"></div></div><div class="form-group"><label>Research Area</label><input name="researchArea" value="${esc(p.researchArea || '')}"></div><div class="form-row"><div class="form-group"><label>Papers Read</label><input name="papersRead" type="number" min="0" value="${p.papersRead || 0}"></div><div class="form-group"><label>Status</label><select name="status">${['researching','contacted','replied','meeting_scheduled','not_interested'].map(s => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div><div class="form-group"><label>Notes</label><textarea name="notes" rows="3">${esc(p.notes || '')}</textarea></div>${Tags.input('tags', p.tags)}`,
      onSubmit: (fd) => { Object.assign(p, { name: fd.get('name'), university: fd.get('university'), lab: fd.get('lab'), researchArea: fd.get('researchArea'), papersRead: Number(fd.get('papersRead')) || 0, status: fd.get('status'), notes: fd.get('notes'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); this.render(); },
      onDelete: () => { State.data.professors = State.data.professors.filter(x => x.id !== id); State.save(); this.render(); }
    });
  },
  emailProfessor(id) { const p = State.data.professors.find(x => x.id === id); this.addEmail(p.name, p.university); },

  // ===== PAPERS =====
  addPaper() {
    Modal.open({
      title: 'Add Paper',
      body: `<div class="form-group"><label>Title</label><input name="title" required></div><div class="form-group"><label>Authors</label><input name="authors" required placeholder="Vaswani et al."></div><div class="form-row"><div class="form-group"><label>Year</label><input name="year" type="number" value="${new Date().getFullYear()}"></div><div class="form-group"><label>Venue</label><input name="venue" placeholder="NeurIPS, ICML..."></div></div><div class="form-row"><div class="form-group"><label>Rating</label><select name="rating"><option value="5">★★★★★</option><option value="4">★★★★☆</option><option value="3" selected>★★★☆☆</option><option value="2">★★☆☆☆</option><option value="1">★☆☆☆☆</option></select></div><div class="form-group"><label>Status</label><select name="status"><option value="to_read">To Read</option><option value="reading">Reading</option><option value="finished">Finished</option><option value="cited">Cited</option></select></div></div><div class="form-group"><label>Key Takeaways</label><textarea name="takeaways" rows="4" placeholder="• Main contribution&#10;• Key insight&#10;• How it relates to my work"></textarea></div><div class="form-group"><label>URL (optional)</label><input name="url" type="url" placeholder="https://arxiv.org/..."></div>${Tags.input('tags')}`,
      onSubmit: (fd) => { State.data.papers.push({ id: uid(), title: fd.get('title'), authors: fd.get('authors'), year: Number(fd.get('year')), venue: fd.get('venue'), rating: Number(fd.get('rating')), status: fd.get('status'), takeaways: fd.get('takeaways'), url: fd.get('url'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); this.render(); Toast.show('Paper added', 'success'); }
    });
  },
  editPaper(id) {
    const p = State.data.papers.find(x => x.id === id);
    Modal.open({
      title: 'Edit Paper',
      body: `<div class="form-group"><label>Title</label><input name="title" value="${esc(p.title)}" required></div><div class="form-group"><label>Authors</label><input name="authors" value="${esc(p.authors)}" required></div><div class="form-row"><div class="form-group"><label>Year</label><input name="year" type="number" value="${p.year}"></div><div class="form-group"><label>Venue</label><input name="venue" value="${esc(p.venue || '')}"></div></div><div class="form-row"><div class="form-group"><label>Rating</label><select name="rating">${[5,4,3,2,1].map(r => `<option value="${r}" ${p.rating === r ? 'selected' : ''}>${'★'.repeat(r)}${'☆'.repeat(5-r)}</option>`).join('')}</select></div><div class="form-group"><label>Status</label><select name="status">${['to_read','reading','finished','cited'].map(s => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div><div class="form-group"><label>Takeaways</label><textarea name="takeaways" rows="4">${esc(p.takeaways || '')}</textarea></div><div class="form-group"><label>URL</label><input name="url" type="url" value="${esc(p.url || '')}"></div>${Tags.input('tags', p.tags)}`,
      onSubmit: (fd) => { Object.assign(p, { title: fd.get('title'), authors: fd.get('authors'), year: Number(fd.get('year')), venue: fd.get('venue'), rating: Number(fd.get('rating')), status: fd.get('status'), takeaways: fd.get('takeaways'), url: fd.get('url'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); this.render(); },
      onDelete: () => { State.data.papers = State.data.papers.filter(x => x.id !== id); State.save(); this.render(); }
    });
  },

  // ===== CONFERENCES =====
  addConference() {
    Modal.open({
      title: 'Add Conference',
      body: `<div class="form-group"><label>Name</label><input name="name" required placeholder="NeurIPS 2026"></div><div class="form-group"><label>Venue</label><input name="venue" required placeholder="Vancouver, Canada"></div><div class="form-row"><div class="form-group"><label>Start Date</label><input name="startDate" type="date" required></div><div class="form-group"><label>End Date</label><input name="endDate" type="date" required></div></div><div class="form-group"><label>Submission Deadline</label><input name="submissionDeadline" type="date"></div><div class="form-row"><div class="form-group"><label>Status</label><select name="status"><option value="planning">Planning</option><option value="submitted">Submitted</option><option value="under_review">Under Review</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="completed">Completed</option></select></div><div class="form-group"><label>Paper Title</label><input name="paperTitle"></div></div>${Tags.input('tags')}`,
      onSubmit: (fd) => { State.data.conferences.push({ id: uid(), name: fd.get('name'), venue: fd.get('venue'), startDate: fd.get('startDate'), endDate: fd.get('endDate'), submissionDeadline: fd.get('submissionDeadline'), status: fd.get('status'), paperTitle: fd.get('paperTitle'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); this.render(); Toast.show('Conference added', 'success'); }
    });
  },
  editConference(id) {
    const c = State.data.conferences.find(x => x.id === id);
    Modal.open({
      title: 'Edit Conference',
      body: `<div class="form-group"><label>Name</label><input name="name" value="${esc(c.name)}" required></div><div class="form-group"><label>Venue</label><input name="venue" value="${esc(c.venue)}" required></div><div class="form-row"><div class="form-group"><label>Start Date</label><input name="startDate" type="date" value="${c.startDate}" required></div><div class="form-group"><label>End Date</label><input name="endDate" type="date" value="${c.endDate}" required></div></div><div class="form-group"><label>Submission Deadline</label><input name="submissionDeadline" type="date" value="${c.submissionDeadline || ''}"></div><div class="form-row"><div class="form-group"><label>Status</label><select name="status">${['planning','submitted','under_review','accepted','rejected','completed','cancelled'].map(s => `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div><div class="form-group"><label>Paper Title</label><input name="paperTitle" value="${esc(c.paperTitle || '')}"></div></div>${Tags.input('tags', c.tags)}`,
      onSubmit: (fd) => { Object.assign(c, { name: fd.get('name'), venue: fd.get('venue'), startDate: fd.get('startDate'), endDate: fd.get('endDate'), submissionDeadline: fd.get('submissionDeadline'), status: fd.get('status'), paperTitle: fd.get('paperTitle'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); this.render(); },
      onDelete: () => { State.data.conferences = State.data.conferences.filter(x => x.id !== id); State.save(); this.render(); }
    });
  },

  // ===== FUNDING =====
  addFunding() {
    Modal.open({
      title: 'Add Funding',
      body: `<div class="form-group"><label>Name</label><input name="name" required></div><div class="form-row"><div class="form-group"><label>Amount</label><input name="amount" placeholder="$10,000"></div><div class="form-group"><label>Deadline</label><input name="deadline" type="date" required></div></div><div class="form-group"><label>Status</label><select name="status"><option value="researching">Researching</option><option value="preparing">Preparing</option><option value="submitted">Submitted</option><option value="awarded">Awarded</option><option value="rejected">Rejected</option></select></div><div class="form-group"><label>Requirements</label><textarea name="requirements" rows="3"></textarea></div>${Tags.input('tags')}`,
      onSubmit: (fd) => { State.data.funding.push({ id: uid(), name: fd.get('name'), amount: fd.get('amount'), deadline: fd.get('deadline'), status: fd.get('status'), requirements: fd.get('requirements'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); this.render(); Toast.show('Funding added', 'success'); }
    });
  },
  editFunding(id) {
    const f = State.data.funding.find(x => x.id === id);
    Modal.open({
      title: 'Edit Funding',
      body: `<div class="form-group"><label>Name</label><input name="name" value="${esc(f.name)}" required></div><div class="form-row"><div class="form-group"><label>Amount</label><input name="amount" value="${esc(f.amount || '')}"></div><div class="form-group"><label>Deadline</label><input name="deadline" type="date" value="${f.deadline}" required></div></div><div class="form-group"><label>Status</label><select name="status">${['researching','preparing','submitted','awarded','rejected'].map(s => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div><div class="form-group"><label>Requirements</label><textarea name="requirements" rows="3">${esc(f.requirements || '')}</textarea></div>${Tags.input('tags', f.tags)}`,
      onSubmit: (fd) => { Object.assign(f, { name: fd.get('name'), amount: fd.get('amount'), deadline: fd.get('deadline'), status: fd.get('status'), requirements: fd.get('requirements'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); this.render(); },
      onDelete: () => { State.data.funding = State.data.funding.filter(x => x.id !== id); State.save(); this.render(); }
    });
  },

  // ===== EMAILS =====
  addEmail(profName = '', uniName = '') {
    Modal.open({
      title: 'Log Email',
      body: `<div class="form-group"><label>Professor</label><input name="professor" value="${esc(profName)}" required></div><div class="form-group"><label>University</label><input name="university" value="${esc(uniName)}" required></div><div class="form-row"><div class="form-group"><label>Date Sent</label><input name="dateSent" type="date" value="${todayISO()}"></div><div class="form-group"><label>Follow-up Date</label><input name="followUpDate" type="date" value="${addDays(7)}"></div></div><div class="form-group"><label>Status</label><select name="status"><option value="awaiting">Awaiting Reply</option><option value="replied">Replied</option><option value="no_response">No Response</option></select></div>`,
      onSubmit: (fd) => { State.data.emails.push({ id: uid(), professor: fd.get('professor'), university: fd.get('university'), dateSent: fd.get('dateSent'), followUpDate: fd.get('followUpDate'), status: fd.get('status') }); State.save(); this.render(); Toast.show('Email logged', 'success'); }
    });
  },
  editEmail(id) {
    const e = State.data.emails.find(x => x.id === id);
    Modal.open({
      title: 'Edit Email',
      body: `<div class="form-group"><label>Professor</label><input name="professor" value="${esc(e.professor)}" required></div><div class="form-group"><label>University</label><input name="university" value="${esc(e.university)}" required></div><div class="form-row"><div class="form-group"><label>Date Sent</label><input name="dateSent" type="date" value="${e.dateSent}"></div><div class="form-group"><label>Follow-up Date</label><input name="followUpDate" type="date" value="${e.followUpDate}"></div></div><div class="form-group"><label>Status</label><select name="status">${['awaiting','replied','no_response'].map(s => `<option value="${s}" ${e.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>`,
      onSubmit: (fd) => { Object.assign(e, { professor: fd.get('professor'), university: fd.get('university'), dateSent: fd.get('dateSent'), followUpDate: fd.get('followUpDate'), status: fd.get('status') }); State.save(); this.render(); },
      onDelete: () => { State.data.emails = State.data.emails.filter(x => x.id !== id); State.save(); this.render(); }
    });
  },
  openTemplates() {
    const body = document.getElementById('templatesBody');
    const tabs = Object.entries(EMAIL_TEMPLATES).map(([key, t], i) => `<button class="template-tab ${i === 0 ? 'active' : ''}" data-template="${key}">${t.name}</button>`).join('');
    const contents = Object.entries(EMAIL_TEMPLATES).map(([key, t], i) => `<div class="template-content ${i === 0 ? 'active' : ''}" data-content="${key}"><div class="form-group"><label>Subject</label><input type="text" value="${esc(t.subject)}" readonly onclick="this.select()"></div><div class="form-group"><label>Body</label><div class="template-preview">${esc(t.body).replace(/\{\{([^}]+)\}\}/g, '<span class="placeholder">{{$1}}</span>')}</div></div><div class="template-actions"><button type="button" class="btn btn-primary" onclick="App.copyTemplate('${key}')">📋 Copy</button></div></div>`).join('');
    body.innerHTML = `<div class="template-tabs">${tabs}</div>${contents}`;
    body.querySelectorAll('.template-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        body.querySelectorAll('.template-tab').forEach(t => t.classList.remove('active'));
        body.querySelectorAll('.template-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        body.querySelector(`[data-content="${tab.dataset.template}"]`).classList.add('active');
      });
    });
    document.getElementById('templatesModal').showModal();
  },
  copyTemplate(key) { const t = EMAIL_TEMPLATES[key]; navigator.clipboard.writeText(`Subject: ${t.subject}\n\n${t.body}`).then(() => Toast.show('📋 Copied', 'success')); },

  // ===== MEETINGS =====
  addMeeting() {
    Modal.open({
      title: 'Schedule Meeting',
      body: `<div class="form-group"><label>Title</label><input name="title" required></div><div class="form-group"><label>With</label><input name="with" required></div><div class="form-group"><label>Date & Time</label><input name="date" type="datetime-local" required></div><div class="form-group"><label>Agenda</label><textarea name="agenda" rows="2"></textarea></div><div class="form-group"><label>Notes (use - for bullets)</label><textarea name="notes" rows="4"></textarea></div>`,
      onSubmit: (fd) => { State.data.meetings.push({ id: uid(), title: fd.get('title'), with: fd.get('with'), date: fd.get('date'), agenda: fd.get('agenda'), notes: fd.get('notes') }); State.save(); this.render(); Toast.show('Meeting scheduled', 'success'); }
    });
  },
  editMeeting(id) {
    const m = State.data.meetings.find(x => x.id === id);
    Modal.open({
      title: 'Edit Meeting',
      body: `<div class="form-group"><label>Title</label><input name="title" value="${esc(m.title)}" required></div><div class="form-group"><label>With</label><input name="with" value="${esc(m.with)}" required></div><div class="form-group"><label>Date & Time</label><input name="date" type="datetime-local" value="${m.date}" required></div><div class="form-group"><label>Agenda</label><textarea name="agenda" rows="2">${esc(m.agenda)}</textarea></div><div class="form-group"><label>Notes</label><textarea name="notes" rows="4">${esc(m.notes || '')}</textarea></div>`,
      onSubmit: (fd) => {
        const newNotes = fd.get('notes'); const oldNotes = m.notes || '';
        Object.assign(m, { title: fd.get('title'), with: fd.get('with'), date: fd.get('date'), agenda: fd.get('agenda'), notes: newNotes });
        if (newNotes && newNotes !== oldNotes) {
          const newTasks = parseNotesToTasks(newNotes, m.title);
          const existingTitles = new Set(State.data.tasks.map(t => t.title));
          const freshTasks = newTasks.filter(t => !existingTitles.has(t.title));
          if (freshTasks.length > 0) { State.data.tasks.push(...freshTasks); Toast.show(`✨ ${freshTasks.length} task(s) created`, 'success'); }
        }
        State.save(); this.render();
      },
      onDelete: () => { State.data.meetings = State.data.meetings.filter(x => x.id !== id); State.save(); this.render(); }
    });
  },

  // ===== TASKS =====
  addTask() {
    Modal.open({
      title: 'Add Task',
      body: `<div class="form-group"><label>Task</label><input name="title" required></div><div class="form-group"><label>Deadline</label><input name="deadline" type="date" value="${addDays(7)}"></div><div class="form-row"><div class="form-group"><label>Priority</label><select name="priority"><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select></div><div class="form-group"><label>Source</label><input name="source" placeholder="e.g., Meeting"></div></div><div class="form-row"><div class="form-group"><label><input type="checkbox" name="importance" checked> Important</label></div><div class="form-group"><label><input type="checkbox" name="urgency"> Urgent</label></div></div>${Tags.input('tags')}`,
      onSubmit: (fd) => { State.data.tasks.push({ id: uid(), title: fd.get('title'), deadline: fd.get('deadline'), done: false, source: fd.get('source') || 'Manual', priority: fd.get('priority'), importance: fd.has('importance'), urgency: fd.has('urgency'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); this.render(); Toast.show('Task added', 'success'); }
    });
  },
  editTask(id) {
    const t = State.data.tasks.find(x => x.id === id);
    Modal.open({
      title: 'Edit Task',
      body: `<div class="form-group"><label>Task</label><input name="title" value="${esc(t.title)}" required></div><div class="form-group"><label>Deadline</label><input name="deadline" type="date" value="${t.deadline || ''}"></div><div class="form-row"><div class="form-group"><label>Priority</label><select name="priority">${['high','medium','low'].map(p => `<option value="${p}" ${t.priority === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div><div class="form-group"><label>Source</label><input name="source" value="${esc(t.source || '')}"></div></div><div class="form-row"><div class="form-group"><label><input type="checkbox" name="importance" ${t.importance ? 'checked' : ''}> Important</label></div><div class="form-group"><label><input type="checkbox" name="urgency" ${t.urgency ? 'checked' : ''}> Urgent</label></div></div>${Tags.input('tags', t.tags)}`,
      onSubmit: (fd) => { Object.assign(t, { title: fd.get('title'), deadline: fd.get('deadline'), source: fd.get('source'), priority: fd.get('priority'), importance: fd.has('importance'), urgency: fd.has('urgency'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); this.render(); },
      onDelete: () => { State.data.tasks = State.data.tasks.filter(x => x.id !== id); State.save(); this.render(); }
    });
  },
  toggleTask(id) { const t = State.data.tasks.find(x => x.id === id); if (t) { t.done = !t.done; State.save(); this.render(); if (t.done) { Toast.show('✅ Task completed', 'success'); Confetti.burst(); } } },

  // ===== STUDY =====
  addStudy() {
    Modal.open({
      title: 'Add Study Block',
      body: `<div class="form-group"><label>Topic</label><input name="topic" required></div><div class="form-row"><div class="form-group"><label>Duration (min)</label><input name="duration" type="number" min="5" value="60" required></div><div class="form-group"><label>Date</label><input name="date" type="date" value="${todayISO()}" required></div></div>${Tags.input('tags')}`,
      onSubmit: (fd) => { State.data.study.push({ id: uid(), topic: fd.get('topic'), duration: Number(fd.get('duration')), date: fd.get('date'), done: false, pomodoros: 0, tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); this.render(); State.updateStreak(); Toast.show('Study block added', 'success'); }
    });
  },
  editStudy(id) {
    const s = State.data.study.find(x => x.id === id);
    Modal.open({
      title: 'Edit Study Block',
      body: `<div class="form-group"><label>Topic</label><input name="topic" value="${esc(s.topic)}" required></div><div class="form-row"><div class="form-group"><label>Duration (min)</label><input name="duration" type="number" min="5" value="${s.duration}" required></div><div class="form-group"><label>Date</label><input name="date" type="date" value="${s.date}" required></div></div>${Tags.input('tags', s.tags)}`,
      onSubmit: (fd) => { Object.assign(s, { topic: fd.get('topic'), duration: Number(fd.get('duration')), date: fd.get('date'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); this.render(); },
      onDelete: () => { State.data.study = State.data.study.filter(x => x.id !== id); State.save(); this.render(); }
    });
  },
  toggleStudy(id) { const s = State.data.study.find(x => x.id === id); if (s) { s.done = !s.done; State.save(); State.updateStreak(); this.render(); if (s.done) Confetti.burst(); } },

  // ===== JOURNAL =====
  addJournal() {
    Modal.open({
      title: 'New Journal Entry',
      body: `<div class="form-group"><label>Date</label><input name="date" type="date" value="${todayISO()}" required></div><div class="form-group"><label>What did you learn this week?</label><textarea name="learned" rows="2" placeholder="Key insights, new skills..."></textarea></div><div class="form-group"><label>What's blocking you?</label><textarea name="blocking" rows="2" placeholder="Challenges, obstacles..."></textarea></div><div class="form-group"><label>What's your #1 priority next week?</label><textarea name="priority" rows="2" placeholder="Main focus..."></textarea></div><div class="form-group"><label>Full Reflection</label><textarea name="content" rows="6" placeholder="Write your weekly reflection here..."></textarea></div>`,
      onSubmit: (fd) => {
        State.data.journal.push({
          id: uid(), date: fd.get('date'), content: fd.get('content'),
          prompts: { learned: fd.get('learned'), blocking: fd.get('blocking'), priority: fd.get('priority') }
        });
        State.save(); this.render(); Toast.show('📓 Journal entry saved', 'success');
        Confetti.burst();
      }
    });
  },
  editJournal(id) {
    const e = State.data.journal.find(x => x.id === id);
    Modal.open({
      title: 'Edit Journal Entry',
      body: `<div class="form-group"><label>Date</label><input name="date" type="date" value="${e.date}" required></div><div class="form-group"><label>Learned</label><textarea name="learned" rows="2">${esc(e.prompts?.learned || '')}</textarea></div><div class="form-group"><label>Blocking</label><textarea name="blocking" rows="2">${esc(e.prompts?.blocking || '')}</textarea></div><div class="form-group"><label>Priority</label><textarea name="priority" rows="2">${esc(e.prompts?.priority || '')}</textarea></div><div class="form-group"><label>Full Reflection</label><textarea name="content" rows="6">${esc(e.content)}</textarea></div>`,
      onSubmit: (fd) => { Object.assign(e, { date: fd.get('date'), content: fd.get('content'), prompts: { learned: fd.get('learned'), blocking: fd.get('blocking'), priority: fd.get('priority') } }); State.save(); this.render(); },
      onDelete: () => { State.data.journal = State.data.journal.filter(x => x.id !== id); State.save(); this.render(); }
    });
  },
  deleteJournal(id) { if (confirm('Delete this entry?')) { State.data.journal = State.data.journal.filter(x => x.id !== id); State.save(); this.render(); } },

  // ===== GOALS =====
  addGoal() {
    Modal.open({
      title: 'Add Goal',
      body: `<div class="form-group"><label>Goal Title</label><input name="title" required></div><div class="form-row"><div class="form-group"><label>Deadline</label><input name="deadline" type="date" required></div><div class="form-group"><label>Priority</label><select name="priority"><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select></div></div>${Tags.input('tags')}`,
      onSubmit: (fd) => { State.data.goals.push({ id: uid(), title: fd.get('title'), deadline: fd.get('deadline'), done: false, priority: fd.get('priority'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); this.render(); Toast.show('Goal added', 'success'); }
    });
  },
  editGoal(id) {
    const g = State.data.goals.find(x => x.id === id);
    Modal.open({
      title: 'Edit Goal',
      body: `<div class="form-group"><label>Title</label><input name="title" value="${esc(g.title)}" required></div><div class="form-row"><div class="form-group"><label>Deadline</label><input name="deadline" type="date" value="${g.deadline}" required></div><div class="form-group"><label>Priority</label><select name="priority">${['high','medium','low'].map(p => `<option value="${p}" ${g.priority === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div></div>${Tags.input('tags', g.tags)}`,
      onSubmit: (fd) => { Object.assign(g, { title: fd.get('title'), deadline: fd.get('deadline'), priority: fd.get('priority'), tags: Tags.parse(fd.get('tags')) }); Tags.sync(); State.save(); this.render(); },
      onDelete: () => { State.data.goals = State.data.goals.filter(x => x.id !== id); State.save(); this.render(); }
    });
  },
  toggleGoal(id) { const g = State.data.goals.find(x => x.id === id); if (g) { g.done = !g.done; State.save(); this.render(); if (g.done) { Toast.show('🎉 Goal achieved!', 'success'); Confetti.burst(); Notifier.send('🎉 Goal Achieved!', g.title); } } },

  // ===== INBOX =====
  convertInbox(id, type) {
    const item = State.data.inbox.find(i => i.id === id);
    if (!item) return;
    if (type === 'task') { State.data.tasks.push({ id: uid(), title: item.content, deadline: addDays(7), done: false, source: 'Inbox', priority: 'medium', importance: true, urgency: false, tags: [] }); Toast.show('✅ Converted to task', 'success'); }
    else if (type === 'study') { State.data.study.push({ id: uid(), topic: item.content, duration: 60, date: todayISO(), done: false, pomodoros: 0, tags: [] }); Toast.show('📚 Converted to study', 'success'); }
    State.data.inbox = State.data.inbox.filter(i => i.id !== id);
    State.save(); this.updateInboxBadge(); this.render();
  },
  deleteInbox(id) { State.data.inbox = State.data.inbox.filter(i => i.id !== id); State.save(); this.updateInboxBadge(); this.render(); },

  // ===== SHARE CARD =====
  openShareCard() {
    const streak = State.data.settings.streak;
    const submitted = State.data.applications.filter(a => ['submitted','interview','accepted'].includes(a.status)).length;
    const papersRead = State.data.papers.filter(p => p.status === 'finished').length;
    const weekStudy = State.data.study.filter(s => s.date >= addDays(-7) && s.done).reduce((sum, s) => sum + s.duration, 0);
    document.getElementById('shareDate').textContent = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    document.getElementById('shareStats').innerHTML = `
      <div class="share-stat"><div class="share-stat-value">${submitted}</div><div class="share-stat-label">Apps Submitted</div></div>
      <div class="share-stat"><div class="share-stat-value">${papersRead}</div><div class="share-stat-label">Papers Read</div></div>
      <div class="share-stat"><div class="share-stat-value">${Math.round(weekStudy / 60)}h</div><div class="share-stat-label">Study / Week</div></div>
    `;
    document.getElementById('shareStreak').innerHTML = `<div style="font-size:28px;font-weight:800">🔥 ${streak.current} day streak</div><div style="font-size:11px;opacity:0.85;margin-top:4px">Longest: ${streak.longest} days</div>`;
    document.getElementById('exportImageModal').showModal();
  },
  downloadShareCard() {
    Toast.show('💡 Tip: Use screenshot tool to capture the card above', 'info');
  },
  copyShareText() {
    const streak = State.data.settings.streak;
    const submitted = State.data.applications.filter(a => ['submitted','interview','accepted'].includes(a.status)).length;
    const papersRead = State.data.papers.filter(p => p.status === 'finished').length;
    const text = `🎓 My PhD Journey Update!\n\n📬 ${submitted} applications submitted\n📄 ${papersRead} papers read\n🔥 ${streak.current}-day study streak\n\n#PhDJourney #ScholarSync #AcademicTwitter`;
    navigator.clipboard.writeText(text).then(() => Toast.show('📋 Copied to clipboard', 'success'));
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());