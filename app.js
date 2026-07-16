// ==========================================================
// CMMS - Campus Maintenance Management System
// Full-Stack Mode: PostgreSQL (Supabase) via Node.js REST API
// ==========================================================

const API = '/api';
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

    // Intercept navigation links for smooth page transition
    document.querySelectorAll('a[href^="/"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const target = link.getAttribute('href');
            if (target && target !== '#' && target !== window.location.pathname) {
                e.preventDefault();
                showPageLoader('Navigating...');
                setTimeout(() => {
                    window.location.href = target;
                }, 180);
            }
        });
    });

    // Check existing login session
    checkSession();
});

function showPageLoader(msg = 'Loading CMMS...') {
    const loader = document.getElementById('page-loader');
    const text = document.getElementById('loader-text');
    if (text && msg) text.innerText = msg;
    if (loader) loader.classList.remove('fade-out');
}

function hidePageLoader() {
    const loader = document.getElementById('page-loader');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('fade-out');
        }, 150);
    }
}

async function checkSession() {
    const page = document.body.getAttribute('data-page');
    const token = localStorage.getItem('cmms_token');
    
    if (!token) {
        if (['student', 'staff', 'admin'].includes(page)) {
            window.location.href = '/login';
            return;
        }
        hidePageLoader();
        return;
    }

    const data = await apiCall(`${API}/auth/me`);
    if (data.success && data.user) {
        currentUser = data.user;

        if (page === 'home') {
            const authBtn = document.getElementById('landing-auth-btn');
            if (authBtn) {
                authBtn.innerHTML = `Go to Dashboard <i data-feather="arrow-right" style="width:16px;height:16px;vertical-align:middle;margin-left:4px;"></i>`;
                authBtn.href = `/${currentUser.role}`;
                feather.replace();
            }
            hidePageLoader();
            return;
        }

        if (page === 'login') {
            showPageLoader('Redirecting to Dashboard...');
            window.location.href = `/${currentUser.role}`;
            return;
        }

        if (page && ['student', 'staff', 'admin'].includes(page) && page !== currentUser.role) {
            showPageLoader('Redirecting to your Dashboard...');
            window.location.href = `/${currentUser.role}`;
            return;
        }

        const navName = document.getElementById('nav-name');
        if (navName) navName.innerText = currentUser.name;
        const navRole = document.getElementById('nav-role');
        if (navRole) navRole.innerText = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
        const navAvatar = document.getElementById('nav-avatar');
        if (navAvatar) navAvatar.innerText = currentUser.name.charAt(0);

        const staffData = await apiCall(`${API}/staff`);
        if (Array.isArray(staffData)) staffCache = staffData;

        generateSidebarNav(currentUser.role);
        
        if (currentUser.role === 'student' && page === 'student') { await renderStudentDash(); showSubView('student', 'My Dashboard'); }
        else if (currentUser.role === 'admin' && page === 'admin') { await renderAdminDash(); showSubView('admin', 'Admin Panel'); }
        else if (currentUser.role === 'staff' && page === 'staff') { await renderStaffDash(); showSubView('staff', 'Assigned Tasks'); }

        hidePageLoader();
    } else {
        localStorage.removeItem('cmms_token');
        localStorage.removeItem('cmms_user');
        if (['student', 'staff', 'admin'].includes(page)) {
            window.location.href = '/login';
            return;
        }
        hidePageLoader();
    }
}

function initThemeToggle() {
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('cmms_theme') || 'light';
    html.setAttribute('data-theme', savedTheme);

    const toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(btn => {
        btn.innerHTML = `<i data-feather="${savedTheme === 'dark' ? 'sun' : 'moon'}"></i>`;
    });

    toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('cmms_theme', newTheme);
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


function getBadgeHtml(status) {
    if (status === 'Pending') return `<span class="status-badge badge-pending">Pending</span>`;
    if (status === 'In Progress') return `<span class="status-badge badge-progress">In Progress</span>`;
    if (status === 'Resolved') return `<span class="status-badge badge-resolved">Resolved</span>`;
    return '';
}

async function apiCall(url, options = {}) {
    try {
        const token = localStorage.getItem('cmms_token');
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(url, {
            ...options,
            headers,
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
function getViews() {
    return {
        login: document.getElementById('login-view'),
        app: document.getElementById('app-shell')
    };
}

function getSubViews() {
    return {
        student: document.getElementById('dash-student'),
        submit: document.getElementById('dash-submit'),
        admin: document.getElementById('dash-admin'),
        adminResolved: document.getElementById('dash-admin-resolved'),
        adminAddStaff: document.getElementById('dash-admin-add-staff'),
        staffPerformance: document.getElementById('dash-admin-performance'),
        staff: document.getElementById('dash-staff')
    };
}

function showSubView(viewName, title) {
    const sList = getSubViews();
    Object.values(sList).forEach(v => {
        if (v) {
            v.classList.add('hidden');
            v.classList.remove('active-subview');
        }
    });
    if (sList[viewName]) {
        sList[viewName].classList.remove('hidden');
        void sList[viewName].offsetWidth;
        sList[viewName].classList.add('active-subview');
    }
    const titleEl = document.getElementById('top-page-title');
    if (titleEl && title) titleEl.innerText = title;
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.target === viewName) el.classList.add('active');
    });
    feather.replace();
}

function generateSidebarNav(role) {
    const navContainer = document.getElementById('sidebar-nav-container');
    if (!navContainer) return;
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
            { target: 'adminAddStaff', icon: 'user-plus', label: 'Register Staff' },
            { target: 'staffPerformance', icon: 'bar-chart-2', label: 'Staff Performance' }
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
        btn.innerHTML = `<i data-feather="${l.icon}"></i> <span>${l.label}</span>`;
        btn.addEventListener('click', () => {
            if (l.target === 'student') renderStudentDash();
            if (l.target === 'admin') renderAdminDash();
            if (l.target === 'adminResolved') renderAdminResolvedDash();
            if (l.target === 'adminAddStaff') renderAdminStaffList();
            if (l.target === 'staffPerformance') renderStaffPerformance();
            if (l.target === 'staff') renderStaffDash();
            showSubView(l.target, l.label);
        });
        navContainer.appendChild(btn);
    });
    feather.replace();
    updateSidebarBadges(role);
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

        const rightPanelH1 = document.querySelector('#toggle-right-panel h1');
        const rightPanelP = document.querySelector('#toggle-right-panel p');
        const registerOverlayBtn = document.getElementById('register');

        if (currentLoginRole === 'student') {
            labelEl.innerText = 'Email';
            inputEl.placeholder = 'name@campus.edu';
            inputEl.type = 'email';
            if (rightPanelH1) rightPanelH1.innerText = 'Hello, Scholar!';
            if (rightPanelP) rightPanelP.innerText = 'New student? Register to start reporting campus issues';
            if (registerOverlayBtn) registerOverlayBtn.classList.remove('hidden');
        } else if (currentLoginRole === 'staff') {
            labelEl.innerText = 'Email';
            inputEl.placeholder = 'staff@campus.edu';
            inputEl.type = 'email';
            if (rightPanelH1) rightPanelH1.innerText = 'Hello, Staff!';
            if (rightPanelP) rightPanelP.innerText = 'Maintenance personnel? Sign in to view and resolve assigned tasks';
            if (registerOverlayBtn) registerOverlayBtn.classList.add('hidden');
            document.getElementById('login-panel-container')?.classList.remove('active');
        } else {
            labelEl.innerText = 'Email';
            inputEl.placeholder = 'admin@campus.edu';
            inputEl.type = 'email';
            if (rightPanelH1) rightPanelH1.innerText = 'Hello, Admin!';
            if (rightPanelP) rightPanelP.innerText = 'Campus administrator? Sign in to oversee operations and manage tickets';
            if (registerOverlayBtn) registerOverlayBtn.classList.add('hidden');
            document.getElementById('login-panel-container')?.classList.remove('active');
        }
    });
});

document.getElementById('login-form')?.addEventListener('submit', async (e) => {
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
    localStorage.setItem('cmms_token', data.token);
    localStorage.setItem('cmms_user', JSON.stringify(data.user));

    showToast('success', 'Logged In', `Welcome back, ${currentUser.name}! Redirecting...`);
    setTimeout(() => {
        showPageLoader(`Welcome back, ${currentUser.name}...`);
        window.location.href = `/${role}`;
    }, 400);
});

// ==========================================================
// SLIDING PANEL TOGGLE
// ==========================================================
const panelContainer = document.getElementById('login-panel-container');
const registerToggleBtn = document.getElementById('register');
const loginToggleBtn = document.getElementById('login');

if (registerToggleBtn) {
    registerToggleBtn.addEventListener('click', () => {
        panelContainer.classList.add('active');
    });
}

if (loginToggleBtn) {
    loginToggleBtn.addEventListener('click', () => {
        panelContainer.classList.remove('active');
    });
}

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
    // Slide back to Sign In panel
    document.getElementById('login-panel-container').classList.remove('active');
});

document.getElementById('logout-btn')?.addEventListener('click', () => {
    showPageLoader('Logging out...');
    localStorage.removeItem('cmms_token');
    localStorage.removeItem('cmms_user');
    currentUser = null;
    staffCache = [];
    setTimeout(() => {
        window.location.href = '/login';
    }, 200);
});

document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.toggle('mobile-open');
});

// ==========================================================
// STUDENT DASHBOARD
// ==========================================================
async function renderStudentDash() {
    const tbody = document.getElementById('student-complaints-body');
    const emptyState = document.getElementById('student-empty-state');
    if (!tbody || !emptyState || !currentUser) return;

    const greetingName = document.getElementById('student-greeting-name');
    if (greetingName) greetingName.innerText = currentUser.name;

    const allComplaints = await apiCall(`${API}/complaints`);
    const myComplaints = Array.isArray(allComplaints) ? allComplaints.filter(c => c.student_id === currentUser.id) : [];

    const statTotal = document.getElementById('stu-stat-total');
    if (statTotal) statTotal.innerText = myComplaints.length;
    const statPending = document.getElementById('stu-stat-pending');
    if (statPending) statPending.innerText = myComplaints.filter(c => c.status !== 'Resolved').length;
    const statResolved = document.getElementById('stu-stat-resolved');
    if (statResolved) statResolved.innerText = myComplaints.filter(c => c.status === 'Resolved').length;

    const renderTable = (list) => {
        tbody.innerHTML = '';
        if (list.length === 0) {
            tbody.parentElement.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            tbody.parentElement.classList.remove('hidden');
            emptyState.classList.add('hidden');
            list.forEach(c => {
                const tr = document.createElement('tr');
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
    };

    renderTable(myComplaints);

    const searchInput = document.getElementById('student-search');
    if (searchInput) {
        searchInput.oninput = (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = myComplaints.filter(c =>
                `tkt-${c.complaint_id}`.includes(query) ||
                (c.category && c.category.toLowerCase().includes(query)) ||
                (c.location && c.location.toLowerCase().includes(query)) ||
                (c.description && c.description.toLowerCase().includes(query))
            );
            renderTable(filtered);
        };
    }
}

document.getElementById('btn-goto-submit')?.addEventListener('click', () => {
    document.getElementById('submit-complaint-form')?.reset();
    showSubView('submit', 'Report Issue');
});

document.getElementById('btn-back-dash')?.addEventListener('click', () => {
    renderStudentDash();
    showSubView('student', 'My Dashboard');
});

document.getElementById('submit-complaint-form')?.addEventListener('submit', async (e) => {
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
    if (!tbody || !emptyState) return;
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

    const renderAdminRows = (list) => {
        tbody.innerHTML = '';
        if (list.length === 0) {
            tbody.parentElement.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            tbody.parentElement.classList.remove('hidden');
            emptyState.classList.add('hidden');

            list.forEach(c => {
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
                        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.25rem">
                            ${assignedName}
                            <div style="display:flex; gap:0.35rem;">
                                <button class="btn-sm-danger delete-action-btn" title="Delete Complaint">
                                    <i data-feather="trash-2" style="width:11px;height:11px;"></i>
                                </button>
                                <button class="btn-sm-assign assign-action-btn">
                                    <i data-feather="user-plus" style="width:11px;height:11px;"></i> ${isAssigned ? 'Change' : 'Assign'}
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
    };

    renderAdminRows(activeComplaints);

    const searchInput = document.getElementById('admin-search');
    if (searchInput) {
        searchInput.oninput = (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = activeComplaints.filter(c =>
                `tkt-${c.complaint_id}`.includes(query) ||
                (c.student_name && c.student_name.toLowerCase().includes(query)) ||
                (c.category && c.category.toLowerCase().includes(query)) ||
                (c.location && c.location.toLowerCase().includes(query)) ||
                (c.description && c.description.toLowerCase().includes(query)) ||
                (c.staff_name && c.staff_name.toLowerCase().includes(query))
            );
            renderAdminRows(filtered);
        };
    }
}

async function renderAdminResolvedDash() {
    const tbody = document.getElementById('admin-resolved-body');
    const emptyState = document.getElementById('admin-resolved-empty-state');
    if (!tbody || !emptyState) return;
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
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.25rem">
                        ${assignedName}
                        <button class="btn-sm-danger delete-action-btn" title="Delete Complaint">
                            <i data-feather="trash-2" style="width:11px;height:11px;"></i>
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
    btn.addEventListener('click', () => document.getElementById('assign-modal')?.classList.remove('active'));
});

// Close modal on backdrop click
document.querySelector('.modal-backdrop')?.addEventListener('click', () => {
    document.getElementById('assign-modal')?.classList.remove('active');
});

document.getElementById('btn-confirm-assign')?.addEventListener('click', async (e) => {
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
    if (!tbody || !emptyState) return;
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

document.getElementById('btn-back-dash-admin')?.addEventListener('click', () => {
    renderAdminDash();
    showSubView('admin', 'Admin Panel');
});

document.getElementById('add-staff-form')?.addEventListener('submit', async (e) => {
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
    if (!tbody || !emptyState || !currentUser) return;
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
                        <select class="status-select staff-status-select" data-id="${c.complaint_id}" data-status="${c.status}" style="min-width:145px;">
                            <option value="Pending"${c.status === 'Pending' ? ' selected' : ''}>Pending</option>
                            <option value="In Progress"${c.status === 'In Progress' ? ' selected' : ''}>In Progress</option>
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

// ==========================================================
// SIDEBAR BADGE (Live Counts)
// ==========================================================
function addBadge(target, count) {
    const btn = document.querySelector(`.nav-item[data-target="${target}"]`);
    if (btn && count > 0) {
        btn.querySelector('.nav-badge')?.remove();
        const badge = document.createElement('span');
        badge.className = 'nav-badge';
        badge.textContent = count > 99 ? '99+' : count;
        btn.appendChild(badge);
    }
}

async function updateSidebarBadges(role) {
    const allComplaints = await apiCall(`${API}/complaints`);
    if (!Array.isArray(allComplaints)) return;

    if (role === 'student' && currentUser) {
        const pending = allComplaints.filter(c => c.student_id === currentUser.id && c.status !== 'Resolved').length;
        addBadge('student', pending);
    } else if (role === 'admin') {
        const active = allComplaints.filter(c => c.status !== 'Resolved').length;
        addBadge('admin', active);
    } else if (role === 'staff' && currentUser) {
        const tasks = allComplaints.filter(c => c.assigned_staff_id === currentUser.id && c.status !== 'Resolved').length;
        addBadge('staff', tasks);
    }
}

// ==========================================================
// STAFF PERFORMANCE VIEW (Admin)
// ==========================================================
async function renderStaffPerformance() {
    const tbody = document.getElementById('staff-performance-body');
    const emptyState = document.getElementById('staff-performance-empty-state');
    if (!tbody || !emptyState) return;
    tbody.innerHTML = '';

    const [staffList, allComplaints] = await Promise.all([
        apiCall(`${API}/staff`),
        apiCall(`${API}/complaints`)
    ]);

    const staff = Array.isArray(staffList) ? staffList : [];
    const complaints = Array.isArray(allComplaints) ? allComplaints : [];

    if (staff.length === 0) {
        tbody.parentElement.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    tbody.parentElement.classList.remove('hidden');
    emptyState.classList.add('hidden');

    staff.forEach(s => {
        const assigned = complaints.filter(c => c.assigned_staff_id === s.staff_id).length;
        const resolved = complaints.filter(c => c.assigned_staff_id === s.staff_id && c.status === 'Resolved').length;
        const rate = assigned === 0 ? '<span class="text-xs subtitle">No tasks yet</span>' : `<strong>${Math.round((resolved / assigned) * 100)}%</strong>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div><strong>${s.name}</strong></div>
                <div class="text-xs subtitle">${s.email}</div>
            </td>
            <td>${s.department}</td>
            <td><span class="status-badge badge-progress">${assigned}</span></td>
            <td><span class="status-badge badge-resolved">${resolved}</span></td>
            <td class="text-right">${rate}</td>
        `;
        tbody.appendChild(tr);
    });
}
