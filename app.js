// ==========================================================
// CMMS - Campus Maintenance Management System
// Full-Stack Mode: All data from MySQL via Node.js REST API
// ==========================================================

const API = 'http://localhost:3000/api';
let currentUser = null;
let staffCache = []; // Cached staff list for dropdowns

// ==========================================================
// INIT
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    feather.replace();
    initThemeToggle();

    // Set dynamic copyright year
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Contact Support → smooth scroll to footer
    document.getElementById('contact-support-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-footer')?.scrollIntoView({ behavior: 'smooth' });
    });
});

function initThemeToggle() {
    const toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            toggles.forEach(btn => {
                btn.innerHTML = `<i data-feather="${newTheme === 'dark' ? 'sun' : 'moon'}"></i>`;
            });
            feather.replace();
        });
    });
}

// ==========================================================
// UTILITIES
// ==========================================================
function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let iconName = type === 'success' ? 'check-circle' : 'alert-circle';
    toast.innerHTML = `
        <div class="toast-icon"><i data-feather="${iconName}"></i></div>
        <div class="toast-content"><strong>${title}</strong><p>${message}</p></div>
    `;
    container.appendChild(toast);
    feather.replace();
    setTimeout(() => toast.remove(), 4000);
}

function generateId() {
    // Fallback random ID — only used if student omits their ID
    return Math.floor(Math.random() * 90000 + 10000);
}

function getBadgeHtml(status) {
    if (status === 'Pending') return `<span class="status-badge badge-pending">Pending</span>`;
    if (status === 'In Progress') return `<span class="status-badge badge-progress">In Progress</span>`;
    if (status === 'Resolved') return `<span class="status-badge badge-resolved">Resolved</span>`;
    return '';
}

async function apiCall(url, options = {}) {
    try {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        return await res.json();
    } catch (err) {
        showToast('error', 'Network Error', 'Cannot reach the server. Is it running?');
        return { success: false, error: err.message };
    }
}

// ==========================================================
// NAVIGATION & ROUTING
// ==========================================================
const views = {
    login: document.getElementById('login-view'),
    app: document.getElementById('app-shell')
};

const subViews = {
    student: document.getElementById('dash-student'),
    submit: document.getElementById('dash-submit'),
    admin: document.getElementById('dash-admin'),
    adminResolved: document.getElementById('dash-admin-resolved'),
    adminAddStaff: document.getElementById('dash-admin-add-staff'),
    staff: document.getElementById('dash-staff')
};

function showMainView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
}

function showSubView(viewName, title) {
    Object.values(subViews).forEach(v => v.classList.add('hidden'));
    if (subViews[viewName]) subViews[viewName].classList.remove('hidden');
    document.getElementById('top-page-title').innerText = title;
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.target === viewName) el.classList.add('active');
    });
    feather.replace();
}

function generateSidebarNav(role) {
    const navContainer = document.getElementById('sidebar-nav-container');
    navContainer.innerHTML = '';

    let links = [];
    if (role === 'student') {
        links = [
            { target: 'student', icon: 'grid', label: 'My Dashboard' },
            { target: 'submit', icon: 'plus-square', label: 'Report Issue' }
        ];
    } else if (role === 'admin') {
        links = [
            { target: 'admin', icon: 'layout', label: 'Admin Panel' },
            { target: 'adminResolved', icon: 'archive', label: 'Resolved Tickets' },
            { target: 'adminAddStaff', icon: 'user-plus', label: 'Register Staff' }
        ];
    } else if (role === 'staff') {
        links = [
            { target: 'staff', icon: 'tool', label: 'Assigned Tasks' }
        ];
    }

    links.forEach(l => {
        const btn = document.createElement('button');
        btn.className = 'nav-item';
        btn.dataset.target = l.target;
        btn.innerHTML = `<i data-feather="${l.icon}"></i> ${l.label}`;
        btn.addEventListener('click', () => {
            if (l.target === 'student') renderStudentDash();
            if (l.target === 'admin') renderAdminDash();
            if (l.target === 'adminResolved') renderAdminResolvedDash();
            if (l.target === 'adminAddStaff') renderAdminStaffList();
            if (l.target === 'staff') renderStaffDash();
            showSubView(l.target, l.label);
        });
        navContainer.appendChild(btn);
    });
    feather.replace();
}

// ==========================================================
// LOGIN FLOW
// ==========================================================
let currentLoginRole = 'student';

document.querySelectorAll('.login-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.login-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLoginRole = btn.dataset.role;

        const inputEl = document.getElementById('login-identifier');
        const labelEl = document.getElementById('login-identifier-label');
        const regSection = document.getElementById('registration-link-section');

        if (currentLoginRole === 'student') {
            labelEl.innerText = 'Email';
            inputEl.placeholder = 'name@campus.edu';
            inputEl.type = 'email';
            if (regSection) regSection.classList.remove('hidden');
        } else if (currentLoginRole === 'staff') {
            labelEl.innerText = 'Email';
            inputEl.placeholder = 'staff@campus.edu';
            inputEl.type = 'email';
            if (regSection) regSection.classList.add('hidden');
        } else {
            labelEl.innerText = 'Email';
            inputEl.placeholder = 'admin@campus.edu';
            inputEl.type = 'email';
            if (regSection) regSection.classList.add('hidden');
        }
    });
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;
    const role = currentLoginRole;
    const btn = document.getElementById('login-btn');

    btn.classList.add('btn-loading');
    const data = await apiCall(`${API}/auth/login`, {
        method: 'POST',
        body: { role, identifier, password }
    });
    btn.classList.remove('btn-loading');

    if (!data.success) {
        showToast('error', 'Login Failed', data.error || 'Invalid credentials.');
        return;
    }

    currentUser = data.user;
    document.getElementById('nav-name').innerText = currentUser.name;
    document.getElementById('nav-role').innerText = currentUser.role;
    document.getElementById('nav-avatar').innerText = currentUser.name.charAt(0);

    // Cache staff list for dropdowns
    const staffData = await apiCall(`${API}/staff`);
    staffCache = Array.isArray(staffData) ? staffData : [];

    generateSidebarNav(role);
    showMainView('app');
    showToast('success', 'Logged In', `Welcome back, ${currentUser.name}!`);

    if (role === 'student') { renderStudentDash(); showSubView('student', 'My Dashboard'); }
    else if (role === 'admin') { renderAdminDash(); showSubView('admin', 'Admin Panel'); }
    else if (role === 'staff') { renderStaffDash(); showSubView('staff', 'Assigned Tasks'); }
});

// ==========================================================
// REGISTRATION FLOW
// ==========================================================
document.getElementById('toggle-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-card-main').classList.add('hidden');
    document.getElementById('register-card').classList.remove('hidden');
});

document.getElementById('toggle-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-card').classList.add('hidden');
    document.getElementById('login-card-main').classList.remove('hidden');
});

document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('register-btn');
    btn.classList.add('btn-loading');

    const rawId = document.getElementById('reg-student-id').value.trim();
    const parsedId = parseInt(rawId);
    if (!rawId || isNaN(parsedId) || parsedId <= 0) {
        btn.classList.remove('btn-loading');
        showToast('error', 'Invalid ID', 'Please enter a valid numeric Student ID.');
        return;
    }

    const data = await apiCall(`${API}/auth/register`, {
        method: 'POST',
        body: {
            student_id: parsedId,
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-password').value,
            department: document.getElementById('reg-department').value
        }
    });

    btn.classList.remove('btn-loading');
    if (!data.success) {
        showToast('error', 'Registration Failed', data.error || 'Could not register.');
        return;
    }

    showToast('success', 'Registration Successful', 'Account created! Please log in.');
    document.getElementById('register-form').reset();
    document.getElementById('register-card').classList.add('hidden');
    document.getElementById('login-card-main').classList.remove('hidden');
});

document.getElementById('logout-btn').addEventListener('click', () => {
    currentUser = null;
    staffCache = [];
    document.getElementById('login-form').reset();
    // Reset login tab to student
    document.querySelectorAll('.login-tab').forEach(b => b.classList.remove('active'));
    document.querySelector('.login-tab[data-role="student"]').classList.add('active');
    currentLoginRole = 'student';
    document.getElementById('registration-link-section').classList.remove('hidden');
    const inputEl = document.getElementById('login-identifier');
    inputEl.type = 'email';
    inputEl.placeholder = 'name@campus.edu';
    document.getElementById('login-identifier-label').innerText = 'Email';
    showMainView('login');
});

document.getElementById('mobile-menu-toggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('mobile-open');
});

// ==========================================================
// STUDENT DASHBOARD
// ==========================================================
async function renderStudentDash() {
    document.getElementById('student-greeting-name').innerText = currentUser.name;

    const allComplaints = await apiCall(`${API}/complaints`);
    const myComplaints = Array.isArray(allComplaints) ? allComplaints.filter(c => c.student_id === currentUser.id) : [];

    document.getElementById('stu-stat-total').innerText = myComplaints.length;
    document.getElementById('stu-stat-pending').innerText = myComplaints.filter(c => c.status !== 'Resolved').length;
    document.getElementById('stu-stat-resolved').innerText = myComplaints.filter(c => c.status === 'Resolved').length;

    const tbody = document.getElementById('student-complaints-body');
    const emptyState = document.getElementById('student-empty-state');
    tbody.innerHTML = '';

    if (myComplaints.length === 0) {
        tbody.parentElement.classList.add('hidden');
        emptyState.classList.remove('hidden');
    } else {
        tbody.parentElement.classList.remove('hidden');
        emptyState.classList.add('hidden');
        myComplaints.forEach(c => {
            const tr = document.createElement('tr');
            const dateStr = c.date_submitted ? new Date(c.date_submitted).toLocaleDateString() : '';
            tr.innerHTML = `
                <td>
                    <div style="margin-bottom:0.2rem"><strong>TKT-${c.complaint_id}</strong></div>
                    <p class="subtitle text-xs" style="white-space:normal;">${c.description}</p>
                </td>
                <td>${c.category}</td>
                <td>${c.location}</td>
                <td>${getBadgeHtml(c.status)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

document.getElementById('btn-goto-submit').addEventListener('click', () => {
    document.getElementById('submit-complaint-form').reset();
    showSubView('submit', 'Report Issue');
});

document.getElementById('btn-back-dash').addEventListener('click', () => {
    renderStudentDash();
    showSubView('student', 'My Dashboard');
});

document.getElementById('submit-complaint-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.classList.add('btn-loading');

    const data = await apiCall(`${API}/complaints`, {
        method: 'POST',
        body: {
            student_id: currentUser.id,
            category: document.getElementById('category').value,
            location: document.getElementById('location').value,
            description: document.getElementById('description').value
        }
    });

    btn.classList.remove('btn-loading');
    if (!data.success) {
        showToast('error', 'Submission Failed', data.error || 'Could not submit complaint.');
        return;
    }

    showToast('success', 'Ticket Created', `Your complaint TKT-${data.id} has been submitted.`);
    document.getElementById('submit-complaint-form').reset();
    renderStudentDash();
    showSubView('student', 'My Dashboard');
});

// ==========================================================
// ADMIN DASHBOARD
// ==========================================================
let activeModalComplaintId = null;

async function renderAdminDash() {
    const tbody = document.getElementById('admin-complaints-body');
    const emptyState = document.getElementById('admin-empty-state');
    tbody.innerHTML = '';

    const allComplaints = await apiCall(`${API}/complaints`);
    if (!Array.isArray(allComplaints)) return;

    const total = allComplaints.length;
    const resolved = allComplaints.filter(c => c.status === 'Resolved').length;
    const pending = total - resolved;

    document.getElementById('admin-p-total').innerText = total;
    document.getElementById('admin-p-resolved').innerText = resolved;
    document.getElementById('admin-p-pending').innerText = pending;
    const fillPercent = total === 0 ? 0 : (resolved / total) * 100;
    document.getElementById('progress-fill').style.width = `${fillPercent}%`;

    const activeComplaints = allComplaints.filter(c => c.status !== 'Resolved');

    if (activeComplaints.length === 0) {
        tbody.parentElement.classList.add('hidden');
        emptyState.classList.remove('hidden');
    } else {
        tbody.parentElement.classList.remove('hidden');
        emptyState.classList.add('hidden');

        activeComplaints.forEach(c => {
            const tr = document.createElement('tr');
            const isAssigned = !!c.assigned_staff_id;
            const assignedName = c.staff_name
                ? `<span class="text-xs">${c.staff_name}</span>`
                : `<span class="text-xs text-warning">Unassigned</span>`;
            const dateStr = c.date_submitted ? new Date(c.date_submitted).toLocaleDateString() : '';

            tr.innerHTML = `
                <td>
                    <div style="margin-bottom:0.2rem"><strong>TKT-${c.complaint_id}</strong> <span class="text-xs subtitle">${dateStr}</span></div>
                    <p class="subtitle text-xs" style="white-space:normal;">${c.description}</p>
                </td>
                <td>${c.student_name || 'Unknown'}</td>
                <td>${c.category}</td>
                <td>${c.location}</td>
                <td>${getBadgeHtml(c.status)}</td>
                <td class="text-right">
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.2rem">
                        ${assignedName}
                        <div style="display:flex; gap:0.4rem;">
                            <button class="btn btn-outline btn-icon text-xs mt-1 delete-action-btn" style="padding:0.2rem 0.4rem; color:var(--clr-danger); border-color:var(--clr-danger);" title="Delete Complaint">
                                <i data-feather="trash-2" style="width:12px;height:12px;"></i>
                            </button>
                            <button class="btn btn-outline btn-icon text-xs mt-1 assign-action-btn" style="padding:0.2rem 0.6rem;">
                                <i data-feather="user-plus" style="width:12px;height:12px;margin-right:4px;"></i> ${isAssigned ? 'Change' : 'Assign'}
                            </button>
                        </div>
                    </div>
                </td>
            `;

            tr.querySelector('.assign-action-btn').addEventListener('click', (ev) => {
                ev.stopPropagation();
                openAssignModal(c.complaint_id);
            });
            tr.querySelector('.delete-action-btn').addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (confirm(`Permanently delete ticket TKT-${c.complaint_id}?`)) deleteComplaint(c.complaint_id);
            });
            tbody.appendChild(tr);
        });
        feather.replace();
    }
}

async function renderAdminResolvedDash() {
    const tbody = document.getElementById('admin-resolved-body');
    const emptyState = document.getElementById('admin-resolved-empty-state');
    tbody.innerHTML = '';

    const allComplaints = await apiCall(`${API}/complaints`);
    if (!Array.isArray(allComplaints)) return;

    const resolved = allComplaints.filter(c => c.status === 'Resolved');

    if (resolved.length === 0) {
        tbody.parentElement.classList.add('hidden');
        emptyState.classList.remove('hidden');
    } else {
        tbody.parentElement.classList.remove('hidden');
        emptyState.classList.add('hidden');

        resolved.forEach(c => {
            const tr = document.createElement('tr');
            const assignedName = c.staff_name
                ? `<span class="text-xs">${c.staff_name}</span>`
                : `<span class="text-xs text-warning">Unassigned</span>`;
            const dateStr = c.date_submitted ? new Date(c.date_submitted).toLocaleDateString() : '';

            tr.innerHTML = `
                <td>
                    <div style="margin-bottom:0.2rem"><strong>TKT-${c.complaint_id}</strong> <span class="text-xs subtitle">${dateStr}</span></div>
                    <p class="subtitle text-xs" style="white-space:normal;">${c.description}</p>
                </td>
                <td>${c.student_name || 'Unknown'}</td>
                <td>${c.category}</td>
                <td>${c.location}</td>
                <td>${getBadgeHtml(c.status)}</td>
                <td class="text-right">
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.2rem">
                        ${assignedName}
                        <button class="btn btn-outline btn-icon text-xs mt-1 delete-action-btn" style="padding:0.2rem 0.4rem; color:var(--clr-danger); border-color:var(--clr-danger);" title="Delete Complaint">
                            <i data-feather="trash-2" style="width:12px;height:12px;"></i>
                        </button>
                    </div>
                </td>
            `;
            tr.querySelector('.delete-action-btn').addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (confirm(`Permanently delete ticket TKT-${c.complaint_id}?`)) deleteComplaint(c.complaint_id);
            });
            tbody.appendChild(tr);
        });
        feather.replace();
    }
}

async function deleteComplaint(id) {
    const data = await apiCall(`${API}/complaints/${id}`, { method: 'DELETE' });
    if (data.success) {
        showToast('success', 'Deleted', `Ticket TKT-${id} permanently removed.`);
        renderAdminDash();
        renderAdminResolvedDash();
    } else {
        showToast('error', 'Error', data.error || 'Could not delete ticket.');
    }
}

// Assign Modal
function openAssignModal(id) {
    activeModalComplaintId = id;
    document.getElementById('modal-task-id').innerText = `TKT-${id}`;
    const select = document.getElementById('assign-staff-select');
    select.innerHTML = '<option value="" disabled selected>Choose staff member</option>';
    staffCache.forEach(s => {
        select.innerHTML += `<option value="${s.staff_id}">${s.name} (${s.department})</option>`;
    });
    document.getElementById('assign-modal').classList.add('active');
}

document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => document.getElementById('assign-modal').classList.remove('active'));
});

document.getElementById('btn-confirm-assign').addEventListener('click', async (e) => {
    const staffIdStr = document.getElementById('assign-staff-select').value;
    if (!staffIdStr) { showToast('error', 'Error', 'Please select a staff member.'); return; }

    const btn = e.currentTarget;
    btn.classList.add('btn-loading');
    const data = await apiCall(`${API}/assign`, {
        method: 'POST',
        body: { complaint_id: activeModalComplaintId, staff_id: parseInt(staffIdStr) }
    });
    btn.classList.remove('btn-loading');

    if (data.success) {
        document.getElementById('assign-modal').classList.remove('active');
        showToast('success', 'Assigned', 'Ticket assigned successfully.');
        renderAdminDash(); // Re-fetch complaints to reflect new assignment
    } else {
        showToast('error', 'Error', data.error || 'Could not assign ticket.');
    }
});

// ==========================================================
// ADMIN — STAFF MANAGEMENT
// ==========================================================
async function renderAdminStaffList() {
    const tbody = document.getElementById('admin-staff-list-body');
    const emptyState = document.getElementById('admin-staff-empty-state');
    tbody.innerHTML = '';

    const staffList = await apiCall(`${API}/staff`);
    staffCache = Array.isArray(staffList) ? staffList : [];

    if (staffCache.length === 0) {
        tbody.parentElement.classList.add('hidden');
        emptyState.classList.remove('hidden');
    } else {
        tbody.parentElement.classList.remove('hidden');
        emptyState.classList.add('hidden');

        staffCache.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>STF-${s.staff_id}</strong></td>
                <td>
                    <div><strong>${s.name}</strong></div>
                    <div class="text-xs subtitle">${s.email}</div>
                </td>
                <td>${s.department}</td>
                <td>${s.phone}</td>
                <td class="text-right">
                    <button class="btn btn-outline btn-icon text-xs delete-staff-btn" style="padding:0.2rem 0.4rem; color:var(--clr-danger); border-color:var(--clr-danger);" title="Remove Staff">
                        <i data-feather="user-minus" style="width:12px;height:12px;"></i>
                    </button>
                </td>
            `;
            tr.querySelector('.delete-staff-btn').addEventListener('click', () => {
                if (confirm(`Remove staff member: ${s.name}?`)) deleteStaffMember(s.staff_id);
            });
            tbody.appendChild(tr);
        });
        feather.replace();
    }
}

async function deleteStaffMember(id) {
    const data = await apiCall(`${API}/staff/${id}`, { method: 'DELETE' });
    if (data.success) {
        showToast('success', 'Staff Removed', 'Staff member removed from the system.');
        renderAdminStaffList();
        renderAdminDash();
    } else {
        showToast('error', 'Error', data.error || 'Could not remove staff.');
    }
}

document.getElementById('btn-back-dash-admin').addEventListener('click', () => {
    renderAdminDash();
    showSubView('admin', 'Admin Panel');
});

document.getElementById('add-staff-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('add-staff-btn');
    btn.classList.add('btn-loading');

    const data = await apiCall(`${API}/staff`, {
        method: 'POST',
        body: {
            name: document.getElementById('staff-name').value,
            email: document.getElementById('staff-email').value,
            password: document.getElementById('staff-password').value,
            department: document.getElementById('staff-department').value,
            phone: document.getElementById('staff-contact').value
        }
    });

    btn.classList.remove('btn-loading');
    if (!data.success) {
        showToast('error', 'Registration Failed', data.error || 'Could not register staff.');
        return;
    }

    showToast('success', 'Staff Registered', 'Staff member added to the system.');
    document.getElementById('add-staff-form').reset();
    renderAdminStaffList();
});

// ==========================================================
// STAFF DASHBOARD
// ==========================================================
async function renderStaffDash() {
    const tbody = document.getElementById('staff-complaints-body');
    const emptyState = document.getElementById('staff-empty-state');
    tbody.innerHTML = '';

    const allComplaints = await apiCall(`${API}/complaints`);
    if (!Array.isArray(allComplaints)) return;

    const myTasks = allComplaints.filter(c => c.assigned_staff_id === currentUser.id);

    if (myTasks.length === 0) {
        tbody.parentElement.classList.add('hidden');
        emptyState.classList.remove('hidden');
    } else {
        tbody.parentElement.classList.remove('hidden');
        emptyState.classList.add('hidden');

        myTasks.forEach(c => {
            const tr = document.createElement('tr');
            let actionHtml = '';
            if (c.status === 'Resolved') {
                actionHtml = getBadgeHtml(c.status);
            } else {
                actionHtml = `
                    <div class="select-wrapper">
                        <select class="status-select staff-status-select" data-id="${c.complaint_id}" style="min-width:140px;">
                            <option value="Pending" selected>Pending</option>
                            <option value="Resolved">Resolved</option>
                        </select>
                        <i data-feather="chevron-down" class="select-icon"></i>
                    </div>
                `;
            }
            tr.innerHTML = `
                <td>
                    <div style="margin-bottom:0.4rem"><strong>TKT-${c.complaint_id}</strong> &mdash; ${c.category}</div>
                    <p class="subtitle text-xs" style="white-space:normal;">${c.description}</p>
                </td>
                <td>${c.location}</td>
                <td>${actionHtml}</td>
            `;
            tbody.appendChild(tr);
        });

        // Wire up selects after all rows are added
        tbody.querySelectorAll('.staff-status-select').forEach(sel => {
            sel.addEventListener('change', async () => {
                const cid = parseInt(sel.dataset.id);
                const val = sel.value;
                sel.style.opacity = '0.5';
                const data = await apiCall(`${API}/complaints/${cid}/status`, {
                    method: 'PUT',
                    body: { status: val }
                });
                sel.style.opacity = '1';
                if (data.success) {
                    showToast('success', 'Status Updated', `Task TKT-${cid} marked as ${val}.`);
                    renderStaffDash(); // Re-render
                } else {
                    showToast('error', 'Error', 'Could not update status.');
                }
            });
        });

        feather.replace();
    }
}
