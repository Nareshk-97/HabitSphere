const STORAGE_KEY = 'habitsphere-web-data-v1';
const palette = { violet:['#7057e9','#f0edff'], orange:['#f39b58','#fff1e5'], blue:['#4d9ce8','#e9f5ff'], green:['#45b99a','#e8f8f4'] };
let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"habits":[],"theme":"light"}');
let insightDays = 7;

const $ = (s) => document.querySelector(s);
const dateKey = (d = new Date()) => new Date(d).toISOString().slice(0, 10);
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
const dateLabel = new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date());
$('#todayLabel').textContent = dateLabel.toUpperCase();

function getHabit(id) { return data.habits.find(h => h.id === id); }
function completed(h, key = dateKey()) { return h.completions.includes(key); }
function dates(h) { return [...h.completions].sort(); }
function streak(h) { let cursor = new Date(); if (!completed(h)) cursor.setDate(cursor.getDate()-1); let total = 0; while (completed(h,dateKey(cursor))) { total++; cursor.setDate(cursor.getDate()-1); } return total; }
function rate(h, days = 7) { const now=new Date(); let count=0; for(let i=0;i<days;i++){const d=new Date(now);d.setDate(now.getDate()-i);if(completed(h,dateKey(d)))count++;} const expected=h.frequency==='daily'?days*h.goal:h.frequency==='weekly'?Math.ceil(days/7)*h.goal:Math.max(1,Math.round(days/30))*h.goal; return Math.min(100,Math.round(count/expected*100)); }
function todayRate() { return data.habits.length ? Math.round(data.habits.filter(h=>completed(h)).length/data.habits.length*100) : 0; }
function style(h) { const [color,light] = palette[h.color] || palette.violet; return `--habit-color:${color};--habit-light:${light}`; }
function escapeHtml(value) { const d=document.createElement('div');d.textContent=value;return d.innerHTML; }
function toast(message) { const el=$('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600); }

function renderTodayHabits() {
  const root=$('#todayHabits');
  if(!data.habits.length){root.innerHTML='<div class="empty-state">No habits yet. Add one and make today meaningful.</div>';return;}
  root.innerHTML=data.habits.map(h=>`<div class="today-habit" style="${style(h)}"><input class="check" type="checkbox" data-complete="${h.id}" ${completed(h)?'checked':''}><span class="habit-dot"></span><div><strong>${escapeHtml(h.name)}</strong><small>${h.goal} time${h.goal>1?'s':''} · ${h.frequency}</small></div><span class="streak">♨ ${streak(h)} day${streak(h)!==1?'s':''}</span></div>`).join('');
}
function renderStats() {
  const count=data.habits.filter(h=>completed(h)).length, best=Math.max(0,...data.habits.map(streak)), consistency=data.habits.length?Math.round(data.habits.reduce((sum,h)=>sum+rate(h,7),0)/data.habits.length):0, percent=todayRate();
  $('#completedStat').textContent=`${count} / ${data.habits.length}`;$('#streakStat').textContent=`${best} day${best!==1?'s':''}`;$('#consistencyStat').textContent=`${consistency}%`;$('#dailyPercent').textContent=`${percent}%`;$('#progressRing').style.setProperty('--progress',`${percent}%`);
  $('#focusText').textContent=percent===100&&data.habits.length?'You did it. Own the momentum.':percent>0?'You are building momentum.':'Make today count.';
  $('#focusDescription').textContent=data.habits.length?`${count} of ${data.habits.length} habits are complete today.`:'Complete your habits and move one step closer to the person you want to be.';
}
function renderChart() { const root=$('#weekChart'), labels=[]; for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=dateKey(d), value=data.habits.length?Math.round(data.habits.filter(h=>completed(h,key)).length/data.habits.length*100):0;labels.push(`<div class="day-bar"><span style="height:${Math.max(value,2)}%"></span><label>${d.toLocaleDateString('en-US',{weekday:'narrow'})}</label></div>`);}root.innerHTML=labels.join('');const completedDays=data.habits.length?Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return data.habits.some(h=>completed(h,dateKey(d)));}).filter(Boolean).length:0;$('#trendText').textContent=completedDays?`${completedDays}/7 active days`:'Start today'; }
function renderSuggestion() { if(!data.habits.length)return; const weak=[...data.habits].sort((a,b)=>rate(a,7)-rate(b,7))[0];const best=[...data.habits].sort((a,b)=>streak(b)-streak(a))[0]; if(rate(weak,7)<50){$('#suggestionTitle').textContent=`Make ${weak.name} easier to start`;$('#suggestionText').textContent=`Its seven-day consistency is ${rate(weak,7)}%. Try connecting it to a routine you already do.`;}else if(streak(best)>=3){$('#suggestionTitle').textContent=`${best.name} is becoming automatic`;$('#suggestionText').textContent=`You have a ${streak(best)}-day streak. Protect it by deciding exactly when you will do it tomorrow.`;}else{$('#suggestionTitle').textContent='Consistency grows from simple starts';$('#suggestionText').textContent='Keep each habit visible and make the next action as easy as possible.';} }
function renderAllHabits() { const root=$('#allHabits');if(!data.habits.length){root.innerHTML='<div class="empty-state">Your habit library is empty. Add the first routine you want to build.</div>';return;}root.innerHTML=data.habits.map(h=>{const r=rate(h,30);return `<article class="habit-card" style="${style(h)}"><div class="habit-card-top"><div><h3>${escapeHtml(h.name)}</h3><p>${h.goal} time${h.goal>1?'s':''} · ${h.frequency}</p></div><div class="habit-orb">✓</div></div><div class="mini-progress"><div class="mini-progress-head"><span>Last 30 days</span><strong>${r}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${r}%"></div></div></div><div class="habit-card-footer"><span>♨ <strong>${streak(h)} day streak</strong></span><button class="delete-button" data-delete="${h.id}" title="Delete habit">⌫</button></div></article>`;}).join(''); }
function renderInsights() { const root=$('#performanceBars');if(!data.habits.length){root.innerHTML='<div class="empty-state">Add habits to unlock your personal analytics.</div>';$('#reportContent').innerHTML='';return;}root.innerHTML=data.habits.map(h=>{const r=rate(h,insightDays);return `<div class="performance-row" style="${style(h)}"><span>${escapeHtml(h.name)}</span><div class="progress-track"><div class="progress-fill" style="width:${r}%"></div></div><strong>${r}%</strong></div>`;}).join('');const avg=Math.round(data.habits.reduce((sum,h)=>sum+rate(h,insightDays),0)/data.habits.length), most=[...data.habits].sort((a,b)=>rate(b,insightDays)-rate(a,insightDays))[0], needs=[...data.habits].sort((a,b)=>rate(a,insightDays)-rate(b,insightDays))[0];$('#reportHeading').textContent=insightDays===7?"This week's reflection":"This month's reflection";$('#reportContent').innerHTML=`<div class="report-item"><strong>${avg}% overall consistency.</strong> ${avg>=75?'That is a strong foundation—keep your routine protected.':'Focus on showing up, even in a smaller way.'}</div><div class="report-item"><strong>${escapeHtml(most.name)}</strong> is your strongest habit at ${rate(most,insightDays)}%.</div>${needs.id!==most.id?`<div class="report-item"><strong>${escapeHtml(needs.name)}</strong> could use attention. Plan its next exact time and place.</div>`:''}`; }
function render(){renderTodayHabits();renderStats();renderChart();renderSuggestion();renderAllHabits();renderInsights();}

function openModal(){ $('#modalBackdrop').classList.add('open');$('#modalBackdrop').setAttribute('aria-hidden','false');$('#habitName').focus(); }
function closeModal(){ $('#modalBackdrop').classList.remove('open');$('#modalBackdrop').setAttribute('aria-hidden','true'); }
$('#openModal').onclick=openModal;$('#openModalSecondary').onclick=openModal;$('#closeModal').onclick=closeModal;$('#modalBackdrop').onclick=e=>{if(e.target===e.currentTarget)closeModal();};
$('#habitForm').onsubmit=e=>{e.preventDefault();const name=$('#habitName').value.trim();if(!name)return;data.habits.push({id:crypto.randomUUID(),name,frequency:$('#habitFrequency').value,goal:Number($('#habitGoal').value),color:document.querySelector('input[name=color]:checked').value,createdAt:dateKey(),completions:[]});save();e.target.reset();$('#violet').checked=true;closeModal();render();toast('Habit created — your journey starts now.');};
document.addEventListener('change',e=>{if(e.target.matches('[data-complete]')){const h=getHabit(e.target.dataset.complete),key=dateKey();h.completions=completed(h,key)?h.completions.filter(d=>d!==key):[...h.completions,key];save();render();toast(completed(h,key)?'Completed for today. Great work!':'Marked incomplete for today.');}});
document.addEventListener('click',e=>{const del=e.target.closest('[data-delete]');if(del){const h=getHabit(del.dataset.delete);if(confirm(`Delete "${h.name}"? This cannot be undone.`)){data.habits=data.habits.filter(x=>x.id!==h.id);save();render();toast('Habit deleted.');}}const nav=e.target.closest('[data-view], [data-view-target]');if(nav){const view=nav.dataset.view||nav.dataset.viewTarget;document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===`${view}View`));document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===view));$('#pageTitle').textContent=view==='dashboard'?'Good morning, achiever.':view==='habits'?'Build the life you want.':'Learn from your progress.';window.scrollTo({top:0,behavior:'smooth'});}});
document.querySelectorAll('.segment').forEach(btn=>btn.onclick=()=>{insightDays=Number(btn.dataset.period);document.querySelectorAll('.segment').forEach(b=>b.classList.toggle('active',b===btn));renderInsights();});
$('#themeButton').onclick=()=>{data.theme=data.theme==='dark'?'light':'dark';save();applyTheme();};function applyTheme(){document.body.classList.toggle('dark',data.theme==='dark');$('#themeButton').textContent=data.theme==='dark'?'☾':'☼';}applyTheme();render();
// Phase 2 authentication uses the Python JSON API and an HttpOnly session cookie.
async function authRequest(url, payload = null) {
  const options = { method: payload ? 'POST' : 'GET', credentials: 'same-origin', headers: {} };
  if (payload) { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(payload); }
  const response = await fetch(url, options);
  const result = await response.json().catch(() => ({ success: false, message: 'Unexpected server response.' }));
  if (!response.ok) throw new Error(result.message || 'Request failed.');
  return result;
}
function showAuthFeedback(message = '', type = 'error') { const el = $('#authFeedback'); el.textContent = message; el.className = `auth-feedback ${message ? `visible ${type}` : ''}`; }
function setAuthMode(mode) { const registering = mode === 'register'; $('#loginForm').classList.toggle('hidden', registering); $('#registerForm').classList.toggle('hidden', !registering); document.querySelectorAll('[data-auth-mode]').forEach(button => button.classList.toggle('active', button.dataset.authMode === mode)); showAuthFeedback(); }
function signInUser(user) { document.body.classList.add('authenticated'); $('#profileName').textContent = user.full_name; $('#profileEmail').textContent = user.email; $('#profileInitial').textContent = user.full_name.charAt(0).toUpperCase(); $('#pageTitle').textContent = `Welcome, ${user.full_name.split(' ')[0]}.`; loadDashboard(); loadHabits(); loadAnalytics(); loadSettings(true); }
async function loadDashboard() {
  try {
    const { dashboard } = await authRequest('/api/dashboard');
    $('#totalHabitsStat').textContent = dashboard.total_habits;
    $('#activeHabitsStat').textContent = dashboard.active_habits;
    $('#completedStat').textContent = dashboard.today_completed;
    $('#streakStat').textContent = `${dashboard.current_streak} day${dashboard.current_streak === 1 ? '' : 's'}`;
    $('#longestStreakStat').textContent = `${dashboard.longest_streak} day${dashboard.longest_streak === 1 ? '' : 's'}`;
    $('#overallPercentageStat').textContent = `${dashboard.overall_completion_percentage}%`;
    $('#dailyPercent').textContent = `${dashboard.today_completion_percentage}%`;
    $('#progressRing').style.setProperty('--progress', `${dashboard.today_completion_percentage}%`);
    $('#focusText').textContent = dashboard.active_habits ? 'Make today count.' : 'Your next habit starts here.';
    $('#focusDescription').textContent = dashboard.active_habits ? `${dashboard.today_completed} active habits completed today.` : 'Create a habit to begin tracking your progress.';
    $('#weeklyGoalText').textContent = `${dashboard.weekly_goal.completed} / ${dashboard.weekly_goal.target}`;
    $('#monthlyGoalText').textContent = `${dashboard.monthly_goal.completed} / ${dashboard.monthly_goal.target}`;
    $('#weeklyGoalBar').style.width = `${dashboard.weekly_goal.percentage}%`;
    $('#monthlyGoalBar').style.width = `${dashboard.monthly_goal.percentage}%`;
  } catch (error) { console.error('Dashboard data could not be loaded:', error); }
}
function signOutUser() { document.body.classList.remove('authenticated'); $('#loginForm').reset(); $('#loginPassword').value = ''; setAuthMode('login'); }
function initializeAuthentication() {
  $('#trackerDate').value = localDateValue();
  $('#settingsForm').addEventListener('submit', saveSettings);
  document.querySelector('[data-view="settings"]').addEventListener('click', () => loadSettings(false));
  $('#trackerDate').addEventListener('change', loadTracker);
  document.querySelector('[data-view="tracker"]').addEventListener('click', loadTracker);
  document.querySelector('[data-view="insights"]').addEventListener('click', loadAnalytics);
  document.querySelectorAll('[data-report]').forEach(button=>button.addEventListener('click',()=>generateReport(button.dataset.report)));
  $('#generateCharts').addEventListener('click', generateCharts);
  document.addEventListener('click',event=>{const button=event.target.closest('[data-track-save]');if(button)saveTrackerCompletion(button.dataset.trackSave);});
  setupHabitForm();
  $('#openModal').onclick = () => openHabitModal();
  $('#openModalSecondary').onclick = () => openHabitModal();
  $('#quickAddHabit').onclick = () => openHabitModal();
  $('#closeModal').onclick = () => $('#modalBackdrop').classList.remove('open');
  $('#modalBackdrop').onclick = event => { if (event.target === event.currentTarget) $('#modalBackdrop').classList.remove('open'); };
  ['habitSearch', 'categoryFilter', 'goalTypeFilter', 'statusFilter'].forEach(id => document.getElementById(id).addEventListener(id === 'habitSearch' ? 'input' : 'change', loadHabits));
  document.addEventListener('click', event => { const button = event.target.closest('[data-habit-view],[data-habit-edit],[data-habit-toggle],[data-habit-delete]'); if (!button) return; if (button.dataset.habitView) showHabit(button.dataset.habitView); if (button.dataset.habitEdit) editHabit(button.dataset.habitEdit); if (button.dataset.habitToggle) toggleHabit(button.dataset.habitToggle); if (button.dataset.habitDelete) deleteHabit(button.dataset.habitDelete); });
  document.querySelector('[data-view="habits"]').addEventListener('click', loadHabits);
  document.querySelectorAll('[data-auth-mode]').forEach(button => button.addEventListener('click', () => setAuthMode(button.dataset.authMode)));
  $('#registerForm').addEventListener('submit', async event => { event.preventDefault(); const button = event.submitter; button.disabled = true; try { const result = await authRequest('/api/auth/register', { full_name: $('#registerName').value, email: $('#registerEmail').value, password: $('#registerPassword').value }); $('#loginEmail').value = result.user.email; $('#registerForm').reset(); setAuthMode('login'); showAuthFeedback(result.message, 'success'); } catch (error) { showAuthFeedback(error.message); } finally { button.disabled = false; } });
  $('#loginForm').addEventListener('submit', async event => { event.preventDefault(); const button = event.submitter; button.disabled = true; try { const result = await authRequest('/api/auth/login', { email: $('#loginEmail').value, password: $('#loginPassword').value }); signInUser(result.user); toast('Welcome back, ' + result.user.full_name.split(' ')[0] + '!'); } catch (error) { showAuthFeedback(error.message); } finally { button.disabled = false; } });
  $('#logoutButton').addEventListener('click', async () => { try { await authRequest('/api/auth/logout', {}); } catch (error) { console.error(error); } finally { signOutUser(); } });
  $('#quickTrackToday').addEventListener('click', () => document.querySelector('[data-view="habits"]').click());
  $('#quickViewReports').addEventListener('click', () => document.querySelector('[data-view="reports"]').click());
  authRequest('/api/auth/me').then(result => signInUser(result.user)).catch(() => { signOutUser(); if (location.protocol === 'file:') showAuthFeedback('Start the site with python app.py, then open http://127.0.0.1:8000.', 'error'); });
}
window.addEventListener('load', initializeAuthentication);
let managedHabits = [];
async function habitRequest(url, method = 'GET', payload = null) {
  const options = { method, credentials: 'same-origin', headers: {} };
  if (payload) { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(payload); }
  const response = await fetch(url, options);
  const result = await response.json().catch(() => ({ success: false, message: 'Unexpected server response.' }));
  if (!response.ok) throw new Error(result.message || 'Habit request failed.');
  return result;
}
function setupHabitForm() {
  const form = $('#habitForm');
  form.querySelector('.eyebrow').textContent = 'HABIT MANAGEMENT';
  form.querySelector('h2').id = 'habitModalTitle';
  form.querySelector('.color-options').parentElement.remove();
  $('#habitName').closest('label').insertAdjacentHTML('afterend', '<label>Description<textarea id="habitDescription" maxlength="1000" placeholder="What does this habit involve?"></textarea></label><label>Category<input id="habitCategory" maxlength="80" required placeholder="e.g. Health, Learning"></label>');
  form.querySelector('.form-row').insertAdjacentHTML('afterend', '<label>Status<select id="habitStatus"><option value="active">Active</option><option value="inactive">Inactive</option></select></label><p class="form-help">The start date is recorded automatically when the habit is created.</p>');
  form.onsubmit = submitHabitForm;
}
function habitPayload() { return { habit_name: $('#habitName').value, description: $('#habitDescription').value, category: $('#habitCategory').value, goal_type: $('#habitFrequency').value, target_count: Number($('#habitGoal').value), status: $('#habitStatus').value }; }
function openHabitModal(habit = null) { const form = $('#habitForm'); form.reset(); form.dataset.habitId = habit ? habit.habit_id : ''; $('#habitModalTitle').textContent = habit ? 'Edit habit' : 'Create a habit'; if (habit) { $('#habitName').value = habit.habit_name; $('#habitDescription').value = habit.description || ''; $('#habitCategory').value = habit.category; $('#habitFrequency').value = habit.goal_type; $('#habitGoal').value = habit.target_count; $('#habitStatus').value = habit.status; } $('#modalBackdrop').classList.add('open'); $('#habitName').focus(); }
async function submitHabitForm(event) { event.preventDefault(); const form = event.currentTarget; const id = form.dataset.habitId; const button = form.querySelector('[type="submit"]'); button.disabled = true; try { const result = await habitRequest(id ? `/api/habits/${id}` : '/api/habits', id ? 'PUT' : 'POST', habitPayload()); $('#modalBackdrop').classList.remove('open'); toast(result.message); await Promise.all([loadHabits(), loadDashboard()]); } catch (error) { toast(error.message); } finally { button.disabled = false; } }
function renderHabitTable() { const body = $('#habitTableBody'), empty = $('#habitTableEmpty'); body.innerHTML = managedHabits.map(habit => `<tr><td>${escapeHtml(habit.habit_name)}<small>${escapeHtml(habit.description || 'No description')}</small></td><td>${escapeHtml(habit.category)}</td><td>${habit.goal_type}</td><td>${habit.target_count}</td><td>${habit.start_date}</td><td><span class="status-pill ${habit.status}">${habit.status}</span></td><td><div class="row-actions"><button class="row-button" data-habit-view="${habit.habit_id}">View</button><button class="row-button" data-habit-edit="${habit.habit_id}">Edit</button><button class="row-button" data-habit-toggle="${habit.habit_id}">${habit.status === 'active' ? 'Deactivate' : 'Activate'}</button><button class="row-button delete" data-habit-delete="${habit.habit_id}">Delete</button></div></td></tr>`).join(''); empty.hidden = managedHabits.length > 0; }
function updateCategoryFilter() { const select = $('#categoryFilter'), selected = select.value, categories = [...new Set(managedHabits.map(habit => habit.category))].sort(); select.innerHTML = '<option value="">All categories</option>' + categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join(''); select.value = categories.includes(selected) ? selected : ''; }
async function loadHabits() { try { const params = new URLSearchParams(); if ($('#habitSearch').value.trim()) params.set('search', $('#habitSearch').value.trim()); if ($('#categoryFilter').value) params.set('category', $('#categoryFilter').value); if ($('#goalTypeFilter').value) params.set('goal_type', $('#goalTypeFilter').value); if ($('#statusFilter').value) params.set('status', $('#statusFilter').value); const result = await habitRequest(`/api/habits?${params}`); managedHabits = result.habits; renderHabitTable(); updateCategoryFilter(); } catch (error) { console.error('Habits could not be loaded:', error); } }
async function showHabit(id) { try { const { habit } = await habitRequest(`/api/habits/${id}`); const detail = $('#habitDetail'); detail.hidden = false; detail.innerHTML = `<h3>${escapeHtml(habit.habit_name)}</h3><p>${escapeHtml(habit.description || 'No description provided.')}</p><p><strong>Category:</strong> ${escapeHtml(habit.category)} &nbsp; <strong>Goal:</strong> ${habit.target_count} ${habit.goal_type} &nbsp; <strong>Status:</strong> ${habit.status}</p>`; detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (error) { toast(error.message); } }
async function editHabit(id) { try { const { habit } = await habitRequest(`/api/habits/${id}`); openHabitModal(habit); } catch (error) { toast(error.message); } }
async function toggleHabit(id) { try { const { habit } = await habitRequest(`/api/habits/${id}`); habit.status = habit.status === 'active' ? 'inactive' : 'active'; const result = await habitRequest(`/api/habits/${id}`, 'PUT', habit); toast(result.message); await Promise.all([loadHabits(), loadDashboard()]); } catch (error) { toast(error.message); } }
async function deleteHabit(id) { if (!confirm('Delete this habit and its completion history? This cannot be undone.')) return; try { const result = await habitRequest(`/api/habits/${id}`, 'DELETE'); $('#habitDetail').hidden = true; toast(result.message); await Promise.all([loadHabits(), loadDashboard()]); } catch (error) { toast(error.message); } }
function localDateValue() { return new Date().toISOString().slice(0, 10); }
async function loadTracker() { try { const result=await habitRequest(`/api/tracker?date=${$('#trackerDate').value||localDateValue()}`); const root=$('#trackerList'); root.innerHTML=result.tracker.habits.map(h=>`<article class="tracker-card ${h.state}"><h3>${escapeHtml(h.habit_name)}</h3><small>${escapeHtml(h.category)} · ${h.target_count} ${h.goal_type} · ${h.state}</small><div class="tracker-controls"><label><input data-track-check="${h.habit_id}" type="checkbox" ${h.completed?'checked':''}> Completed</label><input data-track-count="${h.habit_id}" type="number" min="1" max="1000" value="${h.completion_count||h.target_count}" title="Completion count"><button data-track-save="${h.habit_id}">Save</button></div><textarea data-track-notes="${h.habit_id}" maxlength="1000" placeholder="Optional notes">${escapeHtml(h.notes)}</textarea></article>`).join('') || '<div class="empty-state">No active habits for this date.</div>'; } catch(error){toast(error.message);} }
async function saveTrackerCompletion(id) { const checked=document.querySelector(`[data-track-check="${id}"]`).checked; const payload={habit_id:Number(id),completion_date:$('#trackerDate').value,completed:checked,completion_count:Number(document.querySelector(`[data-track-count="${id}"]`).value),notes:document.querySelector(`[data-track-notes="${id}"]`).value}; try { const result=await habitRequest('/api/tracker/completions','POST',payload); toast(result.message); await Promise.all([loadTracker(),loadDashboard(),loadAnalytics()]); } catch(error){toast(error.message);} }
async function loadAnalytics() { try { const {analytics}=await habitRequest('/api/analytics'); const metrics=analytics.habits; $('#performanceBars').innerHTML=metrics.map(h=>`<div class="performance-row"><span>${escapeHtml(h.habit_name)}</span><div class="progress-track"><div class="progress-fill" style="width:${h.completion_percentage}%;background:#4d9ce8"></div></div><strong>${h.completion_percentage}%</strong></div>`).join('') || '<div class="empty-state">Complete habits to unlock analytics.</div>'; const most=analytics.most_consistent; const least=analytics.least_consistent; $('#reportHeading').textContent='Your analytics summary'; $('#reportContent').innerHTML=`<div class="report-item"><strong>${analytics.overall_completion_percentage}% overall completion.</strong></div>${most?`<div class="report-item"><strong>Most consistent:</strong> ${escapeHtml(most.habit_name)} (${most.consistency_score}%).</div><div class="report-item"><strong>Needs attention:</strong> ${escapeHtml(least.habit_name)} (${least.missed_days} missed days).</div>`:''}`; }catch(error){console.error(error);} }
async function generateReport(period) { try { const {report}=await habitRequest('/api/reports','POST',{period}); const root=$('#reportResult'); root.hidden=false; root.innerHTML=`<p class="eyebrow">${report.period.toUpperCase()} REPORT READY</p><h2>${report.summary.overall_completion_percentage}% overall completion</h2><div class="report-download"><a href="${report.csv_url}" download>Download CSV</a><a href="${report.txt_url}" download>Download TXT</a></div>`; toast('Report generated.'); }catch(error){toast(error.message);} }
async function generateCharts() { try { const {charts}=await habitRequest('/api/charts','POST',{}); $('#chartGrid').innerHTML=Object.entries(charts).map(([name,url])=>`<img src="${url}" alt="${name} chart">`).join(''); toast('Charts generated from current analytics.'); }catch(error){toast(error.message);} }
async function loadSettings(applyDefault = false) { try { const {preferences}=await habitRequest('/api/settings'); $('#settingTheme').value=preferences.theme; $('#settingView').value=preferences.default_dashboard_view; $('#settingWeekly').value=preferences.weekly_goal; $('#settingMonthly').value=preferences.monthly_goal; $('#settingExport').value=preferences.export_format; data.theme=preferences.theme; save(); applyTheme(); if(applyDefault && preferences.default_dashboard_view!=='dashboard') document.querySelector(`[data-view="${preferences.default_dashboard_view}"]`).click(); } catch(error){console.error('Settings could not be loaded:',error);} }
async function saveSettings(event) { event.preventDefault(); try { const {preferences,message}=await habitRequest('/api/settings','PUT',{theme:$('#settingTheme').value,default_dashboard_view:$('#settingView').value,weekly_goal:Number($('#settingWeekly').value),monthly_goal:Number($('#settingMonthly').value),export_format:$('#settingExport').value}); data.theme=preferences.theme; save(); applyTheme(); toast(message); await loadDashboard(); } catch(error){toast(error.message);} }
