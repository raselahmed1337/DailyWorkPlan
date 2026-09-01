// ========== STATE MANAGEMENT ==========
const STORAGE_KEY = 'scholarsync_v1';
const defaultState = {
  applications: [],
  emails: [],
  meetings: [],
  study: [],
  goals: [],
  settings: { theme: 'system', remindersEnabled: false }
};

const State = {
  data: structuredClone(defaultState),
  currentView: 'dashboard',
  listeners: [],

  init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.data = { ...structuredClone(defaultState), ...JSON.parse(saved) };
      } catch { this.loadTemplate(); }
    } else {
      this.loadTemplate();
    }
  },

  loadTemplate() {
    this.data = {
      applications: [
        { id: uid(), university: 'ETH Zurich', program: 'PhD in Computer Science', deadline: '2026-12-15', status: 'preparing', notes: 'Prof. Smith lab' }
      ],
      emails: [
        { id: uid(), professor: 'Dr. Jane Smith', university: 'ETH Zurich', dateSent: todayISO(), status: 'awaiting', followUpDate: addDays(7) }
      ],
      meetings: [
        { id: uid(), title: 'Advisor Meeting', date: addDays(2) + 'T14:00', with: 'Prof. Johnson', agenda: 'Discuss research proposal' }
      ],
      study: [
        { id: uid(), topic: 'Read paper: Attention Is All You Need', duration: 60, date: todayISO(), done: false }
      ],
      goals: [
        { id: uid(), title: 'Finalize university shortlist (8-10)', deadline: addDays(14), done: false },
        { id: uid(), title: 'Secure 2 Letters of Recommendation', deadline: addDays(30), done: false }
      ],
      settings: { theme: 'system', remindersEnabled: false }
    };
    this.save();
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    this.emit();
  },

  subscribe(fn) { this.listeners.push(fn); },
  emit() { this.listeners.forEach(fn => fn()); }
};

// ========== UTILITIES ==========
const uid = () => crypto.randomUUID();
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = d => {
  if (!d) return '—';
  return new Date(d + (d.length === 10 ? 'T00:00' : '')).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
const daysUntil = d => {
  if (!d) return null;
  const target = new Date(d + (d.length === 10 ? 'T00:00' : '')).getTime();
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((target - now.getTime()) / 86400000);
};
const minutesUntil = (dateTime) => {
  if (!dateTime) return null;
  return Math.round((new Date(dateTime).getTime() - Date.now()) / 60000);
};

// ========== NOTIFICATION SERVICE ==========
const Notifier = {
  async requestPermission() {
    if (!('Notification' in window)) {
      Toast.show('Notifications not supported in this browser', 'warning');
      return false;
    }
    const perm = await Notification.requestPermission();
    State.data.settings.remindersEnabled = perm === 'granted';
    State.save();
    return perm === 'granted';
  },

  send(title, body) {
    if (State.data.settings.remindersEnabled && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '🎓' });
    }
  },

  showBanner(title, meta) {
    const banner = document.getElementById('reminderBanner');
    document.getElementById('reminderTitle').textContent = title;
    document.getElementById('reminderMeta').textContent = meta;
    banner.classList.remove('hidden');
  },

  hideBanner() {
    document.getElementById('reminderBanner').classList.add('hidden');
  },

  // Check for upcoming events every 60s
  startChecker() {
    this.check();
    setInterval(() => this.check(), 60000);
  },

  check() {
    const now = Date.now();
    // Check meetings (within 15 minutes)
    const upcomingMeeting = State.data.meetings.find(m => {
      const diff = new Date(m.date).getTime() - now;
      return diff > 0 && diff <= 15 * 60 * 1000;
    });
    if (upcomingMeeting) {
      const mins = minutesUntil(upcomingMeeting.date);
      this.showBanner(`Meeting in ${mins} min`, `${upcomingMeeting.title} with ${upcomingMeeting.with}`);
      this.send('Meeting Soon', `${upcomingMeeting.title} in ${mins} minutes`);
      return;
    }

    // Check goals (due today)
    const todayGoal = State.data.goals.find(g => !g.done && g.deadline === todayISO());
    if (todayGoal) {
      this.showBanner('Goal Due Today', todayGoal.title);
      return;
    }

    // Check application deadlines (within 7 days)
    const urgentApp = State.data.applications.find(a => {
      const d = daysUntil(a.deadline);
      return d !== null && d >= 0 && d <= 7 && a.status !== 'submitted' && a.status !== 'accepted' && a.status !== 'rejected';
    });
    if (urgentApp) {
      this.showBanner(`Application due in ${daysUntil(urgentApp.deadline)} days`, `${urgentApp.university} — ${urgentApp.program}`);
    }
  }
};

// ========== TOAST SERVICE ==========
const Toast = {
  show(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(120%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// ========== MODAL SERVICE ==========
const Modal = {
  open({ title, body, onSubmit, onDelete }) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;
    const form = document.getElementById('modalForm');
    const deleteBtn = document.getElementById('modalDelete');

    form.onsubmit = (e) => {
      e.preventDefault();
      onSubmit(new FormData(form));
      this.close();
    };

    if (onDelete) {
      deleteBtn.classList.remove('hidden');
      deleteBtn.onclick = () => { onDelete(); this.close(); };
    } else {
      deleteBtn.classList.add('hidden');
    }

    document.getElementById('modal').showModal();
  },
  close() { document.getElementById('modal').close(); }
};

// ========== VIEWS ==========
const Views = {
  dashboard() {
    const apps = State.data.applications;
    const submitted = apps.filter(a => a.status === 'submitted' || a.status === 'interview' || a.status === 'accepted').length;
    const awaitingReply = State.data.emails.filter(e => e.status === 'awaiting').length;
    const todayMeetings = State.data.meetings.filter(m => m.date.startsWith(todayISO())).length;
    const studyDone = State.data.study.filter(s => s.date === todayISO() && s.done).length;
    const studyTotal = State.data.study.filter(s => s.date === todayISO()).length;

    // Find next upcoming event
    const allEvents = [
      ...State.data.meetings.map(m => ({ type: 'meeting', title: m.title, date: m.date, meta: `with ${m.with}` })),
      ...State.data.goals.filter(g => !g.done).map(g => ({ type: 'goal', title: g.title, date: g.deadline + 'T23:59', meta: 'Goal deadline' })),
      ...apps.filter(a => !['submitted', 'accepted', 'rejected'].includes(a.status)).map(a => ({ type: 'application', title: `${a.university}`, date: a.deadline + 'T23:59', meta: a.program }))
    ].filter(e => new Date(e.date).getTime() > Date.now())
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const next = allEvents[0];

    return `
      ${next ? `
        <div class="upnext-card">
          <h3>⏰ Up Next</h3>
          <div class="upnext-title">${esc(next.title)}</div>
          <div class="upnext-meta">${esc(next.meta)} • ${fmtDate(next.date.slice(0, 10))}</div>
          <span class="countdown">${this.countdown(next.date)}</span>
        </div>
      ` : ''}

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🎓</div>
          <div>
            <div class="stat-value">${submitted}/${apps.length}</div>
            <div class="stat-label">Applications</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning">📧</div>
          <div>
            <div class="stat-value">${awaitingReply}</div>
            <div class="stat-label">Awaiting Reply</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon success">🤝</div>
          <div>
            <div class="stat-value">${todayMeetings}</div>
            <div class="stat-label">Today's Meetings</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div>
            <div class="stat-value">${studyDone}/${studyTotal}</div>
            <div class="stat-label">Study Done Today</div>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <div>
              <h3>Upcoming Deadlines</h3>
              <small>Applications and goals sorted by due date</small>
            </div>
          </div>
          <div class="list">
            ${allEvents.slice(0, 5).map(e => `
              <div class="list-item">
                <div style="font-size:20px">${e.type === 'meeting' ? '🤝' : e.type === 'goal' ? '🎯' : '🎓'}</div>
                <div class="list-item-content">
                  <div class="list-item-title">${esc(e.title)}</div>
                  <div class="list-item-meta">${esc(e.meta)} • ${fmtDate(e.date.slice(0, 10))}</div>
                </div>
                <span class="badge ${daysUntil(e.date.slice(0, 10)) <= 3 ? 'danger' : daysUntil(e.date.slice(0, 10)) <= 7 ? 'warning' : 'primary'}">${daysUntil(e.date.slice(0, 10))}d</span>
              </div>
            `).join('') || '<div class="empty"><div class="empty-icon">✨</div><div class="empty-title">All clear!</div><div>No upcoming deadlines</div></div>'}
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <h3>Today's Study Plan</h3>
              <small>${fmtDate(todayISO())}</small>
            </div>
            <button class="btn btn-sm btn-ghost" onclick="App.switchView('study')">View all</button>
          </div>
          <div class="list">
            ${State.data.study.filter(s => s.date === todayISO()).map(s => `
              <div class="list-item">
                <input type="checkbox" ${s.done ? 'checked' : ''} onchange="App.toggleStudy('${s.id}')" style="width:18px;height:18px;cursor:pointer">
                <div class="list-item-content">
                  <div class="list-item-title" style="${s.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${esc(s.topic)}</div>
                  <div class="list-item-meta">${s.duration} min</div>
                </div>
              </div>
            `).join('') || '<div class="empty"><div class="empty-icon">📚</div><div class="empty-title">No study planned</div></div>'}
          </div>
        </div>
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
              <div class="kanban-col-head">
                <span>${s.label}</span>
                <span class="kanban-col-count">${items.length}</span>
              </div>
              ${items.map(a => `
                <div class="kanban-card" draggable="true" data-id="${a.id}" ondragstart="App.dragApplication(event, '${a.id}')">
                  <div class="kanban-card-title">${esc(a.university)}</div>
                  <div class="kanban-card-meta">
                    <span class="badge">${esc(a.program)}</span>
                    ${a.deadline ? `<span class="badge ${daysUntil(a.deadline) <= 7 ? 'warning' : ''}">${fmtDate(a.deadline)}</span>` : ''}
                  </div>
                  <button class="btn btn-sm btn-ghost" style="margin-top:8px;width:100%" onclick="App.editApplication('${a.id}')">Edit</button>
                </div>
              `).join('')}
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  emails() {
    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px">
        <div></div>
        <button class="btn btn-primary" onclick="App.addEmail()">+ Log Email</button>
      </div>
      <div class="card">
        <div class="list">
          ${State.data.emails.map(e => {
            const daysWait = daysUntil(e.dateSent) * -1;
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
        </div>
      </div>
    `;
  },

  meetings() {
    const upcoming = State.data.meetings
      .filter(m => new Date(m.date).getTime() >= Date.now() - 86400000)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px">
        <div></div>
        <button class="btn btn-primary" onclick="App.addMeeting()">+ Schedule Meeting</button>
      </div>
      <div class="card">
        <div class="list">
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
        </div>
      </div>
    `;
  },

  study() {
    const today = State.data.study.filter(s => s.date === todayISO());
    const totalMin = today.reduce((sum, s) => sum + (s.done ? s.duration : 0), 0);

    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px">
        <div class="stat-card" style="padding:12px 16px">
          <div>
            <div class="stat-value">${totalMin} min</div>
            <div class="stat-label">Studied today</div>
          </div>
        </div>
        <button class="btn btn-primary" onclick="App.addStudy()">+ Add Study Block</button>
      </div>
      <div class="card">
        <div class="card-head">
          <div>
            <h3>${fmtDate(todayISO())}</h3>
            <small>${today.filter(s => s.done).length} of ${today.length} completed</small>
          </div>
        </div>
        <div class="list">
          ${today.map(s => `
            <div class="list-item">
              <input type="checkbox" ${s.done ? 'checked' : ''} onchange="App.toggleStudy('${s.id}')" style="width:18px;height:18px;cursor:pointer">
              <div class="list-item-content">
                <div class="list-item-title" style="${s.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${esc(s.topic)}</div>
                <div class="list-item-meta">${s.duration} min</div>
              </div>
              <button class="btn btn-sm btn-ghost" onclick="App.editStudy('${s.id}')">Edit</button>
            </div>
          `).join('') || '<div class="empty"><div class="empty-icon">📚</div><div class="empty-title">No study planned for today</div><div>Add a study block to get started</div></div>'}
        </div>
      </div>
    `;
  },

  goals() {
    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:20px">
        <div></div>
        <button class="btn btn-primary" onclick="App.addGoal()">+ Add Goal</button>
      </div>
      <div class="card">
        <div class="list">
          ${State.data.goals.map(g => {
            const d = daysUntil(g.deadline);
            const overdue = !g.done && d < 0;
            return `
              <div class="list-item" style="${overdue ? 'border-color:var(--danger)' : ''}">
                <input type="checkbox" ${g.done ? 'checked' : ''} onchange="App.toggleGoal('${g.id}')" style="width:18px;height:18px;cursor:pointer">
                <div class="list-item-content">
                  <div class="list-item-title" style="${g.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${esc(g.title)}</div>
                  <div class="list-item-meta">
                    Due ${fmtDate(g.deadline)}
                    ${overdue ? '• <span style="color:var(--danger);font-weight:600">Overdue</span>' : d !== null && d <= 7 ? `• <span style="color:var(--warning);font-weight:600">${d} days left</span>` : ''}
                  </div>
                </div>
                <button class="btn btn-sm btn-ghost" onclick="App.editGoal('${g.id}')">Edit</button>
              </div>
            `;
          }).join('') || '<div class="empty"><div class="empty-icon">🎯</div><div class="empty-title">No goals set</div></div>'}
        </div>
      </div>
    `;
  }
};

// ========== MAIN APP CONTROLLER ==========
const App = {
  init() {
    State.init();
    this.applyTheme();
    this.bindEvents();
    this.render();
    Notifier.startChecker();

    // Update date display
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

    // Update notification button state
    this.updateNotifButton();

    // Refresh countdown every minute
    setInterval(() => {
      if (State.currentView === 'dashboard') this.render();
    }, 60000);
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

  bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchView(link.dataset.view);
      });
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
      const curr = State.data.settings.theme;
      State.data.settings.theme = curr === 'dark' ? 'light' : curr === 'light' ? 'system' : 'dark';
      State.save();
      this.applyTheme();
    });

    // Notification permission
    document.getElementById('notifPermission').addEventListener('click', async () => {
      const granted = await Notifier.requestPermission();
      if (granted) {
        Toast.show('Reminders enabled!', 'success');
        this.updateNotifButton();
      }
    });

    // Dismiss reminder banner
    document.getElementById('dismissReminder').addEventListener('click', () => Notifier.hideBanner());

    // Close modal
    document.getElementById('closeModal').addEventListener('click', () => Modal.close());

    // Export
    document.getElementById('exportBtn').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(State.data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `scholarsync-backup-${todayISO()}.json`;
      a.click();
      Toast.show('Backup exported', 'success');
    });

    // Import
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
          Toast.show('Data imported successfully', 'success');
        } catch {
          Toast.show('Invalid backup file', 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.key === 'Escape') Modal.close();
    });
  },

  switchView(view) {
    State.currentView = view;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.view === view));
    const titles = {
      dashboard: ['Dashboard', 'Your PhD journey at a glance'],
      applications: ['Applications', 'Track your university applications'],
      emails: ['Email Outreach', 'Manage professor communications'],
      meetings: ['Meetings', 'Schedule and track meetings'],
      study: ['Study Plan', 'Your daily study blocks'],
      goals: ['Goals', 'Long-term PhD milestones']
    };
    document.getElementById('viewTitle').textContent = titles[view][0];
    document.getElementById('viewSubtitle').textContent = titles[view][1];
    this.render();
  },

  render() {
    const container = document.getElementById('viewContainer');
    container.innerHTML = Views[State.currentView]();
  },

  // ===== APPLICATION ACTIONS =====
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
          id: uid(),
          university: fd.get('university'),
          program: fd.get('program'),
          deadline: fd.get('deadline'),
          status: fd.get('status'),
          notes: fd.get('notes')
        });
        State.save();
        this.render();
        Toast.show('Application added', 'success');
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
        Object.assign(a, {
          university: fd.get('university'),
          program: fd.get('program'),
          deadline: fd.get('deadline'),
          status: fd.get('status'),
          notes: fd.get('notes')
        });
        State.save();
        this.render();
        Toast.show('Application updated', 'success');
      },
      onDelete: () => {
        State.data.applications = State.data.applications.filter(x => x.id !== id);
        State.save();
        this.render();
        Toast.show('Application deleted', 'info');
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

  // ===== EMAIL ACTIONS =====
  addEmail() {
    Modal.open({
      title: 'Log Email',
      body: `
        <div class="form-group"><label>Professor Name</label><input name="professor" required></div>
        <div class="form-group"><label>University</label><input name="university" required></div>
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
        State.data.emails.push({
          id: uid(),
          professor: fd.get('professor'),
          university: fd.get('university'),
          dateSent: fd.get('dateSent'),
          followUpDate: fd.get('followUpDate'),
          status: fd.get('status')
        });
        State.save();
        this.render();
        Toast.show('Email logged', 'success');
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
        Object.assign(e, {
          professor: fd.get('professor'),
          university: fd.get('university'),
          dateSent: fd.get('dateSent'),
          followUpDate: fd.get('followUpDate'),
          status: fd.get('status')
        });
        State.save();
        this.render();
        Toast.show('Email updated', 'success');
      },
      onDelete: () => {
        State.data.emails = State.data.emails.filter(x => x.id !== id);
        State.save();
        this.render();
      }
    });
  },

  // ===== MEETING ACTIONS =====
  addMeeting() {
    Modal.open({
      title: 'Schedule Meeting',
      body: `
        <div class="form-group"><label>Title</label><input name="title" required placeholder="e.g., Advisor check-in"></div>
        <div class="form-group"><label>With</label><input name="with" required placeholder="Prof. Smith"></div>
        <div class="form-group"><label>Date & Time</label><input name="date" type="datetime-local" required></div>
        <div class="form-group"><label>Agenda / Notes</label><textarea name="agenda" rows="3"></textarea></div>
      `,
      onSubmit: (fd) => {
        State.data.meetings.push({
          id: uid(),
          title: fd.get('title'),
          with: fd.get('with'),
          date: fd.get('date'),
          agenda: fd.get('agenda')
        });
        State.save();
        this.render();
        Toast.show('Meeting scheduled', 'success');
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
        <div class="form-group"><label>Agenda</label><textarea name="agenda" rows="3">${esc(m.agenda)}</textarea></div>
      `,
      onSubmit: (fd) => {
        Object.assign(m, {
          title: fd.get('title'),
          with: fd.get('with'),
          date: fd.get('date'),
          agenda: fd.get('agenda')
        });
        State.save();
        this.render();
        Toast.show('Meeting updated', 'success');
      },
      onDelete: () => {
        State.data.meetings = State.data.meetings.filter(x => x.id !== id);
        State.save();
        this.render();
      }
    });
  },

  // ===== STUDY ACTIONS =====
  addStudy() {
    Modal.open({
      title: 'Add Study Block',
      body: `
        <div class="form-group"><label>Topic</label><input name="topic" required placeholder="e.g., Read paper on Transformers"></div>
        <div class="form-row">
          <div class="form-group"><label>Duration (min)</label><input name="duration" type="number" min="5" value="60" required></div>
          <div class="form-group"><label>Date</label><input name="date" type="date" value="${todayISO()}" required></div>
        </div>
      `,
      onSubmit: (fd) => {
        State.data.study.push({
          id: uid(),
          topic: fd.get('topic'),
          duration: Number(fd.get('duration')),
          date: fd.get('date'),
          done: false
        });
        State.save();
        this.render();
        Toast.show('Study block added', 'success');
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
      onSubmit: (fd) => {
        Object.assign(s, {
          topic: fd.get('topic'),
          duration: Number(fd.get('duration')),
          date: fd.get('date')
        });
        State.save();
        this.render();
      },
      onDelete: () => {
        State.data.study = State.data.study.filter(x => x.id !== id);
        State.save();
        this.render();
      }
    });
  },

  toggleStudy(id) {
    const s = State.data.study.find(x => x.id === id);
    if (s) { s.done = !s.done; State.save(); this.render(); }
  },

  // ===== GOAL ACTIONS =====
  addGoal() {
    Modal.open({
      title: 'Add Goal',
      body: `
        <div class="form-group"><label>Goal Title</label><input name="title" required placeholder="e.g., Submit 3 applications"></div>
        <div class="form-group"><label>Deadline</label><input name="deadline" type="date" required></div>
      `,
      onSubmit: (fd) => {
        State.data.goals.push({
          id: uid(),
          title: fd.get('title'),
          deadline: fd.get('deadline'),
          done: false
        });
        State.save();
        this.render();
        Toast.show('Goal added', 'success');
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
      onSubmit: (fd) => {
        Object.assign(g, { title: fd.get('title'), deadline: fd.get('deadline') });
        State.save();
        this.render();
      },
      onDelete: () => {
        State.data.goals = State.data.goals.filter(x => x.id !== id);
        State.save();
        this.render();
      }
    });
  },

  toggleGoal(id) {
    const g = State.data.goals.find(x => x.id === id);
    if (g) {
      g.done = !g.done;
      State.save();
      this.render();
      if (g.done) Toast.show('🎉 Goal achieved!', 'success');
    }
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());