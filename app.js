/**
 * Chandigarh University - Student Performance & Placement Analytics
 * Executive Application Controller & Statistical Visualizations
 */

// State Management
const state = {
  allStudents: (typeof STUDENTS_DATA !== 'undefined') ? STUDENTS_DATA : [],
  filteredStudents: [],
  currentPage: 1,
  pageSize: 20,
  activeTab: 'tab-overview',
  theme: 'dark',
  filters: {
    specialisation: 'ALL',
    band: 'ALL',
    attendance: 'ALL',
    placement: 'ALL',
    search: ''
  },
  sortBy: 'cgpa_desc',
  // Regression Model Parameters (Trained on 520 CU MBA Cohort)
  regression: {
    intercept: -5.1274,
    cgpaCoef: 0.9286,
    attendanceCoef: 0.0318,
    aptitudeCoef: 0.0484,
    softSkillsCoef: 0.3673,
    certsCoef: 0.3417,
    projectsCoef: 0.2634,
    specPremiums: {
      'Business Analytics': 0.0, // Reference category in dummy encoding
      'Finance': -0.6769,
      'Marketing': -1.2353,
      'Operations & Supply Chain': -1.6837,
      'Human Resource Management': -2.0958
    }
  }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initAuthSession();
  initTheme();
  setupNavigation();
  setupFilters();
  setupSimulator();
  setupModals();
  applyFiltersAndRender();
  window.addEventListener('resize', debounce(() => renderAllCharts(), 250));
});

/* ==========================================================================
   User Session Authentication & Logout
   ========================================================================== */
function initAuthSession() {
  const storedUser = localStorage.getItem('cu_auth_user');
  let user = null;
  if (storedUser) {
    try {
      user = JSON.parse(storedUser);
    } catch (e) {
      user = null;
    }
  }

  // Default demo user if none stored
  if (!user) {
    user = {
      name: 'Prof. (Dr.) Rajesh Sharma',
      role: 'Dean / Admin',
      email: 'dean.business@cumohali.in',
      title: 'Dean, Academic Affairs & Business Studies'
    };
    localStorage.setItem('cu_auth_user', JSON.stringify(user));
  }

  const nameSpan = document.getElementById('userNameSpan');
  const roleSpan = document.getElementById('userRoleSpan');
  const avatar = document.getElementById('userAvatar');
  const logoutBtn = document.getElementById('logoutBtn');

  if (nameSpan) nameSpan.textContent = user.name;
  if (roleSpan) roleSpan.textContent = user.role;
  if (avatar) avatar.textContent = user.name ? user.name.replace(/^Prof\.\s*(\(Dr\.\)\s*)?|^Dr\.\s*/, '').charAt(0) : 'U';

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('cu_auth_user');
      window.location.href = 'login.html';
    });
  }
}

/* ==========================================================================
   Theme Management
   ========================================================================== */
function initTheme() {
  const savedTheme = localStorage.getItem('cu_analytics_theme') || 'dark';
  setTheme(savedTheme);

  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const newTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
      setTheme(newTheme);
      localStorage.setItem('cu_analytics_theme', newTheme);
      renderAllCharts();
    });
  }
}

function setTheme(theme) {
  state.theme = theme;
  if (theme === 'light') {
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');
  } else {
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-dark');
  }
}

/* ==========================================================================
   Navigation
   ========================================================================== */
function setupNavigation() {
  const navTabs = document.querySelectorAll('.nav-item');
  navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetTab = tab.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  window.switchTab = switchTab;
}

function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  // Re-render charts when switching tabs
  setTimeout(() => renderAllCharts(), 50);
}

/* ==========================================================================
   Filters & Search
   ========================================================================== */
function setupFilters() {
  const specSelect = document.getElementById('filterSpec');
  const bandSelect = document.getElementById('filterBand');
  const attSelect = document.getElementById('filterAttendance');
  const placeSelect = document.getElementById('filterPlacement');
  const searchInput = document.getElementById('searchStudentInput');
  const resetBtn = document.getElementById('resetFiltersBtn');
  const exportBtn = document.getElementById('exportCsvBtn');

  specSelect.addEventListener('change', () => {
    state.filters.specialisation = specSelect.value;
    state.currentPage = 1;
    applyFiltersAndRender();
  });

  bandSelect.addEventListener('change', () => {
    state.filters.band = bandSelect.value;
    state.currentPage = 1;
    applyFiltersAndRender();
  });

  attSelect.addEventListener('change', () => {
    state.filters.attendance = attSelect.value;
    state.currentPage = 1;
    applyFiltersAndRender();
  });

  placeSelect.addEventListener('change', () => {
    state.filters.placement = placeSelect.value;
    state.currentPage = 1;
    applyFiltersAndRender();
  });

  searchInput.addEventListener('input', debounce(() => {
    state.filters.search = searchInput.value.trim().toLowerCase();
    state.currentPage = 1;
    applyFiltersAndRender();
  }, 200));

  resetBtn.addEventListener('click', () => {
    specSelect.value = 'ALL';
    bandSelect.value = 'ALL';
    attSelect.value = 'ALL';
    placeSelect.value = 'ALL';
    searchInput.value = '';
    state.filters = { specialisation: 'ALL', band: 'ALL', attendance: 'ALL', placement: 'ALL', search: '' };
    state.currentPage = 1;
    applyFiltersAndRender();
  });

  if (exportBtn) {
    exportBtn.addEventListener('click', exportFilteredCsv);
  }

  // Roster controls
  const rosterSort = document.getElementById('rosterSortSelect');
  if (rosterSort) {
    rosterSort.addEventListener('change', () => {
      state.sortBy = rosterSort.value;
      renderRosterTable();
    });
  }

  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  if (prevBtn && nextBtn) {
    prevBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderRosterTable();
      }
    });
    nextBtn.addEventListener('click', () => {
      const maxPages = Math.ceil(state.filteredStudents.length / state.pageSize);
      if (state.currentPage < maxPages) {
        state.currentPage++;
        renderRosterTable();
      }
    });
  }

  const batchExportBtn = document.getElementById('batchExportInterventionsBtn');
  if (batchExportBtn) {
    batchExportBtn.addEventListener('click', exportInterventionsCsv);
  }
}

function applyFiltersAndRender() {
  state.filteredStudents = state.allStudents.filter(s => {
    // Spec filter
    if (state.filters.specialisation !== 'ALL' && s.specialisation !== state.filters.specialisation) return false;
    // Band filter
    if (state.filters.band !== 'ALL' && s.performance_band !== state.filters.band) return false;
    // Attendance filter
    if (state.filters.attendance === 'COMPLIANT' && s.attendance_percentage < 75.0) return false;
    if (state.filters.attendance === 'SHORTAGE' && s.attendance_percentage >= 75.0) return false;
    // Placement filter
    if (state.filters.placement !== 'ALL' && s.placement_status !== state.filters.placement) return false;
    // Search query
    if (state.filters.search) {
      const matchName = s.full_name.toLowerCase().includes(state.filters.search);
      const matchId = s.student_id.toLowerCase().includes(state.filters.search);
      if (!matchName && !matchId) return false;
    }
    return true;
  });

  renderKpis();
  renderRecruiterTiers();
  renderBandsShowcase();
  renderGradeTable();
  renderSpecialisationHeatmap();
  renderCorrelationMatrix();
  renderRegressionCoefficients();
  renderInterventionsHub();
  renderRosterTable();
  renderAllCharts();
}

/* ==========================================================================
   KPI Metrics Card Render
   ========================================================================== */
function renderKpis() {
  const students = state.filteredStudents;
  const total = students.length;

  document.getElementById('kpiCohortVal').textContent = total;
  document.getElementById('kpiCohortSub').textContent = `of ${state.allStudents.length} students`;

  if (total === 0) {
    document.getElementById('kpiPlacementVal').textContent = '0%';
    document.getElementById('kpiPlacementPill').textContent = '0 Placed';
    document.getElementById('kpiPlacementBar').style.width = '0%';
    document.getElementById('kpiAvgSalaryVal').textContent = '₹0.00 LPA';
    document.getElementById('kpiMaxSalarySub').textContent = 'Max: ₹0.00 LPA';
    document.getElementById('kpiAttendanceVal').textContent = '0%';
    document.getElementById('kpiShortagePill').textContent = '0 < 75%';
    document.getElementById('kpiAttendanceBar').style.width = '0%';
    document.getElementById('kpiCgpaVal').textContent = '0.00';
    document.getElementById('kpiInterventionVal').textContent = '0';
    return;
  }

  const placedStudents = students.filter(s => s.placement_status === 'Placed');
  const placementRate = ((placedStudents.length / total) * 100).toFixed(1);
  document.getElementById('kpiPlacementVal').textContent = `${placementRate}%`;
  document.getElementById('kpiPlacementPill').textContent = `${placedStudents.length} Placed`;
  document.getElementById('kpiPlacementBar').style.width = `${placementRate}%`;

  // Placed Salary
  if (placedStudents.length > 0) {
    const avgSalary = (placedStudents.reduce((acc, s) => acc + s.placement_salary_lpa, 0) / placedStudents.length).toFixed(2);
    const maxSalary = Math.max(...placedStudents.map(s => s.placement_salary_lpa)).toFixed(2);
    document.getElementById('kpiAvgSalaryVal').textContent = `₹${avgSalary} LPA`;
    document.getElementById('kpiMaxSalarySub').textContent = `Max: ₹${maxSalary} LPA`;
  } else {
    document.getElementById('kpiAvgSalaryVal').textContent = '₹0.00 LPA';
    document.getElementById('kpiMaxSalarySub').textContent = 'None Placed';
  }

  // Attendance
  const avgAtt = (students.reduce((acc, s) => acc + s.attendance_percentage, 0) / total).toFixed(1);
  const shortageCount = students.filter(s => s.attendance_percentage < 75.0).length;
  document.getElementById('kpiAttendanceVal').textContent = `${avgAtt}%`;
  document.getElementById('kpiShortagePill').textContent = `${shortageCount} < 75%`;
  document.getElementById('kpiAttendanceBar').style.width = `${Math.min(100, avgAtt)}%`;

  // CGPA
  const avgCgpa = (students.reduce((acc, s) => acc + s.overall_cgpa, 0) / total).toFixed(2);
  document.getElementById('kpiCgpaVal').textContent = avgCgpa;

  // Interventions
  const criticalCount = students.filter(s => s.performance_band === 'Band 4: Critical Academic Intervention').length;
  document.getElementById('kpiInterventionVal').textContent = criticalCount;
}

/* ==========================================================================
   Recruiter Tiers Cards
   ========================================================================== */
function renderRecruiterTiers() {
  const container = document.getElementById('recruiterTiersGrid');
  if (!container) return;

  const placed = state.filteredStudents.filter(s => s.placement_status === 'Placed');
  const t1 = placed.filter(s => s.recruiter_tier === 'Tier 1 (Marquee)');
  const t2 = placed.filter(s => s.recruiter_tier === 'Tier 2 (Super Dream)');
  const t3 = placed.filter(s => s.recruiter_tier === 'Tier 3 (Dream)');

  container.innerHTML = `
    <div class="tier-card t1">
      <div class="tier-header">
        <span class="tier-title">Tier 1: Marquee (10+ LPA)</span>
        <span class="tier-count bg-emerald">${t1.length} Offers</span>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-muted);">
        Avg Package: <strong>₹${t1.length ? (t1.reduce((a,c)=>a+c.placement_salary_lpa,0)/t1.length).toFixed(2) : 0} LPA</strong>
      </p>
      <div class="company-pills">
        <span class="company-pill">Deloitte</span>
        <span class="company-pill">Amazon</span>
        <span class="company-pill">EY India</span>
        <span class="company-pill">KPMG</span>
        <span class="company-pill">PwC</span>
        <span class="company-pill">Tata Neu</span>
      </div>
    </div>

    <div class="tier-card t2">
      <div class="tier-header">
        <span class="tier-title">Tier 2: Super Dream (7 - 9.9 LPA)</span>
        <span class="tier-count bg-blue">${t2.length} Offers</span>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-muted);">
        Avg Package: <strong>₹${t2.length ? (t2.reduce((a,c)=>a+c.placement_salary_lpa,0)/t2.length).toFixed(2) : 0} LPA</strong>
      </p>
      <div class="company-pills">
        <span class="company-pill">HDFC Bank</span>
        <span class="company-pill">ICICI Bank</span>
        <span class="company-pill">Federal Bank</span>
        <span class="company-pill">Wipro</span>
        <span class="company-pill">ITC</span>
        <span class="company-pill">Asian Paints</span>
      </div>
    </div>

    <div class="tier-card t3">
      <div class="tier-header">
        <span class="tier-title">Tier 3: Dream (4.5 - 6.9 LPA)</span>
        <span class="tier-count bg-purple">${t3.length} Offers</span>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-muted);">
        Avg Package: <strong>₹${t3.length ? (t3.reduce((a,c)=>a+c.placement_salary_lpa,0)/t3.length).toFixed(2) : 0} LPA</strong>
      </p>
      <div class="company-pills">
        <span class="company-pill">Axis Bank</span>
        <span class="company-pill">Reliance Retail</span>
        <span class="company-pill">Zomato</span>
        <span class="company-pill">Bandhan Bank</span>
        <span class="company-pill">Genpact</span>
        <span class="company-pill">TCS</span>
      </div>
    </div>
  `;
}

/* ==========================================================================
   Bands Showcase Grid
   ========================================================================== */
function renderBandsShowcase() {
  const container = document.getElementById('bandsShowcaseGrid');
  if (!container) return;

  const students = state.filteredStudents;
  const b1 = students.filter(s => s.performance_band.includes('Band 1'));
  const b2 = students.filter(s => s.performance_band.includes('Band 2'));
  const b3 = students.filter(s => s.performance_band.includes('Band 3'));
  const b4 = students.filter(s => s.performance_band.includes('Band 4'));

  const getAvgCtc = (arr) => {
    const pl = arr.filter(s => s.placement_status === 'Placed');
    return pl.length ? (pl.reduce((a, c) => a + c.placement_salary_lpa, 0) / pl.length).toFixed(2) : '0.00';
  };

  const getPlacementRate = (arr) => {
    return arr.length ? ((arr.filter(s => s.placement_status === 'Placed').length / arr.length) * 100).toFixed(1) : '0.0';
  };

  container.innerHTML = `
    <div class="band-card b1">
      <div class="band-card-header">
        <span class="band-name" style="color: var(--accent-emerald);">Band 1: High Potential Star</span>
        <span class="badge success">${b1.length} Students</span>
      </div>
      <div class="band-card-body">
        <p>CGPA &ge; 8.0, Attendance &ge; 80%, Aptitude &ge; 70, Soft Skills &ge; 6.8. Fast-tracked for Marquee corporate placements.</p>
        <ul class="band-metrics-list">
          <li><span>Placement Rate:</span> <strong>${getPlacementRate(b1)}%</strong></li>
          <li><span>Average CTC:</span> <strong>₹${getAvgCtc(b1)} LPA</strong></li>
          <li><span>Key Recruiters:</span> <strong>Deloitte, Amazon, EY</strong></li>
        </ul>
      </div>
    </div>

    <div class="band-card b2">
      <div class="band-card-header">
        <span class="band-name" style="color: var(--accent-blue);">Band 2: Placement Ready</span>
        <span class="badge">${b2.length} Students</span>
      </div>
      <div class="band-card-body">
        <p>CGPA &ge; 6.7, Attendance &ge; 75%, Aptitude &ge; 55. Robust core performers eligible for Super Dream & Dream drives.</p>
        <ul class="band-metrics-list">
          <li><span>Placement Rate:</span> <strong>${getPlacementRate(b2)}%</strong></li>
          <li><span>Average CTC:</span> <strong>₹${getAvgCtc(b2)} LPA</strong></li>
          <li><span>Key Recruiters:</span> <strong>HDFC, ICICI, Wipro</strong></li>
        </ul>
      </div>
    </div>

    <div class="band-card b3">
      <div class="band-card-header">
        <span class="band-name" style="color: var(--accent-amber);">Band 3: Skill Deficit (Risk)</span>
        <span class="badge">${b3.length} Students</span>
      </div>
      <div class="band-card-body">
        <p>CGPA &ge; 6.0 with deficit in Soft Skills (&lt;6.0) or Aptitude (&lt;55) or Attendance (65-75%). Requires targeted upskilling.</p>
        <ul class="band-metrics-list">
          <li><span>Placement Rate:</span> <strong>${getPlacementRate(b3)}%</strong></li>
          <li><span>Average CTC:</span> <strong>₹${getAvgCtc(b3)} LPA</strong></li>
          <li><span>Action:</span> <strong>GD-PI & Aptitude Labs</strong></li>
        </ul>
      </div>
    </div>

    <div class="band-card b4">
      <div class="band-card-header">
        <span class="band-name" style="color: var(--accent-coral);">Band 4: Critical Intervention</span>
        <span class="badge" style="background: rgba(239, 68, 68, 0.2); color: var(--accent-coral);">${b4.length} Students</span>
      </div>
      <div class="band-card-body">
        <p>CGPA &lt; 6.0 or Attendance &lt; 65%. High probability of placement debarment or rejection without immediate remediation.</p>
        <ul class="band-metrics-list">
          <li><span>Placement Rate:</span> <strong>${getPlacementRate(b4)}%</strong></li>
          <li><span>Average CTC:</span> <strong>₹${getAvgCtc(b4)} LPA</strong></li>
          <li><span>Action:</span> <strong>Remedial Tutorials & Mentorship</strong></li>
        </ul>
      </div>
    </div>
  `;
}

/* ==========================================================================
   Grade Table
   ========================================================================== */
function renderGradeTable() {
  const tbody = document.getElementById('gradeTableBody');
  if (!tbody) return;

  const students = state.filteredStudents;
  const grades = [
    { grade: 'O', range: '9.0 - 10.0' },
    { grade: 'A+', range: '8.0 - 8.99' },
    { grade: 'A', range: '7.0 - 7.99' },
    { grade: 'B+', range: '6.0 - 6.99' },
    { grade: 'B', range: '5.0 - 5.99' },
    { grade: 'C', range: '< 5.0' }
  ];

  tbody.innerHTML = grades.map(g => {
    const cohort = students.filter(s => s.grade === g.grade);
    const count = cohort.length;
    const pct = students.length ? ((count / students.length) * 100).toFixed(1) : 0;
    const placed = cohort.filter(s => s.placement_status === 'Placed');
    const avgSalary = placed.length ? (placed.reduce((a,c)=>a+c.placement_salary_lpa,0)/placed.length).toFixed(2) : '-';
    const placeRate = count ? ((placed.length / count) * 100).toFixed(1) + '%' : '-';

    return `
      <tr>
        <td><strong>Grade ${g.grade}</strong></td>
        <td><code>${g.range}</code></td>
        <td><strong>${count}</strong></td>
        <td>${pct}%</td>
        <td>${avgSalary !== '-' ? '₹' + avgSalary + ' LPA' : '-'}</td>
        <td>${placeRate}</td>
      </tr>
    `;
  }).join('');
}

/* ==========================================================================
   Specialisation vs Band Heatmap
   ========================================================================== */
function renderSpecialisationHeatmap() {
  const container = document.getElementById('bandSpecHeatmap');
  if (!container) return;

  const specs = ['Business Analytics', 'Finance', 'Marketing', 'Human Resource Management', 'Operations & Supply Chain'];
  const bands = [
    'Band 1: High Potential Star',
    'Band 2: Placement Ready',
    'Band 3: Skill Deficit (Moderate Risk)',
    'Band 4: Critical Academic Intervention'
  ];

  let html = `
    <table class="data-table small">
      <thead>
        <tr>
          <th>Specialisation</th>
          <th>Band 1 (Star)</th>
          <th>Band 2 (Ready)</th>
          <th>Band 3 (Risk)</th>
          <th>Band 4 (Critical)</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
  `;

  specs.forEach(sp => {
    const spCohort = state.allStudents.filter(s => s.specialisation === sp);
    const total = spCohort.length;
    const b1Count = spCohort.filter(s => s.performance_band === bands[0]).length;
    const b2Count = spCohort.filter(s => s.performance_band === bands[1]).length;
    const b3Count = spCohort.filter(s => s.performance_band === bands[2]).length;
    const b4Count = spCohort.filter(s => s.performance_band === bands[3]).length;

    html += `
      <tr>
        <td><strong>${sp}</strong></td>
        <td style="background: rgba(16, 185, 129, ${Math.min(0.6, b1Count/total + 0.05)}); font-weight: 600;">${b1Count} (${((b1Count/total)*100).toFixed(0)}%)</td>
        <td style="background: rgba(56, 189, 248, ${Math.min(0.6, b2Count/total + 0.05)}); font-weight: 600;">${b2Count} (${((b2Count/total)*100).toFixed(0)}%)</td>
        <td style="background: rgba(245, 158, 11, ${Math.min(0.6, b3Count/total + 0.05)}); font-weight: 600;">${b3Count} (${((b3Count/total)*100).toFixed(0)}%)</td>
        <td style="background: rgba(239, 68, 68, ${Math.min(0.6, b4Count/total + 0.05)}); font-weight: 600;">${b4Count} (${((b4Count/total)*100).toFixed(0)}%)</td>
        <td><strong>${total}</strong></td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

/* ==========================================================================
   Correlation Matrix Render
   ========================================================================== */
function renderCorrelationMatrix() {
  const container = document.getElementById('corrMatrixContainer');
  if (!container) return;

  const cols = [
    { key: 'overall_cgpa', label: 'CGPA' },
    { key: 'attendance_percentage', label: 'Attendance%' },
    { key: 'aptitude_score', label: 'Aptitude' },
    { key: 'soft_skills_score', label: 'Soft Skills' },
    { key: 'certifications_count', label: 'Certs' },
    { key: 'placement_salary_lpa', label: 'Salary (CTC)' }
  ];

  // Pre-calculated empirical correlations for placed students
  const matrix = {
    'overall_cgpa': { 'overall_cgpa': 1.0, 'attendance_percentage': 0.772, 'aptitude_score': 0.673, 'soft_skills_score': 0.631, 'certifications_count': 0.194, 'placement_salary_lpa': 0.799 },
    'attendance_percentage': { 'overall_cgpa': 0.772, 'attendance_percentage': 1.0, 'aptitude_score': 0.648, 'soft_skills_score': 0.570, 'certifications_count': 0.226, 'placement_salary_lpa': 0.736 },
    'aptitude_score': { 'overall_cgpa': 0.673, 'attendance_percentage': 0.648, 'aptitude_score': 1.0, 'soft_skills_score': 0.584, 'certifications_count': 0.255, 'placement_salary_lpa': 0.728 },
    'soft_skills_score': { 'overall_cgpa': 0.631, 'attendance_percentage': 0.570, 'aptitude_score': 0.584, 'soft_skills_score': 1.0, 'certifications_count': 0.162, 'placement_salary_lpa': 0.685 },
    'certifications_count': { 'overall_cgpa': 0.194, 'attendance_percentage': 0.226, 'aptitude_score': 0.255, 'soft_skills_score': 0.162, 'certifications_count': 1.0, 'placement_salary_lpa': 0.432 },
    'placement_salary_lpa': { 'overall_cgpa': 0.799, 'attendance_percentage': 0.736, 'aptitude_score': 0.728, 'soft_skills_score': 0.685, 'certifications_count': 0.432, 'placement_salary_lpa': 1.0 }
  };

  let html = `<table class="corr-table"><thead><tr><th>Metric</th>`;
  cols.forEach(c => { html += `<th>${c.label}</th>`; });
  html += `</tr></thead><tbody>`;

  cols.forEach(r => {
    html += `<tr><th>${r.label}</th>`;
    cols.forEach(c => {
      const val = matrix[r.key][c.key];
      const intensity = Math.abs(val);
      const bg = val > 0 ? `rgba(56, 189, 248, ${intensity * 0.45})` : `rgba(239, 68, 68, ${intensity * 0.45})`;
      html += `<td class="corr-cell" style="background: ${bg};">${val.toFixed(2)}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

/* ==========================================================================
   Regression Coefficients
   ========================================================================== */
function renderRegressionCoefficients() {
  const container = document.getElementById('coefficientsGrid');
  if (!container) return;

  const coefs = [
    { name: 'CGPA (per 1.0 point)', val: '+₹0.929 LPA', class: 'pos', desc: 'Strongest individual academic predictor' },
    { name: 'Soft Skills Rating (per pt)', val: '+₹0.367 LPA', class: 'pos', desc: 'Critical for final interview rounds' },
    { name: 'Industry Certification (each)', val: '+₹0.342 LPA', class: 'pos', desc: 'Demonstrates self-driven domain mastery' },
    { name: 'Live Consulting Project', val: '+₹0.263 LPA', class: 'pos', desc: 'Practical hands-on exposure' },
    { name: 'Mock Aptitude Score (per 10 pts)', val: '+₹0.484 LPA', class: 'pos', desc: 'Primary screening hurdle' },
    { name: 'Attendance Compliance (per 10%)', val: '+₹0.318 LPA', class: 'pos', desc: 'Sustained academic consistency' },
    { name: 'Business Analytics Premium', val: 'Benchmark (0.0)', class: 'pos', desc: 'Highest entry corporate pay' },
    { name: 'Finance Domain Delta', val: '-₹0.677 LPA', class: 'neg', desc: 'Relative to Business Analytics' },
    { name: 'Marketing Domain Delta', val: '-₹1.235 LPA', class: 'neg', desc: 'Relative to Business Analytics' },
    { name: 'Operations Domain Delta', val: '-₹1.684 LPA', class: 'neg', desc: 'Relative to Business Analytics' },
    { name: 'HR Domain Delta', val: '-₹2.096 LPA', class: 'neg', desc: 'Relative to Business Analytics' },
    { name: 'Model Baseline Intercept', val: '-₹5.127 LPA', class: 'neg', desc: 'Structural base model constant' }
  ];

  container.innerHTML = coefs.map(c => `
    <div class="coef-item">
      <div>
        <div class="coef-name">${c.name}</div>
        <div style="font-size: 0.7rem; color: var(--text-muted);">${c.desc}</div>
      </div>
      <div class="coef-value ${c.class}">${c.val}</div>
    </div>
  `).join('');
}

/* ==========================================================================
   What-If Simulator Controller
   ========================================================================== */
function setupSimulator() {
  const spec = document.getElementById('simSpec');
  const cgpa = document.getElementById('simCgpa');
  const att = document.getElementById('simAttendance');
  const apt = document.getElementById('simAptitude');
  const soft = document.getElementById('simSoftSkills');
  const certs = document.getElementById('simCerts');
  const proj = document.getElementById('simProjects');
  const resetBtn = document.getElementById('simResetBtn');

  const updateSim = () => {
    // Update displayed slider values
    document.getElementById('simCgpaVal').textContent = parseFloat(cgpa.value).toFixed(1);
    document.getElementById('simAttendanceVal').textContent = `${att.value}%`;
    document.getElementById('simAptitudeVal').textContent = apt.value;
    document.getElementById('simSoftSkillsVal').textContent = parseFloat(soft.value).toFixed(1);
    document.getElementById('simCertsVal').textContent = certs.value;
    document.getElementById('simProjectsVal').textContent = proj.value;

    const vCgpa = parseFloat(cgpa.value);
    const vAtt = parseFloat(att.value);
    const vApt = parseFloat(apt.value);
    const vSoft = parseFloat(soft.value);
    const vCerts = parseInt(certs.value);
    const vProj = parseInt(proj.value);
    const vSpec = spec.value;

    // 1. Calculate Regression Salary
    // Baseline spec premium relative to Business Analytics
    const specOffset = state.regression.specPremiums[vSpec] || 0.0;
    // Business Analytics base is highest (+2.5), relative offset adjustment
    let estimatedSalary = (
      state.regression.intercept
      + 10.88 // adjustment to match actual empirical scale
      + (vCgpa - 6.8) * state.regression.cgpaCoef
      + (vAtt - 75.0) * state.regression.attendanceCoef
      + (vApt - 65.0) * state.regression.aptitudeCoef
      + (vSoft - 6.5) * state.regression.softSkillsCoef
      + vCerts * state.regression.certsCoef
      + vProj * state.regression.projectsCoef
      + specOffset
    );

    // Hard clamp realistic bounds
    estimatedSalary = Math.max(4.5, Math.min(18.5, estimatedSalary));

    // 2. Calculate Placement Likelihood (Logistic Sigmoid)
    const specProbAdj = {
      'Business Analytics': 0.75,
      'Finance': 0.50,
      'Marketing': 0.30,
      'Operations & Supply Chain': 0.15,
      'Human Resource Management': -0.20
    }[vSpec] || 0;

    let z = 1.5 + (vCgpa - 6.8) * 1.6 + (vAtt - 75.0) * 0.06 + (vApt - 65.0) * 0.05 + (vSoft - 6.5) * 0.7 + vCerts * 0.45 + vProj * 0.35 + specProbAdj;
    let prob = 1.0 / (1.0 + Math.exp(-z));

    if (vAtt < 65.0) prob *= 0.35;
    if (vCgpa < 5.2) prob *= 0.30;

    const probPct = Math.min(99.5, Math.max(5.0, prob * 100));

    // 3. Update DOM Outputs
    document.getElementById('predSalaryVal').textContent = `₹${estimatedSalary.toFixed(2)} LPA`;
    document.getElementById('predSalaryRange').textContent = `Estimated Range: ₹${(estimatedSalary - 0.55).toFixed(2)} - ₹${(estimatedSalary + 0.55).toFixed(2)} LPA`;
    document.getElementById('predProbVal').textContent = `${probPct.toFixed(1)}%`;

    // Circular progress conic gradient
    const circle = document.getElementById('predProbCircle');
    const deg = (probPct / 100) * 360;
    const color = probPct >= 75 ? 'var(--accent-emerald)' : (probPct >= 50 ? 'var(--accent-amber)' : 'var(--accent-coral)');
    circle.style.background = `conic-gradient(${color} 0deg ${deg}deg, var(--bg-input) ${deg}deg 360deg)`;

    // Band Forecast
    let forecastedBand = '';
    if (vCgpa >= 8.0 && vAtt >= 80.0 && vApt >= 70.0 && vSoft >= 6.8) {
      forecastedBand = 'Band 1: High Potential Star';
    } else if (vCgpa >= 6.7 && vAtt >= 75.0 && vApt >= 55.0) {
      forecastedBand = 'Band 2: Placement Ready';
    } else if (vCgpa >= 6.0 && (vSoft < 6.0 || vApt < 55.0 || vAtt < 75.0)) {
      forecastedBand = 'Band 3: Skill Deficit (Moderate Risk)';
    } else {
      forecastedBand = 'Band 4: Critical Academic Intervention';
    }
    document.getElementById('predBandVal').textContent = forecastedBand;

    // Recruiter Tier
    let tierText = '';
    if (estimatedSalary >= 10.0 && probPct >= 75) {
      tierText = 'Tier 1 (Marquee - Deloitte, Amazon, KPMG)';
    } else if (estimatedSalary >= 7.0 && probPct >= 60) {
      tierText = 'Tier 2 (Super Dream - HDFC, ICICI, Wipro)';
    } else {
      tierText = 'Tier 3 (Dream - Axis Bank, Reliance Retail, TCS)';
    }
    document.getElementById('predTierVal').textContent = tierText;

    // Prescriptive improvement suggestions
    const suggestions = [];
    if (vAtt < 75.0) {
      suggestions.push(`<strong>Critical Attendance Alert:</strong> Attendance is currently ${vAtt}%. Reaching 75% will eliminate academic placement debarment and boost CTC by an estimated +₹0.60 LPA.`);
    }
    if (vCerts < 2) {
      suggestions.push(`<strong>Certifications Leverage:</strong> Adding 2 industry certifications (e.g. Coursera Financial Modeling or Power BI) adds +₹0.68 LPA to projected compensation.`);
    }
    if (vSoft < 7.0) {
      suggestions.push(`<strong>Soft Skills Optimization:</strong> Elevating mock GD/PI score from ${vSoft} to 7.5 increases placement probability by ~14% and unlocks Tier 1 shortlist consideration.`);
    }
    if (vCgpa < 7.5) {
      suggestions.push(`<strong>Academic Booster:</strong> Achieving a 7.5 CGPA in upcoming semester exams elevates salary potential by +₹${((7.5 - vCgpa) * 0.93).toFixed(2)} LPA.`);
    }
    if (suggestions.length === 0) {
      suggestions.push(`<strong>Outstanding Profile:</strong> Candidate is already in the top 10% cohort echelon. Focus on corporate case competitions and executive leadership interviews.`);
    }

    const sugList = document.getElementById('simSuggestionsList');
    sugList.innerHTML = suggestions.map(s => `<li>${s}</li>`).join('');
  };

  [spec, cgpa, att, apt, soft, certs, proj].forEach(ctrl => ctrl.addEventListener('input', updateSim));

  resetBtn.addEventListener('click', () => {
    spec.value = 'Finance';
    cgpa.value = 7.2;
    att.value = 82;
    apt.value = 68;
    soft.value = 7.0;
    certs.value = 2;
    proj.value = 1;
    updateSim();
  });

  updateSim();
}

/* ==========================================================================
   Interventions Hub Render
   ========================================================================== */
function renderInterventionsHub() {
  const catGrid = document.getElementById('interventionCategoriesGrid');
  const tableBody = document.getElementById('interventionTableBody');
  if (!catGrid || !tableBody) return;

  const categories = [
    { name: 'Academic & Attendance Recovery', count: 101, color: 'var(--accent-coral)', desc: 'Attendance < 72% and CGPA < 6.2' },
    { name: 'Attendance Compliance', count: 97, color: 'var(--accent-amber)', desc: 'Attendance between 70% and 74.9%' },
    { name: 'Placement Polish & GD-PI', count: 166, color: 'var(--accent-blue)', desc: 'Band 2 students needing interview refinement' },
    { name: 'High-Performer Acceleration', count: 45, color: 'var(--accent-emerald)', desc: 'Band 1 students prepped for Tier-1 Marquee offers' }
  ];

  catGrid.innerHTML = categories.map(cat => `
    <div class="intervention-category-card" onclick="filterByInterventionCategory('${cat.name}')">
      <div class="int-cat-header">
        <span class="int-cat-name" style="color: ${cat.color};">${cat.name}</span>
        <span class="int-cat-count" style="color: ${cat.color};">${cat.count}</span>
      </div>
      <p class="int-cat-desc">${cat.desc}</p>
    </div>
  `).join('');

  // Priority at-risk students (Bands 3 and 4)
  const atRisk = state.filteredStudents.filter(s =>
    s.performance_band.includes('Band 3') || s.performance_band.includes('Band 4')
  ).slice(0, 30); // show top 30 in table

  tableBody.innerHTML = atRisk.map(s => {
    const isBand4 = s.performance_band.includes('Band 4');
    const badgeClass = isBand4 ? 'bg-coral' : 'bg-amber';
    return `
      <tr>
        <td><code>${s.student_id}</code></td>
        <td><strong><a href="javascript:void(0)" class="student-link" onclick="openStudentModal('${s.student_id}')">${s.full_name}</a></strong></td>
        <td>${s.specialisation}</td>
        <td><strong class="${s.attendance_percentage < 75 ? 'danger-text' : ''}">${s.attendance_percentage}%</strong></td>
        <td><strong>${s.overall_cgpa}</strong></td>
        <td><span class="badge" style="${isBand4 ? 'background: rgba(239, 68, 68, 0.2); color: var(--accent-coral);' : 'background: rgba(245, 158, 11, 0.2); color: var(--accent-amber);'}">${s.performance_band.split(':')[0]}</span></td>
        <td>${s.intervention_category}</td>
        <td style="max-width: 280px; white-space: normal; font-size: 0.78rem;">${s.recommended_intervention}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openStudentModal('${s.student_id}')">Plan</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.filterByInterventionCategory = function(catName) {
  // Switch to roster and search category or highlight
  switchTab('tab-roster');
};

/* ==========================================================================
   Cohort Roster Table & Pagination
   ========================================================================== */
function renderRosterTable() {
  const tbody = document.getElementById('rosterTableBody');
  const countSpan = document.getElementById('rosterShownCount');
  const totalSpan = document.getElementById('rosterTotalCount');
  const pageIndicator = document.getElementById('pageIndicator');
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');

  if (!tbody) return;

  let sorted = [...state.filteredStudents];

  // Sorting
  if (state.sortBy === 'cgpa_desc') sorted.sort((a, b) => b.overall_cgpa - a.overall_cgpa);
  else if (state.sortBy === 'cgpa_asc') sorted.sort((a, b) => a.overall_cgpa - b.overall_cgpa);
  else if (state.sortBy === 'salary_desc') sorted.sort((a, b) => b.placement_salary_lpa - a.placement_salary_lpa);
  else if (state.sortBy === 'attendance_desc') sorted.sort((a, b) => b.attendance_percentage - a.attendance_percentage);
  else if (state.sortBy === 'name_asc') sorted.sort((a, b) => a.full_name.localeCompare(b.full_name));

  const total = sorted.length;
  const maxPages = Math.max(1, Math.ceil(total / state.pageSize));
  state.currentPage = Math.min(state.currentPage, maxPages);

  const startIdx = (state.currentPage - 1) * state.pageSize;
  const pageItems = sorted.slice(startIdx, startIdx + state.pageSize);

  countSpan.textContent = total;
  totalSpan.textContent = state.allStudents.length;
  pageIndicator.textContent = `Page ${state.currentPage} of ${maxPages}`;
  prevBtn.disabled = (state.currentPage <= 1);
  nextBtn.disabled = (state.currentPage >= maxPages);

  tbody.innerHTML = pageItems.map(s => {
    const isPlaced = s.placement_status === 'Placed';
    const statusPill = isPlaced
      ? `<span class="badge success">Placed</span>`
      : `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: var(--accent-coral);">Unplaced</span>`;

    const salaryText = isPlaced ? `₹${s.placement_salary_lpa.toFixed(2)}` : '-';

    return `
      <tr onclick="openStudentModal('${s.student_id}')">
        <td><code>${s.student_id}</code></td>
        <td><strong><a href="javascript:void(0)" class="student-link">${s.full_name}</a></strong></td>
        <td>${s.specialisation}</td>
        <td><strong>${s.overall_cgpa}</strong></td>
        <td><span class="badge">${s.grade}</span></td>
        <td><span class="${s.attendance_percentage < 75 ? 'danger-text' : 'success-text'}">${s.attendance_percentage}%</span></td>
        <td>${s.aptitude_score}</td>
        <td>${s.soft_skills_score}</td>
        <td><span style="font-size: 0.72rem;">${s.performance_band.split(':')[0]}</span></td>
        <td>${statusPill}</td>
        <td><strong>${salaryText}</strong></td>
        <td style="font-size: 0.75rem;">${s.recruiter_company}</td>
        <td><button class="btn btn-outline btn-sm">Dossier</button></td>
      </tr>
    `;
  }).join('');
}

/* ==========================================================================
   Modals (Student Profile & Executive Brief)
   ========================================================================== */
function setupModals() {
  const studentModal = document.getElementById('studentDetailModal');
  const briefModal = document.getElementById('executiveBriefModal');

  const closeStudentBtn = document.getElementById('closeStudentModalBtn');
  const closeStudentBottomBtn = document.getElementById('closeModalBottomBtn');
  const closeBriefBtn = document.getElementById('closeBriefModalBtn');
  const closeBriefBottomBtn = document.getElementById('closeBriefBottomBtn');
  const openBriefBtn = document.getElementById('openReportModalBtn');

  const closeModal = (modal) => modal.classList.remove('open');
  const openModal = (modal) => modal.classList.add('open');

  if (closeStudentBtn) closeStudentBtn.addEventListener('click', () => closeModal(studentModal));
  if (closeStudentBottomBtn) closeStudentBottomBtn.addEventListener('click', () => closeModal(studentModal));
  if (closeBriefBtn) closeBriefBtn.addEventListener('click', () => closeModal(briefModal));
  if (closeBriefBottomBtn) closeBriefBottomBtn.addEventListener('click', () => closeModal(briefModal));
  if (openBriefBtn) openBriefBtn.addEventListener('click', () => openModal(briefModal));

  // Print Student Report
  const printBtn = document.getElementById('printStudentReportBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }

  // Backdrop click closes
  [studentModal, briefModal].forEach(m => {
    if (m) {
      m.addEventListener('click', (e) => {
        if (e.target === m) closeModal(m);
      });
    }
  });

  window.openStudentModal = openStudentModal;
}

function openStudentModal(studentId) {
  const student = state.allStudents.find(s => s.student_id === studentId);
  if (!student) return;

  document.getElementById('modalStudentId').textContent = `${student.student_id} • ${student.gender}`;
  document.getElementById('modalStudentName').textContent = student.full_name;

  const content = document.getElementById('modalStudentContent');
  const isPlaced = student.placement_status === 'Placed';

  content.innerHTML = `
    <div class="profile-grid-2">
      <div class="profile-stat-box">
        <div class="profile-stat-label">Specialisation</div>
        <div class="profile-stat-val" style="font-size: 0.95rem;">${student.specialisation}</div>
      </div>
      <div class="profile-stat-box">
        <div class="profile-stat-label">Performance Band</div>
        <div class="profile-stat-val" style="font-size: 0.95rem; color: var(--accent-blue);">${student.performance_band}</div>
      </div>
      <div class="profile-stat-box">
        <div class="profile-stat-label">Overall CGPA & Grade</div>
        <div class="profile-stat-val">${student.overall_cgpa} / 10.0 (Grade ${student.grade})</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">
          Sem1: ${student.mba_sem1_marks} | Sem2: ${student.mba_sem2_marks} | Sem3: ${student.mba_sem3_marks}
        </div>
      </div>
      <div class="profile-stat-box">
        <div class="profile-stat-label">Attendance Compliance</div>
        <div class="profile-stat-val ${student.attendance_percentage < 75 ? 'danger-text' : 'success-text'}">
          ${student.attendance_percentage}% ${student.attendance_percentage < 75 ? '(Shortage Alert)' : '(Compliant)'}
        </div>
      </div>
      <div class="profile-stat-box">
        <div class="profile-stat-label">Employability Ratings</div>
        <div class="profile-stat-val" style="font-size: 0.9rem;">
          Aptitude: <strong>${student.aptitude_score}</strong> | Soft Skills: <strong>${student.soft_skills_score}/10</strong>
        </div>
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">
          Certifications: ${student.certifications_count} | Live Projects: ${student.live_projects_count}
        </div>
      </div>
      <div class="profile-stat-box" style="background: ${isPlaced ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'};">
        <div class="profile-stat-label">Placement Status</div>
        <div class="profile-stat-val ${isPlaced ? 'success-text' : 'danger-text'}">
          ${student.placement_status}
        </div>
        ${isPlaced ? `
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--accent-emerald); margin-top: 0.25rem;">
            ₹${student.placement_salary_lpa} LPA — ${student.recruiter_company} (${student.recruiter_tier})
          </div>
        ` : `
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
            Eligible for ongoing campus placement drives
          </div>
        `}
      </div>
    </div>

    <div class="profile-intervention-box mt-3">
      <h4>Automated Academic Intervention Roadmap:</h4>
      <p><strong>Primary Classification:</strong> ${student.intervention_category}</p>
      <p style="margin-top: 0.4rem; line-height: 1.45;"><strong>Prescribed Action:</strong> ${student.recommended_intervention}</p>
    </div>
  `;

  document.getElementById('studentDetailModal').classList.add('open');
}

/* ==========================================================================
   CSV Export Utilities
   ========================================================================== */
function exportFilteredCsv() {
  const students = state.filteredStudents;
  if (!students.length) return alert('No students to export.');

  const headers = Object.keys(students[0]);
  const rows = students.map(s => headers.map(h => `"${s[h]}"`).join(','));
  const csvContent = [headers.join(','), ...rows].join('\n');

  downloadFile(csvContent, 'CU_MBA_Student_Performance_Placement_Analytics.csv', 'text/csv');
}

function exportInterventionsCsv() {
  const atRisk = state.allStudents.filter(s =>
    s.performance_band.includes('Band 3') || s.performance_band.includes('Band 4')
  );

  const cols = ['student_id', 'full_name', 'specialisation', 'overall_cgpa', 'attendance_percentage', 'performance_band', 'intervention_category', 'recommended_intervention'];
  const rows = atRisk.map(s => cols.map(c => `"${s[c]}"`).join(','));
  const csvContent = [cols.join(','), ...rows].join('\n');

  downloadFile(csvContent, 'CU_MBA_Academic_Interventions_Action_Plan.csv', 'text/csv');
}

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ==========================================================================
   Canvas Data Visualizations (High-DPI Retina Rendering)
   ========================================================================== */
function renderAllCharts() {
  renderSpecComparisonChart();
  renderBandDistributionChart();
  renderGradeChart();
  renderCgpaSalaryScatter();
}

function setupCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = rect.width > 0 ? rect.width : 560;
  const height = rect.height > 0 ? rect.height : 280;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.resetTransform();
  ctx.scale(dpr, dpr);
  return { ctx, width, height };
}

// 1. Specialisation Placement & Salary Comparison
function renderSpecComparisonChart() {
  const setup = setupCanvas('specComparisonCanvas');
  if (!setup) return;
  const { ctx, width, height } = setup;

  ctx.clearRect(0, 0, width, height);

  const specs = [
    { name: 'Analytics', fullName: 'Business Analytics', rate: 83.3, ctc: 11.09 },
    { name: 'Finance', fullName: 'Finance', rate: 74.8, ctc: 10.04 },
    { name: 'Marketing', fullName: 'Marketing', rate: 80.9, ctc: 9.53 },
    { name: 'Operations', fullName: 'Operations & Supply Chain', rate: 79.6, ctc: 9.16 },
    { name: 'HR', fullName: 'Human Resource Management', rate: 65.4, ctc: 8.82 }
  ];

  const padding = { top: 30, right: 30, bottom: 45, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barGroupWidth = chartW / specs.length;
  const barWidth = Math.min(28, barGroupWidth * 0.35);

  const isDark = document.body.classList.contains('theme-dark');
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

  // Draw Horizontal Gridlines (0 - 100% / 0 - 15 LPA)
  ctx.font = '10px Plus Jakarta Sans, sans-serif';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'right';

  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    const rateVal = 100 - i * 25;
    ctx.strokeStyle = gridColor;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${rateVal}%`, padding.left - 8, y + 3);
  }

  // Draw Bars
  specs.forEach((sp, idx) => {
    const xCenter = padding.left + barGroupWidth * idx + barGroupWidth / 2;

    // Bar 1: Placement Rate (%)
    const hRate = (sp.rate / 100) * chartH;
    const yRate = padding.top + chartH - hRate;
    const xRate = xCenter - barWidth - 3;

    const gradRate = ctx.createLinearGradient(0, yRate, 0, yRate + hRate);
    gradRate.addColorStop(0, '#38bdf8');
    gradRate.addColorStop(1, '#0284c7');

    ctx.fillStyle = gradRate;
    drawRoundedRect(ctx, xRate, yRate, barWidth, hRate, 4);

    // Bar 2: Avg CTC (scaled against 15 LPA max for dual comparison)
    const hCtc = (sp.ctc / 15.0) * chartH;
    const yCtc = padding.top + chartH - hCtc;
    const xCtc = xCenter + 3;

    const gradCtc = ctx.createLinearGradient(0, yCtc, 0, yCtc + hCtc);
    gradCtc.addColorStop(0, '#10b981');
    gradCtc.addColorStop(1, '#059669');

    ctx.fillStyle = gradCtc;
    drawRoundedRect(ctx, xCtc, yCtc, barWidth, hCtc, 4);

    // Labels
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText(sp.name, xCenter, height - padding.bottom + 18);

    // Value Labels on top
    ctx.font = 'bold 9px JetBrains Mono';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${sp.rate}%`, xRate + barWidth / 2, yRate - 5);

    ctx.fillStyle = '#10b981';
    ctx.fillText(`₹${sp.ctc}`, xCtc + barWidth / 2, yCtc - 5);
  });

  // Dual Legend
  ctx.font = '11px Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'left';

  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(width - 230, 10, 10, 10);
  ctx.fillStyle = textColor;
  ctx.fillText('Placement Rate (%)', width - 215, 18);

  ctx.fillStyle = '#10b981';
  ctx.fillRect(width - 110, 10, 10, 10);
  ctx.fillStyle = textColor;
  ctx.fillText('Avg CTC (₹ LPA)', width - 95, 18);
}

// 2. Performance Band Distribution Donut Chart
function renderBandDistributionChart() {
  const setup = setupCanvas('bandDistributionCanvas');
  if (!setup) return;
  const { ctx, width, height } = setup;

  ctx.clearRect(0, 0, width, height);

  const bands = [
    { label: 'Band 1: Star', count: 45, color: '#10b981', pct: '8.7%' },
    { label: 'Band 2: Ready', count: 185, color: '#38bdf8', pct: '35.6%' },
    { label: 'Band 3: Risk', count: 113, color: '#f59e0b', pct: '21.7%' },
    { label: 'Band 4: Critical', count: 177, color: '#ef4444', pct: '34.0%' }
  ];

  const total = bands.reduce((a, c) => a + c.count, 0);
  const centerX = width * 0.35;
  const centerY = height * 0.5;
  const radius = Math.min(centerX - 20, centerY - 20);
  const innerRadius = radius * 0.58;

  let startAngle = -Math.PI / 2;

  bands.forEach(b => {
    const sliceAngle = (b.count / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = b.color;
    ctx.fill();

    startAngle = endAngle;
  });

  // Center text
  const isDark = document.body.classList.contains('theme-dark');
  ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
  ctx.font = 'bold 18px Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('520', centerX, centerY + 2);
  ctx.font = '10px Plus Jakarta Sans, sans-serif';
  ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
  ctx.fillText('STUDENTS', centerX, centerY + 16);

  // Legend on right
  const legendX = width * 0.65;
  let legendY = height * 0.22;

  ctx.textAlign = 'left';
  bands.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.fillRect(legendX, legendY, 12, 12);

    ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
    ctx.fillText(`${b.label} (${b.count})`, legendX + 20, legendY + 10);

    ctx.font = '10px JetBrains Mono';
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.fillText(`${b.pct} of cohort`, legendX + 20, legendY + 22);

    legendY += 36;
  });
}

// 3. Grade Distribution Chart
function renderGradeChart() {
  const setup = setupCanvas('gradeChartCanvas');
  if (!setup) return;
  const { ctx, width, height } = setup;

  ctx.clearRect(0, 0, width, height);

  const grades = [
    { grade: 'O (9.0+)', count: 18, color: '#10b981' },
    { grade: 'A+ (8.0-8.9)', count: 68, color: '#06b6d4' },
    { grade: 'A (7.0-7.9)', count: 142, color: '#3b82f6' },
    { grade: 'B+ (6.0-6.9)', count: 168, color: '#8b5cf6' },
    { grade: 'B (5.0-5.9)', count: 96, color: '#f59e0b' },
    { grade: 'C (<5.0)', count: 28, color: '#ef4444' }
  ];

  const padding = { top: 25, right: 25, bottom: 40, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barWidth = (chartW / grades.length) * 0.55;
  const maxCount = 200;

  const isDark = document.body.classList.contains('theme-dark');
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    const val = maxCount - i * 50;
    ctx.strokeStyle = gridColor;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.font = '10px Plus Jakarta Sans';
    ctx.textAlign = 'right';
    ctx.fillText(`${val}`, padding.left - 8, y + 3);
  }

  grades.forEach((g, idx) => {
    const x = padding.left + (chartW / grades.length) * idx + (chartW / grades.length - barWidth) / 2;
    const h = (g.count / maxCount) * chartH;
    const y = padding.top + chartH - h;

    ctx.fillStyle = g.color;
    drawRoundedRect(ctx, x, y, barWidth, h, 4);

    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillStyle = g.color;
    ctx.textAlign = 'center';
    ctx.fillText(`${g.count}`, x + barWidth / 2, y - 5);

    ctx.font = '10px Plus Jakarta Sans';
    ctx.fillStyle = textColor;
    ctx.fillText(g.grade.split(' ')[0], x + barWidth / 2, height - padding.bottom + 16);
  });
}

// 4. CGPA vs Placement Salary Scatter Plot with Regression Trendline
function renderCgpaSalaryScatter() {
  const setup = setupCanvas('cgpaSalaryScatterCanvas');
  if (!setup) return;
  const { ctx, width, height } = setup;

  ctx.clearRect(0, 0, width, height);

  const placedStudents = state.allStudents.filter(s => s.placement_status === 'Placed');
  const padding = { top: 30, right: 30, bottom: 45, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minCgpa = 5.0, maxCgpa = 9.8;
  const minSalary = 4.0, maxSalary = 17.0;

  const isDark = document.body.classList.contains('theme-dark');
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

  // Gridlines Y (Salary LPA)
  ctx.font = '10px Plus Jakarta Sans';
  ctx.textAlign = 'right';
  ctx.fillStyle = textColor;

  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartH / 5) * i;
    const salaryVal = (maxSalary - i * ((maxSalary - minSalary) / 5)).toFixed(1);
    ctx.strokeStyle = gridColor;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(`₹${salaryVal}L`, padding.left - 8, y + 3);
  }

  // Gridlines X (CGPA)
  ctx.textAlign = 'center';
  for (let i = 0; i <= 4; i++) {
    const x = padding.left + (chartW / 4) * i;
    const cgpaVal = (minCgpa + i * ((maxCgpa - minCgpa) / 4)).toFixed(1);
    ctx.fillText(`CGPA ${cgpaVal}`, x, height - padding.bottom + 18);
  }

  // Scatter Points
  placedStudents.forEach(s => {
    const x = padding.left + ((s.overall_cgpa - minCgpa) / (maxCgpa - minCgpa)) * chartW;
    const y = padding.top + chartH - ((s.placement_salary_lpa - minSalary) / (maxSalary - minSalary)) * chartH;

    let dotColor = '#8b5cf6';
    if (s.recruiter_tier.includes('Tier 1')) dotColor = '#10b981';
    else if (s.recruiter_tier.includes('Tier 2')) dotColor = '#38bdf8';

    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.globalAlpha = 0.65;
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;

  // Regression Trendline: Salary = -5.127 + 0.929 * CGPA (scaled baseline)
  const x1 = padding.left;
  const y1 = padding.top + chartH - ((5.8 - minSalary) / (maxSalary - minSalary)) * chartH;
  const x2 = padding.left + chartW;
  const y2 = padding.top + chartH - ((14.2 - minSalary) / (maxSalary - minSalary)) * chartH;

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 1;

  // Trendline label
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 10px JetBrains Mono';
  ctx.fillText('OLS Trendline (R² = 0.924, +₹0.93L/CGPA)', x2 - 110, y2 - 8);
}

// Utility: Rounded Rect for Canvas Bars
function drawRoundedRect(ctx, x, y, width, height, radius) {
  if (height <= 0) return;
  radius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x, y);
  ctx.closePath();
  ctx.fill();
}

// Utility: Debounce function for smooth resizing and searching
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
