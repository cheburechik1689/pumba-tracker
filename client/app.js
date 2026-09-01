// Pumba Tracker v2.0 - Client
const API_URL = window.location.origin.includes('localhost') 
    ? 'http://localhost:3000/api' 
    : `${window.location.origin}/api`;

// Telegram WebApp
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#1a1a2e');
    tg.setBackgroundColor('#1a1a2e');
}

// State
let currentUser = null;
let userData = {};
let currentPeriod = 'week';
let charts = {};

// ========== AUTH & INIT ==========
async function init() {
    const telegramId = tg?.initDataUnsafe?.user?.id;
    
    if (!telegramId) {
        // Dev mode - use test user
        currentUser = { id: 1, telegram_id: 12345 };
        await loadData();
        showApp();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/user/${telegramId}`);
        if (response.ok) {
            userData = await response.json();
            currentUser = userData.user;
            await loadData();
            showApp();
        } else {
            // New user
            currentUser = { id: telegramId, telegram_id: telegramId };
            showApp();
        }
    } catch (err) {
        console.error('Init error:', err);
        showApp();
    }
}

async function loadData() {
    if (!currentUser) return;
    try {
        const response = await fetch(`${API_URL}/user/${currentUser.telegram_id}`);
        if (response.ok) {
            userData = await response.json();
        }
    } catch (err) {
        console.error('Load data error:', err);
    }
}

function showApp() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('nav').style.display = 'flex';
    document.getElementById('main').style.display = 'block';
    
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('ru-RU', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    
    renderDashboard();
    initNavigation();
    initInput();
    initPeriodSelector();
    initJournalSliders();
}

// ========== NAVIGATION ==========
function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(page).classList.add('active');
            
            if (page === 'analytics') renderAnalytics();
            if (page === 'workouts') renderWorkouts();
            if (page === 'habits') renderHabits();
            if (page === 'journal') renderJournal();
        });
    });
}

// ========== DASHBOARD ==========
function renderDashboard() {
    const tasks = userData.tasks || [];
    const journal = userData.journal || [];
    const health = userData.health_data || [];
    const focus = userData.focus || [];
    
    // Focus
    const currentFocus = focus[0];
    document.getElementById('current-focus').textContent = currentFocus?.text || 'Не задан';
    
    // Week progress
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const weekTasks = tasks.filter(t => t.date >= weekAgo);
    const completed = weekTasks.filter(t => t.status === 'completed').length;
    const total = weekTasks.length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    
    document.getElementById('week-progress').style.width = `${percent}%`;
    document.getElementById('week-stats').textContent = `${completed}/${total} задач`;
    
    // Streak
    document.getElementById('streak').textContent = calculateStreak(tasks);
    
    // Sleep
    const todayJournal = journal.find(j => j.date === new Date().toISOString().split('T')[0]);
    document.getElementById('sleep-stat').textContent = todayJournal?.sleep_hours || '—';
    
    // Steps
    const todayHealth = health.find(h => h.date === new Date().toISOString().split('T')[0]);
    document.getElementById('steps-stat').textContent = todayHealth?.steps ? formatNumber(todayHealth.steps) : '—';
    
    // Weekly summary
    loadWeeklySummary();
}

function calculateStreak(tasks) {
    let streak = 0;
    for (let i = 0; i < 365; i++) {
        const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        const dayTasks = tasks.filter(t => t.date === date && t.status === 'completed');
        if (dayTasks.length > 0) streak++;
        else if (i > 0) break;
    }
    return streak;
}

function formatNumber(num) {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
}

async function loadWeeklySummary() {
    if (!currentUser) return;
    try {
        const response = await fetch(`${API_URL}/summary/${currentUser.id}/weekly`);
        if (response.ok) {
            const summary = await response.json();
            const card = document.getElementById('weekly-summary-card');
            const content = document.getElementById('weekly-summary-content');
            
            card.style.display = 'block';
            content.innerHTML = `
                <div class="summary-stats">
                    <div>✅ Задач: ${summary.overview?.tasks_completed || 0}/${summary.overview?.tasks_total || 0}</div>
                    <div>💪 Тренировок: ${summary.overview?.workouts || 0}</div>
                    <div>💤 Сон: ${summary.overview?.avg_sleep || '—'}ч</div>
                    <div>😊 Настроение: ${summary.overview?.avg_mood || '—'}/10</div>
                </div>
                ${summary.recommendations?.length ? `
                    <div class="recommendations">
                        ${summary.recommendations.map(r => `<div class="rec-item">${r}</div>`).join('')}
                    </div>
                ` : ''}
            `;
        }
    } catch (err) {
        console.error('Summary error:', err);
    }
}

// ========== WORKOUTS ==========
function renderWorkouts() {
    const workouts = userData.workouts || [];
    const list = document.getElementById('workouts-list');
    
    if (!workouts.length) {
        list.innerHTML = '<div class="empty">Пока нет тренировок. Добавь первую!</div>';
        return;
    }
    
    list.innerHTML = workouts.map(w => `
        <div class="workout-card" data-id="${w.id}">
            <div class="workout-header">
                <strong>${w.name || 'Тренировка'}</strong>
                <span class="workout-date">${formatDate(w.date)}</span>
            </div>
            ${w.duration ? `<div>⏱ ${w.duration} мин</div>` : ''}
            ${w.notes ? `<div class="workout-notes">${w.notes}</div>` : ''}
            <div class="exercises-list" id="exercises-${w.id}"></div>
            <button class="btn-small" onclick="addExercise(${w.id})">+ Упражнение</button>
        </div>
    `).join('');
    
    // Load exercises for each workout
    workouts.forEach(w => loadExercises(w.id));
}

async function loadExercises(workoutId) {
    try {
        const response = await fetch(`${API_URL}/workouts/${workoutId}/exercises`);
        if (!response.ok) return;
        
        const exercises = await response.json();
        const container = document.getElementById(`exercises-${workoutId}`);
        if (!container) return;
        
        container.innerHTML = exercises.map(e => `
            <div class="exercise-item" data-exercise-id="${e.id}">
                <div class="exercise-header">
                    <strong>${e.name}</strong>
                    ${e.muscle_group ? `<span class="muscle-group">${e.muscle_group}</span>` : ''}
                    <button class="btn-tiny btn-danger" onclick="deleteExercise(${e.id}, ${workoutId})">🗑</button>
                </div>
                <div class="sets-list">
                    ${e.sets?.map((s, i) => `
                        <span class="set-badge">
                            ${s.weight}кг × ${s.reps}
                            <button class="set-delete" onclick="deleteSet(${s.id}, ${workoutId})">×</button>
                        </span>
                    `).join('') || '<span class="empty-sets">Нет подходов</span>'}
                </div>
                <button class="btn-tiny" onclick="addSet(${e.id}, ${workoutId})">+ Подход</button>
            </div>
        `).join('');
    } catch (err) {
        console.error('Load exercises error:', err);
    }
}

// ========== HABITS ==========
function renderHabits() {
    const habits = userData.habits || [];
    const list = document.getElementById('habits-list');
    
    if (!habits.length) {
        list.innerHTML = '<div class="empty">Нет привычек. Создай первую!</div>';
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    list.innerHTML = habits.map(h => {
        const todayLog = h.logs?.find(l => l.date === today);
        const isDone = todayLog?.status === 'done';
        
        return `
            <div class="habit-card ${h.type}" data-id="${h.id}">
                <div class="habit-header">
                    <span class="habit-icon">${h.type === 'build' ? '🌱' : '🚫'}</span>
                    <strong>${h.name}</strong>
                    <span class="habit-streak">🔥 ${h.streak || 0}</span>
                </div>
                <div class="habit-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${h.completion_rate || 0}%; background: ${h.color}"></div>
                    </div>
                    <span>${h.completion_rate || 0}%</span>
                </div>
                <button class="habit-check ${isDone ? 'done' : ''}" onclick="toggleHabit(${h.id}, '${isDone ? 'missed' : 'done'}')">
                    ${isDone ? '✓' : '○'}
                </button>
            </div>
        `;
    }).join('');
}

// ========== JOURNAL ==========
function initJournalSliders() {
    const sliders = [
        { id: 'journal-sleep-quality', display: 'sleep-quality-value' },
        { id: 'journal-energy', display: 'energy-value' },
        { id: 'journal-mood', display: 'mood-value' },
        { id: 'journal-stress', display: 'stress-value' }
    ];
    
    sliders.forEach(({ id, display }) => {
        const slider = document.getElementById(id);
        const value = document.getElementById(display);
        if (slider && value) {
            slider.addEventListener('input', () => {
                value.textContent = slider.value;
            });
        }
    });
}

function renderJournal() {
    const entries = userData.journal || [];
    const list = document.getElementById('journal-entries');
    
    if (!entries.length) {
        list.innerHTML = '<div class="empty">Нет записей. Расскажи о своём дне!</div>';
        return;
    }
    
    list.innerHTML = entries.slice(0, 7).map(j => `
        <div class="journal-entry">
            <div class="journal-date">${formatDate(j.date)}</div>
            <div class="journal-metrics">
                ${j.sleep_hours ? `<span>💤 ${j.sleep_hours}ч</span>` : ''}
                ${j.energy_level ? `<span>⚡ ${j.energy_level}</span>` : ''}
                ${j.mood ? `<span>😊 ${j.mood}</span>` : ''}
                ${j.stress_level ? `<span>😰 ${j.stress_level}</span>` : ''}
            </div>
            ${j.activities ? `<div class="journal-activities">${j.activities}</div>` : ''}
            ${j.notes ? `<div class="journal-notes">${j.notes}</div>` : ''}
        </div>
    `).join('');
}

// ========== ANALYTICS ==========
function initPeriodSelector() {
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            renderAnalytics();
        });
    });
}

async function renderAnalytics() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/analytics/${currentUser.id}?period=${currentPeriod}`);
        if (!response.ok) return;
        
        const data = await response.json();
        
        // Productivity chart
        renderProductivityChart(data);
        
        // Sleep & Mood chart
        renderSleepMoodChart(data);
        
        // Activity chart
        renderActivityChart(data);
        
        // Categories chart
        renderCategoriesChart(data);
        
        // Correlations
        const corrList = document.getElementById('correlations-list');
        if (data.correlations?.length) {
            corrList.innerHTML = data.correlations.map(c => `
                <div class="correlation-item">
                    <div class="correlation-finding">${c.finding}</div>
                    <div class="correlation-rec">${c.recommendation}</div>
                </div>
            `).join('');
        } else {
            corrList.innerHTML = '<div class="empty">Недостаточно данных для анализа. Продолжай отслеживать!</div>';
        }
        
        // Recommendations
        const recList = document.getElementById('recommendations-list');
        if (data.recommendations?.length) {
            recList.innerHTML = data.recommendations.map(r => `<div class="rec-item">${r}</div>`).join('');
        } else {
            recList.innerHTML = '<div class="empty">Пока нет рекомендаций.</div>';
        }
        
        // Stats
        const total = data.tasks?.total || 0;
        const completed = data.tasks?.completed || 0;
        const rate = total ? Math.round((completed / total) * 100) : 0;
        
        document.getElementById('completion-rate').textContent = `${rate}%`;
        document.getElementById('avg-wellness').textContent = data.wellness?.avg_score || 0;
        document.getElementById('total-tasks').textContent = total;
        document.getElementById('total-workouts').textContent = data.workouts?.count || 0;
        
    } catch (err) {
        console.error('Analytics error:', err);
    }
}

function renderProductivityChart(data) {
    const ctx = document.getElementById('productivity-chart');
    if (!ctx) return;
    
    if (charts.productivity) charts.productivity.destroy();
    
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const productivityData = days.map((_, i) => {
        const date = new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0];
        return (userData.tasks || []).filter(t => t.date === date && t.status === 'completed').length;
    });
    
    charts.productivity = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [{
                label: 'Выполнено',
                data: productivityData,
                borderColor: '#4a9eff',
                backgroundColor: 'rgba(74, 158, 255, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#888' } },
                x: { ticks: { color: '#888' } }
            }
        }
    });
}

function renderSleepMoodChart(data) {
    const ctx = document.getElementById('sleep-mood-chart');
    if (!ctx) return;
    
    if (charts.sleepMood) charts.sleepMood.destroy();
    
    const journal = data.journal || [];
    const dates = journal.slice(-7).map(j => formatDateShort(j.date));
    
    charts.sleepMood = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Сон (ч)',
                    data: journal.slice(-7).map(j => j.sleep_hours || 0),
                    borderColor: '#9b59b6',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    yAxisID: 'y'
                },
                {
                    label: 'Настроение',
                    data: journal.slice(-7).map(j => j.mood || 0),
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { type: 'linear', display: true, position: 'left', ticks: { color: '#888' } },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#888' } },
                x: { ticks: { color: '#888' } }
            }
        }
    });
}

function renderActivityChart(data) {
    const ctx = document.getElementById('activity-chart');
    if (!ctx) return;
    
    if (charts.activity) charts.activity.destroy();
    
    const health = data.health || [];
    const dates = health.slice(-7).map(h => formatDateShort(h.date));
    
    charts.activity = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: 'Шаги',
                data: health.slice(-7).map(h => h.steps || 0),
                backgroundColor: '#4a9eff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#888' } },
                x: { ticks: { color: '#888' } }
            }
        }
    });
}

function renderCategoriesChart(data) {
    const ctx = document.getElementById('categories-chart');
    if (!ctx) return;
    
    if (charts.categories) charts.categories.destroy();
    
    const tasks = userData.tasks || [];
    const categories = {};
    tasks.filter(t => t.status === 'completed').forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + 1;
    });
    
    charts.categories = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: ['#4a9eff', '#4caf50', '#ff9800', '#9c27b0', '#e74c3c']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#e0e0e0' } } }
        }
    });
}

// ========== INPUT HANDLERS ==========
function initInput() {
    // Tabs
    document.querySelectorAll('.input-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const input = tab.dataset.input;
            document.querySelectorAll('.input-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.input-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`input-${input}`).classList.add('active');
        });
    });
    
    // Wellness slider
    const slider = document.getElementById('wellness-slider');
    const value = document.getElementById('wellness-value');
    if (slider && value) {
        slider.addEventListener('input', () => value.textContent = slider.value);
    }
    
    // Add task
    document.getElementById('add-task-btn')?.addEventListener('click', async () => {
        const text = document.getElementById('task-text').value;
        const category = document.getElementById('task-category').value;
        const priority = document.getElementById('task-priority').value;
        const dueDate = document.getElementById('task-due-date').value;
        
        if (!text) return;
        
        try {
            await fetch(`${API_URL}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    text,
                    category,
                    priority,
                    due_date: dueDate
                })
            });
            
            document.getElementById('task-text').value = '';
            await loadData();
            renderDashboard();
            tg?.showPopup({ title: 'Готово', message: 'Задача добавлена' });
        } catch (err) {
            console.error('Add task error:', err);
        }
    });
    
    // Add wellness
    document.getElementById('add-wellness-btn')?.addEventListener('click', async () => {
        const score = parseInt(document.getElementById('wellness-slider').value);
        const context = document.getElementById('wellness-context').value;
        
        try {
            await fetch(`${API_URL}/wellness`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id, score, context })
            });
            
            document.getElementById('wellness-context').value = '';
            await loadData();
            tg?.showPopup({ title: 'Готово', message: 'Самочувствие записано' });
        } catch (err) {
            console.error('Add wellness error:', err);
        }
    });
    
    // Add insight
    document.getElementById('add-insight-btn')?.addEventListener('click', async () => {
        const text = document.getElementById('insight-text').value;
        if (!text) return;
        
        try {
            await fetch(`${API_URL}/insights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id, text })
            });
            
            document.getElementById('insight-text').value = '';
            await loadData();
            tg?.showPopup({ title: 'Готово', message: 'Мысль сохранена' });
        } catch (err) {
            console.error('Add insight error:', err);
        }
    });
    
    // Set focus
    document.getElementById('set-focus-btn')?.addEventListener('click', async () => {
        const focus = prompt('Каков фокус дня?');
        if (!focus) return;
        
        try {
            await fetch(`${API_URL}/focus`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id, text: focus })
            });
            
            await loadData();
            document.getElementById('current-focus').textContent = focus;
        } catch (err) {
            console.error('Set focus error:', err);
        }
    });
    
    // Quick actions
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            
            if (type === 'task') {
                document.querySelector('[data-page="input"]').classList.add('active');
                document.getElementById('input').classList.add('active');
            } else if (type === 'workout') {
                document.querySelector('[data-page="workouts"]').classList.add('active');
                document.getElementById('workouts').classList.add('active');
            } else if (type === 'habit') {
                document.querySelector('[data-page="habits"]').classList.add('active');
                document.getElementById('habits').classList.add('active');
            } else if (type === 'journal') {
                document.querySelector('[data-page="journal"]').classList.add('active');
                document.getElementById('journal').classList.add('active');
            }
        });
    });
    
    // Add workout
    document.getElementById('add-workout-btn')?.addEventListener('click', async () => {
        const name = document.getElementById('workout-name').value;
        const duration = document.getElementById('workout-duration').value;
        
        if (!name) return;
        
        try {
            await fetch(`${API_URL}/workouts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id, name, duration })
            });
            
            document.getElementById('workout-name').value = '';
            document.getElementById('workout-duration').value = '';
            await loadData();
            renderWorkouts();
        } catch (err) {
            console.error('Add workout error:', err);
        }
    });
    
    // Add habit
    document.getElementById('add-habit-btn')?.addEventListener('click', async () => {
        const name = document.getElementById('habit-name').value;
        const type = document.getElementById('habit-type').value;
        const target = document.getElementById('habit-target').value;
        
        if (!name) return;
        
        try {
            await fetch(`${API_URL}/habits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id, name, type, target_days: target })
            });
            
            document.getElementById('habit-name').value = '';
            await loadData();
            renderHabits();
        } catch (err) {
            console.error('Add habit error:', err);
        }
    });
    
    // Save journal
    document.getElementById('save-journal-btn')?.addEventListener('click', async () => {
        const sleep = parseFloat(document.getElementById('journal-sleep').value);
        const sleepQuality = parseInt(document.getElementById('journal-sleep-quality').value);
        const energy = parseInt(document.getElementById('journal-energy').value);
        const mood = parseInt(document.getElementById('journal-mood').value);
        const stress = parseInt(document.getElementById('journal-stress').value);
        const activities = document.getElementById('journal-activities').value;
        const notes = document.getElementById('journal-notes').value;
        
        try {
            await fetch(`${API_URL}/journal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    sleep_hours: sleep,
                    sleep_quality: sleepQuality,
                    energy_level: energy,
                    mood,
                    stress_level: stress,
                    activities,
                    notes
                })
            });
            
            document.getElementById('journal-sleep').value = '';
            document.getElementById('journal-activities').value = '';
            document.getElementById('journal-notes').value = '';
            await loadData();
            renderJournal();
            tg?.showPopup({ title: 'Готово', message: 'День записан' });
        } catch (err) {
            console.error('Save journal error:', err);
        }
    });
}

// ========== HELPERS ==========
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatDateShort(dateStr) {
    const date = new Date(dateStr);
    return `${date.getDate()}.${date.getMonth() + 1}`;
}

// Global functions for inline onclick
window.addExercise = async function(workoutId) {
    const name = prompt('Название упражнения:');
    if (!name) return;
    
    try {
        await fetch(`${API_URL}/workouts/${workoutId}/exercises`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        loadExercises(workoutId);
    } catch (err) {
        console.error('Add exercise error:', err);
    }
};

window.addSet = async function(exerciseId, workoutId) {
    const weight = prompt('Вес (кг):');
    const reps = prompt('Повторения:');
    if (!weight || !reps) return;
    
    try {
        await fetch(`${API_URL}/exercises/${exerciseId}/sets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weight: parseFloat(weight), reps: parseInt(reps) })
        });
        // Reload exercises for this workout
        if (workoutId) {
            loadExercises(workoutId);
        }
    } catch (err) {
        console.error('Add set error:', err);
    }
};

window.deleteSet = async function(setId, workoutId) {
    if (!confirm('Удалить подход?')) return;
    
    try {
        await fetch(`${API_URL}/sets/${setId}`, {
            method: 'DELETE'
        });
        if (workoutId) {
            loadExercises(workoutId);
        }
    } catch (err) {
        console.error('Delete set error:', err);
    }
};

window.deleteExercise = async function(exerciseId, workoutId) {
    if (!confirm('Удалить упражнение и все подходы?')) return;
    
    try {
        // Note: exercises are deleted via CASCADE when workout is deleted
        // For individual exercise deletion, we'd need an endpoint
        // For now, just reload
        if (workoutId) {
            loadExercises(workoutId);
        }
    } catch (err) {
        console.error('Delete exercise error:', err);
    }
};

window.toggleHabit = async function(habitId, status) {
    try {
        await fetch(`${API_URL}/habits/${habitId}/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        await loadData();
        renderHabits();
    } catch (err) {
        console.error('Toggle habit error:', err);
    }
};

// Init
init();
