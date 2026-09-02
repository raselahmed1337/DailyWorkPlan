// ========== CONSTANTS ==========
const STORAGE_KEY = 'scholarsync_v3';
const POMODORO_WORK = 25 * 60;
const POMODORO_BREAK = 5 * 60;

const EMAIL_TEMPLATES = {
  cold: {
    name: 'Cold Email to Professor',
    subject: 'Prospective PhD Student — Research Inquiry',
    body: `Dear Professor {{LAST_NAME}},\n\nI hope this email finds you well. My name is {{YOUR_NAME}}, and I am a prospective PhD student interested in joining your research group at {{UNIVERSITY}}.\n\nI recently read your paper "{{PAPER_TITLE}}" and was particularly fascinated by {{SPECIFIC_ASPECT}}. My own background in {{YOUR_BACKGROUND}} aligns well with your work on {{RESEARCH_AREA}}.\n\nI would be grateful for the opportunity to discuss potential PhD openings in your lab. I have attached my CV for your reference.\n\nThank you for your time and consideration.\n\nBest regards,\n{{YOUR_NAME}}`
  },
  followup: {
    name: 'Follow-Up Email',
    subject: 'Following Up — PhD Inquiry',
    body: `Dear Professor {{LAST_NAME}},\n\nI hope you're doing well. I'm following up on my email from {{ORIGINAL_DATE}} regarding potential PhD opportunities in your research group.\n\nI remain very interested in your work on {{RESEARCH_AREA}} and would welcome the chance to discuss how my background in {{YOUR_BACKGROUND}} could contribute to your team.\n\nBest regards,\n{{YOUR_NAME}}`
  },
  lor: {
    name: 'Letter of Recommendation Request',
    subject: 'Request for Letter of Recommendation',
    body: `Dear Professor {{LAST_NAME}},\n\nI am writing to kindly ask if you would be willing to provide a letter of recommendation for my PhD applications.\n\nI had the privilege of {{CONTEXT}}. Your guidance significantly shaped my research interests in {{RESEARCH_AREA}}.\n\nI am applying to PhD programs with a deadline of {{DEADLINE}}.\n\nThank you very much for considering my request.\n\nBest regards,\n{{YOUR_NAME}}`
  },
  thanks: {
    name: 'Thank You After Meeting',
    subject: 'Thank You — Our Meeting Today',
    body: `Dear Professor {{LAST_NAME}},\n\nThank you for taking the time to meet with me today. I truly appreciated your insights on {{TOPIC_DISCUSSED}}.\n\nAs discussed, I will {{ACTION_ITEM}} by {{DEADLINE}}.\n\nBest regards,\n{{YOUR_NAME}}`
  }
};

const DEFAULT_DOCS = ['Statement of Purpose', 'CV / Resume', 'Transcripts', 'Letter of Rec. #1', 'Letter of Rec. #2', 'Research Proposal', 'Writing Sample'];

// ========== STATE ==========
const defaultState = {
  applications: [],
  emails: [],
  meetings: [],
  study: [],
  goals: [],
  tasks: [],
  professors: [],
  funding: [],
  inbox: [],
  settings: { 
    theme: 'system', 
    remindersEnabled: false,
    streak: { current: 0, longest: 0, lastStudyDate: null }
  }
};

const State = {
  data: structuredClone(defaultState),
  currentView: 'dashboard',
  calendarDate: new Date(),

  init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.data = { ...structuredClone(defaultState), ...parsed };
        if (!Array.isArray(this.data.tasks)) this.data.tasks = [];
        if (!Array.isArray(this.data.professors)) this.data.professors = [];
        if (!Array.isArray(this.data.funding)) this.data.funding = [];
        if (!Array.isArray(this.data.inbox)) this.data.inbox = [];
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
        { id: uid(), university: 'ETH Zurich', program: 'PhD in Computer Science', deadline: '2026-12-15', status: 'preparing', notes: 'Prof. Smith lab', documents: DEFAULT_DOCS.map(d => ({ name: d, done: false })) },
        { id: uid(), university: 'MIT', program: 'PhD in EECS', deadline: '2026-12-01', status: 'target', notes: '', documents: DEFAULT_DOCS.map(d => ({ name: d, done: false })) }
      ],
      emails: [{ id: uid(), professor: 'Dr. Jane Smith', university: 'ETH Zurich', dateSent: todayISO(), status: 'awaiting', followUpDate: addDays(7) }],
      meetings: [{ id: uid(), title: 'Advisor Meeting', date: addDays(2) + 'T14:00', with: 'Prof. Johnson', agenda: 'Discuss research proposal', notes: '- Draft 1-page summary\n- Email Prof. X' }],
      study: [{ id: uid(), topic: 'Read paper: Attention Is All You Need', duration: 60, date: todayISO(), done: false, pomodoros: 0 }],
      goals: [
        { id: uid(), title: 'Finalize university shortlist (8-10)', deadline: addDays(14), done: false },
        { id: uid(), title: 'Secure 2 Letters of Recommendation', deadline: addDays(30), done: false }
      ],
      tasks: [{ id: uid(), title: 'Update CV with recent projects', deadline: addDays(3), done: false, source: 'Manual' }],
      professors: [
        { id: uid(), name: 'Dr. Jane Smith', university: 'ETH Zurich', lab: 'AI Lab', researchArea: 'Medical Imaging, Agentic AI', papersRead: 2, status: 'contacted', notes: 'Very responsive. Interested in my background.' },
        { id: uid(), name: 'Dr. John Doe', university: 'MIT', lab: 'CSAIL', researchArea: 'Robotics', papersRead: 0, status: 'researching', notes: '' }
      ],
      funding: [
        { id: uid(), name: 'ETH Zurich Excellence Scholarship', amount: 'CHF 12,000/year', deadline: '2026-11-30', status: 'preparing', requirements: 'Separate application, research proposal' }
      ],
      inbox: [
        { id: uid(), content: 'Check out the new paper on Mamba architecture — might be relevant for my research', tag: 'paper', date: todayISO() }
      ],
      settings: { theme: 'system', remindersEnabled: false, streak: { current: 0, longest: 0, lastStudyDate: null } }
    };
    this.save();
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    this.emit();
  },

  subscribe(fn) { /* ... */ },
  emit() { /* ... */ },

  updateStreak() {
    const today = todayISO();
    const yesterday = addDays(-1);
    const streak = this.data.settings.streak;
    const studiedToday = this.data.study.some(s => s.date === today && s.done);
    
    if (studiedToday && streak.lastStudyDate !== today) {
      if (streak.lastStudyDate === yesterday) {
        streak.current += 1;
      } else {
        streak.current = 1;
      }
      streak.lastStudyDate = today;
      if (streak.current > streak.longest) streak.longest = streak.current;
      this.save();
    } else if (!studiedToday && streak.lastStudyDate && streak.lastStudyDate < yesterday) {
      streak.current = 0;
      this.save();
    }
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
const minutesUntil = (dateTime) => dateTime ? Math.round((new Date(dateTime).getTime() - Date.now()) / 60000) : null;

const parseNotesToTasks = (notes, meetingTitle) => {
  if (!notes) return [];
  return notes.split('\n').map(l => l.trim().replace(/^[-*•]\s*/, '').replace(/^\[\s*\]\s*/, '')).filter(Boolean).map(t => ({
    id: uid(), title: t, deadline: addDays(7), done: false, source: `Meeting: ${meetingTitle}`
  }));
};

// ========== SERVICES (Notifier, Toast, Modal, Pomodoro) ==========
// [Same as previous version - Notifier, Toast, Modal, Pomodoro objects]
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
      this.send('Meeting Soon', `${upcomingMeeting.title} soon`);
      return;
    }
    const urgentApp = State.data.applications.find(a => { const d = daysUntil(a.deadline); return d !== null && d >= 0 && d <= 7 && !['submitted','accepted','rejected'].includes(a.status); });
    if (urgentApp) this.showBanner(`Application due in ${daysUntil(urgentApp.deadline)} days`, `${urgentApp.university}`);
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
      ...State.data.funding.filter(f => !['awarded','rejected'].includes(f.status)).map(f => ({ type: 'funding', title: f.name, date: f.deadline + 'T23:59', meta: f.amount }))
    ].filter(e => new Date(e.date).getTime() > Date.now()).sort((a, b) => new Date(a.date) - new Date(b.date));

    const next = allEvents[0];

    // Weekly review data
    const weekAgo = addDays(-7);
    const weekStudy = State.data.study.filter(s => s.date >= weekAgo && s.done);
    const weekMins = weekStudy.reduce((sum, s) => sum + s.duration, 0);
    const weekTasksDone = State.data.tasks.filter(t => t.done).length;
    const weekAppsSubmitted = State.data.applications.filter(a => a.status === 'submitted').length;

    return `
      ${streak.current > 0 ? `
        <div class="streak-card">
          <div class="streak-fire">🔥</div>
          <div class="streak-info">
            <strong>${streak.current} day${streak.current !== 1 ? 's' : ''} streak</strong>
            <small>Longest: ${streak.longest} days • Keep studying to maintain!</small>
          </div>
        </div>
      ` : ''}

      ${next ? `
        <div class="upnext-card">
          <h3>⏰ Up Next</h3>
          <div class="upnext-title">${esc(next.title)}</div>
          <div class="upnext-meta">${esc(next.meta)} • ${fmtDate(next.date.slice(0, 10))}</div>
          <span class="countdown">${this.countdown(next.date)}</span>
        </div>
      ` : ''}

      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon">🎓</div><div><div class="stat-value">${submitted}/${apps.length}</div><div class="stat-label">Applications</div></div></div>
        <div class="stat-card"><div class="stat-icon warning">📧</div><div><div class="stat-value">${awaitingReply}</div><div class="stat-label">Awaiting Reply</div></div></div>
        <div class="stat-card"><div class="stat-icon success">💰</div><div><div class="stat-value">${State.data.funding.length}</div><div class="stat-label">Funding Tracked</div></div></div>
        <div class="stat-card"><div class="stat-icon">✅</div><div><div class="stat-value">${tasksPending}</div><div class="stat-label">Open Tasks</div></div></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-head"><div><h3>Upcoming Deadlines</h3><small>All time-bound items</small></div></div>
          <div class="list">
            ${allEvents.slice(0, 6).map(e => `
              <div class="list-item">
                <div style="font-size:20px">${{meeting:'🤝',goal:'🎯',task:'✅',application:'🎓',funding:'💰'}[e.type]}</div>
                <div class="list-item-content">
                  <div class="list-item-title">${esc(e.title)}</div>
                  <div class="list-item-meta">${esc(e.meta)} • ${fmtDate(e.date.slice(0, 10))}</div>
                </div>
                <span class="badge ${daysUntil(e.date.slice(0, 10)) <= 3 ? 'danger' : daysUntil(e.date.slice(0, 10)) <= 7 ? 'warning' : 'primary'}">${daysUntil(e.date.slice(0, 10))}d</span>
              </div>
            `).join('') || '<div class="empty"><div class="empty-icon">✨</div><div class="empty-title">All clear!</div></div>'}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><h3>Today's Study</h3><small>${fmtDate(todayISO())}</small></div><button class="btn btn-sm btn-ghost" onclick="App.switchView('study')">View all</button></div>
          <div class="list">
            ${State.data.study.filter(s => s.date === todayISO()).map(s => `
              <div class="list-item">
                <input type="checkbox" ${s.done ? 'checked' : ''} onchange="App.toggleStudy('${s.id}')" style="width:18px;height:18px;cursor:pointer">
                <div class="list-item-content">
                  <div class="list-item-title" style="${s.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${esc(s.topic)}</div>
                  <div class="list-item-meta">${s.duration} min • 🍅 ${s.pomodoros || 0}</div>
                </div>
                ${!s.done ? `<button class="pomodoro-start" onclick="Pomodoro.start('${s.id}')">🍅 Focus</button>` : ''}
              </div>
            `).join('') || '<div class="empty"><div class="empty-icon">📚</div><div class="empty-title">No study planned</div></div>'}
          </div>
        </div>
      </div>

      <div class="weekly-review">
        <h3>📊 Weekly Review</h3>
        <small>Last 7 days performance</small>
        <div class="review-stats">
          <div class="review-stat"><div class="review-stat-value">${Math.round(weekMins / 60 * 10) / 10}h</div><div class="review-stat-label">Study Time</div></div>
          <div class="review-stat"><div class="review-stat-value">${weekStudy.length}</div><div class="review-stat-label">Sessions Done</div></div>
          <div class="review-stat"><div class="review-stat-value">${weekTasksDone}</div><div class="review-stat-label">Tasks Done</div></div>
          <div class="review-stat"><div class="review-stat-value">${weekAppsSubmitted}</div><div class="review-stat-label">Apps Submitted</div></div>
          <div class="review-stat"><div class="review-stat-value">${streak.current}</div><div class="review-stat-label">Day Streak</div></div>
        </div>
      </div>

      ${this.renderCharts()}
    `;
  },

  // ===== CALENDAR VIEW =====
  calendar() {
    const d = State.calendarDate;
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const monthName = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    // Gather events by date
    const eventsByDate = {};
    const addEvent = (date, type, title) => {
      if (!date) return;
      const key = date.slice(0, 10);
      if (!eventsByDate[key]) eventsByDate[key] = [];
      eventsByDate[key].push({ type, title });
    };

    State.data.meetings.forEach(m => addEvent(m.date, 'meeting', m.title));
    State.data.applications.forEach(a => addEvent(a.deadline, 'deadline', `${a.university}`));
    State.data.goals.forEach(g => addEvent(g.deadline, 'goal', g.title));
    State.data.study.forEach(s => addEvent(s.date, 'study', s.topic));
    State.data.funding.forEach(f => addEvent(f.deadline, 'deadline', f.name));

    // Previous month padding
    const prevMonthLast = new Date(year, month, 0).getDate();
    let cells = '';
    for (let i = startPad - 1; i >= 0; i--) {
      cells += `<div class="calendar-day other-month"><div class="calendar-day-num">${prevMonthLast - i}</div></div>`;
    }
    // Current month
    const today = todayISO();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const events = eventsByDate[dateStr] || [];
      const isToday = dateStr === today;
      cells += `
        <div class="calendar-day ${isToday ? 'today' : ''}" onclick="App.showDayDetail('${dateStr}')">
          <div class="calendar-day-num">${day}</div>
          ${events.slice(0, 3).map(e => `<div class="calendar-event ${e.type}">${esc(e.title)}</div>`).join('')}
          ${events.length > 3 ? `<div class="calendar-more">+${events.length - 3} more</div>` : ''}
        </div>
      `;
    }
    // Next month padding
    const totalCells = startPad + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      cells += `<div class="calendar-day other-month"><div class="calendar-day-num">${i}</div></div>`;
    }

    return `
      <div class="card">
        <div class="calendar-controls">
          <div class="calendar-month">${monthName}</div>
          <div class="calendar-nav">
            <button class="btn btn-ghost btn-sm" onclick="App.changeMonth(-1)">← Prev</button>
            <button class="btn btn-ghost btn-sm" onclick="App.goToToday()">Today</button>
            <button class="btn btn-ghost btn-sm" onclick="App.changeMonth(1)">Next →</button>
          </div>
        </div>
        <div class="calendar-grid">
          ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="calendar-day-header">${d}</div>`).join('')}
          ${cells}
        </div>
      </div>
      <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;font-size:11px">
        <span class="badge primary">🤝 Meetings</span>
        <span class="badge danger">📅 Deadlines</span>
        <span class="badge success">📚 Study</span>
        <span class="badge warning">🎯 Goals</span>
      </div>
    `;
  },

  // ===== PROFESSORS VIEW =====
  professors() {
    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px">
        <div></div>
        <button class="btn btn-primary" onclick="App.addProfessor()">+ Add Professor</button>
      </div>
      <div class="prof-grid">
        ${State.data.professors.map(p => `
          <div class="prof-card">
            <div class="prof-head">
              <div class="prof-avatar">${esc(p.name.charAt(0))}</div>
              <div>
                <div class="prof-name">${esc(p.name)}</div>
                <div class="prof-uni">${esc(p.university)}${p.lab ? ` • ${esc(p.lab)}` : ''}</div>
              </div>
            </div>
            <div class="prof-details">
              ${p.researchArea ? `<span>🔬 ${esc(p.researchArea)}</span>` : ''}
              <span>📄 ${p.papersRead || 0} papers read</span>
              <span class="badge ${p.status === 'contacted' ? 'success' : p.status === 'researching' ? 'warning' : ''}">${esc(p.status || 'researching')}</span>
            </div>
            ${p.notes ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;line-height:1.5">${esc(p.notes)}</div>` : ''}
            <div class="prof-actions">
              <button class="btn btn-sm btn-ghost" onclick="App.editProfessor('${p.id}')">Edit</button>
              <button class="btn btn-sm btn-primary" onclick="App.emailProfessor('${p.id}')">📧 Email</button>
            </div>
          </div>
        `).join('') || '<div class="empty"><div class="empty-icon">🔬</div><div class="empty-title">No professors saved</div><div>Track potential advisors here</div></div>'}
      </div>
    `;
  },

  // ===== FUNDING VIEW =====
  funding() {
    const totalAmount = State.data.funding.filter(f => f.status === 'awarded').length;
    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px">
        <div class="stat-card" style="padding:12px 16px">
          <div><div class="stat-value">${State.data.funding.length}</div><div class="stat-label">Funding opportunities tracked</div></div>
        </div>
        <button class="btn btn-primary" onclick="App.addFunding()">+ Add Funding</button>
      </div>
      <div>
        ${State.data.funding.map(f => {
          const d = daysUntil(f.deadline);
          const overdue = !['awarded','rejected'].includes(f.status) && d < 0;
          return `
            <div class="funding-item" style="${overdue ? 'border-color:var(--danger)' : ''}">
              <div class="funding-amount">${esc(f.amount || '—')}</div>
              <div class="funding-info">
                <div class="funding-name">${esc(f.name)}</div>
                <div class="funding-meta">
                  Due ${fmtDate(f.deadline)}
                  ${overdue ? ' • <span style="color:var(--danger);font-weight:600">Overdue</span>' : d !== null && d <= 7 ? ` • <span style="color:var(--warning);font-weight:600">${d} days left</span>` : ''}
                  ${f.requirements ? ` • ${esc(f.requirements)}` : ''}
                </div>
                <div style="margin-top:6px"><span class="badge ${f.status === 'awarded' ? 'success' : f.status === 'rejected' ? 'danger' : 'warning'}">${esc(f.status)}</span></div>
              </div>
              <button class="btn btn-sm btn-ghost" onclick="App.editFunding('${f.id}')">Edit</button>
            </div>
          `;
        }).join('') || '<div class="empty"><div class="empty-icon">💰</div><div class="empty-title">No funding tracked</div><div>Add scholarships and grants here</div></div>'}
      </div>
    `;
  },

  // ===== INBOX VIEW =====
  inbox() {
    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px">
        <div>
          <p style="font-size:12px;color:var(--text-muted);margin-top:4px">Capture ideas, papers, questions. Sort later.</p>
        </div>
        <button class="btn btn-primary" onclick="App.openQuickCapture()">⚡ Quick Capture</button>
      </div>
      <div>
        ${State.data.inbox.map(i => `
          <div class="inbox-item">
            <div style="flex:1">
              <div class="inbox-content">${esc(i.content)}</div>
              <div style="display:flex;gap:6px;margin-top:6px;align-items:center">
                ${i.tag ? `<span class="inbox-tag">${esc(i.tag)}</span>` : ''}
                <span class="inbox-date">${fmtDate(i.date)}</span>
              </div>
            </div>
            <div class="inbox-actions">
              <button class="btn btn-sm btn-ghost" onclick="App.convertInbox('${i.id}', 'task')" title="Convert to task">✅</button>
              <button class="btn btn-sm btn-ghost" onclick="App.convertInbox('${i.id}', 'study')" title="Convert to study">📚</button>
              <button class="btn btn-sm btn-ghost" onclick="App.deleteInbox('${i.id}')" title="Delete">×</button>
            </div>
          </div>
        `).join('') || '<div class="empty"><div class="empty-icon">📥</div><div class="empty-title">Inbox zero!</div><div>Use Quick Capture (Ctrl+Q) to add items</div></div>'}
      </div>
    `;
  },

  // [Keep existing: applications, emails, meetings, tasks, study, goals views]
  // ... (same as previous version)
  
  applications() {
    const statuses = [
      { id: 'target', label: 'Target List' },
      { id: 'preparing', label: 'Preparing Docs' },
      { id: 'submitted', label: 'Submitted' },
      { id: 'interview', label: 'Interviewing' },
      { id: 'accepted', label: 'Accepted' },
      { id: 'rejected', label: 'Rejected' }
    ];
    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px">
        <div></div>
        <button class="btn btn-primary" onclick="App.addApplication()">+ Add Application</button>
      </div>
      <div class="kanban">
        ${statuses.map(s => {
          const items = State.data.applications.filter(a => a.status === s.id);
          return `
            <div class="kanban-col" data-status="${s.id}" ondragover="event.preventDefault()" ondrop="App.dropApplication(event, '${s.id}')">
              <div class="kanban-col-head"><span>${s.label}</span><span class="kanban-col-count">${items.length}</span></div>
              ${items.map(a => {
                const docs = a.documents || [];
                const docsDone = docs.filter(d => d.done).length;
                return `
                  <div class="kanban-card" draggable="true" data-id="${a.id}" ondragstart="App.dragApplication(event, '${a.id}')">
                    <div class="kanban-card-title">${esc(a.university)}</div>
                    <div class="kanban-card-meta">
                      <span class="badge">${esc(a.program)}</span>
                      ${a.deadline ? `<span class="badge ${daysUntil(a.deadline) <= 7 ? 'warning' : ''}">${fmtDate(a.deadline)}</span>` : ''}
                    </div>
                    ${docs.length > 0 ? `
                      <div class="doc-checklist">
                        <div class="doc-progress">📄 ${docsDone}/${docs.length} documents</div>
                        ${docs.slice(0, 3).map(d => `
                          <div class="doc-item ${d.done ? 'done' : ''}">
                            <input type="checkbox" ${d.done ? 'checked' : ''} onchange="App.toggleDoc('${a.id}', '${esc(d.name)}')">
                            <span>${esc(d.name)}</span>
                          </div>
                        `).join('')}
                        ${docs.length > 3 ? `<div style="font-size:10px;color:var(--text-muted)">+${docs.length - 3} more</div>` : ''}
                      </div>
                    ` : ''}
                    <button class="btn btn-sm btn-ghost" style="margin-top:8px;width:100%" onclick="App.editApplication('${a.id}')">Edit</button>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  emails() {
    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px">
        <button class="btn btn-ghost" onclick="App.openTemplates()">📧 Email Templates</button>
        <button class="btn btn-primary" onclick="App.addEmail()">+ Log Email</button>
      </div>
      <div class="card"><div class="list">
        ${State.data.emails.map(e => {
          const overdue = e.status === 'awaiting' && daysUntil(e.followUpDate) < 0;
          return `
            <div class="list-item" style="${overdue ? 'border-color:var(--danger);background:var(--danger-soft)' : ''}">
              <div style="font-size:20px">📧</div>
              <div class="list-item-content">
                <div class="list-item-title">${esc(e.professor)} <span class="badge ${e.status === 'replied' ? 'success' : e.status === 'awaiting' ? 'warning' : ''}">${e.status}</span></div>
                <div class="list-item-meta">${esc(e.university)} • Sent ${fmtDate(e.dateSent)} ${overdue ? '• <strong style="color:var(--danger)">Follow-up overdue!</strong>' : `• Follow-up ${fmtDate(e.followUpDate)}`}</div>
              </div>
              <button class="btn btn-sm btn-ghost" onclick="App.editEmail('${e.id}')">Edit</button>
            </div>
          `;
        }).join('') || '<div class="empty"><div class="empty-icon">📧</div><div class="empty-title">No emails logged</div></div>'}
      </div></div>
    `;
  },

  meetings() {
    const upcoming = State.data.meetings.filter(m => new Date(m.date).getTime() >= Date.now() - 86400000).sort((a, b) => new Date(a.date) - new Date(b.date));
    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addMeeting()">+ Schedule Meeting</button></div>
      <div class="card"><div class="list">
        ${upcoming.map(m => {
          const mins = minutesUntil(m.date);
          const isSoon = mins > 0 && mins <= 60;
          return `
            <div class="list-item" style="${isSoon ? 'border-color:var(--warning);background:var(--warning-soft)' : ''}">
              <div style="font-size:20px">🤝</div>
              <div class="list-item-content">
                <div class="list-item-title">${esc(m.title)} ${isSoon ? '<span class="badge warning">Soon</span>' : ''}</div>
                <div class="list-item-meta">with ${esc(m.with)} • ${fmtDate(m.date.slice(0, 10))} at ${m.date.slice(11, 16) || '—'}</div>
                ${m.agenda ? `<div class="list-item-meta" style="margin-top:4px">📝 ${esc(m.agenda)}</div>` : ''}
              </div>
              <button class="btn btn-sm btn-ghost" onclick="App.editMeeting('${m.id}')">Edit</button>
            </div>
          `;
        }).join('') || '<div class="empty"><div class="empty-icon">🤝</div><div class="empty-title">No meetings scheduled</div></div>'}
      </div></div>
    `;
  },

  tasks() {
    const pending = State.data.tasks.filter(t => !t.done).sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
    const done = State.data.tasks.filter(t => t.done);
    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addTask()">+ Add Task</button></div>
      <div class="card">
        <div class="card-head"><div><h3>Pending Tasks</h3><small>${pending.length} open</small></div></div>
        <div>
          ${pending.map(t => {
            const d = daysUntil(t.deadline);
            const overdue = d !== null && d < 0;
            return `
              <div class="task-item" style="${overdue ? 'border-color:var(--danger)' : ''}">
                <input type="checkbox" ${t.done ? 'checked' : ''} onchange="App.toggleTask('${t.id}')" style="width:18px;height:18px;cursor:pointer">
                <div style="flex:1">
                  <div class="task-item-title">${esc(t.title)}</div>
                  <div class="task-item-meta">Due ${fmtDate(t.deadline)} ${t.source ? `• <span class="task-source">${esc(t.source)}</span>` : ''} ${overdue ? '• <span style="color:var(--danger);font-weight:600">Overdue</span>' : ''}</div>
                </div>
                <button class="btn btn-sm btn-ghost" onclick="App.editTask('${t.id}')">Edit</button>
              </div>
            `;
          }).join('') || '<div class="empty"><div class="empty-icon">✅</div><div class="empty-title">No pending tasks</div></div>'}
        </div>
      </div>
      ${done.length > 0 ? `
        <div class="card" style="margin-top:16px">
          <div class="card-head"><div><h3>Completed</h3><small>${done.length} done</small></div></div>
          <div>${done.map(t => `<div class="task-item done"><input type="checkbox" checked onchange="App.toggleTask('${t.id}')" style="width:18px;height:18px;cursor:pointer"><div style="flex:1"><div class="task-item-title">${esc(t.title)}</div></div></div>`).join('')}</div>
        </div>
      ` : ''}
    `;
  },

  study() {
    const today = State.data.study.filter(s => s.date === todayISO());
    const totalMin = today.reduce((sum, s) => sum + (s.done ? s.duration : 0), 0);
    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px">
        <div class="stat-card" style="padding:12px 16px"><div><div class="stat-value">${totalMin} min</div><div class="stat-label">Studied today</div></div></div>
        <button class="btn btn-primary" onclick="App.addStudy()">+ Add Study Block</button>
      </div>
      <div class="card">
        <div class="card-head"><div><h3>${fmtDate(todayISO())}</h3><small>${today.filter(s => s.done).length} of ${today.length} completed</small></div></div>
        <div class="list">
          ${today.map(s => `
            <div class="list-item">
              <input type="checkbox" ${s.done ? 'checked' : ''} onchange="App.toggleStudy('${s.id}')" style="width:18px;height:18px;cursor:pointer">
              <div class="list-item-content">
                <div class="list-item-title" style="${s.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${esc(s.topic)}</div>
                <div class="list-item-meta">${s.duration} min • 🍅 ${s.pomodoros || 0} pomodoros</div>
              </div>
              ${!s.done ? `<button class="pomodoro-start" onclick="Pomodoro.start('${s.id}')">🍅 Focus</button>` : ''}
              <button class="btn btn-sm btn-ghost" onclick="App.editStudy('${s.id}')">Edit</button>
            </div>
          `).join('') || '<div class="empty"><div class="empty-icon">📚</div><div class="empty-title">No study planned</div></div>'}
        </div>
      </div>
    `;
  },

  goals() {
    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px"><div></div><button class="btn btn-primary" onclick="App.addGoal()">+ Add Goal</button></div>
      <div class="card"><div class="list">
        ${State.data.goals.map(g => {
          const d = daysUntil(g.deadline);
          const overdue = !g.done && d < 0;
          return `
            <div class="list-item" style="${overdue ? 'border-color:var(--danger)' : ''}">
              <input type="checkbox" ${g.done ? 'checked' : ''} onchange="App.toggleGoal('${g.id}')" style="width:18px;height:18px;cursor:pointer">
              <div class="list-item-content">
                <div class="list-item-title" style="${g.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${esc(g.title)}</div>
                <div class="list-item-meta">Due ${fmtDate(g.deadline)} ${overdue ? '• <span style="color:var(--danger);font-weight:600">Overdue</span>' : d !== null && d <= 7 ? `• <span style="color:var(--warning);font-weight:600">${d} days left</span>` : ''}</div>
              </div>
              <button class="btn btn-sm btn-ghost" onclick="App.editGoal('${g.id}')">Edit</button>
            </div>
          `;
        }).join('') || '<div class="empty"><div class="empty-icon">🎯</div><div class="empty-title">No goals set</div></div>'}
      </div></div>
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

  renderCharts() {
    const statusCounts = { target: 0, preparing: 0, submitted: 0, interview: 0, accepted: 0, rejected: 0 };
    State.data.applications.forEach(a => { if (statusCounts[a.status] !== undefined) statusCounts[a.status]++; });
    const maxApp = Math.max(1, ...Object.values(statusCounts));
    const statusColors = { target: '#9ca3af', preparing: '#f59e0b', submitted: '#4f46e5', interview: '#8b5cf6', accepted: '#10b981', rejected: '#ef4444' };
    const appChartBars = Object.entries(statusCounts).map(([status, count], i) => {
      const height = (count / maxApp) * 150;
      const x = 30 + i * 55;
      return `<rect x="${x}" y="${180 - height}" width="40" height="${height}" fill="${statusColors[status]}" rx="4"/><text x="${x + 20}" y="${175 - height}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text)">${count}</text><text x="${x + 20}" y="195" text-anchor="middle" font-size="9" fill="var(--text-muted)">${status}</text>`;
    }).join('');

    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const mins = State.data.study.filter(s => s.date === iso && s.done).reduce((sum, s) => sum + s.duration, 0);
      last7.push({ mins, label: d.toLocaleDateString(undefined, { weekday: 'short' }) });
    }
    const maxMins = Math.max(60, ...last7.map(d => d.mins));
    const studyChartBars = last7.map((d, i) => {
      const height = (d.mins / maxMins) * 150;
      const x = 30 + i * 55;
      return `<rect x="${x}" y="${180 - height}" width="40" height="${height}" fill="var(--primary)" rx="4" opacity="0.85"/><text x="${x + 20}" y="${175 - height}" text-anchor="middle" font-size="10" font-weight="600" fill="var(--text)">${d.mins}m</text><text x="${x + 20}" y="195" text-anchor="middle" font-size="9" fill="var(--text-muted)">${d.label}</text>`;
    }).join('');

    return `<div class="charts-grid"><div class="chart-card"><h3>🎓 Application Pipeline</h3><small>Status breakdown</small><svg class="chart-svg" viewBox="0 0 360 210"><line x1="20" y1="180" x2="350" y2="180" stroke="var(--border)" stroke-width="1"/>${appChartBars}</svg></div><div class="chart-card"><h3>📚 Study Hours (Last 7 Days)</h3><small>Minutes per day</small><svg class="chart-svg" viewBox="0 0 360 210"><line x1="20" y1="180" x2="350" y2="180" stroke="var(--border)" stroke-width="1"/>${studyChartBars}</svg></div></div>`;
  }
};

// ========== MAIN APP ==========
const App = {
  init() {
    State.init();
    this.applyTheme();
    this.bindEvents();
    this.render();
    Notifier.startChecker();
    this.updateInboxBadge();
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    this.updateNotifButton();
    setInterval(() => { if (State.currentView === 'dashboard' || State.currentView === 'calendar') this.render(); }, 60000);
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
    if (State.data.settings.remindersEnabled) {
      btn.textContent = '🔔 Reminders On';
      btn.style.background = 'var(--success-soft)';
      btn.style.color = 'var(--success)';
    }
  },

  updateInboxBadge() {
    const badge = document.getElementById('inboxBadge');
    const count = State.data.inbox.length;
    if (count > 0) { badge.textContent = count; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
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
    document.getElementById('notifPermission').addEventListener('click', async () => {
      const granted = await Notifier.requestPermission();
      if (granted) { Toast.show('Reminders enabled!', 'success'); this.updateNotifButton(); }
    });
    document.getElementById('dismissReminder').addEventListener('click', () => Notifier.hideBanner());
    document.getElementById('closeModal').addEventListener('click', () => Modal.close());
    document.getElementById('closeTemplates').addEventListener('click', () => document.getElementById('templatesModal').close());
    document.getElementById('closeQuickCapture').addEventListener('click', () => document.getElementById('quickCaptureModal').close());
    document.getElementById('quickCaptureBtn').addEventListener('click', () => this.openQuickCapture());
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
        try {
          State.data = JSON.parse(ev.target.result);
          State.save();
          this.render();
          Toast.show('Data imported', 'success');
        } catch { Toast.show('Invalid backup file', 'error'); }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.key === 'Escape') { Modal.close(); document.getElementById('templatesModal').close(); document.getElementById('quickCaptureModal').close(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') { e.preventDefault(); this.openQuickCapture(); }
    });
  },

  openQuickCapture() { document.getElementById('quickCaptureModal').showModal(); },

  switchView(view) {
    State.currentView = view;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.view === view));
    const titles = {
      dashboard: ['Dashboard', 'Your PhD journey at a glance'],
      calendar: ['Calendar', 'Visual overview of all events'],
      applications: ['Applications', 'Track university applications'],
      professors: ['Professors', 'Research potential advisors'],
      funding: ['Funding', 'Scholarships and grants'],
      emails: ['Emails', 'Manage professor communications'],
      meetings: ['Meetings', 'Schedule and track meetings'],
      tasks: ['Tasks', 'Action items'],
      study: ['Study', 'Daily study blocks'],
      goals: ['Goals', 'Long-term milestones'],
      inbox: ['Inbox', 'Quick capture & sort later']
    };
    document.getElementById('viewTitle').textContent = titles[view][0];
    document.getElementById('viewSubtitle').textContent = titles[view][1];
    this.render();
  },

  render() {
    document.getElementById('viewContainer').innerHTML = Views[State.currentView]();
  },

  // ===== CALENDAR ACTIONS =====
  changeMonth(delta) {
    State.calendarDate.setMonth(State.calendarDate.getMonth() + delta);
    this.render();
  },
  goToToday() {
    State.calendarDate = new Date();
    this.render();
  },
  showDayDetail(dateStr) {
    const events = [];
    State.data.meetings.filter(m => m.date.startsWith(dateStr)).forEach(m => events.push({ type: 'meeting', title: m.title, meta: `with ${m.with}` }));
    State.data.applications.filter(a => a.deadline === dateStr).forEach(a => events.push({ type: 'deadline', title: `${a.university} deadline`, meta: a.program }));
    State.data.goals.filter(g => g.deadline === dateStr).forEach(g => events.push({ type: 'goal', title: g.title, meta: 'Goal' }));
    State.data.study.filter(s => s.date === dateStr).forEach(s => events.push({ type: 'study', title: s.topic, meta: `${s.duration} min` }));
    
    Modal.open({
      title: `📅 ${fmtDate(dateStr)}`,
      body: events.length ? `<div class="list">${events.map(e => `<div class="list-item"><div style="font-size:20px">${{meeting:'🤝',deadline:'📅',goal:'🎯',study:'📚'}[e.type]}</div><div class="list-item-content"><div class="list-item-title">${esc(e.title)}</div><div class="list-item-meta">${esc(e.meta)}</div></div></div>`).join('')}</div>` : '<div class="empty"><div class="empty-icon">✨</div><div class="empty-title">Nothing scheduled</div></div>',
      onSubmit: () => {}
    });
    document.getElementById('modalDelete').classList.add('hidden');
    document.querySelector('#modalForm button[type="submit"]').classList.add('hidden');
  },

  // ===== PROFESSOR ACTIONS =====
  addProfessor() {
    Modal.open({
      title: 'Add Professor',
      body: `
        <div class="form-group"><label>Name</label><input name="name" required placeholder="Dr. Jane Smith"></div>
        <div class="form-row">
          <div class="form-group"><label>University</label><input name="university" required></div>
          <div class="form-group"><label>Lab</label><input name="lab" placeholder="AI Lab"></div>
        </div>
        <div class="form-group"><label>Research Area</label><input name="researchArea" placeholder="Medical Imaging, NLP"></div>
        <div class="form-row">
          <div class="form-group"><label>Papers Read</label><input name="papersRead" type="number" min="0" value="0"></div>
          <div class="form-group"><label>Status</label>
            <select name="status">
              <option value="researching">Researching</option>
              <option value="contacted">Contacted</option>
              <option value="replied">Replied</option>
              <option value="meeting_scheduled">Meeting Scheduled</option>
              <option value="not_interested">Not Interested</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label>Notes</label><textarea name="notes" rows="3" placeholder="Key findings, mutual interests..."></textarea></div>
      `,
      onSubmit: (fd) => {
        State.data.professors.push({
          id: uid(), name: fd.get('name'), university: fd.get('university'), lab: fd.get('lab'),
          researchArea: fd.get('researchArea'), papersRead: Number(fd.get('papersRead')) || 0,
          status: fd.get('status'), notes: fd.get('notes')
        });
        State.save(); this.render(); Toast.show('Professor added', 'success');
      }
    });
  },

  editProfessor(id) {
    const p = State.data.professors.find(x => x.id === id);
    Modal.open({
      title: 'Edit Professor',
      body: `
        <div class="form-group"><label>Name</label><input name="name" value="${esc(p.name)}" required></div>
        <div class="form-row">
          <div class="form-group"><label>University</label><input name="university" value="${esc(p.university)}" required></div>
          <div class="form-group"><label>Lab</label><input name="lab" value="${esc(p.lab || '')}"></div>
        </div>
        <div class="form-group"><label>Research Area</label><input name="researchArea" value="${esc(p.researchArea || '')}"></div>
        <div class="form-row">
          <div class="form-group"><label>Papers Read</label><input name="papersRead" type="number" min="0" value="${p.papersRead || 0}"></div>
          <div class="form-group"><label>Status</label>
            <select name="status">
              ${['researching','contacted','replied','meeting_scheduled','not_interested'].map(s => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group"><label>Notes</label><textarea name="notes" rows="3">${esc(p.notes || '')}</textarea></div>
      `,
      onSubmit: (fd) => {
        Object.assign(p, {
          name: fd.get('name'), university: fd.get('university'), lab: fd.get('lab'),
          researchArea: fd.get('researchArea'), papersRead: Number(fd.get('papersRead')) || 0,
          status: fd.get('status'), notes: fd.get('notes')
        });
        State.save(); this.render(); Toast.show('Professor updated', 'success');
      },
      onDelete: () => {
        State.data.professors = State.data.professors.filter(x => x.id !== id);
        State.save(); this.render();
      }
    });
  },

  emailProfessor(id) {
    const p = State.data.professors.find(x => x.id === id);
    // Pre-fill email form with professor info
    this.addEmail(p.name, p.university);
  },

  // ===== FUNDING ACTIONS =====
  addFunding() {
    Modal.open({
      title: 'Add Funding Opportunity',
      body: `
        <div class="form-group"><label>Scholarship / Grant Name</label><input name="name" required placeholder="ETH Excellence Scholarship"></div>
        <div class="form-row">
          <div class="form-group"><label>Amount</label><input name="amount" placeholder="$10,000 / CHF 12,000"></div>
          <div class="form-group"><label>Deadline</label><input name="deadline" type="date" required></div>
        </div>
        <div class="form-group"><label>Status</label>
          <select name="status">
            <option value="researching">Researching</option>
            <option value="preparing">Preparing Application</option>
            <option value="submitted">Submitted</option>
            <option value="awarded">Awarded</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div class="form-group"><label>Requirements</label><textarea name="requirements" rows="3" placeholder="Essays, recommendations, etc."></textarea></div>
      `,
      onSubmit: (fd) => {
        State.data.funding.push({
          id: uid(), name: fd.get('name'), amount: fd.get('amount'), deadline: fd.get('deadline'),
          status: fd.get('status'), requirements: fd.get('requirements')
        });
        State.save(); this.render(); Toast.show('Funding added', 'success');
      }
    });
  },

  editFunding(id) {
    const f = State.data.funding.find(x => x.id === id);
    Modal.open({
      title: 'Edit Funding',
      body: `
        <div class="form-group"><label>Name</label><input name="name" value="${esc(f.name)}" required></div>
        <div class="form-row">
          <div class="form-group"><label>Amount</label><input name="amount" value="${esc(f.amount || '')}"></div>
          <div class="form-group"><label>Deadline</label><input name="deadline" type="date" value="${f.deadline}" required></div>
        </div>
        <div class="form-group"><label>Status</label>
          <select name="status">
            ${['researching','preparing','submitted','awarded','rejected'].map(s => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Requirements</label><textarea name="requirements" rows="3">${esc(f.requirements || '')}</textarea></div>
      `,
      onSubmit: (fd) => {
        Object.assign(f, { name: fd.get('name'), amount: fd.get('amount'), deadline: fd.get('deadline'), status: fd.get('status'), requirements: fd.get('requirements') });
        State.save(); this.render();
      },
      onDelete: () => {
        State.data.funding = State.data.funding.filter(x => x.id !== id);
        State.save(); this.render();
      }
    });
  },

  // ===== INBOX ACTIONS =====
  convertInbox(id, type) {
    const item = State.data.inbox.find(i => i.id === id);
    if (!item) return;
    if (type === 'task') {
      State.data.tasks.push({ id: uid(), title: item.content, deadline: addDays(7), done: false, source: 'Inbox' });
      Toast.show('✅ Converted to task', 'success');
    } else if (type === 'study') {
      State.data.study.push({ id: uid(), topic: item.content, duration: 60, date: todayISO(), done: false, pomodoros: 0 });
      Toast.show('📚 Converted to study block', 'success');
    }
    State.data.inbox = State.data.inbox.filter(i => i.id !== id);
    State.save();
    this.updateInboxBadge();
    this.render();
  },

  deleteInbox(id) {
    State.data.inbox = State.data.inbox.filter(i => i.id !== id);
    State.save();
    this.updateInboxBadge();
    this.render();
  },

  // ===== DOCUMENT CHECKLIST ACTIONS =====
  toggleDoc(appId, docName) {
    const app = State.data.applications.find(a => a.id === appId);
    if (!app) return;
    const doc = app.documents.find(d => d.name === docName);
    if (doc) {
      doc.done = !doc.done;
      State.save();
      this.render();
      Toast.show(doc.done ? '📄 Document marked ready' : 'Document unchecked', 'info');
    }
  },

  // ===== [Keep all existing actions: addApplication, editApplication, etc.] =====
  // ... (copy from previous version)
  
  addApplication() {
    Modal.open({
      title: 'Add Application',
      body: `
        <div class="form-group"><label>University</label><input name="university" required></div>
        <div class="form-group"><label>Program</label><input name="program" required></div>
        <div class="form-row">
          <div class="form-group"><label>Deadline</label><input name="deadline" type="date"></div>
          <div class="form-group"><label>Status</label>
            <select name="status">
              <option value="target">Target List</option>
              <option value="preparing">Preparing Docs</option>
              <option value="submitted">Submitted</option>
              <option value="interview">Interviewing</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label>Notes</label><textarea name="notes" rows="3"></textarea></div>
      `,
      onSubmit: (fd) => {
        State.data.applications.push({
          id: uid(), university: fd.get('university'), program: fd.get('program'),
          deadline: fd.get('deadline'), status: fd.get('status'), notes: fd.get('notes'),
          documents: DEFAULT_DOCS.map(d => ({ name: d, done: false }))
        });
        State.save(); this.render(); Toast.show('Application added', 'success');
      }
    });
  },

  editApplication(id) {
    const a = State.data.applications.find(x => x.id === id);
    Modal.open({
      title: 'Edit Application',
      body: `
        <div class="form-group"><label>University</label><input name="university" value="${esc(a.university)}" required></div>
        <div class="form-group"><label>Program</label><input name="program" value="${esc(a.program)}" required></div>
        <div class="form-row">
          <div class="form-group"><label>Deadline</label><input name="deadline" type="date" value="${a.deadline || ''}"></div>
          <div class="form-group"><label>Status</label>
            <select name="status">
              ${['target','preparing','submitted','interview','accepted','rejected'].map(s => `<option value="${s}" ${a.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group"><label>Notes</label><textarea name="notes" rows="3">${esc(a.notes)}</textarea></div>
      `,
      onSubmit: (fd) => {
        Object.assign(a, { university: fd.get('university'), program: fd.get('program'), deadline: fd.get('deadline'), status: fd.get('status'), notes: fd.get('notes') });
        State.save(); this.render(); Toast.show('Application updated', 'success');
      },
      onDelete: () => {
        State.data.applications = State.data.applications.filter(x => x.id !== id);
        State.save(); this.render();
      }
    });
  },

  dragApplication(e, id) { e.dataTransfer.setData('text/plain', id); e.target.classList.add('dragging'); },
  dropApplication(e, status) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const app = State.data.applications.find(a => a.id === id);
    if (app) { app.status = status; State.save(); this.render(); }
  },

  addEmail(profName = '', uniName = '') {
    Modal.open({
      title: 'Log Email',
      body: `
        <div class="form-group"><label>Professor Name</label><input name="professor" value="${esc(profName)}" required></div>
        <div class="form-group"><label>University</label><input name="university" value="${esc(uniName)}" required></div>
        <div class="form-row">
          <div class="form-group"><label>Date Sent</label><input name="dateSent" type="date" value="${todayISO()}"></div>
          <div class="form-group"><label>Follow-up Date</label><input name="followUpDate" type="date" value="${addDays(7)}"></div>
        </div>
        <div class="form-group"><label>Status</label>
          <select name="status">
            <option value="awaiting">Awaiting Reply</option>
            <option value="replied">Replied</option>
            <option value="no_response">No Response</option>
          </select>
        </div>
      `,
      onSubmit: (fd) => {
        State.data.emails.push({ id: uid(), professor: fd.get('professor'), university: fd.get('university'), dateSent: fd.get('dateSent'), followUpDate: fd.get('followUpDate'), status: fd.get('status') });
        State.save(); this.render(); Toast.show('Email logged', 'success');
      }
    });
  },

  editEmail(id) {
    const e = State.data.emails.find(x => x.id === id);
    Modal.open({
      title: 'Edit Email',
      body: `
        <div class="form-group"><label>Professor</label><input name="professor" value="${esc(e.professor)}" required></div>
        <div class="form-group"><label>University</label><input name="university" value="${esc(e.university)}" required></div>
        <div class="form-row">
          <div class="form-group"><label>Date Sent</label><input name="dateSent" type="date" value="${e.dateSent}"></div>
          <div class="form-group"><label>Follow-up Date</label><input name="followUpDate" type="date" value="${e.followUpDate}"></div>
        </div>
        <div class="form-group"><label>Status</label>
          <select name="status">
            ${['awaiting','replied','no_response'].map(s => `<option value="${s}" ${e.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      `,
      onSubmit: (fd) => {
        Object.assign(e, { professor: fd.get('professor'), university: fd.get('university'), dateSent: fd.get('dateSent'), followUpDate: fd.get('followUpDate'), status: fd.get('status') });
        State.save(); this.render();
      },
      onDelete: () => { State.data.emails = State.data.emails.filter(x => x.id !== id); State.save(); this.render(); }
    });
  },

  openTemplates() {
    const body = document.getElementById('templatesBody');
    const tabs = Object.entries(EMAIL_TEMPLATES).map(([key, t], i) => `<button class="template-tab ${i === 0 ? 'active' : ''}" data-template="${key}">${t.name}</button>`).join('');
    const contents = Object.entries(EMAIL_TEMPLATES).map(([key, t], i) => `
      <div class="template-content ${i === 0 ? 'active' : ''}" data-content="${key}">
        <div class="form-group"><label>Subject</label><input type="text" value="${esc(t.subject)}" readonly onclick="this.select()"></div>
        <div class="form-group"><label>Body</label><div class="template-preview">${esc(t.body).replace(/\{\{([^}]+)\}\}/g, '<span class="placeholder">{{$1}}</span>')}</div></div>
        <div class="template-actions">
          <button type="button" class="btn btn-primary" onclick="App.copyTemplate('${key}')">📋 Copy Full Email</button>
        </div>
      </div>
    `).join('');
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

  copyTemplate(key) {
    const t = EMAIL_TEMPLATES[key];
    navigator.clipboard.writeText(`Subject: ${t.subject}\n\n${t.body}`).then(() => Toast.show('📋 Copied', 'success'));
  },

  addMeeting() {
    Modal.open({
      title: 'Schedule Meeting',
      body: `
        <div class="form-group"><label>Title</label><input name="title" required></div>
        <div class="form-group"><label>With</label><input name="with" required></div>
        <div class="form-group"><label>Date & Time</label><input name="date" type="datetime-local" required></div>
        <div class="form-group"><label>Agenda</label><textarea name="agenda" rows="2"></textarea></div>
        <div class="form-group"><label>Notes (use - for bullets)</label><textarea name="notes" rows="4"></textarea></div>
      `,
      onSubmit: (fd) => {
        State.data.meetings.push({ id: uid(), title: fd.get('title'), with: fd.get('with'), date: fd.get('date'), agenda: fd.get('agenda'), notes: fd.get('notes') });
        State.save(); this.render(); Toast.show('Meeting scheduled', 'success');
      }
    });
  },

  editMeeting(id) {
    const m = State.data.meetings.find(x => x.id === id);
    Modal.open({
      title: 'Edit Meeting',
      body: `
        <div class="form-group"><label>Title</label><input name="title" value="${esc(m.title)}" required></div>
        <div class="form-group"><label>With</label><input name="with" value="${esc(m.with)}" required></div>
        <div class="form-group"><label>Date & Time</label><input name="date" type="datetime-local" value="${m.date}" required></div>
        <div class="form-group"><label>Agenda</label><textarea name="agenda" rows="2">${esc(m.agenda)}</textarea></div>
        <div class="form-group"><label>Notes</label><textarea name="notes" rows="4">${esc(m.notes || '')}</textarea></div>
      `,
      onSubmit: (fd) => {
        const newNotes = fd.get('notes');
        const oldNotes = m.notes || '';
        Object.assign(m, { title: fd.get('title'), with: fd.get('with'), date: fd.get('date'), agenda: fd.get('agenda'), notes: newNotes });
        if (newNotes && newNotes !== oldNotes) {
          const newTasks = parseNotesToTasks(newNotes, m.title);
          const existingTitles = new Set(State.data.tasks.map(t => t.title));
          const freshTasks = newTasks.filter(t => !existingTitles.has(t.title));
          if (freshTasks.length > 0) {
            State.data.tasks.push(...freshTasks);
            Toast.show(`✨ ${freshTasks.length} task(s) created`, 'success');
          }
        }
        State.save(); this.render();
      },
      onDelete: () => { State.data.meetings = State.data.meetings.filter(x => x.id !== id); State.save(); this.render(); }
    });
  },

  addTask() {
    Modal.open({
      title: 'Add Task',
      body: `
        <div class="form-group"><label>Task</label><input name="title" required></div>
        <div class="form-group"><label>Deadline</label><input name="deadline" type="date" value="${addDays(7)}"></div>
        <div class="form-group"><label>Source</label><input name="source" placeholder="e.g., Meeting with Prof. X"></div>
      `,
      onSubmit: (fd) => {
        State.data.tasks.push({ id: uid(), title: fd.get('title'), deadline: fd.get('deadline'), done: false, source: fd.get('source') || 'Manual' });
        State.save(); this.render(); Toast.show('Task added', 'success');
      }
    });
  },

  editTask(id) {
    const t = State.data.tasks.find(x => x.id === id);
    Modal.open({
      title: 'Edit Task',
      body: `
        <div class="form-group"><label>Task</label><input name="title" value="${esc(t.title)}" required></div>
        <div class="form-group"><label>Deadline</label><input name="deadline" type="date" value="${t.deadline || ''}"></div>
        <div class="form-group"><label>Source</label><input name="source" value="${esc(t.source || '')}"></div>
      `,
      onSubmit: (fd) => { Object.assign(t, { title: fd.get('title'), deadline: fd.get('deadline'), source: fd.get('source') }); State.save(); this.render(); },
      onDelete: () => { State.data.tasks = State.data.tasks.filter(x => x.id !== id); State.save(); this.render(); }
    });
  },

  toggleTask(id) {
    const t = State.data.tasks.find(x => x.id === id);
    if (t) { t.done = !t.done; State.save(); this.render(); if (t.done) Toast.show('✅ Task completed', 'success'); }
  },

  addStudy() {
    Modal.open({
      title: 'Add Study Block',
      body: `
        <div class="form-group"><label>Topic</label><input name="topic" required></div>
        <div class="form-row">
          <div class="form-group"><label>Duration (min)</label><input name="duration" type="number" min="5" value="60" required></div>
          <div class="form-group"><label>Date</label><input name="date" type="date" value="${todayISO()}" required></div>
        </div>
      `,
      onSubmit: (fd) => {
        State.data.study.push({ id: uid(), topic: fd.get('topic'), duration: Number(fd.get('duration')), date: fd.get('date'), done: false, pomodoros: 0 });
        State.save(); this.render(); State.updateStreak(); Toast.show('Study block added', 'success');
      }
    });
  },

  editStudy(id) {
    const s = State.data.study.find(x => x.id === id);
    Modal.open({
      title: 'Edit Study Block',
      body: `
        <div class="form-group"><label>Topic</label><input name="topic" value="${esc(s.topic)}" required></div>
        <div class="form-row">
          <div class="form-group"><label>Duration (min)</label><input name="duration" type="number" min="5" value="${s.duration}" required></div>
          <div class="form-group"><label>Date</label><input name="date" type="date" value="${s.date}" required></div>
        </div>
      `,
      onSubmit: (fd) => { Object.assign(s, { topic: fd.get('topic'), duration: Number(fd.get('duration')), date: fd.get('date') }); State.save(); this.render(); },
      onDelete: () => { State.data.study = State.data.study.filter(x => x.id !== id); State.save(); this.render(); }
    });
  },

  toggleStudy(id) {
    const s = State.data.study.find(x => x.id === id);
    if (s) { s.done = !s.done; State.save(); State.updateStreak(); this.render(); }
  },

  addGoal() {
    Modal.open({
      title: 'Add Goal',
      body: `
        <div class="form-group"><label>Goal Title</label><input name="title" required></div>
        <div class="form-group"><label>Deadline</label><input name="deadline" type="date" required></div>
      `,
      onSubmit: (fd) => {
        State.data.goals.push({ id: uid(), title: fd.get('title'), deadline: fd.get('deadline'), done: false });
        State.save(); this.render(); Toast.show('Goal added', 'success');
      }
    });
  },

  editGoal(id) {
    const g = State.data.goals.find(x => x.id === id);
    Modal.open({
      title: 'Edit Goal',
      body: `
        <div class="form-group"><label>Title</label><input name="title" value="${esc(g.title)}" required></div>
        <div class="form-group"><label>Deadline</label><input name="deadline" type="date" value="${g.deadline}" required></div>
      `,
      onSubmit: (fd) => { Object.assign(g, { title: fd.get('title'), deadline: fd.get('deadline') }); State.save(); this.render(); },
      onDelete: () => { State.data.goals = State.data.goals.filter(x => x.id !== id); State.save(); this.render(); }
    });
  },

  toggleGoal(id) {
    const g = State.data.goals.find(x => x.id === id);
    if (g) { g.done = !g.done; State.save(); this.render(); if (g.done) Toast.show('🎉 Goal achieved!', 'success'); }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());



// ========== COMMAND PALETTE ==========
const CommandPalette = {
  isOpen: false,
  selectedIndex: 0,
  items: [],
  recentItems: [],

  open() {
    this.isOpen = true;
    const dialog = document.getElementById('commandPalette');
    dialog.showModal();
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
    
    // Build searchable items
    this.items = this.buildItems();
    
    // Filter by query
    const filtered = query 
      ? this.fuzzySearch(this.items, query)
      : this.items.slice(0, 20);

    if (filtered.length === 0) {
      results.innerHTML = '<div class="command-empty">No results found</div>';
      return;
    }

    // Group by type
    const groups = {};
    filtered.forEach((item, index) => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push({ ...item, index });
    });

    // Render
    let html = '';
    Object.entries(groups).forEach(([group, items]) => {
      html += `<div class="command-group">`;
      html += `<div class="command-group-title">${group}</div>`;
      items.forEach(item => {
        const isSelected = item.index === this.selectedIndex;
        html += `
          <div class="command-item ${isSelected ? 'selected' : ''}" data-index="${item.index}" onclick="CommandPalette.execute(${item.index})">
            <div class="command-item-icon">${item.icon}</div>
            <div class="command-item-content">
              <div class="command-item-title">${item.title}</div>
              ${item.meta ? `<div class="command-item-meta">${item.meta}</div>` : ''}
            </div>
            ${item.shortcut ? `<div class="command-item-shortcut">${item.shortcut}</div>` : ''}
          </div>
        `;
      });
      html += `</div>`;
    });

    results.innerHTML = html;
  },

  buildItems() {
    const items = [];

    // Quick Actions
    items.push(
      { group: 'Quick Actions', icon: '✚', title: 'New Task', action: () => App.addTask(), shortcut: '⌘N' },
      { group: 'Quick Actions', icon: '📧', title: 'Log Email', action: () => App.addEmail() },
      { group: 'Quick Actions', icon: '🤝', title: 'Schedule Meeting', action: () => App.addMeeting() },
      { group: 'Quick Actions', icon: '📚', title: 'Add Study Block', action: () => App.addStudy() },
      { group: 'Quick Actions', icon: '🎯', title: 'Add Goal', action: () => App.addGoal() },
      { group: 'Quick Actions', icon: '🎓', title: 'Add Application', action: () => App.addApplication() },
      { group: 'Quick Actions', icon: '🔬', title: 'Add Professor', action: () => App.addProfessor() },
      { group: 'Quick Actions', icon: '💰', title: 'Add Funding', action: () => App.addFunding() },
      { group: 'Quick Actions', icon: '⚡', title: 'Quick Capture', action: () => App.openQuickCapture(), shortcut: '⌘Q' }
    );

    // Navigation
    items.push(
      { group: 'Navigation', icon: '📊', title: 'Dashboard', action: () => App.switchView('dashboard'), shortcut: '⌘1' },
      { group: 'Navigation', icon: '📅', title: 'Calendar', action: () => App.switchView('calendar'), shortcut: '⌘2' },
      { group: 'Navigation', icon: '🎓', title: 'Applications', action: () => App.switchView('applications'), shortcut: '⌘3' },
      { group: 'Navigation', icon: '🔬', title: 'Professors', action: () => App.switchView('professors'), shortcut: '⌘4' },
      { group: 'Navigation', icon: '💰', title: 'Funding', action: () => App.switchView('funding'), shortcut: '⌘5' },
      { group: 'Navigation', icon: '📧', title: 'Emails', action: () => App.switchView('emails') },
      { group: 'Navigation', icon: '🤝', title: 'Meetings', action: () => App.switchView('meetings') },
      { group: 'Navigation', icon: '✅', title: 'Tasks', action: () => App.switchView('tasks') },
      { group: 'Navigation', icon: '📚', title: 'Study', action: () => App.switchView('study') },
      { group: 'Navigation', icon: '🎯', title: 'Goals', action: () => App.switchView('goals') },
      { group: 'Navigation', icon: '📥', title: 'Inbox', action: () => App.switchView('inbox') }
    );

    // Tasks
    State.data.tasks.forEach(t => {
      items.push({
        group: 'Tasks',
        icon: t.done ? '✅' : '⬜',
        title: t.title,
        meta: t.deadline ? `Due ${fmtDate(t.deadline)}` : 'No deadline',
        action: () => {
          App.switchView('tasks');
          setTimeout(() => {
            const el = document.querySelector(`[data-task-id="${t.id}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      });
    });

    // Applications
    State.data.applications.forEach(a => {
      items.push({
        group: 'Applications',
        icon: '🎓',
        title: a.university,
        meta: `${a.program} • ${a.status}`,
        action: () => {
          App.switchView('applications');
          setTimeout(() => App.editApplication(a.id), 100);
        }
      });
    });

    // Professors
    State.data.professors.forEach(p => {
      items.push({
        group: 'Professors',
        icon: '🔬',
        title: p.name,
        meta: `${p.university}${p.lab ? ` • ${p.lab}` : ''}`,
        action: () => {
          App.switchView('professors');
          setTimeout(() => App.editProfessor(p.id), 100);
        }
      });
    });

    // Meetings
    State.data.meetings.forEach(m => {
      items.push({
        group: 'Meetings',
        icon: '🤝',
        title: m.title,
        meta: `${m.with} • ${fmtDate(m.date.slice(0, 10))}`,
        action: () => {
          App.switchView('meetings');
          setTimeout(() => App.editMeeting(m.id), 100);
        }
      });
    });

    // Emails
    State.data.emails.forEach(e => {
      items.push({
        group: 'Emails',
        icon: '📧',
        title: e.professor,
        meta: `${e.university} • ${e.status}`,
        action: () => {
          App.switchView('emails');
          setTimeout(() => App.editEmail(e.id), 100);
        }
      });
    });

    // Study Blocks
    State.data.study.forEach(s => {
      items.push({
        group: 'Study',
        icon: '📚',
        title: s.topic,
        meta: `${s.duration} min • ${fmtDate(s.date)}`,
        action: () => {
          App.switchView('study');
          setTimeout(() => App.editStudy(s.id), 100);
        }
      });
    });

    // Goals
    State.data.goals.forEach(g => {
      items.push({
        group: 'Goals',
        icon: g.done ? '🎉' : '🎯',
        title: g.title,
        meta: `Due ${fmtDate(g.deadline)}`,
        action: () => {
          App.switchView('goals');
          setTimeout(() => App.editGoal(g.id), 100);
        }
      });
    });

    // System Actions
    items.push(
      { group: 'System', icon: '💾', title: 'Export Backup', action: () => document.getElementById('exportBtn').click() },
      { group: 'System', icon: '📂', title: 'Import Backup', action: () => document.getElementById('importBtn').click() },
      { group: 'System', icon: '🌙', title: 'Toggle Dark Mode', action: () => document.getElementById('themeToggle').click() },
      { group: 'System', icon: '🔔', title: 'Toggle Reminders', action: () => document.getElementById('notifPermission').click() }
    );

    return items;
  },

  fuzzySearch(items, query) {
    const q = query.toLowerCase();
    return items
      .map(item => {
        const titleMatch = item.title.toLowerCase().includes(q);
        const metaMatch = item.meta?.toLowerCase().includes(q);
        const score = titleMatch ? 2 : metaMatch ? 1 : 0;
        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
  },

  execute(index) {
    const item = this.items[index];
    if (!item) return;
    
    this.close();
    
    // Track in recent
    this.recentItems.unshift(item);
    this.recentItems = this.recentItems.slice(0, 5);
    
    // Execute action
    setTimeout(() => item.action(), 100);
  },

  navigate(direction) {
    this.selectedIndex += direction;
    if (this.selectedIndex < 0) this.selectedIndex = this.items.length - 1;
    if (this.selectedIndex >= this.items.length) this.selectedIndex = 0;
    
    // Update UI
    document.querySelectorAll('.command-item').forEach((el, i) => {
      el.classList.toggle('selected', i === this.selectedIndex);
    });

    // Scroll into view
    const selected = document.querySelector('.command-item.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }
};

// Bind command palette events
document.addEventListener('keydown', (e) => {
  // Open with Ctrl/Cmd + K
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    if (CommandPalette.isOpen) {
      CommandPalette.close();
    } else {
      CommandPalette.open();
    }
  }

  // Navigation when palette is open
  if (CommandPalette.isOpen) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      CommandPalette.navigate(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      CommandPalette.navigate(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      CommandPalette.execute(CommandPalette.selectedIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      CommandPalette.close();
    }
  }
});

// Search input handler
document.getElementById('commandInput')?.addEventListener('input', (e) => {
  CommandPalette.selectedIndex = 0;
  CommandPalette.render(e.target.value);
});

// Close on backdrop click
document.getElementById('commandPalette')?.addEventListener('click', (e) => {
  if (e.target.id === 'commandPalette') {
    CommandPalette.close();
  }
});