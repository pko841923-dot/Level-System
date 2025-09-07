// Level System PWA JavaScript
class LevelSystem {
    // Constants
    static DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    static DIFFICULTY_COLORS = {
        'Easy': '#4CAF50',
        'Normal': '#2196F3', 
        'Hard': '#FF9800',
        'Weekly': '#9C27B0',
        'Monthly': '#E91E63',
        'Mega': '#F44336'
    };
    static MULTIPLIERS = {
        'Easy': { xp: 0.7, coins: 0.8, sp: 0.5 },
        'Normal': { xp: 1.0, coins: 1.0, sp: 1.0 },
        'Hard': { xp: 1.5, coins: 1.5, sp: 1.5 },
        'Weekly': { xp: 3.0, coins: 3.0, sp: 2.0 },
        'Monthly': { xp: 5.0, coins: 5.0, sp: 3.0 },
        'Mega': { xp: 10.0, coins: 10.0, sp: 5.0 }
    };

    constructor() {
        this.data = this.loadData();
        this.currentScreen = 'home';
        this.currentDay = 0; // 0 = Monday
        this.cachedElements = {};
        this.initThemes();
        this.init();
    }

    // Utility methods
    sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    safeGetElement(id) {
        if (!this.cachedElements[id]) {
            this.cachedElements[id] = document.getElementById(id);
        }
        return this.cachedElements[id];
    }

    showCustomDialog(message, type = 'info') {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'custom-dialog';
            dialog.innerHTML = `
                <div class="dialog-content">
                    <p>${this.sanitizeHTML(message)}</p>
                    <div class="dialog-buttons">
                        ${type === 'confirm' ? 
                            '<button class="btn-cancel">Cancel</button><button class="btn-confirm">OK</button>' :
                            '<button class="btn-ok">OK</button>'
                        }
                    </div>
                </div>
            `;
            document.body.appendChild(dialog);
            
            const handleClick = (result) => {
                document.body.removeChild(dialog);
                resolve(result);
            };
            
            if (type === 'confirm') {
                dialog.querySelector('.btn-cancel').onclick = () => handleClick(false);
                dialog.querySelector('.btn-confirm').onclick = () => handleClick(true);
            } else {
                dialog.querySelector('.btn-ok').onclick = () => handleClick(true);
            }
        });
    }

    getTotalStats() {
        return Object.values(this.data.stats).reduce((a, b) => a + b, 0);
    }

    renderStatBoosts(statBoosts) {
        if (!statBoosts || Object.keys(statBoosts).length === 0) return '';
        return `<span>${Object.entries(statBoosts).map(([stat, val]) => `${this.sanitizeHTML(stat.slice(0,3))}+${val}`).join(', ')}</span>`;
    }

    initThemes() {
        const savedTheme = localStorage.getItem('selectedTheme') || 'blue-dark';
        this.applyTheme(savedTheme);
    }

    applyTheme(themeName) {
        const [color] = themeName.split('-');
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.setAttribute('data-color', color);
        localStorage.setItem('selectedTheme', `${color}-dark`);
    }

    getAvailableThemes() {
        return {
            'blue-dark': { name: 'Blue Dark', color: 'blue', mode: 'dark' },
            'green-dark': { name: 'Green Dark', color: 'green', mode: 'dark' }
        };
    }

    renderThemeSelector() {
        const themes = this.getAvailableThemes();
        const currentTheme = localStorage.getItem('selectedTheme') || 'blue-dark';
        
        return Object.entries(themes).map(([key, theme]) => {
            const isActive = key === currentTheme;
            return `
                <div class="theme-option ${isActive ? 'active' : ''}" data-theme="${key}">
                    <div class="theme-preview theme-preview-${theme.color}-${theme.mode}"></div>
                    <span class="theme-name">${theme.name}</span>
                    ${isActive ? '<span class="theme-check">✓</span>' : ''}
                </div>
            `;
        }).join('');
    }

    updateThemeSelector() {
        const container = document.querySelector('.theme-selector');
        if (container) {
            container.innerHTML = this.renderThemeSelector();
            container.querySelectorAll('.theme-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    const themeName = e.target.dataset.theme;
                    if (themeName) {
                        this.applyTheme(themeName);
                        this.updateThemeSelector();
                    }
                });
            });
        }
    }

    init() {
        this.setupEventListeners();
        this.checkMidnightReset();
        this.setCurrentDay();
        this.updateUI();
        this.updateCharacter();
        this.registerServiceWorker();
        this.setupAutoSave();
        this.setupOfflineMode();
        
        // Check for midnight reset every minute
        setInterval(() => {
            this.checkMidnightReset();
        }, 60000);
    }

    setCurrentDay() {
        const today = new Date().getDay();
        this.currentDay = today === 0 ? 6 : today - 1; // Convert Sunday=0 to Saturday=6
    }

    loadData() {
        const defaultData = {
            level: 1,
            xp: 0,
            coins: 0,
            skillPoints: 0,
            characterName: 'Hero',
            stats: {
                STRENGTH: 0, AGILITY: 0, VITALITY: 0, CREATIVITY: 0,
                LOGIC: 0, CLARITY: 0, WISDOM: 0, CHARISMA: 0
            },
            skills: {
                'Warrior': { level: 1, max: 5, cost: 1, description: 'Increases STRENGTH and VITALITY gains' },
                'Athlete': { level: 1, max: 5, cost: 1, description: 'Increases AGILITY and VITALITY gains' },
                'Scholar': { level: 1, max: 5, cost: 1, description: 'Increases LOGIC and WISDOM gains' },
                'Artist': { level: 1, max: 5, cost: 1, description: 'Increases CREATIVITY and CHARISMA gains' },
                'Monk': { level: 1, max: 5, cost: 1, description: 'Increases CLARITY and WISDOM gains' },
                'Leader': { level: 1, max: 5, cost: 1, description: 'Increases CHARISMA and LOGIC gains' }
            },
            tasks: [],
            achievements: [],
            unlockedAchievements: [],
            dailyStreak: 0,
            lastCompletionDate: null,
            milestonesClaimed: [],
            streakRewardsClaimed: [],
            weeklyChallenge: null,
            monthlyChallenge: null,
            customChallenges: [],
            megaQuestsCompleted: [],
            character: {
                cosmetics: {
                    hat: null,
                    accessory: null,
                    weapon: null
                },
                ownedCosmetics: []
            }
        };
        
        try {
            const saved = localStorage.getItem('levelSystemData');
            if (saved) {
                const parsedData = JSON.parse(saved);
                const achievements = Array.isArray(parsedData.unlockedAchievements) 
                    ? parsedData.unlockedAchievements 
                    : [];
                
                return {
                    ...defaultData,
                    ...parsedData,
                    unlockedAchievements: achievements
                };
            }
        } catch (error) {
            console.error('Error loading data:', error);
            localStorage.removeItem('levelSystemData');
        }
        return defaultData;
    }

    saveData() {
        try {
            const dataToSave = {
                ...this.data,
                unlockedAchievements: Array.isArray(this.data.unlockedAchievements) 
                    ? this.data.unlockedAchievements 
                    : Array.from(this.data.unlockedAchievements || [])
            };
            localStorage.setItem('levelSystemData', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const screen = e.target.dataset.screen;
                if (screen) {
                    // Switching to screen
                    this.switchScreen(screen);
                }
            });
        });

        // Day navigation
        document.getElementById('prev-day').addEventListener('click', () => {
            this.currentDay = (this.currentDay - 1 + 7) % 7;
            this.updateUI();
        });

        document.getElementById('next-day').addEventListener('click', () => {
            this.currentDay = (this.currentDay + 1) % 7;
            this.updateUI();
        });

        // Add quest
        document.getElementById('add-quest').addEventListener('click', () => {
            this.openQuestModal();
        });

        // Quest modal
        document.getElementById('cancel-quest').addEventListener('click', () => {
            this.closeQuestModal();
        });

        document.getElementById('save-quest').addEventListener('click', () => {
            this.saveQuest();
        });

        document.getElementById('delete-quest').addEventListener('click', () => {
            this.deleteQuest();
        });

        // Stat modal
        document.getElementById('cancel-stat').addEventListener('click', () => {
            this.closeStatModal();
        });

        document.getElementById('save-stat').addEventListener('click', () => {
            this.saveStat();
        });

        document.getElementById('delete-stat').addEventListener('click', () => {
            this.deleteStat();
        });
    }

    switchScreen(screen) {
        console.log('switchScreen called with:', screen);
        const oldScreen = this.currentScreen;
        
        // Don't animate if same screen
        if (oldScreen === screen) {
            return;
        }
        
        this.currentScreen = screen;
        
        // Update nav button states
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-screen="${CSS.escape(screen)}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        this.updateMainContentWithTransition(oldScreen, screen);
    }

    updateMainContentWithTransition(oldScreen, newScreen) {
        const container = document.getElementById('main-content');
        const direction = this.getAnimationDirection(oldScreen, newScreen);
        
        // Add exit animation
        container.classList.add(direction.out);
        
        setTimeout(() => {
            this.updateMainContent();
            container.classList.remove(direction.out);
            container.classList.add(direction.in);
            
            setTimeout(() => {
                container.classList.remove(direction.in);
            }, 200);
        }, 75);
    }

    getAnimationDirection(oldScreen, newScreen) {
        const screens = ['home', 'stats', 'skills', 'achievements', 'profile', 'analytics', 'settings'];
        const oldIndex = screens.indexOf(oldScreen);
        const newIndex = screens.indexOf(newScreen);
        
        // Different animations for different screen types
        const animations = {
            'home': { out: 'fade-out-down', in: 'fade-in-up' },
            'stats': { out: 'zoom-out', in: 'zoom-in' },
            'skills': { out: 'slide-out-left', in: 'slide-in-right' },
            'achievements': { out: 'fade-out-down', in: 'fade-in-up' },
            'profile': { out: 'zoom-out', in: 'zoom-in' },
            'analytics': { out: 'slide-out-left', in: 'slide-in-right' },
            'settings': { out: 'slide-out-right', in: 'slide-in-left' }
        };
        
        // Use screen-specific animation or fallback to directional
        if (animations[newScreen]) {
            return animations[newScreen];
        }
        
        if (newIndex > oldIndex) {
            return { out: 'slide-out-left', in: 'slide-in-right' };
        } else {
            return { out: 'slide-out-right', in: 'slide-in-left' };
        }
    }

    updateUI() {
        // Update header with change detection
        const charNameEl = document.getElementById('char-name');
        if (charNameEl.textContent !== this.data.characterName) {
            charNameEl.textContent = this.data.characterName;
            charNameEl.style.cursor = 'pointer';
            charNameEl.onclick = () => this.editCharacterName();
        }
        
        const levelText = `Lv.${this.data.level}`;
        const xpText = `${this.data.xp} XP`;
        const coinsText = `${this.data.coins} Coins`;
        const spText = `${this.data.skillPoints} SP`;
        
        const levelEl = this.safeGetElement('level');
        const xpEl = this.safeGetElement('xp');
        const coinsEl = this.safeGetElement('coins');
        const spEl = this.safeGetElement('sp');
        
        if (levelEl && levelEl.textContent !== levelText) levelEl.textContent = levelText;
        if (xpEl && xpEl.textContent !== xpText) xpEl.textContent = xpText;
        if (coinsEl && coinsEl.textContent !== coinsText) coinsEl.textContent = coinsText;
        if (spEl && spEl.textContent !== spText) spEl.textContent = spText;

        // Update day
        const dayText = LevelSystem.DAYS[this.currentDay];
        const dayEl = this.safeGetElement('current-day');
        if (dayEl && dayEl.textContent !== dayText) dayEl.textContent = dayText;

        // Update progress
        const todayTasks = this.getTodayTasks();
        const completed = todayTasks.filter(t => t.completed).length;
        const streakText = this.data.dailyStreak > 0 ? ` • ${this.data.dailyStreak} day streak` : '';
        const progressText = `Today: ${completed}/${todayTasks.length} quests completed${streakText}`;
        const progressEl = this.safeGetElement('progress');
        if (progressEl && progressEl.textContent !== progressText) progressEl.textContent = progressText;

        this.updateMainContent();
        this.updateCharacter();
    }

    updateMainContent() {
        const container = document.getElementById('main-content');
        const bottomNav = document.getElementById('bottom-nav');
        const heroCard = document.querySelector('.hero-card');
        const dayNav = document.querySelector('.day-nav');
        
        // Updating main content
        
        // Show/hide elements based on screen
        if (this.currentScreen === 'home') {
            if (bottomNav) bottomNav.style.display = 'flex';
            if (heroCard) heroCard.style.display = 'block';
            if (dayNav) dayNav.style.display = 'flex';
        } else {
            if (bottomNav) bottomNav.style.display = 'none';
            if (heroCard) heroCard.style.display = 'none';
            if (dayNav) dayNav.style.display = 'none';
        }
        
        switch(this.currentScreen) {
            case 'home':
                this.renderHome(container);
                break;
            case 'stats':
                this.renderStats(container);
                break;
            case 'skills':
                this.renderSkills(container);
                break;
            case 'achievements':
                this.renderAchievements(container);
                break;
            case 'profile':
                this.renderProfile(container);
                break;
            case 'analytics':
                this.renderAnalytics(container);
                break;
            case 'settings':
                this.renderSettings(container);
                break;
            case 'challenges':
                this.renderChallenges(container);
                break;
            default:
                this.renderHome(container);
        }
    }

    renderHome(container) {
        const tasks = this.getTodayTasks();
        
        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state animate-in">
                    <div class="icon">○</div>
                    <p>No quests for today<br>Tap + to add your first quest!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div id="tasks-container">
                ${tasks.map((task, index) => this.renderTaskCard(task, index)).join('')}
            </div>
        `;

        // Add task event listeners
        container.querySelectorAll('.btn-complete').forEach((btn, index) => {
            btn.addEventListener('click', () => this.completeTask(index));
        });

        container.querySelectorAll('.btn-redo').forEach((btn, index) => {
            btn.addEventListener('click', () => this.redoTask(index));
        });

        container.querySelectorAll('.btn-edit').forEach((btn, index) => {
            btn.addEventListener('click', () => this.openEditQuestModal(index));
        });
    }

    renderTaskCard(task, index) {
        const statusIcon = task.completed ? '✓' : '○';
        const statusClass = task.completed ? 'completed' : '';
        const actionBtn = task.completed 
            ? '<button class="btn-redo">Redo</button>'
            : '<button class="btn-complete">Complete</button>';
        
        const diffColor = LevelSystem.DIFFICULTY_COLORS[task.difficulty] || '#2196F3';

        return `
            <div class="task-card ${statusClass}">
                <div class="task-header">
                    <span class="task-name">${this.sanitizeHTML(task.name)}</span>
                    <span class="task-status">${statusIcon}</span>
                </div>
                ${task.description ? `<div class="task-desc">${this.sanitizeHTML(task.description)}</div>` : ''}
                <div class="task-meta">
                    <span style="color: ${diffColor}; font-weight: bold;">${this.sanitizeHTML(task.difficulty || 'Normal')}</span>
                    <span>+${task.xpReward} XP</span>
                    ${this.renderStatBoosts(task.statBoosts)}
                </div>
                <div class="task-buttons">
                    <button class="btn-edit">Edit</button>
                    ${actionBtn}
                </div>
            </div>
        `;
    }

    renderStats(container) {
        const statsHtml = Object.entries(this.data.stats).map(([stat, value]) => {
            const tier = this.getStatTier(value);
            const progress = this.getStatProgress(value);
            const color = this.getTierColor(tier);
            const hexColor = `rgb(${Math.round(color[0]*255)}, ${Math.round(color[1]*255)}, ${Math.round(color[2]*255)})`;
            
            return `
                <div class="stat-card" data-stat="${stat}" style="cursor: pointer; background: var(--primary); border: 1px solid var(--secondary);">
                    <div class="stat-header">
                        <span class="stat-name" style="color: var(--text);">${stat}</span>
                        <span class="stat-tier" style="color: ${hexColor}">${tier} (${value})</span>
                    </div>
                    <div class="progress-bar" style="background: var(--secondary);">
                        <div class="progress-fill" style="width: ${progress}%; background: ${hexColor}"></div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="stats-header" style="background: var(--primary); border: 1px solid var(--secondary);">
                <button id="add-stat" class="add-btn" style="background: var(--accent); color: var(--background);">+ Add Stat</button>
            </div>
            <div class="stats-grid">
                ${statsHtml}
            </div>
            <div class="radar-section">
                <div class="radar-header" style="background: var(--primary); border: 1px solid var(--secondary);">
                    <h3 style="color: var(--accent);">Stats Radar Chart</h3>
                    <p style="color: var(--text); opacity: 0.7;">Visual representation of your character stats</p>
                </div>
                <div class="radar-container" style="background: var(--primary); border: 1px solid var(--secondary);">
                    <canvas id="radar-canvas" width="300" height="300"></canvas>
                </div>
                <div class="radar-legend" id="radar-legend"></div>
            </div>
        `;
        
        // Add click listeners to stat cards
        container.querySelectorAll('.stat-card').forEach(card => {
            card.addEventListener('click', () => {
                const statName = card.dataset.stat;
                this.editStat(statName);
            });
        });
        
        // Add stat button
        document.getElementById('add-stat').addEventListener('click', () => {
            this.openStatModal('');
        });
        
        this.drawRadarChart();
    }

    renderSkills(container) {
        const skillsHtml = Object.entries(this.data.skills).map(([name, skill]) => {
            const canUpgrade = this.data.skillPoints >= skill.cost && skill.level < skill.max;
            const isMaxed = skill.level >= skill.max;
            
            return `
                <div class="skill-card" style="background: var(--primary); border: 2px solid var(--secondary);">
                    <div class="skill-header">
                        <span class="skill-name" style="color: var(--text);">${name}</span>
                        <span class="skill-level" style="color: var(--accent);">Lv.${skill.level}/${skill.max}</span>
                    </div>
                    <div class="skill-desc" style="color: var(--text); opacity: 0.7;">${skill.description}</div>
                    <div class="skill-footer">
                        <span class="skill-cost" style="color: var(--secondary);">Cost: ${skill.cost} SP</span>
                        ${isMaxed ? 
                            '<button class="skill-btn maxed" disabled style="background: var(--accent); color: var(--background); opacity: 0.8;">MAXED</button>' :
                            `<button class="skill-btn ${canUpgrade ? 'upgrade' : 'disabled'}" 
                                data-skill="${name}" ${!canUpgrade ? 'disabled' : ''}
                                style="background: ${canUpgrade ? 'var(--accent)' : 'var(--secondary)'}; color: ${canUpgrade ? 'var(--background)' : 'var(--text)'}; border: none;">
                                ${canUpgrade ? 'UPGRADE' : 'NEED SP'}
                            </button>`
                        }
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="skills-header" style="background: var(--primary); border: 1px solid var(--secondary);">
                <h3 style="color: var(--accent);">Available Skill Points: ${this.data.skillPoints}</h3>
            </div>
            <div class="skills-grid">
                ${skillsHtml}
            </div>
        `;

        // Add upgrade listeners to all skill buttons
        container.querySelectorAll('.skill-btn').forEach(btn => {
            if (!btn.disabled) {
                btn.addEventListener('click', (e) => {
                    const skillName = e.target.dataset.skill;
                    this.upgradeSkill(skillName);
                });
            }
        });
        
        // Store skill points header for updates
        this.skillsHeaderEl = container.querySelector('.skills-header h3');
    }

    renderAchievements(container) {
        const achievements = this.getAchievements();
        const achievementsHtml = achievements.map(([id, icon, name, desc, unlocked]) => {
            return `
                <div class="achievement-card ${unlocked ? 'unlocked' : ''}" style="background: var(--primary); border: 1px solid ${unlocked ? 'var(--accent)' : 'var(--secondary)'};">
                    <div class="achievement-icon">${icon}</div>
                    <div class="achievement-details">
                        <div class="achievement-name" style="color: var(--text);">${name}</div>
                        <div class="achievement-desc" style="color: var(--text); opacity: 0.7;">${desc}</div>
                    </div>
                    <div class="achievement-status" style="color: ${unlocked ? 'var(--accent)' : 'var(--secondary)'};">${unlocked ? '✓' : '○'}</div>
                </div>
            `;
        }).join('');

        const unlockedCount = achievements.filter(([,,,,unlocked]) => unlocked).length;
        
        container.innerHTML = `
            <div class="achievements-header" style="background: var(--primary); border: 1px solid var(--secondary);">
                <h3 style="color: var(--accent);">Achievements: ${unlockedCount}/${achievements.length}</h3>
            </div>
            <div class="achievements-grid">
                ${achievementsHtml}
            </div>
        `;
    }

    renderRadar(container) {
        container.innerHTML = `
            <div class="radar-header">
                <h3>Stats Radar Chart</h3>
                <p>Visual representation of your character stats</p>
            </div>
            <div class="radar-container">
                <canvas id="radar-canvas" width="300" height="300"></canvas>
            </div>
            <div class="radar-legend" id="radar-legend"></div>
        `;
        
        this.drawRadarChart();
    }

    drawRadarChart() {
        const canvas = document.getElementById('radar-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 120;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Stats data
        const stats = Object.entries(this.data.stats);
        const numStats = stats.length;
        
        if (numStats === 0) return;
        
        // Calculate average stat value
        const avgStat = stats.reduce((sum, [, value]) => sum + value, 0) / stats.length;
        
        // Convert values to tier ranks (0-18 for D- to SSS)
        const tiers = [
            [0, 0], [10, 1], [21, 2], [33, 3], [46, 4], [60, 5],
            [75, 6], [91, 7], [108, 8], [126, 9], [145, 10], [165, 11],
            [186, 12], [208, 13], [231, 14], [255, 15], [280, 16], [306, 17], [333, 18]
        ];
        
        const tierRanks = stats.map(([name, value]) => {
            let rank = 0;
            for (const [threshold, tierRank] of tiers) {
                if (value >= threshold) rank = tierRank;
            }
            return rank;
        });
        
        // Get average tier rank
        let avgRank = 0;
        for (const [threshold, tierRank] of tiers) {
            if (avgStat >= threshold) avgRank = tierRank;
        }
        
        // Normalize ranks (0-18 -> 0-1)
        const normalizedValues = tierRanks.map(rank => rank / 18.0);
        const avgNormalized = avgRank / 18.0;
        
        // Get theme colors
        const computedStyle = getComputedStyle(document.documentElement);
        const borderColor = computedStyle.getPropertyValue('--border').trim() || '#4d5d52';
        const textColor = computedStyle.getPropertyValue('--text-secondary').trim() || '#b2c0b5';
        
        // Draw grid circles with tier labels
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        const tierLabels = ['D-', 'C-', 'B-', 'A-', 'S-'];
        for (let i = 1; i <= 5; i++) {
            const gridRadius = radius * (i / 5);
            ctx.beginPath();
            ctx.arc(centerX, centerY, gridRadius, 0, 2 * Math.PI);
            ctx.stroke();
            
            // Add tier labels
            if (i <= tierLabels.length) {
                ctx.fillStyle = textColor;
                ctx.font = '8px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(tierLabels[i-1], centerX + gridRadius - 10, centerY - 5);
            }
        }
        
        // Draw axes
        const angles = [];
        stats.forEach((stat, i) => {
            const angle = (2 * Math.PI * i) / numStats - Math.PI / 2;
            angles.push(angle);
            
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + radius * Math.cos(angle),
                centerY + radius * Math.sin(angle)
            );
            ctx.stroke();
        });
        
        // Draw filled polygon area with individual values
        if (normalizedValues.length >= 3) {
            const avgTier = this.getStatTier(avgStat);
            const avgColor = this.getTierColor(avgTier);
            ctx.fillStyle = `rgba(${avgColor[0]*255}, ${avgColor[1]*255}, ${avgColor[2]*255}, 0.3)`;
            ctx.beginPath();
            normalizedValues.forEach((value, i) => {
                const pointRadius = radius * value;
                const x = centerX + pointRadius * Math.cos(angles[i]);
                const y = centerY + pointRadius * Math.sin(angles[i]);
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fill();
            
            // Draw outline
            ctx.strokeStyle = `rgb(${avgColor[0]*255}, ${avgColor[1]*255}, ${avgColor[2]*255})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            normalizedValues.forEach((value, i) => {
                const pointRadius = radius * value;
                const x = centerX + pointRadius * Math.cos(angles[i]);
                const y = centerY + pointRadius * Math.sin(angles[i]);
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.stroke();
            
            // Draw data points with tier colors
            normalizedValues.forEach((value, i) => {
                const [statName, statValue] = stats[i];
                const tier = this.getStatTier(statValue);
                const tierColor = this.getTierColor(tier);
                
                const pointRadius = radius * value;
                const x = centerX + pointRadius * Math.cos(angles[i]);
                const y = centerY + pointRadius * Math.sin(angles[i]);
                
                ctx.fillStyle = `rgb(${tierColor[0]*255}, ${tierColor[1]*255}, ${tierColor[2]*255})`;
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, 2 * Math.PI);
                ctx.fill();
            });
        }
        
        // Draw stat labels
        const primaryTextColor = computedStyle.getPropertyValue('--text-primary').trim() || '#eaf3ed';
        ctx.fillStyle = primaryTextColor;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        stats.forEach((stat, i) => {
            const [statName, statValue] = stat;
            const angle = angles[i];
            const labelRadius = radius + 25;
            const labelX = centerX + labelRadius * Math.cos(angle);
            const labelY = centerY + labelRadius * Math.sin(angle);
            
            const tier = this.getStatTier(statValue);
            ctx.fillText(`${statName.substring(0, 3)}\n${tier}`, labelX, labelY);
        });
        
        // Update legend
        const legend = document.getElementById('radar-legend');
        if (legend) {
            legend.innerHTML = stats.map(([name, value]) => {
                const tier = this.getStatTier(value);
                const color = this.getTierColor(tier);
                const hexColor = `#${Math.round(color[0]*255).toString(16).padStart(2,'0')}${Math.round(color[1]*255).toString(16).padStart(2,'0')}${Math.round(color[2]*255).toString(16).padStart(2,'0')}`;
                return `
                    <div class="radar-legend-item" style="background: var(--primary); border: 1px solid var(--secondary);">
                        <span class="legend-color" style="background: ${hexColor}"></span>
                        <span style="color: var(--text);">${name}: ${tier} (${value})</span>
                    </div>
                `;
            }).join('');
        }
    }

    renderProfile(container) {
        const totalStats = Object.values(this.data.stats).reduce((a, b) => a + b, 0);
        const avgStat = totalStats / Object.keys(this.data.stats).length;
        const avgTier = this.getStatTier(avgStat);
        const completedTasks = this.data.tasks.filter(t => t.completed).length;
        
        container.innerHTML = `
            <div class="profile-section">
                <h3>Character</h3>
                <div id="character-display"></div>
            </div>
            
            <div class="profile-section">
                <h3>Character Info</h3>
                <div class="profile-row">
                    <span class="profile-label">Name:</span>
                    <span class="profile-value">${this.data.characterName}</span>
                </div>
                <div class="profile-row">
                    <span class="profile-label">Level:</span>
                    <span class="profile-value">${this.data.level}</span>
                </div>
                <div class="profile-row">
                    <span class="profile-label">Total Stats:</span>
                    <span class="profile-value">${totalStats}</span>
                </div>
                <div class="profile-row">
                    <span class="profile-label">Average Stat:</span>
                    <span class="profile-value">${avgStat.toFixed(1)} (${avgTier})</span>
                </div>
            </div>
            
            <div class="profile-section">
                <h3>Progress</h3>
                <div class="profile-row">
                    <span class="profile-label">Experience:</span>
                    <span class="profile-value">${this.data.xp} XP</span>
                </div>
                <div class="profile-row">
                    <span class="profile-label">Coins:</span>
                    <span class="profile-value">${this.data.coins}</span>
                </div>
                <div class="profile-row">
                    <span class="profile-label">Skill Points:</span>
                    <span class="profile-value">${this.data.skillPoints}</span>
                </div>
                <div class="profile-row">
                    <span class="profile-label">Quests Completed:</span>
                    <span class="profile-value">${completedTasks}</span>
                </div>
                <div class="profile-row">
                    <span class="profile-label">Achievements:</span>
                    <span class="profile-value">${this.data.unlockedAchievements.length}/${this.getAchievements().length}</span>
                </div>
            </div>
        `;
        
        this.updateCharacter();
    }

    renderAnalytics(container) {
        const analytics = this.calculateAnalytics();
        
        container.innerHTML = `
            <div class="analytics-header" style="background: var(--primary); border: 1px solid var(--secondary);">
                <h3 style="color: var(--accent);">📊 Analytics & Reports</h3>
                <p style="color: var(--text); opacity: 0.7;">Detailed insights into your progress</p>
            </div>
            
            <div class="analytics-grid">
                <div class="analytics-card" style="background: var(--primary); border: 1px solid var(--secondary);">
                    <h4 style="color: var(--accent);">📈 Progress Overview</h4>
                    <div class="analytics-stats">
                        <div class="analytics-stat">
                            <span class="stat-label" style="color: var(--text); opacity: 0.7;">Completion Rate:</span>
                            <span class="stat-value" style="color: var(--accent);">${analytics.completionRate}%</span>
                        </div>
                        <div class="analytics-stat">
                            <span class="stat-label" style="color: var(--text); opacity: 0.7;">Daily Average:</span>
                            <span class="stat-value" style="color: var(--accent);">${analytics.dailyAverage} quests</span>
                        </div>
                        <div class="analytics-stat">
                            <span class="stat-label" style="color: var(--text); opacity: 0.7;">Best Streak:</span>
                            <span class="stat-value" style="color: var(--accent);">${analytics.bestStreak} days</span>
                        </div>
                    </div>
                </div>
                
                <div class="analytics-card" style="background: var(--primary); border: 1px solid var(--secondary);">
                    <h4 style="color: var(--accent);">🎯 Quest Analysis</h4>
                    <div class="difficulty-chart">
                        <canvas id="difficulty-chart" width="300" height="200"></canvas>
                    </div>
                </div>
                
                <div class="analytics-card" style="background: var(--primary); border: 1px solid var(--secondary);">
                    <h4 style="color: var(--accent);">📅 Weekly Performance</h4>
                    <div class="weekly-chart">
                        <canvas id="weekly-chart" width="300" height="200"></canvas>
                    </div>
                </div>
                
                <div class="analytics-card" style="background: var(--primary); border: 1px solid var(--secondary);">
                    <h4 style="color: var(--accent);">🏆 Achievement Progress</h4>
                    <div class="achievement-progress">
                        <div class="progress-item">
                            <span style="color: var(--text);">Unlocked: ${analytics.achievementProgress.unlocked}/${analytics.achievementProgress.total}</span>
                            <div class="progress-bar" style="background: var(--secondary);">
                                <div class="progress-fill" style="width: ${analytics.achievementProgress.percentage}%; background: var(--accent);"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="analytics-card" style="background: var(--primary); border: 1px solid var(--secondary);">
                    <h4 style="color: var(--accent);">💡 Insights</h4>
                    <div class="insights-list">
                        ${analytics.insights.map(insight => `
                            <div class="insight-item" style="color: var(--text); opacity: 0.9;">
                                <span class="insight-icon">${insight.icon}</span>
                                <span class="insight-text">${insight.text}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="analytics-card" style="background: var(--primary); border: 1px solid var(--secondary);">
                    <h4 style="color: var(--accent);">📊 Stat Growth</h4>
                    <div class="stat-growth">
                        <canvas id="stat-growth-chart" width="300" height="200"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            this.drawDifficultyChart(analytics.difficultyData);
            this.drawWeeklyChart(analytics.weeklyData);
            this.drawStatGrowthChart(analytics.statGrowthData);
        }, 100);
    }

    calculateAnalytics() {
        const completedTasks = this.data.tasks.filter(t => t.completed);
        const totalTasks = this.data.tasks.length;
        
        const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
        const dailyAverage = Math.round((completedTasks.length / 30) * 10) / 10;
        const bestStreak = this.data.dailyStreak || 0;
        
        const difficultyData = {
            'Easy': completedTasks.filter(t => (t.difficulty || 'Normal') === 'Easy').length,
            'Normal': completedTasks.filter(t => (t.difficulty || 'Normal') === 'Normal').length,
            'Hard': completedTasks.filter(t => (t.difficulty || 'Normal') === 'Hard').length,
            'Weekly': completedTasks.filter(t => (t.difficulty || 'Normal') === 'Weekly').length,
            'Monthly': completedTasks.filter(t => (t.difficulty || 'Normal') === 'Monthly').length,
            'Mega': completedTasks.filter(t => (t.difficulty || 'Normal') === 'Mega').length
        };
        
        const weeklyData = {
            'Mon': completedTasks.filter(t => t.day === 'Monday').length,
            'Tue': completedTasks.filter(t => t.day === 'Tuesday').length,
            'Wed': completedTasks.filter(t => t.day === 'Wednesday').length,
            'Thu': completedTasks.filter(t => t.day === 'Thursday').length,
            'Fri': completedTasks.filter(t => t.day === 'Friday').length,
            'Sat': completedTasks.filter(t => t.day === 'Saturday').length,
            'Sun': completedTasks.filter(t => t.day === 'Sunday').length
        };
        
        const totalAchievements = this.getAchievements().length;
        const unlockedAchievements = this.data.unlockedAchievements.length;
        const achievementProgress = {
            unlocked: unlockedAchievements,
            total: totalAchievements,
            percentage: Math.round((unlockedAchievements / totalAchievements) * 100)
        };
        
        const insights = this.generateInsights(completedTasks, difficultyData, weeklyData);
        
        const statGrowthData = Object.entries(this.data.stats).map(([name, value]) => ({
            name: name.substring(0, 3),
            value,
            tier: this.getStatTier(value)
        }));
        
        return {
            completionRate,
            dailyAverage,
            bestStreak,
            difficultyData,
            weeklyData,
            achievementProgress,
            insights,
            statGrowthData
        };
    }
    
    generateInsights(completedTasks, difficultyData, weeklyData) {
        const insights = [];
        
        const bestDay = Object.entries(weeklyData).reduce((a, b) => weeklyData[a[0]] > weeklyData[b[0]] ? a : b)[0];
        const dayNames = {'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'};
        insights.push({
            icon: '📅',
            text: `Your most productive day is ${dayNames[bestDay]}`
        });
        
        const preferredDifficulty = Object.entries(difficultyData).reduce((a, b) => difficultyData[a[0]] > difficultyData[b[0]] ? a : b)[0];
        insights.push({
            icon: '🎯',
            text: `You prefer ${preferredDifficulty} difficulty quests`
        });
        
        if (this.data.level >= 10) {
            insights.push({
                icon: '🚀',
                text: `Great progress! You've reached level ${this.data.level}`
            });
        }
        
        if (this.data.dailyStreak >= 7) {
            insights.push({
                icon: '🔥',
                text: `Amazing ${this.data.dailyStreak}-day streak! Keep it up!`
            });
        } else if (this.data.dailyStreak === 0) {
            insights.push({
                icon: '💪',
                text: 'Start a new streak by completing a quest today!'
            });
        }
        
        return insights;
    }
    
    drawDifficultyChart(data) {
        const canvas = document.getElementById('difficulty-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const entries = Object.entries(data).filter(([, value]) => value > 0);
        if (entries.length === 0) {
            ctx.fillStyle = 'var(--text)';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No completed quests yet', canvas.width/2, canvas.height/2);
            return;
        }
        
        const total = entries.reduce((sum, [, value]) => sum + value, 0);
        const colors = ['#4a7bc8', '#34d399', '#ff9500', '#9C27B0', '#E91E63', '#F44336'];
        
        let currentAngle = 0;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 80;
        
        entries.forEach(([difficulty, count], index) => {
            const sliceAngle = (count / total) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index % colors.length];
            ctx.fill();
            
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
            const labelY = centerY + Math.sin(labelAngle) * (radius + 20);
            
            ctx.fillStyle = 'var(--text)';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${difficulty}\n${count}`, labelX, labelY);
            
            currentAngle += sliceAngle;
        });
    }
    
    drawWeeklyChart(data) {
        const canvas = document.getElementById('weekly-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const days = Object.keys(data);
        const values = Object.values(data);
        const maxValue = Math.max(...values, 1);
        
        const barWidth = canvas.width / days.length - 10;
        const maxBarHeight = canvas.height - 40;
        
        days.forEach((day, index) => {
            const barHeight = (values[index] / maxValue) * maxBarHeight;
            const x = index * (barWidth + 10) + 5;
            const y = canvas.height - barHeight - 20;
            
            ctx.fillStyle = 'var(--accent)';
            ctx.fillRect(x, y, barWidth, barHeight);
            
            ctx.fillStyle = 'var(--text)';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(day, x + barWidth/2, canvas.height - 5);
            
            if (values[index] > 0) {
                ctx.fillText(values[index], x + barWidth/2, y - 5);
            }
        });
    }
    
    drawStatGrowthChart(data) {
        const canvas = document.getElementById('stat-growth-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (data.length === 0) return;
        
        const maxValue = Math.max(...data.map(d => d.value), 1);
        const barWidth = canvas.width / data.length - 10;
        const maxBarHeight = canvas.height - 40;
        
        data.forEach((stat, index) => {
            const barHeight = (stat.value / maxValue) * maxBarHeight;
            const x = index * (barWidth + 10) + 5;
            const y = canvas.height - barHeight - 20;
            
            const tierColor = this.getTierColor(stat.tier);
            const hexColor = `rgb(${Math.round(tierColor[0]*255)}, ${Math.round(tierColor[1]*255)}, ${Math.round(tierColor[2]*255)})`;
            
            ctx.fillStyle = hexColor;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            ctx.fillStyle = 'var(--text)';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(stat.name, x + barWidth/2, canvas.height - 5);
            ctx.fillText(stat.value, x + barWidth/2, y - 5);
        });
    }

    getTodayTasks() {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const currentDayName = days[this.currentDay];
        return this.data.tasks.filter(task => task.day === currentDayName);
    }
    
    getChallenges() {
        const challenges = [];
        if (this.data.weeklyChallenge) {
            challenges.push(this.data.weeklyChallenge);
        }
        if (this.data.monthlyChallenge) {
            challenges.push(this.data.monthlyChallenge);
        }
        // Add custom challenges (show all, not just incomplete)
        if (this.data.customChallenges) {
            challenges.push(...this.data.customChallenges);
        }
        return challenges;
    }

    openQuestModal() {
        const modal = document.getElementById('quest-modal');
        const statsContainer = document.getElementById('stat-checkboxes');
        
        // Reset modal for creation
        document.getElementById('modal-title').textContent = 'Create New Quest';
        document.getElementById('save-quest').textContent = 'Create Quest';
        document.getElementById('delete-quest').style.display = 'none';
        
        // Set current day as default
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        document.getElementById('quest-day').value = days[this.currentDay];
        
        // Set default difficulty
        document.getElementById('quest-difficulty').value = 'Normal';
        
        // Create stat checkboxes
        statsContainer.innerHTML = Object.keys(this.data.stats).map(stat => `
            <div class="stat-row">
                <input type="checkbox" id="stat-${stat}" value="${stat}">
                <label for="stat-${stat}">${stat}</label>
                <input type="number" id="val-${stat}" value="1" min="1" max="10">
            </div>
        `).join('');

        modal.style.display = 'block';
    }

    openEditQuestModal(taskIndex) {
        const todayTasks = this.getTodayTasks();
        const task = todayTasks[taskIndex];
        
        // Skip challenges - they can't be edited
        if (task.difficulty === 'Weekly' || task.difficulty === 'Monthly') {
            alert('Challenges cannot be edited');
            return;
        }
        
        const globalIndex = this.data.tasks.indexOf(task);
        
        const modal = document.getElementById('quest-modal');
        const statsContainer = document.getElementById('stat-checkboxes');
        
        // Set modal for editing
        document.getElementById('modal-title').textContent = 'Edit Quest';
        document.getElementById('save-quest').textContent = 'Save Changes';
        document.getElementById('delete-quest').style.display = 'inline-block';
        
        // Fill form with existing data
        document.getElementById('quest-name').value = task.name || '';
        document.getElementById('quest-desc').value = task.description || '';
        document.getElementById('quest-xp').value = task.xpReward || 10;
        document.getElementById('quest-day').value = task.day || 'Monday';
        document.getElementById('quest-difficulty').value = task.difficulty || 'Normal';
        
        // Create stat checkboxes
        statsContainer.innerHTML = Object.keys(this.data.stats).map(stat => {
            const isChecked = task.statBoosts && task.statBoosts[stat] ? 'checked' : '';
            const value = task.statBoosts && task.statBoosts[stat] ? task.statBoosts[stat] : 1;
            return `
                <div class="stat-row">
                    <input type="checkbox" id="stat-${stat}" value="${stat}" ${isChecked}>
                    <label for="stat-${stat}">${stat}</label>
                    <input type="number" id="val-${stat}" value="${value}" min="1" max="10">
                </div>
            `;
        }).join('');

        // Store edit mode
        modal.dataset.editIndex = globalIndex;
        modal.style.display = 'block';
    }

    closeQuestModal() {
        const modal = document.getElementById('quest-modal');
        modal.style.display = 'none';
        delete modal.dataset.editIndex;
        delete modal.dataset.challengeMode;
        delete modal.dataset.editChallengeIndex;
        this.clearQuestForm();
    }

    clearQuestForm() {
        document.getElementById('quest-name').value = '';
        document.getElementById('quest-desc').value = '';
        document.getElementById('quest-xp').value = '10';
        document.getElementById('quest-day').value = 'Monday';
        document.getElementById('quest-difficulty').value = 'Normal';
        document.querySelectorAll('#stat-checkboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('#stat-checkboxes input[type="number"]').forEach(input => input.value = '1');
    }

    saveQuest() {
        const name = document.getElementById('quest-name').value.trim();
        if (!name) {
            alert('Please enter a quest name');
            return;
        }

        const description = document.getElementById('quest-desc').value.trim();
        const xpReward = parseInt(document.getElementById('quest-xp').value) || 10;
        const selectedDay = document.getElementById('quest-day').value;
        const difficulty = document.getElementById('quest-difficulty').value;
        
        const statBoosts = {};
        document.querySelectorAll('#stat-checkboxes input[type="checkbox"]:checked').forEach(cb => {
            const stat = cb.value;
            const value = parseInt(document.getElementById(`val-${stat}`).value) || 1;
            statBoosts[stat] = value;
        });

        const modal = document.getElementById('quest-modal');
        const editIndex = modal.dataset.editIndex;
        const challengeMode = modal.dataset.challengeMode;
        const editChallengeIndex = modal.dataset.editChallengeIndex;
        
        if (challengeMode) {
            // Handle challenge creation/editing
            const challengeData = {
                name,
                desc: description,
                xp: xpReward,
                stats: statBoosts,
                difficulty,
                day: 'Challenge',
                completed: false,
                createdDate: new Date().toISOString()
            };
            
            if (editChallengeIndex !== undefined) {
                // Edit existing challenge
                const challenges = this.getChallenges();
                const challenge = challenges[editChallengeIndex];
                
                if (challenge === this.data.weeklyChallenge) {
                    this.data.weeklyChallenge = { ...this.data.weeklyChallenge, ...challengeData };
                } else if (challenge === this.data.monthlyChallenge) {
                    this.data.monthlyChallenge = { ...this.data.monthlyChallenge, ...challengeData };
                } else {
                    // Edit custom challenge
                    const customIndex = this.data.customChallenges.indexOf(challenge);
                    if (customIndex !== -1) {
                        this.data.customChallenges[customIndex] = { ...challenge, ...challengeData };
                    }
                }
            } else {
                // Create new custom challenge
                if (!this.data.customChallenges) {
                    this.data.customChallenges = [];
                }
                this.data.customChallenges.push(challengeData);
            }
        } else if (editIndex !== undefined) {
            // Edit existing task
            const task = this.data.tasks[parseInt(editIndex)];
            task.name = name;
            task.description = description;
            task.xpReward = xpReward;
            task.day = selectedDay;
            task.difficulty = difficulty;
            task.statBoosts = statBoosts;
        } else {
            // Create new task
            const task = {
                name,
                description,
                xpReward,
                statBoosts,
                day: selectedDay,
                difficulty,
                completed: false,
                completedDate: null,
                createdDate: new Date().toISOString()
            };
            this.data.tasks.push(task);
        }

        this.saveData();
        this.closeQuestModal();
        this.updateUI();
    }

    completeTask(index) {
        const tasks = this.getTodayTasks();
        const task = tasks[index];
        
        // Check SS+ requirement for mega quests only
        if (task.difficulty === 'Mega') {
            const hasSSPlus = Object.values(this.data.stats).some(stat => this.getStatTier(stat).includes('SS'));
            if (!hasSSPlus) {
                alert('You need at least one SS+ stat to attempt Mega quests!');
                return;
            }
        }
        
        const taskIndex = this.data.tasks.indexOf(task);
        
        if (taskIndex !== -1 && !task.completed) {
            task.completed = true;
            task.completedDate = new Date().toISOString();
            
            // Apply difficulty multipliers
            const multipliers = {
                'Easy': { xp: 0.7, coins: 0.8, sp: 0.5 },
                'Normal': { xp: 1.0, coins: 1.0, sp: 1.0 },
                'Hard': { xp: 1.5, coins: 1.5, sp: 1.5 },
                'Weekly': { xp: 3.0, coins: 3.0, sp: 2.0 },
                'Monthly': { xp: 5.0, coins: 5.0, sp: 3.0 },
                'Mega': { xp: 10.0, coins: 10.0, sp: 5.0 }
            };
            const mult = multipliers[task.difficulty] || multipliers['Normal'];
            
            // Gain XP and coins with multipliers
            this.data.xp += Math.floor(task.xpReward * mult.xp);
            this.data.coins += Math.floor(5 * mult.coins);
            
            // Gain SP with multipliers
            if (task.xpReward >= 20) {
                this.data.skillPoints += Math.floor(Math.floor(task.xpReward / 20) * mult.sp);
            }
            
            // Apply stat boosts with difficulty multipliers
            Object.entries(task.statBoosts || {}).forEach(([stat, value]) => {
                if (this.data.stats[stat] !== undefined) {
                    const boostedValue = Math.floor(value * mult.xp);
                    this.data.stats[stat] = Math.min(333, this.data.stats[stat] + boostedValue);
                }
            });
            
            // Check for mega quest completion
            if (task.difficulty === 'Mega') {
                this.data.megaQuestsCompleted.push(task.name);
            }
            
            // Handle challenge completion
            if (task === this.data.weeklyChallenge) {
                this.data.weeklyChallenge.completed = true;
            } else if (task === this.data.monthlyChallenge) {
                this.data.monthlyChallenge.completed = true;
            } else if (this.data.customChallenges && this.data.customChallenges.includes(task)) {
                // Custom challenge completion is handled by reference
                task.completed = true;
            }
            
            // Update level and check milestones
            const oldLevel = this.data.level;
            this.data.level = Math.max(1, Math.floor(Object.values(this.data.stats).reduce((a, b) => a + b, 0) / 10));
            
            // Update daily streak
            this.updateDailyStreak();
            
            // Check streak rewards
            this.checkStreakRewards();
            
            // Check milestone rewards
            if (this.data.level > oldLevel) {
                this.checkMilestoneRewards(this.data.level);
            }
            
            // Update only the specific task card
            this.updateTaskCard(index, task);
            this.updateHeaderOnly();
            
            this.saveData();
            
            // Check achievements after data is saved
            setTimeout(() => this.checkAchievements(), 100);
        }
    }

    redoTask(index) {
        const tasks = this.getTodayTasks();
        const task = tasks[index];
        const taskIndex = this.data.tasks.indexOf(task);
        
        if (taskIndex !== -1 && task.completed) {
            task.completed = false;
            task.completedDate = null;
            
            this.updateTaskCard(index, task);
            this.updateHeaderOnly();
            this.saveData();
        }
    }

    getStatTier(value) {
        const tiers = [
            [0, 'D-'], [10, 'D'], [21, 'D+'], [33, 'C-'], [46, 'C'], [60, 'C+'],
            [75, 'B-'], [91, 'B'], [108, 'B+'], [126, 'A-'], [145, 'A'], [165, 'A+'],
            [186, 'S-'], [208, 'S'], [231, 'S+'], [255, 'SS-'], [280, 'SS'], [306, 'SS+'], [333, 'SSS']
        ];
        
        // SSS tier requires mega quest completion
        if (value >= 333) {
            return this.data.megaQuestsCompleted.length > 0 ? 'SSS' : 'SS+';
        }
        
        for (let i = tiers.length - 2; i >= 0; i--) {
            if (value >= tiers[i][0]) return tiers[i][1];
        }
        return 'D-';
    }

    getStatProgress(value) {
        const tiers = [
            [0, 10], [10, 11], [21, 12], [33, 13], [46, 14], [60, 15],
            [75, 16], [91, 17], [108, 18], [126, 19], [145, 20], [165, 21],
            [186, 22], [208, 23], [231, 24], [255, 25], [280, 26], [306, 27], [333, 0]
        ];
        
        for (let i = 0; i < tiers.length; i++) {
            const [min, range] = tiers[i];
            if (i === tiers.length - 1 || value < tiers[i + 1][0]) {
                if (range === 0) return 100;
                return Math.min(100, Math.max(0, ((value - min) / range) * 100));
            }
        }
        return 0;
    }

    getTierColor(tier) {
        const colors = {
            'D-': [0.4, 0.4, 0.4], 'D': [0.47, 0.47, 0.47], 'D+': [0.53, 0.53, 0.53],
            'C-': [0.27, 0.67, 0.27], 'C': [0.33, 0.73, 0.33], 'C+': [0.4, 0.8, 0.4],
            'B-': [0.27, 0.27, 0.67], 'B': [0.33, 0.33, 0.73], 'B+': [0.4, 0.4, 0.8],
            'A-': [0.8, 0.8, 0.27], 'A': [0.87, 0.87, 0.33], 'A+': [0.93, 0.93, 0.4],
            'S-': [0.8, 0.53, 0.27], 'S': [0.87, 0.6, 0.33], 'S+': [0.93, 0.67, 0.4],
            'SS-': [0.8, 0.27, 0.27], 'SS': [0.87, 0.33, 0.33], 'SS+': [0.93, 0.4, 0.4],
            'SSS': [0.67, 0.13, 0.13]
        };
        return colors[tier] || [0.4, 0.4, 0.4];
    }

    upgradeSkill(skillName) {
        const skill = this.data.skills[skillName];
        if (!skill || this.data.skillPoints < skill.cost || skill.level >= skill.max) {
            return;
        }

        this.data.skillPoints -= skill.cost;
        skill.level += 1;
        skill.cost = Math.floor(skill.cost * 1.5);

        // Update only the specific skill card and header
        this.updateSkillCard(skillName, skill);
        this.updateHeaderOnly();
        
        this.saveData();
        setTimeout(() => this.checkAchievements(), 100);
    }

    getAchievements() {
        return [
            // Quest milestones
            ['first_steps', '🏆', 'First Steps', 'Complete your first quest', this.hasAchievement('first_steps')],
            ['quest_master', '🎯', 'Quest Master', 'Complete 10 quests', this.hasAchievement('quest_master')],
            ['quest_veteran', '🎖️', 'Quest Veteran', 'Complete 25 quests', this.hasAchievement('quest_veteran')],
            ['quest_legend', '👑', 'Quest Legend', 'Complete 50 quests', this.hasAchievement('quest_legend')],
            ['quest_god', '⚡', 'Quest God', 'Complete 100 quests', this.hasAchievement('quest_god')],
            ['quest_immortal', '🌟', 'Quest Immortal', 'Complete 200 quests', this.hasAchievement('quest_immortal')],
            
            // XP milestones
            ['xp_novice', '📈', 'XP Novice', 'Earn 100 XP', this.hasAchievement('xp_novice')],
            ['xp_adept', '📊', 'XP Adept', 'Earn 500 XP', this.hasAchievement('xp_adept')],
            ['xp_expert', '📋', 'XP Expert', 'Earn 1000 XP', this.hasAchievement('xp_expert')],
            ['xp_master', '📜', 'XP Master', 'Earn 2500 XP', this.hasAchievement('xp_master')],
            ['xp_grandmaster', '🎓', 'XP Grandmaster', 'Earn 5000 XP', this.hasAchievement('xp_grandmaster')],
            ['xp_legend', '🏅', 'XP Legend', 'Earn 10000 XP', this.hasAchievement('xp_legend')],
            
            // Stat milestones
            ['stat_builder', '💪', 'Stat Builder', 'Reach 100 total stat points', this.hasAchievement('stat_builder')],
            ['stat_warrior', '⚔️', 'Stat Warrior', 'Reach 250 total stat points', this.hasAchievement('stat_warrior')],
            ['stat_champion', '🛡️', 'Stat Champion', 'Reach 500 total stat points', this.hasAchievement('stat_champion')],
            ['stat_legend', '👑', 'Stat Legend', 'Reach 1000 total stat points', this.hasAchievement('stat_legend')],
            ['stat_god', '🌟', 'Stat God', 'Reach 2000 total stat points', this.hasAchievement('stat_god')],
            
            // Tier achievements
            ['tier_climber', '🔥', 'Tier Climber', 'Get any stat to A tier', this.hasAchievement('tier_climber')],
            ['tier_master', '⭐', 'Tier Master', 'Get any stat to S tier', this.hasAchievement('tier_master')],
            ['tier_legend', '💎', 'Tier Legend', 'Get any stat to SS tier', this.hasAchievement('tier_legend')],
            ['tier_god', '👑', 'Tier God', 'Get any stat to SSS tier', this.hasAchievement('tier_god')],
            
            // Skill achievements
            ['skill_novice', '🎯', 'Skill Novice', 'Upgrade any skill to level 2', this.hasAchievement('skill_novice')],
            ['skill_adept', '🎪', 'Skill Adept', 'Upgrade any skill to level 3', this.hasAchievement('skill_adept')],
            ['skill_master', '🎖️', 'Skill Master', 'Max out any skill', this.hasAchievement('skill_master')],
            ['skill_collector', '🏆', 'Skill Collector', 'Max out all skills', this.hasAchievement('skill_collector')],
            
            // Strength achievements
            ['strength_novice', '💪', 'Strength Novice', 'Get STRENGTH to 50', this.hasAchievement('strength_novice')],
            ['strength_warrior', '⚔️', 'Strength Warrior', 'Get STRENGTH to 100', this.hasAchievement('strength_warrior')],
            ['strength_titan', '🏔️', 'Strength Titan', 'Get STRENGTH to 200', this.hasAchievement('strength_titan')],
            
            // Agility achievements
            ['agility_runner', '🏃', 'Agility Runner', 'Get AGILITY to 50', this.hasAchievement('agility_runner')],
            ['agility_ninja', '🥷', 'Agility Ninja', 'Get AGILITY to 100', this.hasAchievement('agility_ninja')],
            ['agility_flash', '⚡', 'Agility Flash', 'Get AGILITY to 200', this.hasAchievement('agility_flash')],
            
            // Vitality achievements
            ['vitality_hardy', '❤️', 'Vitality Hardy', 'Get VITALITY to 50', this.hasAchievement('vitality_hardy')],
            ['vitality_tank', '🛡️', 'Vitality Tank', 'Get VITALITY to 100', this.hasAchievement('vitality_tank')],
            ['vitality_immortal', '💎', 'Vitality Immortal', 'Get VITALITY to 200', this.hasAchievement('vitality_immortal')],
            
            // Creativity achievements
            ['creativity_artist', '🎨', 'Creativity Artist', 'Get CREATIVITY to 50', this.hasAchievement('creativity_artist')],
            ['creativity_genius', '🧠', 'Creativity Genius', 'Get CREATIVITY to 100', this.hasAchievement('creativity_genius')],
            ['creativity_visionary', '🌟', 'Creativity Visionary', 'Get CREATIVITY to 200', this.hasAchievement('creativity_visionary')],
            
            // Logic achievements
            ['logic_thinker', '🤔', 'Logic Thinker', 'Get LOGIC to 50', this.hasAchievement('logic_thinker')],
            ['logic_scholar', '📚', 'Logic Scholar', 'Get LOGIC to 100', this.hasAchievement('logic_scholar')],
            ['logic_mastermind', '🧩', 'Logic Mastermind', 'Get LOGIC to 200', this.hasAchievement('logic_mastermind')],
            
            // Clarity achievements
            ['clarity_focused', '🎯', 'Clarity Focused', 'Get CLARITY to 50', this.hasAchievement('clarity_focused')],
            ['clarity_zen', '🧘', 'Clarity Zen', 'Get CLARITY to 100', this.hasAchievement('clarity_zen')],
            ['clarity_enlightened', '✨', 'Clarity Enlightened', 'Get CLARITY to 200', this.hasAchievement('clarity_enlightened')],
            
            // Wisdom achievements
            ['wisdom_sage', '📜', 'Wisdom Sage', 'Get WISDOM to 50', this.hasAchievement('wisdom_sage')],
            ['wisdom_oracle', '🔮', 'Wisdom Oracle', 'Get WISDOM to 100', this.hasAchievement('wisdom_oracle')],
            ['wisdom_ancient', '🏛️', 'Wisdom Ancient', 'Get WISDOM to 200', this.hasAchievement('wisdom_ancient')],
            
            // Charisma achievements
            ['charisma_charming', '😊', 'Charisma Charming', 'Get CHARISMA to 50', this.hasAchievement('charisma_charming')],
            ['charisma_leader', '👑', 'Charisma Leader', 'Get CHARISMA to 100', this.hasAchievement('charisma_leader')],
            ['charisma_legend', '🌟', 'Charisma Legend', 'Get CHARISMA to 200', this.hasAchievement('charisma_legend')],
            
            // Coin achievements
            ['coin_saver', '💰', 'Coin Saver', 'Collect 100 coins', this.hasAchievement('coin_saver')],
            ['coin_hoarder', '💎', 'Coin Hoarder', 'Collect 500 coins', this.hasAchievement('coin_hoarder')],
            ['coin_tycoon', '🏦', 'Coin Tycoon', 'Collect 1000 coins', this.hasAchievement('coin_tycoon')],
            
            // SP achievements
            ['sp_collector', '⭐', 'SP Collector', 'Collect 10 skill points', this.hasAchievement('sp_collector')],
            ['sp_master', '🎖️', 'SP Master', 'Collect 25 skill points', this.hasAchievement('sp_master')],
            ['sp_legend', '👑', 'SP Legend', 'Collect 50 skill points', this.hasAchievement('sp_legend')],
            
            // Special achievements
            ['balanced_warrior', '⚖️', 'Balanced Warrior', 'Get all stats to 25+', this.hasAchievement('balanced_warrior')],
            ['perfectionist', '💯', 'Perfectionist', 'Get all stats to 100+', this.hasAchievement('perfectionist')],
            ['completionist', '🏆', 'Completionist', 'Unlock 30 achievements', this.hasAchievement('completionist')],
            ['achievement_hunter', '🎯', 'Achievement Hunter', 'Unlock 50 achievements', this.hasAchievement('achievement_hunter')]
        ];
    }

    checkAchievements() {
        const completedTasks = this.data.tasks.filter(t => t.completed).length;
        const totalStats = Object.values(this.data.stats).reduce((a, b) => a + b, 0);
        
        // Quest achievements
        if (completedTasks >= 1 && !this.hasAchievement('first_steps')) {
            this.unlockAchievement('first_steps');
        }
        if (completedTasks >= 10 && !this.hasAchievement('quest_master')) {
            this.unlockAchievement('quest_master');
        }
        if (completedTasks >= 25 && !this.hasAchievement('quest_veteran')) {
            this.unlockAchievement('quest_veteran');
        }
        if (completedTasks >= 50 && !this.hasAchievement('quest_legend')) {
            this.unlockAchievement('quest_legend');
        }
        if (completedTasks >= 100 && !this.hasAchievement('quest_god')) {
            this.unlockAchievement('quest_god');
        }
        if (completedTasks >= 200 && !this.hasAchievement('quest_immortal')) {
            this.unlockAchievement('quest_immortal');
        }
        
        // XP achievements
        if (this.data.xp >= 100 && !this.hasAchievement('xp_novice')) {
            this.unlockAchievement('xp_novice');
        }
        if (this.data.xp >= 500 && !this.hasAchievement('xp_adept')) {
            this.unlockAchievement('xp_adept');
        }
        if (this.data.xp >= 1000 && !this.hasAchievement('xp_expert')) {
            this.unlockAchievement('xp_expert');
        }
        if (this.data.xp >= 2500 && !this.hasAchievement('xp_master')) {
            this.unlockAchievement('xp_master');
        }
        if (this.data.xp >= 5000 && !this.hasAchievement('xp_grandmaster')) {
            this.unlockAchievement('xp_grandmaster');
        }
        if (this.data.xp >= 10000 && !this.hasAchievement('xp_legend')) {
            this.unlockAchievement('xp_legend');
        }
        
        // Stat total achievements
        if (totalStats >= 100 && !this.hasAchievement('stat_builder')) {
            this.unlockAchievement('stat_builder');
        }
        if (totalStats >= 250 && !this.hasAchievement('stat_warrior')) {
            this.unlockAchievement('stat_warrior');
        }
        if (totalStats >= 500 && !this.hasAchievement('stat_champion')) {
            this.unlockAchievement('stat_champion');
        }
        if (totalStats >= 1000 && !this.hasAchievement('stat_legend')) {
            this.unlockAchievement('stat_legend');
        }
        if (totalStats >= 2000 && !this.hasAchievement('stat_god')) {
            this.unlockAchievement('stat_god');
        }
        
        // Tier achievements
        Object.values(this.data.stats).forEach(value => {
            const tier = this.getStatTier(value);
            if (tier.startsWith('A') && !this.hasAchievement('tier_climber')) {
                this.unlockAchievement('tier_climber');
            }
            if (tier.startsWith('S') && !tier.startsWith('SS') && !this.hasAchievement('tier_master')) {
                this.unlockAchievement('tier_master');
            }
            if (tier.startsWith('SS') && !tier.startsWith('SSS') && !this.hasAchievement('tier_legend')) {
                this.unlockAchievement('tier_legend');
            }
            if (tier === 'SSS' && !this.hasAchievement('tier_god')) {
                this.unlockAchievement('tier_god');
            }
        });
        
        // Individual stat achievements
        Object.entries(this.data.stats).forEach(([stat, value]) => {
            const statKey = stat.toLowerCase();
            if (value >= 50) {
                if (stat === 'STRENGTH' && !this.hasAchievement('strength_novice')) this.unlockAchievement('strength_novice');
                if (stat === 'AGILITY' && !this.hasAchievement('agility_runner')) this.unlockAchievement('agility_runner');
                if (stat === 'VITALITY' && !this.hasAchievement('vitality_hardy')) this.unlockAchievement('vitality_hardy');
                if (stat === 'CREATIVITY' && !this.hasAchievement('creativity_artist')) this.unlockAchievement('creativity_artist');
                if (stat === 'LOGIC' && !this.hasAchievement('logic_thinker')) this.unlockAchievement('logic_thinker');
                if (stat === 'CLARITY' && !this.hasAchievement('clarity_focused')) this.unlockAchievement('clarity_focused');
                if (stat === 'WISDOM' && !this.hasAchievement('wisdom_sage')) this.unlockAchievement('wisdom_sage');
                if (stat === 'CHARISMA' && !this.hasAchievement('charisma_charming')) this.unlockAchievement('charisma_charming');
            }
            if (value >= 100) {
                if (stat === 'STRENGTH' && !this.hasAchievement('strength_warrior')) this.unlockAchievement('strength_warrior');
                if (stat === 'AGILITY' && !this.hasAchievement('agility_ninja')) this.unlockAchievement('agility_ninja');
                if (stat === 'VITALITY' && !this.hasAchievement('vitality_tank')) this.unlockAchievement('vitality_tank');
                if (stat === 'CREATIVITY' && !this.hasAchievement('creativity_genius')) this.unlockAchievement('creativity_genius');
                if (stat === 'LOGIC' && !this.hasAchievement('logic_scholar')) this.unlockAchievement('logic_scholar');
                if (stat === 'CLARITY' && !this.hasAchievement('clarity_zen')) this.unlockAchievement('clarity_zen');
                if (stat === 'WISDOM' && !this.hasAchievement('wisdom_oracle')) this.unlockAchievement('wisdom_oracle');
                if (stat === 'CHARISMA' && !this.hasAchievement('charisma_leader')) this.unlockAchievement('charisma_leader');
            }
            if (value >= 200) {
                if (stat === 'STRENGTH' && !this.hasAchievement('strength_titan')) this.unlockAchievement('strength_titan');
                if (stat === 'AGILITY' && !this.hasAchievement('agility_flash')) this.unlockAchievement('agility_flash');
                if (stat === 'VITALITY' && !this.hasAchievement('vitality_immortal')) this.unlockAchievement('vitality_immortal');
                if (stat === 'CREATIVITY' && !this.hasAchievement('creativity_visionary')) this.unlockAchievement('creativity_visionary');
                if (stat === 'LOGIC' && !this.hasAchievement('logic_mastermind')) this.unlockAchievement('logic_mastermind');
                if (stat === 'CLARITY' && !this.hasAchievement('clarity_enlightened')) this.unlockAchievement('clarity_enlightened');
                if (stat === 'WISDOM' && !this.hasAchievement('wisdom_ancient')) this.unlockAchievement('wisdom_ancient');
                if (stat === 'CHARISMA' && !this.hasAchievement('charisma_legend')) this.unlockAchievement('charisma_legend');
            }
        });
        
        // Coin achievements
        if (this.data.coins >= 100 && !this.hasAchievement('coin_saver')) {
            this.unlockAchievement('coin_saver');
        }
        if (this.data.coins >= 500 && !this.hasAchievement('coin_hoarder')) {
            this.unlockAchievement('coin_hoarder');
        }
        if (this.data.coins >= 1000 && !this.hasAchievement('coin_tycoon')) {
            this.unlockAchievement('coin_tycoon');
        }
        
        // SP achievements
        if (this.data.skillPoints >= 10 && !this.hasAchievement('sp_collector')) {
            this.unlockAchievement('sp_collector');
        }
        if (this.data.skillPoints >= 25 && !this.hasAchievement('sp_master')) {
            this.unlockAchievement('sp_master');
        }
        if (this.data.skillPoints >= 50 && !this.hasAchievement('sp_legend')) {
            this.unlockAchievement('sp_legend');
        }
        
        // Skill achievements
        const hasLevel2Skill = Object.values(this.data.skills).some(skill => skill.level >= 2);
        const hasLevel3Skill = Object.values(this.data.skills).some(skill => skill.level >= 3);
        const hasMaxSkill = Object.values(this.data.skills).some(skill => skill.level >= skill.max);
        const allMaxSkills = Object.values(this.data.skills).every(skill => skill.level >= skill.max);
        
        if (hasLevel2Skill && !this.hasAchievement('skill_novice')) {
            this.unlockAchievement('skill_novice');
        }
        if (hasLevel3Skill && !this.hasAchievement('skill_adept')) {
            this.unlockAchievement('skill_adept');
        }
        if (hasMaxSkill && !this.hasAchievement('skill_master')) {
            this.unlockAchievement('skill_master');
        }
        if (allMaxSkills && !this.hasAchievement('skill_collector')) {
            this.unlockAchievement('skill_collector');
        }
        
        // Special achievements
        if (Object.values(this.data.stats).every(v => v >= 25) && !this.hasAchievement('balanced_warrior')) {
            this.unlockAchievement('balanced_warrior');
        }
        if (Object.values(this.data.stats).every(v => v >= 100) && !this.hasAchievement('perfectionist')) {
            this.unlockAchievement('perfectionist');
        }
        if (this.data.unlockedAchievements.length >= 30 && !this.hasAchievement('completionist')) {
            this.unlockAchievement('completionist');
        }
        if (this.data.unlockedAchievements.length >= 50 && !this.hasAchievement('achievement_hunter')) {
            this.unlockAchievement('achievement_hunter');
        }
    }

    unlockAchievement(id) {
        if (!Array.isArray(this.data.unlockedAchievements)) {
            this.data.unlockedAchievements = [];
        }
        
        if (!this.data.unlockedAchievements.includes(id)) {
            this.data.unlockedAchievements.push(id);
            this.showAchievementNotification(id);
            this.saveData();
        }
    }

    editCharacterName() {
        const newName = prompt('Enter new character name:', this.data.characterName);
        if (newName && newName.trim()) {
            this.data.characterName = newName.trim();
            this.saveData();
            this.updateUI();
        }
    }

    editStat(statName) {
        this.openStatModal(statName);
    }

    openStatModal(statName) {
        const modal = document.getElementById('stat-modal');
        const title = document.getElementById('stat-modal-title');
        const saveBtn = document.getElementById('save-stat');
        const deleteBtn = document.getElementById('delete-stat');
        
        if (statName) {
            // Edit mode
            title.textContent = 'Edit Stat';
            saveBtn.textContent = 'Save Changes';
            deleteBtn.style.display = 'inline-block';
            document.getElementById('stat-name').value = statName;
            modal.dataset.originalName = statName;
        } else {
            // Add mode
            title.textContent = 'Add New Stat';
            saveBtn.textContent = 'Create Stat';
            deleteBtn.style.display = 'none';
            document.getElementById('stat-name').value = '';
            modal.dataset.originalName = '';
        }
        
        modal.style.display = 'block';
    }

    closeStatModal() {
        const modal = document.getElementById('stat-modal');
        modal.style.display = 'none';
        delete modal.dataset.originalName;
        document.getElementById('stat-name').value = '';
    }

    saveStat() {
        const modal = document.getElementById('stat-modal');
        const originalName = modal.dataset.originalName;
        const newName = document.getElementById('stat-name').value.trim().toUpperCase();
        
        if (!newName) {
            alert('Please enter a stat name');
            return;
        }
        
        if (newName !== originalName && this.data.stats[newName] !== undefined) {
            alert('A stat with this name already exists');
            return;
        }
        
        if (originalName) {
            // Rename existing stat
            if (newName !== originalName) {
                const value = this.data.stats[originalName];
                delete this.data.stats[originalName];
                this.data.stats[newName] = value;
                
                // Update tasks that reference this stat
                this.data.tasks.forEach(task => {
                    if (task.statBoosts && task.statBoosts[originalName]) {
                        const boost = task.statBoosts[originalName];
                        delete task.statBoosts[originalName];
                        task.statBoosts[newName] = boost;
                    }
                });
            }
        } else {
            // Create new stat
            this.data.stats[newName] = 0;
        }
        
        this.saveData();
        this.closeStatModal();
        this.updateUI();
    }

    deleteStat() {
        const modal = document.getElementById('stat-modal');
        const statName = modal.dataset.originalName;
        
        if (Object.keys(this.data.stats).length <= 1) {
            alert('Cannot delete the last stat');
            return;
        }
        
        if (confirm(`Are you sure you want to delete the ${statName} stat? This will also remove it from all quests.`)) {
            delete this.data.stats[statName];
            
            // Remove from tasks
            this.data.tasks.forEach(task => {
                if (task.statBoosts && task.statBoosts[statName]) {
                    delete task.statBoosts[statName];
                }
            });
            
            this.data.level = Math.max(1, Math.floor(Object.values(this.data.stats).reduce((a, b) => a + b, 0) / 10));
            this.saveData();
            this.closeStatModal();
            this.updateUI();
        }
    }

    hasAchievement(id) {
        return Array.isArray(this.data.unlockedAchievements) 
            ? this.data.unlockedAchievements.includes(id)
            : false;
    }

    showAchievementNotification(id) {
        const achievements = this.getAchievements();
        const achievement = achievements.find(([aid]) => aid === id);
        if (!achievement) return;
        
        const [, icon, name, desc] = achievement;
        
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-popup">
                <div class="achievement-icon">${icon}</div>
                <div class="achievement-text">
                    <div class="achievement-title">Achievement Unlocked!</div>
                    <div class="achievement-name">${name}</div>
                    <div class="achievement-desc">${desc}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        notification.classList.add('show');
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }

    deleteQuest() {
        const modal = document.getElementById('quest-modal');
        const editIndex = modal.dataset.editIndex;
        const challengeMode = modal.dataset.challengeMode;
        const editChallengeIndex = modal.dataset.editChallengeIndex;
        
        if (challengeMode && editChallengeIndex !== undefined) {
            // Delete challenge
            this.deleteChallenge(parseInt(editChallengeIndex));
        } else if (editIndex !== undefined && confirm('Are you sure you want to delete this quest?')) {
            // Delete regular quest
            this.data.tasks.splice(parseInt(editIndex), 1);
            this.saveData();
            this.closeQuestModal();
            this.updateUI();
        }
    }

    checkMidnightReset() {
        const now = new Date();
        const lastReset = localStorage.getItem('lastMidnightReset');
        const today = now.toDateString();
        
        if (lastReset !== today) {
            // Reset all completed quests
            this.data.tasks.forEach(task => {
                if (task.completed) {
                    task.completed = false;
                    task.completedDate = null;
                }
            });
            
            localStorage.setItem('lastMidnightReset', today);
            this.saveData();
        }
    }

    renderSettings(container) {
        const completedTasks = this.data.tasks.filter(t => t.completed).length;
        const totalStats = Object.values(this.data.stats).reduce((a, b) => a + b, 0);
        
        container.innerHTML = `
            <div class="settings-section">
                <h3>Game Data</h3>
                <div class="settings-row">
                    <span class="settings-label">Level:</span>
                    <span class="settings-value">${this.data.level}</span>
                </div>
                <div class="settings-row">
                    <span class="settings-label">Experience:</span>
                    <span class="settings-value">${this.data.xp} XP</span>
                </div>
                <div class="settings-row">
                    <span class="settings-label">Total Stats:</span>
                    <span class="settings-value">${totalStats}</span>
                </div>
                <div class="settings-row">
                    <span class="settings-label">Quests Completed:</span>
                    <span class="settings-value">${completedTasks}</span>
                </div>
                <div class="settings-row">
                    <span class="settings-label">Achievements:</span>
                    <span class="settings-value">${this.data.unlockedAchievements.length}/${this.getAchievements().length}</span>
                </div>
            </div>
            
            <div class="settings-section">
                <h3>Character</h3>
                <div class="settings-actions">
                    <button class="settings-btn" onclick="app.editCharacterName()">Edit Character Name</button>
                </div>
            </div>
            
            <div class="settings-section">
                <h3>Appearance</h3>
                <div class="theme-selector">
                    ${this.renderThemeSelector()}
                </div>
            </div>
            
            <div class="settings-section">
                <h3>App Installation</h3>
                <div class="settings-actions">
                    <button class="settings-btn" onclick="app.showInstallButton()">📱 Install as App</button>
                </div>
            </div>
            
            <div class="settings-section">
                <h3>Data Management</h3>
                <div class="settings-actions">
                    <button class="settings-btn" onclick="app.exportData()">Export Data</button>
                    <button class="settings-btn danger" onclick="app.resetData()">Reset All Data</button>
                </div>
            </div>
        `;
        
        container.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const themeName = e.target.dataset.theme;
                if (themeName) {
                    this.applyTheme(themeName);
                    this.updateThemeSelector();
                }
            });
        });
    }

    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `level-system-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert('Data exported successfully!');
    }

    resetData() {
        if (confirm('Are you sure you want to reset ALL data? This cannot be undone!\n\nThis will delete:\n- All quests and progress\n- Character stats and level\n- All achievements\n- Skill points and upgrades')) {
            localStorage.removeItem('levelSystemData');
            localStorage.removeItem('lastMidnightReset');
            location.reload();
        }
    }

    updateTaskCard(index, task) {
        const taskCards = document.querySelectorAll('.task-card');
        if (taskCards[index]) {
            const card = taskCards[index];
            const statusIcon = card.querySelector('.task-status');
            const actionBtns = card.querySelectorAll('.task-buttons button');
            const completeBtn = actionBtns[1]; // Second button is complete/redo
            
            if (task.completed) {
                card.classList.add('completed');
                if (statusIcon) statusIcon.textContent = '✓';
                if (completeBtn) {
                    completeBtn.textContent = 'Redo';
                    completeBtn.className = 'btn-redo';
                    // Remove old event listener and add new one
                    completeBtn.replaceWith(completeBtn.cloneNode(true));
                    const newBtn = card.querySelectorAll('.task-buttons button')[1];
                    newBtn.addEventListener('click', () => this.redoTask(index));
                }
            } else {
                card.classList.remove('completed');
                if (statusIcon) statusIcon.textContent = '○';
                if (completeBtn) {
                    completeBtn.textContent = 'Complete';
                    completeBtn.className = 'btn-complete';
                    // Remove old event listener and add new one
                    completeBtn.replaceWith(completeBtn.cloneNode(true));
                    const newBtn = card.querySelectorAll('.task-buttons button')[1];
                    newBtn.addEventListener('click', () => this.completeTask(index));
                }
            }
        }
    }

    updateHeaderOnly() {
        // Update header stats only
        const levelEl = document.getElementById('level');
        const xpEl = document.getElementById('xp');
        const coinsEl = document.getElementById('coins');
        const spEl = document.getElementById('sp');
        const progressEl = document.getElementById('progress');
        
        if (levelEl) levelEl.textContent = `Lv.${this.data.level}`;
        if (xpEl) xpEl.textContent = `${this.data.xp} XP`;
        if (coinsEl) coinsEl.textContent = `${this.data.coins} Coins`;
        if (spEl) spEl.textContent = `${this.data.skillPoints} SP`;
        
        if (progressEl) {
            const todayTasks = this.getTodayTasks();
            const completed = todayTasks.filter(t => t.completed).length;
            progressEl.textContent = `Today: ${completed}/${todayTasks.length} quests completed`;
        }
        
        // Update skills header if on skills screen
        if (this.skillsHeaderEl) {
            this.skillsHeaderEl.textContent = `Available Skill Points: ${this.data.skillPoints}`;
        }
    }

    updateSkillCard(skillName, skill) {
        const skillCards = document.querySelectorAll('.skill-card');
        const skillNames = Object.keys(this.data.skills);
        const skillIndex = skillNames.indexOf(skillName);
        
        if (skillCards[skillIndex]) {
            const card = skillCards[skillIndex];
            const levelEl = card.querySelector('.skill-level');
            const costEl = card.querySelector('.skill-cost');
            const btnEl = card.querySelector('.skill-btn');
            
            if (levelEl) levelEl.textContent = `Lv.${skill.level}/${skill.max}`;
            if (costEl) costEl.textContent = `Cost: ${skill.cost} SP`;
            
            if (btnEl) {
                const canUpgrade = this.data.skillPoints >= skill.cost && skill.level < skill.max;
                const isMaxed = skill.level >= skill.max;
                
                if (isMaxed) {
                    btnEl.textContent = 'MAXED';
                    btnEl.className = 'skill-btn maxed';
                    btnEl.disabled = true;
                } else if (canUpgrade) {
                    btnEl.textContent = 'UPGRADE';
                    btnEl.className = 'skill-btn upgrade';
                    btnEl.disabled = false;
                } else {
                    btnEl.textContent = 'NEED SP';
                    btnEl.className = 'skill-btn disabled';
                    btnEl.disabled = true;
                }
            }
        }
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js');
        }
        
        // Install prompt
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
        });
        
        this.showInstallButton = () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt = null;
            }
        };
    }
    updateDailyStreak() {
        const today = new Date().toDateString();
        const lastDate = this.data.lastCompletionDate;
        
        if (lastDate !== today) {
            if (lastDate === null) {
                // First completion ever
                this.data.dailyStreak = 1;
            } else {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                if (lastDate === yesterday.toDateString()) {
                    // Consecutive day
                    this.data.dailyStreak += 1;
                } else {
                    // Streak broken, reset to 1
                    this.data.dailyStreak = 1;
                    // Clear streak rewards when streak breaks
                    this.data.streakRewardsClaimed = [];
                }
            }
            
            this.data.lastCompletionDate = today;
        }
    }

    checkStreakRewards() {
        const streakMilestones = [3, 7, 14, 30, 50, 100];
        
        streakMilestones.forEach(milestone => {
            if (this.data.dailyStreak >= milestone && !this.data.streakRewardsClaimed.includes(milestone)) {
                this.data.streakRewardsClaimed.push(milestone);
                
                // Streak rewards
                const bonusCoins = milestone * 5;
                const bonusSP = Math.floor(milestone / 7) + 1;
                
                this.data.coins += bonusCoins;
                this.data.skillPoints += bonusSP;
                
                // Show streak notification
                this.showStreakNotification(milestone, bonusCoins, bonusSP);
            }
        });
    }

    showStreakNotification(streak, coins, sp) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-popup" style="background: linear-gradient(135deg, #ff6b6b, #ee5a24);">
                <div class="achievement-icon">🔥</div>
                <div class="achievement-text">
                    <div class="achievement-title">STREAK REWARD!</div>
                    <div class="achievement-name">${streak} Day Streak</div>
                    <div class="achievement-desc">+${coins} Coins, +${sp} Skill Points</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        notification.classList.add('show');
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 4000);
    }

    checkMilestoneRewards(level) {
        const milestones = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
        
        milestones.forEach(milestone => {
            if (level >= milestone && !this.data.milestonesClaimed.includes(milestone)) {
                this.data.milestonesClaimed.push(milestone);
                
                // Milestone rewards
                const bonusCoins = milestone * 10;
                const bonusSP = Math.floor(milestone / 5);
                
                this.data.coins += bonusCoins;
                this.data.skillPoints += bonusSP;
                
                // Show milestone notification
                this.showMilestoneNotification(milestone, bonusCoins, bonusSP);
            }
        });
    }

    showMilestoneNotification(level, coins, sp) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-popup" style="background: linear-gradient(135deg, #ffd700, #ffb347);">
                <div class="achievement-icon">🏆</div>
                <div class="achievement-text">
                    <div class="achievement-title">MILESTONE REACHED!</div>
                    <div class="achievement-name">Level ${level}</div>
                    <div class="achievement-desc">+${coins} Coins, +${sp} Skill Points</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        notification.classList.add('show');
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 4000);
    }


    

    
    completeChallengeTask(task, index) {
        if (!task.completed) {
            task.completed = true;
            task.completedDate = new Date().toISOString();
            
            // Apply challenge rewards
            const multipliers = {
                'Weekly': { xp: 3.0, coins: 3.0, sp: 2.0 },
                'Monthly': { xp: 5.0, coins: 5.0, sp: 3.0 }
            };
            const mult = multipliers[task.difficulty];
            
            this.data.xp += Math.floor(task.xp * mult.xp);
            this.data.coins += Math.floor(5 * mult.coins);
            
            if (task.xp >= 20) {
                this.data.skillPoints += Math.floor(Math.floor(task.xp / 20) * mult.sp);
            }
            
            // Apply stat boosts
            Object.entries(task.stats || {}).forEach(([stat, value]) => {
                if (this.data.stats[stat] !== undefined) {
                    this.data.stats[stat] = Math.min(333, this.data.stats[stat] + value);
                }
            });
            
            // Update level
            const oldLevel = this.data.level;
            this.data.level = Math.max(1, Math.floor(Object.values(this.data.stats).reduce((a, b) => a + b, 0) / 10));
            
            if (this.data.level > oldLevel) {
                this.checkMilestoneRewards(this.data.level);
            }
            
            this.updateUI();
            this.saveData();
            setTimeout(() => this.checkAchievements(), 100);
        }
    }
    
    redoChallengeTask(task, index) {
        if (task.completed) {
            task.completed = false;
            task.completedDate = null;
            this.updateUI();
            this.saveData();
        }
    }
    
    renderChallenges(container) {
        const challenges = this.getChallenges();
        
        container.innerHTML = `
            <div class="challenges-header">
                <h3>Active Challenges</h3>
                <p>Special quests with massive rewards!</p>
                <button id="add-challenge" class="add-btn">+ Create Challenge</button>
            </div>
            <div id="challenges-container">
                ${challenges.length === 0 ? 
                    '<div class="empty-state animate-in"><div class="icon">🏆</div><p>No active challenges<br>Tap + to create your first challenge!</p></div>' :
                    challenges.map((challenge, index) => this.renderChallengeCard(challenge, index)).join('')
                }
            </div>
        `;
        

        
        // Add challenge event listeners
        const addBtn = document.getElementById('add-challenge');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.openChallengeModal();
            });
        }
        
        if (challenges.length > 0) {
            container.querySelectorAll('.btn-complete').forEach((btn, index) => {
                btn.addEventListener('click', () => this.completeChallengeTask(challenges[index], index));
            });
            
            container.querySelectorAll('.btn-redo').forEach((btn, index) => {
                btn.addEventListener('click', () => this.redoChallengeTask(challenges[index], index));
            });
            
            container.querySelectorAll('.btn-edit').forEach((btn, index) => {
                btn.addEventListener('click', () => this.openEditChallengeModal(index));
            });
            
            container.querySelectorAll('.btn-delete').forEach((btn, index) => {
                btn.addEventListener('click', () => this.deleteChallenge(index));
            });
        }
    }
    
    renderChallengeCard(challenge, index) {
        const statusIcon = challenge.completed ? '✓' : '○';
        const statusClass = challenge.completed ? 'completed' : '';
        
        // Check if Mega quest is locked
        const isMegaLocked = challenge.difficulty === 'Mega' && !challenge.completed && 
            !Object.values(this.data.stats).some(stat => this.getStatTier(stat).includes('SS'));
        
        let actionBtn;
        if (challenge.completed) {
            actionBtn = '<button class="btn-redo">Redo</button>';
        } else if (isMegaLocked) {
            actionBtn = '<button class="btn-locked">Locked</button>';
        } else {
            actionBtn = '<button class="btn-complete">Complete</button>';
        }
        
        const diffColor = LevelSystem.DIFFICULTY_COLORS[challenge.difficulty] || '#2196F3';
        
        return `
            <div class="task-card challenge-card ${statusClass} ${isMegaLocked ? 'locked' : ''}">
                <div class="task-header">
                    <span class="task-name">${this.sanitizeHTML(challenge.name)}</span>
                    <span class="task-status">${statusIcon}</span>
                </div>
                <div class="task-desc">${this.sanitizeHTML(challenge.desc)}</div>
                ${isMegaLocked ? '<div class="locked-msg">Requires SS+ stat to unlock</div>' : ''}
                <div class="task-meta">
                    <span style="color: ${diffColor}; font-weight: bold;">${this.sanitizeHTML(challenge.difficulty)}</span>
                    <span>+${challenge.xp} XP</span>
                    ${this.renderStatBoosts(challenge.stats)}
                </div>
                <div class="task-buttons">
                    <button class="btn-edit">Edit</button>
                    <button class="btn-delete">Delete</button>
                    ${actionBtn}
                </div>
            </div>
        `;
    }
    

    
    createWeeklyChallenge() {
        const challenges = [
            { name: 'Fitness Week', desc: 'Complete 5 fitness-related tasks', xp: 100, stats: { STRENGTH: 5, VITALITY: 5 } },
            { name: 'Learning Sprint', desc: 'Study for 7 hours total', xp: 120, stats: { LOGIC: 6, WISDOM: 4 } },
            { name: 'Creative Burst', desc: 'Work on creative projects daily', xp: 110, stats: { CREATIVITY: 7, CHARISMA: 3 } },
            { name: 'Social Challenge', desc: 'Connect with 3 new people', xp: 90, stats: { CHARISMA: 6, CLARITY: 4 } },
            { name: 'Skill Builder', desc: 'Practice a skill for 5 days', xp: 100, stats: { AGILITY: 4, LOGIC: 6 } }
        ];
        
        const challenge = challenges[Math.floor(Math.random() * challenges.length)];
        return {
            ...challenge,
            difficulty: 'Weekly',
            day: 'Challenge',
            completed: false,
            createdDate: new Date().toISOString()
        };
    }
    
    createMonthlyChallenge() {
        const challenges = [
            { name: 'Master Quest', desc: 'Complete 50 quests this month', xp: 300, stats: { STRENGTH: 10, VITALITY: 10 } },
            { name: 'Knowledge Seeker', desc: 'Read 4 books or courses', xp: 350, stats: { LOGIC: 15, WISDOM: 10 } },
            { name: 'Creative Mastery', desc: 'Finish a major creative project', xp: 320, stats: { CREATIVITY: 15, CHARISMA: 8 } },
            { name: 'Leadership Journey', desc: 'Lead 3 group activities', xp: 280, stats: { CHARISMA: 12, CLARITY: 10 } },
            { name: 'Peak Performance', desc: 'Achieve personal best in fitness', xp: 300, stats: { STRENGTH: 12, AGILITY: 12 } }
        ];
        
        const challenge = challenges[Math.floor(Math.random() * challenges.length)];
        return {
            ...challenge,
            difficulty: 'Monthly',
            day: 'Challenge',
            completed: false,
            createdDate: new Date().toISOString()
        };
    }
    
    openChallengeModal() {
        const modal = document.getElementById('quest-modal');
        const statsContainer = document.getElementById('stat-checkboxes');
        
        // Reset modal for challenge creation
        document.getElementById('modal-title').textContent = 'Create New Challenge';
        document.getElementById('save-quest').textContent = 'Create Challenge';
        document.getElementById('delete-quest').style.display = 'none';
        
        // Set challenge defaults
        document.getElementById('quest-name').value = '';
        document.getElementById('quest-desc').value = '';
        document.getElementById('quest-xp').value = '100';
        document.getElementById('quest-day').value = 'Challenge';
        document.getElementById('quest-difficulty').value = 'Weekly';
        
        // Create stat checkboxes
        statsContainer.innerHTML = Object.keys(this.data.stats).map(stat => `
            <div class="stat-row">
                <input type="checkbox" id="stat-${stat}" value="${stat}">
                <label for="stat-${stat}">${stat}</label>
                <input type="number" id="val-${stat}" value="5" min="1" max="20">
            </div>
        `).join('');
        
        modal.dataset.challengeMode = 'true';
        modal.style.display = 'block';
    }
    
    openEditChallengeModal(challengeIndex) {
        const challenges = this.getChallenges();
        const challenge = challenges[challengeIndex];
        
        const modal = document.getElementById('quest-modal');
        const statsContainer = document.getElementById('stat-checkboxes');
        
        // Set modal for editing
        document.getElementById('modal-title').textContent = 'Edit Challenge';
        document.getElementById('save-quest').textContent = 'Save Changes';
        document.getElementById('delete-quest').style.display = 'inline-block';
        
        // Fill form with existing data
        document.getElementById('quest-name').value = challenge.name || '';
        document.getElementById('quest-desc').value = challenge.desc || '';
        document.getElementById('quest-xp').value = challenge.xp || 100;
        document.getElementById('quest-day').value = 'Challenge';
        document.getElementById('quest-difficulty').value = challenge.difficulty || 'Weekly';
        
        // Create stat checkboxes
        statsContainer.innerHTML = Object.keys(this.data.stats).map(stat => {
            const isChecked = challenge.stats && challenge.stats[stat] ? 'checked' : '';
            const value = challenge.stats && challenge.stats[stat] ? challenge.stats[stat] : 5;
            return `
                <div class="stat-row">
                    <input type="checkbox" id="stat-${stat}" value="${stat}" ${isChecked}>
                    <label for="stat-${stat}">${stat}</label>
                    <input type="number" id="val-${stat}" value="${value}" min="1" max="20">
                </div>
            `;
        }).join('');
        
        // Store edit mode
        modal.dataset.challengeMode = 'true';
        modal.dataset.editChallengeIndex = challengeIndex;
        modal.style.display = 'block';
    }
    
    deleteChallenge(challengeIndex) {
        const challenges = this.getChallenges();
        const challenge = challenges[challengeIndex];
        
        if (window.confirm(`Are you sure you want to delete the challenge "${challenge.name}"?`)) {
            if (challenge === this.data.weeklyChallenge) {
                this.data.weeklyChallenge = null;
            } else if (challenge === this.data.monthlyChallenge) {
                this.data.monthlyChallenge = null;
            } else {
                // Delete custom challenge
                const customIndex = this.data.customChallenges.indexOf(challenge);
                if (customIndex !== -1) {
                    this.data.customChallenges.splice(customIndex, 1);
                }
            }
            
            this.saveData();
            this.updateUI();
        }
    }

    // Character System
    updateCharacter() {
        const characterContainer = document.getElementById('character-display');
        if (!characterContainer) return;

        const avgStat = this.getAverageStatValue();
        const auraColor = this.getAuraColor(avgStat);
        
        characterContainer.innerHTML = `
            <div class="character-container">
                <canvas id="character-canvas" width="120" height="160"></canvas>
                <div class="character-info">
                    <div class="avg-stat">Avg: ${avgStat}</div>
                    <button onclick="app.openCosmeticsShop()" class="cosmetics-btn">Shop</button>
                </div>
            </div>
        `;
        
        this.drawCharacter(auraColor);
        
        // Start animation loop for aura effects
        if (!this.animationRunning) {
            this.animationRunning = true;
            this.animateCharacter();
        }
    }

    getAverageStatValue() {
        const stats = Object.values(this.data.stats);
        return Math.round(stats.reduce((a, b) => a + b, 0) / stats.length);
    }

    getAuraColor(avgStat) {
        if (avgStat >= 80) return '#ff6b6b';
        if (avgStat >= 60) return '#4ecdc4';
        if (avgStat >= 40) return '#45b7d1';
        if (avgStat >= 20) return '#96ceb4';
        return '#feca57';
    }

    drawCharacter(auraColor) {
        const canvas = document.getElementById('character-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 120, 160);
        
        // Goku-style flame aura
        const time = Date.now() * 0.01;
        ctx.strokeStyle = auraColor;
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time;
            const radius = 35 + Math.sin(time + i) * 8;
            const x = 60 + Math.cos(angle) * radius;
            const y = 80 + Math.sin(angle) * radius * 0.7;
            const flameHeight = 12 + Math.sin(time * 2 + i) * 4;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 3, y + flameHeight);
            ctx.lineTo(x + 3, y + flameHeight);
            ctx.closePath();
            ctx.stroke();
        }
        
        // Draw stickman
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 4;
        
        // Head
        ctx.beginPath();
        ctx.arc(60, 30, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Body
        ctx.beginPath();
        ctx.moveTo(60, 42);
        ctx.lineTo(60, 75);
        ctx.stroke();
        
        // Arms
        ctx.beginPath();
        ctx.moveTo(60, 42);
        ctx.lineTo(52, 60);
        ctx.lineTo(52, 75);
        ctx.moveTo(60, 42);
        ctx.lineTo(68, 60);
        ctx.lineTo(68, 75);
        ctx.stroke();
        
        // Legs
        ctx.beginPath();
        ctx.moveTo(60, 75);
        ctx.lineTo(52, 100);
        ctx.lineTo(52, 120);
        ctx.moveTo(60, 75);
        ctx.lineTo(68, 100);
        ctx.lineTo(68, 120);
        ctx.stroke();
        
        // Draw cosmetics
        const cosmetics = this.data.character.cosmetics;
        
        if (cosmetics.hat === 'crown') {
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(50, 18, 20, 6);
        } else if (cosmetics.hat === 'cap') {
            ctx.fillStyle = '#ff4757';
            ctx.fillRect(48, 20, 24, 4);
        } else if (cosmetics.hat === 'helmet') {
            ctx.fillStyle = '#708090';
            ctx.fillRect(48, 18, 24, 8);
        } else if (cosmetics.hat === 'bandana') {
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(48, 22, 24, 3);
        }
        
        if (cosmetics.weapon === 'sword') {
            ctx.strokeStyle = '#c0c0c0';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(80, 70);
            ctx.lineTo(85, 60);
            ctx.stroke();
        } else if (cosmetics.weapon === 'axe') {
            ctx.strokeStyle = '#8b4513';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(80, 70);
            ctx.lineTo(85, 60);
            ctx.stroke();
            ctx.fillStyle = '#696969';
            ctx.fillRect(83, 58, 6, 4);
        } else if (cosmetics.weapon === 'bow') {
            ctx.strokeStyle = '#8b4513';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(82, 65, 6, 0, Math.PI);
            ctx.stroke();
        } else if (cosmetics.weapon === 'staff') {
            ctx.strokeStyle = '#8b4513';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(80, 70);
            ctx.lineTo(85, 55);
            ctx.stroke();
            ctx.fillStyle = '#4169e1';
            ctx.fillRect(83, 53, 4, 4);
        }
        
        if (cosmetics.accessory === 'cape') {
            ctx.fillStyle = '#9b59b6';
            ctx.fillRect(45, 50, 8, 25);
        } else if (cosmetics.accessory === 'wings') {
            ctx.fillStyle = '#f0f8ff';
            ctx.fillRect(40, 55, 8, 15);
            ctx.fillRect(72, 55, 8, 15);
        } else if (cosmetics.accessory === 'shield') {
            ctx.fillStyle = '#b8860b';
            ctx.fillRect(30, 60, 8, 12);
        } else if (cosmetics.accessory === 'aura') {
            const time = Date.now() * 0.01;
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2 + time;
                const x = 60 + Math.cos(angle) * 40;
                const y = 80 + Math.sin(angle) * 35;
                const sparkSize = 6 + Math.sin(time * 3 + i) * 3;
                
                ctx.beginPath();
                ctx.moveTo(x - sparkSize, y);
                ctx.lineTo(x, y - sparkSize);
                ctx.lineTo(x + sparkSize, y);
                ctx.lineTo(x, y + sparkSize);
                ctx.closePath();
                ctx.stroke();
            }
        }
    }

    drawAura(ctx, color) {
        const centerX = 60;
        const centerY = 80;
        const time = Date.now() * 0.003;
        const radius1 = 45 + Math.sin(time) * 5;
        const radius2 = 35 + Math.cos(time * 1.2) * 3;
        
        const gradient1 = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius1);
        gradient1.addColorStop(0, color + '00');
        gradient1.addColorStop(0.7, color + '40');
        gradient1.addColorStop(1, color + '00');
        
        ctx.fillStyle = gradient1;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const gradient2 = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius2);
        gradient2.addColorStop(0, color + '00');
        gradient2.addColorStop(0.5, color + '60');
        gradient2.addColorStop(1, color + '00');
        
        ctx.fillStyle = gradient2;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawStickman(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.arc(60, 30, 12, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillRect(55, 26, 2, 2);
        ctx.fillRect(63, 26, 2, 2);
        
        ctx.beginPath();
        ctx.moveTo(60, 42);
        ctx.lineTo(60, 100);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(60, 60);
        ctx.lineTo(40, 80);
        ctx.moveTo(60, 60);
        ctx.lineTo(80, 80);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(60, 100);
        ctx.lineTo(45, 130);
        ctx.moveTo(60, 100);
        ctx.lineTo(75, 130);
        ctx.stroke();
    }

    drawCosmetics(ctx) {
        const cosmetics = this.data.character.cosmetics;
        
        if (cosmetics.hat === 'crown') {
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(50, 15, 20, 8);
            ctx.fillRect(55, 10, 2, 5);
            ctx.fillRect(60, 8, 2, 7);
            ctx.fillRect(65, 10, 2, 5);
        } else if (cosmetics.hat === 'cap') {
            ctx.fillStyle = '#ff4757';
            ctx.fillRect(48, 18, 24, 6);
            ctx.fillRect(45, 20, 8, 4);
        }
        
        if (cosmetics.weapon === 'sword') {
            ctx.strokeStyle = '#c0c0c0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(85, 75);
            ctx.lineTo(95, 65);
            ctx.stroke();
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(83, 77, 4, 8);
        }
        
        if (cosmetics.accessory === 'cape') {
            ctx.fillStyle = '#9b59b6';
            ctx.beginPath();
            ctx.moveTo(55, 45);
            ctx.lineTo(35, 90);
            ctx.lineTo(45, 95);
            ctx.lineTo(60, 50);
            ctx.fill();
        }
    }

    openCosmeticsShop() {
        const modal = document.createElement('div');
        modal.className = 'custom-dialog';
        modal.innerHTML = `
            <div class="dialog-content cosmetics-shop">
                <div class="shop-header">
                    <h3>Cosmetics Shop</h3>
                    <button class="close-btn">×</button>
                </div>
                <div class="coins-display">Coins: ${this.data.coins}</div>
                <div class="cosmetics-grid">
                    ${this.getCosmeticsHTML()}
                </div>
                <div class="dialog-buttons">
                    <button class="btn-cancel">Close</button>
                </div>
            </div>
        `;
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        // Close button handlers
        modal.querySelector('.btn-cancel').addEventListener('click', () => modal.remove());
        modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
        
        modal.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const type = e.target.dataset.type;
                const id = e.target.dataset.id;
                const price = parseInt(e.target.dataset.price);
                
                if (action === 'buy') {
                    this.buyCosmetic(id, type, price);
                } else if (action === 'equip') {
                    this.equipCosmetic(type, id);
                } else if (action === 'unequip') {
                    this.unequipCosmetic(type);
                }
            });
        });
        
        document.body.appendChild(modal);
    }

    getCosmeticsHTML() {
        const cosmetics = [
            { id: 'crown', name: 'Golden Crown', type: 'hat', price: 500, owned: this.data.character.ownedCosmetics.includes('crown') },
            { id: 'cap', name: 'Red Cap', type: 'hat', price: 200, owned: this.data.character.ownedCosmetics.includes('cap') },
            { id: 'helmet', name: 'Knight Helmet', type: 'hat', price: 600, owned: this.data.character.ownedCosmetics.includes('helmet') },
            { id: 'bandana', name: 'Ninja Bandana', type: 'hat', price: 250, owned: this.data.character.ownedCosmetics.includes('bandana') },
            { id: 'sword', name: 'Steel Sword', type: 'weapon', price: 300, owned: this.data.character.ownedCosmetics.includes('sword') },
            { id: 'axe', name: 'Battle Axe', type: 'weapon', price: 450, owned: this.data.character.ownedCosmetics.includes('axe') },
            { id: 'bow', name: 'Magic Bow', type: 'weapon', price: 350, owned: this.data.character.ownedCosmetics.includes('bow') },
            { id: 'staff', name: 'Wizard Staff', type: 'weapon', price: 550, owned: this.data.character.ownedCosmetics.includes('staff') },
            { id: 'cape', name: 'Purple Cape', type: 'accessory', price: 400, owned: this.data.character.ownedCosmetics.includes('cape') },
            { id: 'wings', name: 'Angel Wings', type: 'accessory', price: 800, owned: this.data.character.ownedCosmetics.includes('wings') },
            { id: 'shield', name: 'Royal Shield', type: 'accessory', price: 350, owned: this.data.character.ownedCosmetics.includes('shield') },
            { id: 'aura', name: 'Fire Aura', type: 'accessory', price: 700, owned: this.data.character.ownedCosmetics.includes('aura') }
        ];
        
        return cosmetics.map(item => {
            const equipped = this.data.character.cosmetics[item.type] === item.id;
            const canBuy = !item.owned && this.data.coins >= item.price;
            
            return `
                <div class="cosmetic-item ${equipped ? 'equipped' : ''}">
                    <div class="cosmetic-preview">${this.getCosmeticIcon(item.id)}</div>
                    <div class="cosmetic-name">${item.name}</div>
                    <div class="cosmetic-price">${item.price} coins</div>
                    ${item.owned ? 
                        (equipped ? 
                            `<button class="btn-equipped" data-action="unequip" data-type="${item.type}">Unequip</button>` :
                            `<button class="btn-equip" data-action="equip" data-type="${item.type}" data-id="${item.id}">Equip</button>`
                        ) :
                        `<button class="btn-buy ${canBuy ? '' : 'disabled'}" data-action="buy" data-id="${item.id}" data-type="${item.type}" data-price="${item.price}" ${!canBuy ? 'disabled' : ''}>Buy</button>`
                    }
                </div>
            `;
        }).join('');
    }

    getCosmeticIcon(id) {
        const icons = {
            crown: '👑',
            cap: '🧢',
            helmet: '⛑️',
            bandana: '🥷',
            sword: '⚔️',
            axe: '🪓',
            bow: '🏹',
            staff: '🪄',
            cape: '🦸',
            wings: '👼',
            shield: '🛡️',
            aura: '🔥'
        };
        return icons[id] || '❓';
    }

    buyCosmetic(id, type, price) {
        if (this.data.coins >= price && !this.data.character.ownedCosmetics.includes(id)) {
            this.data.coins -= price;
            this.data.character.ownedCosmetics.push(id);
            this.saveData();
            this.updateUI();
            
            const modal = document.querySelector('.custom-dialog');
            if (modal) modal.remove();
            this.openCosmeticsShop();
        }
    }

    equipCosmetic(type, id) {
        this.data.character.cosmetics[type] = id;
        this.saveData();
        this.updateCharacter();
        
        const modal = document.querySelector('.custom-dialog');
        if (modal) modal.remove();
        this.openCosmeticsShop();
    }

    unequipCosmetic(type) {
        this.data.character.cosmetics[type] = null;
        this.saveData();
        this.updateCharacter();
        
        const modal = document.querySelector('.custom-dialog');
        if (modal) modal.remove();
        this.openCosmeticsShop();
    }
    
    animateCharacter() {
        if (document.getElementById('character-canvas')) {
            const avgStat = this.getAverageStatValue();
            const auraColor = this.getAuraColor(avgStat);
            this.drawCharacter(auraColor);
            requestAnimationFrame(() => this.animateCharacter());
        } else {
            this.animationRunning = false;
        }
    }

    setupAutoSave() {
        // Auto-save every 30 seconds
        setInterval(() => {
            this.saveData();
            console.log('Auto-saved at', new Date().toLocaleTimeString());
        }, 30000);

        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.saveData();
        });

        // Save on visibility change (tab switch)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveData();
            }
        });
    }

    setupOfflineMode() {
        // Check online status
        this.updateOnlineStatus();
        
        window.addEventListener('online', () => {
            this.updateOnlineStatus();
            this.syncOfflineData();
        });
        
        window.addEventListener('offline', () => {
            this.updateOnlineStatus();
        });
    }

    updateOnlineStatus() {
        const isOnline = navigator.onLine;
        const statusElement = document.getElementById('online-status');
        
        if (!statusElement) {
            const status = document.createElement('div');
            status.id = 'online-status';
            status.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                z-index: 1000;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(status);
        }
        
        const status = document.getElementById('online-status');
        if (isOnline) {
            status.textContent = '🟢 Online';
            status.style.background = '#d4edda';
            status.style.color = '#155724';
            status.style.border = '1px solid #c3e6cb';
        } else {
            status.textContent = '🔴 Offline';
            status.style.background = '#f8d7da';
            status.style.color = '#721c24';
            status.style.border = '1px solid #f5c6cb';
        }
    }

    syncOfflineData() {
        // In a real app, this would sync with a server
        // For now, just ensure local data is consistent
        const offlineChanges = localStorage.getItem('levelSystemOfflineChanges');
        if (offlineChanges) {
            console.log('Syncing offline changes...');
            // Process any offline changes here
            localStorage.removeItem('levelSystemOfflineChanges');
        }
    }

    saveOfflineChange(change) {
        if (!navigator.onLine) {
            const changes = JSON.parse(localStorage.getItem('levelSystemOfflineChanges') || '[]');
            changes.push({
                timestamp: Date.now(),
                change: change
            });
            localStorage.setItem('levelSystemOfflineChanges', JSON.stringify(changes));
        }
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LevelSystem();
    window.app = app;
});
/* Add CSS for custom dialog */
const style = document.createElement('style');
style.textContent = `
.custom-dialog {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}
.dialog-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    max-width: 400px;
    text-align: center;
}
.dialog-buttons {
    margin-top: 15px;
}
.dialog-buttons button {
    margin: 0 5px;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}
.btn-confirm, .btn-ok {
    background: #007bff;
    color: white;
}
.btn-cancel {
    background: #6c757d;
    color: white;
}

/* Theme Selector Styles */
.theme-selector {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
    margin-top: 10px;
}

.theme-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--secondary);
    position: relative;
}

.theme-option:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
}

.theme-option.active {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--background);
}

.theme-preview {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-bottom: 5px;
    border: 2px solid rgba(255,255,255,0.2);
}

.theme-preview-blue-dark { background: linear-gradient(45deg, #4a7bc8, #2d4a6b); }
.theme-preview-green-dark { background: linear-gradient(45deg, #34d399, #2d5a3d); }

.theme-name {
    font-size: 12px;
    text-align: center;
    font-weight: 500;
}

.theme-check {
    position: absolute;
    top: 5px;
    right: 5px;
    font-size: 14px;
    color: var(--background);
}

/* Analytics Styles */
.analytics-header {
    text-align: center;
    margin-bottom: 20px;
    padding: 15px;
    border-radius: 8px;
}

.analytics-header h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
}

.analytics-header p {
    margin: 0;
    font-size: 14px;
}

.analytics-grid {
    display: grid;
    gap: 15px;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.analytics-card {
    border-radius: 8px;
    padding: 15px;
    transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.analytics-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.analytics-card h4 {
    margin: 0 0 15px 0;
    font-size: 16px;
}

.analytics-stats {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.analytics-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.stat-label {
    font-size: 14px;
}

.stat-value {
    font-size: 16px;
    font-weight: bold;
}

.difficulty-chart, .weekly-chart, .stat-growth {
    display: flex;
    justify-content: center;
    margin-top: 10px;
}

.achievement-progress {
    margin-top: 10px;
}

.progress-item {
    margin-bottom: 10px;
}

.progress-item span {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
}

.insights-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
}

.insight-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    line-height: 1.4;
}

.insight-icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
}

@media (max-width: 480px) {
    .analytics-grid {
        grid-template-columns: 1fr;
    }
    
    .analytics-card {
        padding: 12px;
    }
}

/* Character System Styles */
.character-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    background: var(--primary);
    border: 1px solid var(--secondary);
    border-radius: 8px;
    margin-bottom: 20px;
}

#character-canvas {
    border: 2px solid var(--accent);
    border-radius: 8px;
    background: rgba(0,0,0,0.3);
    margin-bottom: 10px;
}

.character-info {
    display: flex;
    gap: 15px;
    align-items: center;
}

.avg-stat {
    color: var(--accent);
    font-weight: bold;
    font-size: 14px;
}

.cosmetics-btn {
    background: var(--accent);
    color: var(--background);
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
}

.cosmetics-btn:hover {
    opacity: 0.8;
}

/* Cosmetics Shop Styles */
.cosmetics-shop {
    width: 90vw;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
}

.shop-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.close-btn {
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-btn:hover {
    background: #c82333;
}

.coins-display {
    text-align: center;
    font-size: 18px;
    font-weight: bold;
    color: #ffd700;
    margin-bottom: 20px;
    padding: 10px;
    background: rgba(255, 215, 0, 0.1);
    border-radius: 4px;
}

.cosmetics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 10px;
    margin-bottom: 20px;
    max-height: 60vh;
    overflow-y: auto;
}

@media (max-width: 600px) {
    .cosmetics-grid {
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: 8px;
    }
    
    .cosmetic-item {
        padding: 10px;
    }
    
    .cosmetic-preview {
        font-size: 24px;
    }
    
    .cosmetic-name {
        font-size: 10px;
    }
    
    .cosmetic-price {
        font-size: 9px;
    }
    
    .btn-buy, .btn-equip, .btn-equipped {
        padding: 4px 8px;
        font-size: 9px;
        min-width: 50px;
    }
}

.cosmetic-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 15px;
    border: 2px solid #ddd;
    border-radius: 8px;
    background: #f9f9f9;
    transition: all 0.2s ease;
}

.cosmetic-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.cosmetic-item.equipped {
    border-color: #4CAF50;
    background: #e8f5e8;
}

.cosmetic-preview {
    font-size: 32px;
    margin-bottom: 8px;
}

.cosmetic-name {
    font-size: 12px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 5px;
    color: #333;
}

.cosmetic-price {
    font-size: 11px;
    color: #666;
    margin-bottom: 10px;
}

.btn-buy, .btn-equip, .btn-equipped {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    font-weight: bold;
    min-width: 70px;
}

.btn-buy {
    background: #007bff;
    color: white;
}

.btn-buy.disabled {
    background: #ccc;
    cursor: not-allowed;
}

.btn-equip {
    background: #28a745;
    color: white;
}

.btn-equipped {
    background: #6c757d;
    color: white;
}

.btn-buy:hover:not(.disabled), .btn-equip:hover, .btn-equipped:hover {
    opacity: 0.8;
}
`;
document.head.appendChild(style);