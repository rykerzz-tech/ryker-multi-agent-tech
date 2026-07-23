/**
 * RYKER MULTI-AGENT TECH // PORTFOLIO ENGINE
 * Vanilla JS logic for profile parsing, editing, and dynamic GitHub integration.
 */

// Global State
let currentProfile = null;
let githubRepos = [];

// DOM References
const elements = {
  openPanelBtn: document.getElementById('open-control-panel'),
  closePanelBtn: document.getElementById('close-control-panel'),
  sidebar: document.getElementById('control-panel-sidebar'),
  saveBtn: document.getElementById('save-profile-btn'),
  exportBtn: document.getElementById('export-config-btn'),
  resetBtn: document.getElementById('reset-profile-btn'),
  addLinkBtn: document.getElementById('add-link-btn'),
  
  // Display nodes
  name: document.getElementById('display-name'),
  title: document.getElementById('display-title'),
  bio: document.getElementById('display-bio'),
  username: document.getElementById('display-username'),
  avatar: document.getElementById('display-avatar'),
  linksContainer: document.getElementById('display-links'),
  skillsContainer: document.getElementById('display-skills'),
  projectsContainer: document.getElementById('projects-container'),
  apiStatusDot: document.getElementById('api-status-dot'),
  apiStatusText: document.getElementById('api-status-text'),
  systemTime: document.getElementById('system-time'),
  
  // Stats nodes
  statRepos: document.getElementById('stat-repos'),
  statFollowers: document.getElementById('stat-followers'),
  statStars: document.getElementById('stat-stars'),
  
  // Form inputs
  inputName: document.getElementById('input-name'),
  inputUsername: document.getElementById('input-username'),
  inputTitle: document.getElementById('input-title'),
  inputBio: document.getElementById('input-bio'),
  inputSkills: document.getElementById('input-skills'),
  linksEditorContainer: document.getElementById('links-editor-container'),
  addExperienceBtn: document.getElementById('add-experience-btn'),
  experienceContainer: document.getElementById('display-experience'),
  experienceEditorContainer: document.getElementById('experience-editor-container')
};

// Start System Time Updater
function startSystemClock() {
  const updateClock = () => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    elements.systemTime.textContent = `// LOCAL: ${timeStr}`;
  };
  updateClock();
  setInterval(updateClock, 1000);
}

// Initialise Profile Configuration
async function initProfile() {
  startSystemClock();
  
  // Load from local storage or fetch from default profile.json
  const stored = localStorage.getItem('ryker_profile_config');
  if (stored) {
    try {
      currentProfile = JSON.parse(stored);
    } catch (e) {
      currentProfile = null;
    }
  }
  
  if (!currentProfile) {
    try {
      const response = await fetch('profile.json');
      currentProfile = await response.json();
    } catch (e) {
      // Hardcoded failsafe default
      currentProfile = {
        name: "Ryker Multi-Agent Tech",
        username: "rykerzz-tech",
        title: "Next-Gen Multi-Agent Systems",
        bio: "Self-orchestrating, secure AI agent networks for complex enterprise environment operations.",
        avatar_url: "https://github.com/rykerzz-tech.png",
        links: [{ label: "GitHub", url: "https://github.com/rykerzz-tech" }],
        skills: ["Multi-Agent Orchestration", "Secure Architecture"],
        custom_projects: []
      };
    }
  }

  // Set Theme
  const activeTheme = currentProfile.theme || 'acid';
  document.documentElement.setAttribute('data-theme', activeTheme);
  updateThemePickerState(activeTheme);
  
  // Render static config parts first
  renderProfileView();
  
  // Load dynamic GitHub data
  await loadGitHubData(currentProfile.username);
}

// Render dynamic profile to View Mode DOM
function renderProfileView() {
  elements.name.textContent = currentProfile.name;
  elements.title.textContent = currentProfile.title;
  elements.bio.textContent = currentProfile.bio;
  elements.username.textContent = `@${currentProfile.username}`;
  elements.avatar.src = currentProfile.avatar_url || `https://github.com/${currentProfile.username}.png`;
  
  // Render Links
  elements.linksContainer.innerHTML = '';
  if (currentProfile.links && currentProfile.links.length > 0) {
    currentProfile.links.forEach(link => {
      const a = document.createElement('a');
      a.className = 'profile-link';
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = link.label.toUpperCase();
      elements.linksContainer.appendChild(a);
    });
  }
  
  // Render Skills
  elements.skillsContainer.innerHTML = '';
  if (currentProfile.skills && currentProfile.skills.length > 0) {
    currentProfile.skills.forEach(skill => {
      const span = document.createElement('span');
      span.className = 'skill-tag';
      span.textContent = skill.toUpperCase();
      elements.skillsContainer.appendChild(span);
    });
  }
  
  // Render Experience
  elements.experienceContainer.innerHTML = '';
  if (currentProfile.experience && currentProfile.experience.length > 0) {
    currentProfile.experience.forEach(exp => {
      const card = document.createElement('div');
      card.className = 'experience-card';
      card.innerHTML = `
        <div class="experience-card-header">
          <span class="experience-company">${exp.company.toUpperCase()}</span>
          <span class="experience-period">${exp.period.toUpperCase()}</span>
        </div>
        <div class="experience-position">${exp.position.toUpperCase()}</div>
        <p class="experience-desc">${exp.description}</p>
      `;
      elements.experienceContainer.appendChild(card);
    });
  } else {
    elements.experienceContainer.innerHTML = `<p class="experience-desc">// NO WORK EXPERIENCE REGISTERED</p>`;
  }
  
  // Combine custom projects and fetched GitHub repos for full project grid
  renderProjectsGrid();
}

// Fetch GitHub API metrics & repositories
async function loadGitHubData(username) {
  try {
    // 1. Fetch profile metrics
    const userRes = await fetch(`https://api.github.com/users/${username}`);
    
    if (!userRes.ok) {
      throw new Error(`GitHub API returned status: ${userRes.status}`);
    }
    
    const userData = await userRes.json();
    
    // Update profile metrics in DOM
    elements.statRepos.textContent = userData.public_repos;
    elements.statFollowers.textContent = userData.followers;
    
    // Update avatar url dynamically if no override set
    if (!currentProfile.avatar_url || currentProfile.avatar_url.includes('github.png')) {
      elements.avatar.src = userData.avatar_url;
      currentProfile.avatar_url = userData.avatar_url;
    }
    
    // 2. Fetch repo listings
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=15`);
    if (reposRes.ok) {
      githubRepos = await reposRes.json();
      
      // Calculate star metric
      const totalStars = githubRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
      elements.statStars.textContent = totalStars;
    }
    
    // Update status indicators
    elements.apiStatusDot.className = 'status-dot pulsing';
    elements.apiStatusText.textContent = 'GITHUB CONNECTED';
    
    renderProjectsGrid();
  } catch (error) {
    // Fallback mode
    elements.apiStatusDot.className = 'status-dot';
    elements.apiStatusDot.style.backgroundColor = '#ffb000'; // Amber warning
    elements.apiStatusText.textContent = 'OFFLINE / FALLBACK MODE';
    
    // Use fallback stats from currentProfile or set placeholder
    elements.statRepos.textContent = currentProfile.custom_projects ? currentProfile.custom_projects.length : '—';
    elements.statFollowers.textContent = '100+';
    elements.statStars.textContent = currentProfile.custom_projects ? 
      currentProfile.custom_projects.reduce((sum, p) => sum + (p.stars || 0), 0) : '—';
  }
}

// Build and populate project cards
function renderProjectsGrid() {
  elements.projectsContainer.innerHTML = '';
  
  // Custom featured projects from configuration
  const customList = currentProfile.custom_projects || [];
  
  // Render Custom Local Projects
  customList.forEach(proj => {
    const card = createProjectCard({
      name: proj.name,
      description: proj.description,
      language: proj.language || 'Documentation',
      stars: proj.stars || 0,
      forks: proj.forks || 0,
      url: proj.url
    }, true);
    elements.projectsContainer.appendChild(card);
  });
  
  // Render GitHub Fetched Repositories (exclude if name matches one of custom projects)
  githubRepos.forEach(repo => {
    const exists = customList.some(p => p.name.toLowerCase() === repo.name.toLowerCase());
    if (!exists) {
      const card = createProjectCard({
        name: repo.name,
        description: repo.description || 'No description provided.',
        language: repo.language || 'Miscellaneous',
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        url: repo.html_url
      }, false);
      elements.projectsContainer.appendChild(card);
    }
  });
  
  // If nothing is shown, add standard placeholder cards
  if (elements.projectsContainer.children.length === 0) {
    elements.projectsContainer.innerHTML = `
      <div class="project-card">
        <div>
          <div class="project-card-header">
            <span class="project-name">// INITIALIZING DIRECTORY</span>
            <span class="project-lang-badge">SYSTEM</span>
          </div>
          <p class="project-description">No active repositories detected. Verify connection, check GitHub username settings, or add custom projects in the control panel.</p>
        </div>
      </div>
    `;
  }
}

// Helper to create individual project card elements
function createProjectCard(proj, isCustom) {
  const card = document.createElement('div');
  card.className = 'project-card';
  
  card.innerHTML = `
    <div>
      <div class="project-card-header">
        <a href="${proj.url}" target="_blank" rel="noopener noreferrer" class="project-name">
          ${proj.name.toUpperCase()} ${isCustom ? '<span style="font-size:0.75rem;color:var(--accent);">[FEATURED]</span>' : ''}
        </a>
        <span class="project-lang-badge">${proj.language.toUpperCase()}</span>
      </div>
      <p class="project-description">${proj.description}</p>
    </div>
    <div class="project-card-footer">
      <div class="project-stats">
        <div class="project-stat-item" title="Stars">
          <span>★</span> <span>${proj.stars}</span>
        </div>
        <div class="project-stat-item" title="Forks">
          <span>⑂</span> <span>${proj.forks}</span>
        </div>
      </div>
      <a href="${proj.url}" target="_blank" rel="noopener noreferrer" class="project-link-icon">// VIEW_SOURCE</a>
    </div>
  `;
  
  return card;
}

// Sidebar Drawer Control functions
function openControlPanel() {
  elements.sidebar.classList.add('open');
  elements.sidebar.setAttribute('aria-hidden', 'false');
  
  // Populate form fields with current data
  elements.inputName.value = currentProfile.name;
  elements.inputUsername.value = currentProfile.username;
  elements.inputTitle.value = currentProfile.title;
  elements.inputBio.value = currentProfile.bio;
  elements.inputSkills.value = currentProfile.skills ? currentProfile.skills.join(', ') : '';
  
  // Populates dynamic links list editor
  renderLinksEditor();
  
  // Populates dynamic experience list editor
  renderExperienceEditor();
}

function closeControlPanel() {
  elements.sidebar.classList.remove('open');
  elements.sidebar.setAttribute('aria-hidden', 'true');
}

// Dynamic Links Editor Manager
function renderLinksEditor() {
  elements.linksEditorContainer.innerHTML = '';
  const links = currentProfile.links || [];
  
  links.forEach((link, index) => {
    addLinkFieldToEditor(link.label, link.url, index);
  });
}

function addLinkFieldToEditor(label = '', url = '', index = null) {
  const item = document.createElement('div');
  item.className = 'link-editor-item';
  
  const idSuffix = index !== null ? index : Date.now();
  
  item.innerHTML = `
    <input type="text" placeholder="Label (e.g. GitHub)" value="${label}" class="link-label-input" id="link-lbl-${idSuffix}">
    <input type="url" placeholder="URL (e.g. https://...)" value="${url}" class="link-url-input" id="link-url-${idSuffix}">
    <button type="button" class="btn-remove-link" aria-label="Remove link field">REMOVE</button>
  `;
  
  item.querySelector('.btn-remove-link').addEventListener('click', () => {
    item.remove();
  });
  
  elements.linksEditorContainer.appendChild(item);
}

// Dynamic Experience Editor Manager
function renderExperienceEditor() {
  elements.experienceEditorContainer.innerHTML = '';
  const experience = currentProfile.experience || [];
  
  experience.forEach((exp, index) => {
    addExperienceFieldToEditor(exp.company, exp.period, exp.position, exp.description, index);
  });
}

function addExperienceFieldToEditor(company = '', period = '', position = '', description = '', index = null) {
  const item = document.createElement('div');
  item.className = 'experience-editor-item';
  
  const idSuffix = index !== null ? index : Date.now();
  
  item.innerHTML = `
    <div class="experience-editor-header">
      <span class="experience-editor-title">EXPERIENCE_ENTRY</span>
      <button type="button" class="btn-remove-experience" aria-label="Remove experience entry">REMOVE</button>
    </div>
    <div class="experience-editor-row">
      <input type="text" placeholder="Company" value="${company}" class="exp-company-input" id="exp-comp-${idSuffix}">
      <input type="text" placeholder="Period (e.g. 2024)" value="${period}" class="exp-period-input" id="exp-per-${idSuffix}">
    </div>
    <input type="text" placeholder="Position (e.g. IT Support)" value="${position}" class="exp-position-input" id="exp-pos-${idSuffix}">
    <textarea placeholder="Description of role..." rows="2" class="exp-desc-input" id="exp-desc-${idSuffix}">${description}</textarea>
  `;
  
  item.querySelector('.btn-remove-experience').addEventListener('click', () => {
    item.remove();
  });
  
  elements.experienceEditorContainer.appendChild(item);
}

// Theme controls state updater
function updateThemePickerState(theme) {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    if (btn.getAttribute('data-theme') === theme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Save profile settings
function saveProfileSettings() {
  const newName = elements.inputName.value.trim() || currentProfile.name;
  const newUsername = elements.inputUsername.value.trim() || currentProfile.username;
  const newTitle = elements.inputTitle.value.trim() || currentProfile.title;
  const newBio = elements.inputBio.value.trim() || currentProfile.bio;
  
  // Parse skills
  const skillsInput = elements.inputSkills.value;
  const newSkills = skillsInput.split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // Gather links
  const newLinks = [];
  document.querySelectorAll('.link-editor-item').forEach(item => {
    const labelVal = item.querySelector('.link-label-input').value.trim();
    const urlVal = item.querySelector('.link-url-input').value.trim();
    if (labelVal && urlVal) {
      newLinks.push({ label: labelVal, url: urlVal });
    }
  });
  
  // Gather experience
  const newExperience = [];
  document.querySelectorAll('.experience-editor-item').forEach(item => {
    const companyVal = item.querySelector('.exp-company-input').value.trim();
    const periodVal = item.querySelector('.exp-period-input').value.trim();
    const positionVal = item.querySelector('.exp-position-input').value.trim();
    const descVal = item.querySelector('.exp-desc-input').value.trim();
    if (companyVal && periodVal && positionVal) {
      newExperience.push({
        company: companyVal,
        period: periodVal,
        position: positionVal,
        description: descVal
      });
    }
  });
  
  // Detect active theme
  const activeThemeBtn = document.querySelector('.theme-btn.active');
  const activeTheme = activeThemeBtn ? activeThemeBtn.getAttribute('data-theme') : 'acid';
  
  // Update state object
  const updatedUsername = newUsername !== currentProfile.username;
  
  currentProfile.name = newName;
  currentProfile.username = newUsername;
  currentProfile.title = newTitle;
  currentProfile.bio = newBio;
  currentProfile.skills = newSkills;
  currentProfile.links = newLinks;
  currentProfile.experience = newExperience;
  currentProfile.theme = activeTheme;
  
  // Save object configuration
  localStorage.setItem('ryker_profile_config', JSON.stringify(currentProfile));
  
  // Re-render and apply changes
  renderProfileView();
  closeControlPanel();
  
  // Reload Github profiles if username changed
  if (updatedUsername) {
    loadGitHubData(newUsername);
  }
}

// Export profile to JSON file download
function exportProfileConfiguration() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentProfile, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "profile.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Factory Reset
function factoryResetProfile() {
  if (confirm("WARNING: Are you sure you want to reset your portfolio settings back to factory defaults?")) {
    localStorage.removeItem('ryker_profile_config');
    window.location.reload();
  }
}

// Event Listeners Registration
function registerEventListeners() {
  elements.openPanelBtn.addEventListener('click', openControlPanel);
  elements.closePanelBtn.addEventListener('click', closeControlPanel);
  elements.saveBtn.addEventListener('click', saveProfileSettings);
  elements.exportBtn.addEventListener('click', exportProfileConfiguration);
  elements.resetBtn.addEventListener('click', factoryResetProfile);
  
  elements.addLinkBtn.addEventListener('click', () => {
    addLinkFieldToEditor();
  });
  
  elements.addExperienceBtn.addEventListener('click', () => {
    addExperienceFieldToEditor();
  });
  
  // Theme option clicks
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const theme = btn.getAttribute('data-theme');
      document.documentElement.setAttribute('data-theme', theme);
      updateThemePickerState(theme);
    });
  });
  
  // Close panel on Esc key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.sidebar.classList.contains('open')) {
      closeControlPanel();
    }
  });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initProfile();
  registerEventListeners();
});
