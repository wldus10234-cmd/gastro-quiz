/**
 * Gastro Liver Disease Quiz Application Logic
 * Pure Vanilla JavaScript - Zero Dependencies
 */

(function () {
  'use strict';

  // --- Sound Effects Synthesizer (Web Audio API) ---
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playCorrect() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // High-pitched pleasant bell chime (E5 -> B5)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc1.frequency.exponentialRampToValueAtTime(987.77, now + 0.12); // B5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1318.5, now); // E6
      osc2.frequency.exponentialRampToValueAtTime(1975.5, now + 0.15); // B6

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    }

    playWrong() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    }

    playVictory() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const now = this.ctx.currentTime + idx * 0.1;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      });
    }
  }

  // --- Confetti Particle System ---
  class ConfettiEffect {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
      this.particles = [];
      this.animationId = null;

      if (this.canvas) {
        window.addEventListener('resize', () => this.resize());
        this.resize();
      }
    }

    resize() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    fire() {
      if (!this.canvas || !this.ctx) return;
      this.resize();
      this.particles = [];
      const colors = ['#0284c7', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

      for (let i = 0; i < 90; i++) {
        this.particles.push({
          x: this.canvas.width / 2,
          y: this.canvas.height / 2 + 50,
          vx: (Math.random() - 0.5) * 16,
          vy: Math.random() * -16 - 6,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
          alpha: 1
        });
      }

      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.loop();
    }

    loop() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      let alive = false;
      for (const p of this.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.45; // gravity
        p.vx *= 0.98; // air drag
        p.rotation += p.rotationSpeed;
        p.alpha -= 0.012;

        if (p.alpha > 0) {
          alive = true;
          this.ctx.save();
          this.ctx.translate(p.x, p.y);
          this.ctx.rotate((p.rotation * Math.PI) / 180);
          this.ctx.globalAlpha = Math.max(0, p.alpha);
          this.ctx.fillStyle = p.color;
          this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          this.ctx.restore();
        }
      }

      if (alive) {
        this.animationId = requestAnimationFrame(() => this.loop());
      } else {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  // --- Main Quiz Application ---
  class QuizApp {
    constructor() {
      this.sound = new SoundEngine();
      this.confetti = new ConfettiEffect('confettiCanvas');

      // State
      this.allQuestions = [];
      this.activeQuestions = [];
      this.currentIndex = 0;
      this.selectedOptions = new Set();
      this.isAnswered = false;

      // Persistence in localStorage
      this.history = this.loadJSON('gastro_quiz_history', {});
      this.bookmarks = new Set(this.loadJSON('gastro_quiz_bookmarks', []));
      this.streak = parseInt(localStorage.getItem('gastro_quiz_streak') || '0', 10);
      this.filter = localStorage.getItem('gastro_quiz_filter') || '14plus';
      this.memos = this.loadJSON('gastro_quiz_memos', {});
      this.allSubjects = [
        '화1_간질환총론', '화2_간질환진단', '화3_간대사간기능', '화4_바이러스간염면역',
        '화1_0915_병리소견', '화2_0915_병리', '화4_0915_내시경',
        '수1_0916_급성췌장염', '수2_0916_만성췌장염', '수3_4_0916_췌장암',
        '수1_2_B형간염', '수3_4_C형간염', '수5_알콜성간질환', '수6_간경변환자의실제', '수7_대사이상지방간', '수8_간기능부전',
        '목1_0917_췌장낭성질환', '목2_0917_췌장암수술', '목3_0917_담낭용종담낭암', '목4_0917_췌장염외과치료',
        '목5_0917_췌장양성종양', '목6_0917_담낭결석치료',
        '목1_약제유발성간염', '목2_자가면역성간염', '목3_4_만성간염의실제', '목5_6_간경변합병증', '목7_급성바이러스간염', '목8_대사성간질환',
        '금1_2_간악성종양', '금3_간담췌의해부학', '금4_간의수술적치료의개요',
        '금5_간종양', '금6_양성간종양', '금7_간세포암', '금8_악성간종양',
        '월1_간이식_내과', '월2_간이식_외과', '월3_영상_간염간암', '월4_국소간질환영상진단'
      ];
      let savedSubjects = this.loadJSON('gastro_quiz_selected_subjects', null);
      if (savedSubjects && Array.isArray(savedSubjects)) {
        savedSubjects = savedSubjects.map(s => s === '목1_약제유발시간염' ? '목1_약제유발성간염' : s);
        if (savedSubjects.includes('금3_4_간담췌해부및수술')) {
          savedSubjects = savedSubjects.filter(s => s !== '금3_4_간담췌해부및수술');
          savedSubjects.push('금3_간담췌의해부학', '금4_간의수술적치료의개요');
        }
      }
      const hasWed = savedSubjects && savedSubjects.some(s => s.startsWith('수'));
      const hasThu = savedSubjects && savedSubjects.some(s => s.startsWith('목'));
      const hasFri = savedSubjects && savedSubjects.some(s => s.startsWith('금'));
      const hasMon = savedSubjects && savedSubjects.some(s => s.startsWith('월'));
      const hasMerged = savedSubjects && savedSubjects.includes('수1_2_B형간염');
      const hasThu1 = savedSubjects && savedSubjects.includes('목1_약제유발성간염');
      const hasFri3 = savedSubjects && savedSubjects.includes('금3_간담췌의해부학');
      const hasFri4 = savedSubjects && savedSubjects.includes('금4_간의수술적치료의개요');
      const hasFri5 = savedSubjects && savedSubjects.includes('금5_간종양');
      const hasFri6 = savedSubjects && savedSubjects.includes('금6_양성간종양');
      const hasFri7 = savedSubjects && savedSubjects.includes('금7_간세포암');
      const hasFri8 = savedSubjects && savedSubjects.includes('금8_악성간종양');
      const hasMon1 = savedSubjects && savedSubjects.includes('월1_간이식_내과');
      const hasMon2 = savedSubjects && savedSubjects.includes('월2_간이식_외과');
      const hasMon3 = savedSubjects && savedSubjects.includes('월3_영상_간염간암');
      const hasMon4 = savedSubjects && savedSubjects.includes('월4_국소간질환영상진단');
      const hasTue1_0915 = savedSubjects && savedSubjects.includes('화1_0915_병리소견');
      const hasTue2_0915 = savedSubjects && savedSubjects.includes('화2_0915_병리');
      const hasTue4_0915 = savedSubjects && savedSubjects.includes('화4_0915_내시경');
      const hasWed1_0916 = savedSubjects && savedSubjects.includes('수1_0916_급성췌장염');
      const hasWed2_0916 = savedSubjects && savedSubjects.includes('수2_0916_만성췌장염');
      const hasWed34_0916 = savedSubjects && savedSubjects.includes('수3_4_0916_췌장암');
      const hasThu1_0917 = savedSubjects && savedSubjects.includes('목1_0917_췌장낭성질환');
      const hasThu2_0917 = savedSubjects && savedSubjects.includes('목2_0917_췌장암수술');
      const hasThu3_0917 = savedSubjects && savedSubjects.includes('목3_0917_담낭용종담낭암');
      const hasThu4_0917 = savedSubjects && savedSubjects.includes('목4_0917_췌장염외과치료');
      const hasThu5_0917 = savedSubjects && savedSubjects.includes('목5_0917_췌장양성종양');
      const hasThu6_0917 = savedSubjects && savedSubjects.includes('목6_0917_담낭결석치료');
      this.selectedSubjects = new Set(savedSubjects && savedSubjects.length > 0 && hasWed && hasThu && hasFri && hasMon && hasMerged && hasThu1 && hasFri3 && hasFri4 && hasFri5 && hasFri6 && hasFri7 && hasFri8 && hasMon1 && hasMon2 && hasMon3 && hasMon4 && hasTue1_0915 && hasTue2_0915 && hasTue4_0915 && hasWed1_0916 && hasWed2_0916 && hasWed34_0916 && hasThu1_0917 && hasThu2_0917 && hasThu3_0917 && hasThu4_0917 && hasThu5_0917 && hasThu6_0917 ? savedSubjects : this.allSubjects);
      this.questionCountLimit = localStorage.getItem('gastro_quiz_count_limit') || 'all';
      this.selectedYears = this.loadJSON('gastro_quiz_selected_years', []);
      this.currentMode = 'practice'; // 'practice' | 'exam' | 'bookmarks'

      // DOM Elements Cache
      this.dom = {
        practiceView: document.getElementById('practiceView'),
        examView: document.getElementById('examView'),
        examResultView: document.getElementById('examResultView'),
        emptyListCard: document.getElementById('emptyListCard'),
        emptyTitle: document.getElementById('emptyTitle'),
        emptySubtitle: document.getElementById('emptySubtitle'),

        // Nav & Controls
        navTabs: document.querySelectorAll('.nav-tab'),
        bookmarkCountBadge: document.getElementById('bookmarkCountBadge'),
        soundToggleBtn: document.getElementById('soundToggleBtn'),
        soundIconOn: document.getElementById('soundIconOn'),
        soundIconOff: document.getElementById('soundIconOff'),
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        themeIconSun: document.getElementById('themeIconSun'),
        themeIconMoon: document.getElementById('themeIconMoon'),

        // Subject & Filter Pills
        lecturePills: document.querySelectorAll('.lecture-pill'),
        countPills: document.querySelectorAll('.count-pill-btn'),
        subjectSelectionSummary: document.getElementById('subjectSelectionSummary'),
        totalAllCount: document.getElementById('totalAllCount'),
        pool14Count: document.getElementById('pool14Count'),
        poolSameProfCount: document.getElementById('poolSameProfCount'),
        poolAllCount: document.getElementById('poolAllCount'),
        poolTotalCount: document.getElementById('poolTotalCount'),
        filterPills: document.querySelectorAll('.filter-pill'),
        yearSelectorModal: document.getElementById('yearSelectorModal'),
        yearCheckboxGrid: document.getElementById('yearCheckboxGrid'),
        selectAllYearsBtn: document.getElementById('selectAllYearsBtn'),
        selectRecentYearsBtn: document.getElementById('selectRecentYearsBtn'),
        streakCount: document.getElementById('streakCount'),
        solvedCount: document.getElementById('solvedCount'),
        totalPoolCount: document.getElementById('totalPoolCount'),

        // Quiz Top Bar
        currentQIndex: document.getElementById('currentQIndex'),
        totalQCount: document.getElementById('totalQCount'),
        accuracyText: document.getElementById('accuracyText'),
        progressBarFill: document.getElementById('progressBarFill'),
        bookmarkBtn: document.getElementById('bookmarkBtn'),
        shuffleBtn: document.getElementById('shuffleBtn'),

        // Question Card
        questionCard: document.getElementById('questionCard'),
        qSubjectBadge: document.getElementById('qSubjectBadge'),
        qYearBadge: document.getElementById('qYearBadge'),
        qProfBadge: document.getElementById('qProfBadge'),
        qSameProfBadge: document.getElementById('qSameProfBadge'),
        qOriginalNumBadge: document.getElementById('qOriginalNumBadge'),
        qMultiTypeBadge: document.getElementById('qMultiTypeBadge'),
        qHasMemoBadge: document.getElementById('qHasMemoBadge'),
        qTitle: document.getElementById('qTitle'),
        qImageBox: document.getElementById('qImageBox'),
        qImage: document.getElementById('qImage'),
        qPassageBox: document.getElementById('qPassageBox'),
        qPassageContent: document.getElementById('qPassageContent'),
        multiSelectNote: document.getElementById('multiSelectNote'),
        optionsGrid: document.getElementById('optionsGrid'),
        qMemoBox: document.getElementById('qMemoBox'),
        qMemoInput: document.getElementById('qMemoInput'),
        memoStatus: document.getElementById('memoStatus'),
        memoClearBtn: document.getElementById('memoClearBtn'),

        // Footer Actions
        prevBtn: document.getElementById('prevBtn'),
        checkAnswerBtn: document.getElementById('checkAnswerBtn'),
        nextBtn: document.getElementById('nextBtn'),

        // Explanation Card
        explanationCard: document.getElementById('explanationCard'),
        resultIndicator: document.getElementById('resultIndicator'),
        resultIcon: document.getElementById('resultIcon'),
        resultTitle: document.getElementById('resultTitle'),
        correctAnswerText: document.getElementById('correctAnswerText'),
        fileExpSection: document.getElementById('fileExpSection'),
        fileExpText: document.getElementById('fileExpText'),

        // Exam Mode
        examTotalCount: document.getElementById('examTotalCount'),
        examQuestionsList: document.getElementById('examQuestionsList'),
        submitExamBtn: document.getElementById('submitExamBtn'),

        // Exam Result View
        finalScorePercent: document.getElementById('finalScorePercent'),
        summaryVerdict: document.getElementById('summaryVerdict'),
        summaryTotal: document.getElementById('summaryTotal'),
        summaryCorrect: document.getElementById('summaryCorrect'),
        summaryWrong: document.getElementById('summaryWrong'),
        summaryAccuracy: document.getElementById('summaryAccuracy'),
        retakeExamBtn: document.getElementById('retakeExamBtn'),
        backToPracticeBtn: document.getElementById('backToPracticeBtn')
      };

      this.initTheme();
      this.initSound();
      this.bindEvents();
      this.loadQuestions();
    }

    // Helper: LocalStorage JSON
    loadJSON(key, defaultVal) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultVal;
      } catch (e) {
        return defaultVal;
      }
    }

    saveJSON(key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) {}
    }

    // --- Helper: Multiple Choice Detection & Count ---
    isQuestionMultipleChoice(q) {
      if (!q) return false;
      if (q.isMultipleChoice === true) return true;
      if (Array.isArray(q.answer) && q.answer.length > 1) return true;
      const stem = (q.question || '') + ' ' + (q.passage || '');
      if (/(?:모두\s*고르|고르시오\s*\(\s*[2-9]\s*가지|\(\s*[2-9]\s*가지\s*\)|지시하는\s*수만큼|복수\s*(?:정답|선택)|\(\s*[2-9]\s*개\s*\))/i.test(stem)) {
        return true;
      }
      return false;
    }

    getExpectedAnswerCount(q) {
      if (!q) return null;
      if (Array.isArray(q.answer) && q.answer.length > 1) {
        return q.answer.length;
      }
      const stem = (q.question || '') + ' ' + (q.passage || '');
      const m = stem.match(/\(\s*([2-9])\s*가지\s*\)|\(\s*([2-9])\s*개\s*\)/);
      if (m) {
        return parseInt(m[1] || m[2], 10);
      }
      return null;
    }

    // --- Theme & Sound Initialization ---
    initTheme() {
      const savedTheme = localStorage.getItem('gastro_quiz_theme') || 'dark';
      if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        this.dom.themeIconSun.classList.add('hidden');
        this.dom.themeIconMoon.classList.remove('hidden');
      } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        this.dom.themeIconSun.classList.remove('hidden');
        this.dom.themeIconMoon.classList.add('hidden');
      }
    }

    toggleTheme() {
      const isDark = document.body.classList.contains('dark-theme');
      if (isDark) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        this.dom.themeIconSun.classList.add('hidden');
        this.dom.themeIconMoon.classList.remove('hidden');
        localStorage.setItem('gastro_quiz_theme', 'light');
      } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        this.dom.themeIconSun.classList.remove('hidden');
        this.dom.themeIconMoon.classList.add('hidden');
        localStorage.setItem('gastro_quiz_theme', 'dark');
      }
    }

    initSound() {
      const soundPref = localStorage.getItem('gastro_quiz_sound');
      this.sound.enabled = soundPref !== 'false';
      this.updateSoundIcon();
    }

    toggleSound() {
      this.sound.enabled = !this.sound.enabled;
      localStorage.setItem('gastro_quiz_sound', this.sound.enabled.toString());
      this.updateSoundIcon();
      if (this.sound.enabled) this.sound.playCorrect();
    }

    updateSoundIcon() {
      if (this.sound.enabled) {
        this.dom.soundIconOn.classList.remove('hidden');
        this.dom.soundIconOff.classList.add('hidden');
      } else {
        this.dom.soundIconOn.classList.add('hidden');
        this.dom.soundIconOff.classList.remove('hidden');
      }
    }

    // --- Loading Questions ---
    async loadQuestions() {
      const embeddedData = window.GASTRO_QUESTIONS_DATA || window.QUESTIONS || window.RAW_QUESTIONS || window.GastroQuestions;
      if (embeddedData && embeddedData.length > 0) {
        this.allQuestions = embeddedData;
      } else {
        try {
          const resp = await fetch('data/questions.json?v=' + Date.now());
          this.allQuestions = await resp.json();
        } catch (err) {
          console.error('Failed to fetch questions.json:', err);
        }
      }

      this.populateYearFilters();
      this.updateLecturePillsUI();
      this.updateCountPillsUI();
      this.applyFilter(this.filter);
      this.updateBadges();
    }

    applySubjectFilter(subject) {
      if (subject === 'all') {
        this.selectedSubjects = new Set(this.allSubjects);
      } else if (subject === 'tue_all') {
        const tueSubjects = this.allSubjects.filter(s => s.startsWith('화'));
        this.selectedSubjects = new Set(tueSubjects);
      } else if (subject === 'wed_all') {
        const wedSubjects = this.allSubjects.filter(s => s.startsWith('수'));
        this.selectedSubjects = new Set(wedSubjects);
      } else if (subject === 'thu_all') {
        const thuSubjects = this.allSubjects.filter(s => s.startsWith('목'));
        this.selectedSubjects = new Set(thuSubjects);
      } else if (subject === 'fri_all') {
        const friSubjects = this.allSubjects.filter(s => s.startsWith('금'));
        this.selectedSubjects = new Set(friSubjects);
      } else if (subject === 'mon_all') {
        const monSubjects = this.allSubjects.filter(s => s.startsWith('월'));
        this.selectedSubjects = new Set(monSubjects);
      } else {
        if (this.selectedSubjects.size === this.allSubjects.length) {
          // If all 19 were selected, user is picking this specific lecture
          this.selectedSubjects.clear();
          this.selectedSubjects.add(subject);
        } else {
          // Toggle subject on/off
          if (this.selectedSubjects.has(subject)) {
            if (this.selectedSubjects.size > 1) {
              this.selectedSubjects.delete(subject);
            } else {
              // Revert to all if user attempts to deselect the last one
              this.selectedSubjects = new Set(this.allSubjects);
            }
          } else {
            this.selectedSubjects.add(subject);
          }
        }
      }

      this.saveJSON('gastro_quiz_selected_subjects', Array.from(this.selectedSubjects));
      this.updateLecturePillsUI();
      this.populateYearFilters();
      this.rebuildQuestionPool();
    }

    setQuestionCountLimit(count) {
      this.questionCountLimit = count;
      localStorage.setItem('gastro_quiz_count_limit', count);
      this.updateCountPillsUI();
      this.rebuildQuestionPool();
    }

    updateCountPillsUI() {
      if (!this.dom.countPills) return;
      this.dom.countPills.forEach(pill => {
        if (pill.dataset.count === this.questionCountLimit) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });
    }

    updateLecturePillsUI() {
      const isAll = this.selectedSubjects.size === this.allSubjects.length;
      const tueSubjects = this.allSubjects.filter(s => s.startsWith('화'));
      const wedSubjects = this.allSubjects.filter(s => s.startsWith('수'));
      const thuSubjects = this.allSubjects.filter(s => s.startsWith('목'));
      const friSubjects = this.allSubjects.filter(s => s.startsWith('금'));
      const monSubjects = this.allSubjects.filter(s => s.startsWith('월'));
      const isTueAll = tueSubjects.length > 0 && tueSubjects.every(s => this.selectedSubjects.has(s)) && this.selectedSubjects.size === tueSubjects.length;
      const isWedAll = wedSubjects.length > 0 && wedSubjects.every(s => this.selectedSubjects.has(s)) && this.selectedSubjects.size === wedSubjects.length;
      const isThuAll = thuSubjects.length > 0 && thuSubjects.every(s => this.selectedSubjects.has(s)) && this.selectedSubjects.size === thuSubjects.length;
      const isFriAll = friSubjects.length > 0 && friSubjects.every(s => this.selectedSubjects.has(s)) && this.selectedSubjects.size === friSubjects.length;
      const isMonAll = monSubjects.length > 0 && monSubjects.every(s => this.selectedSubjects.has(s)) && this.selectedSubjects.size === monSubjects.length;

      // Calculate dynamic counts
      const counts = {};
      this.allQuestions.forEach(q => { counts[q.subject] = (counts[q.subject] || 0) + 1; });
      const tueCount = tueSubjects.reduce((acc, s) => acc + (counts[s] || 0), 0);
      const wedCount = wedSubjects.reduce((acc, s) => acc + (counts[s] || 0), 0);
      const thuCount = thuSubjects.reduce((acc, s) => acc + (counts[s] || 0), 0);
      const friCount = friSubjects.reduce((acc, s) => acc + (counts[s] || 0), 0);
      const monCount = monSubjects.reduce((acc, s) => acc + (counts[s] || 0), 0);

      this.dom.lecturePills.forEach(pill => {
        const subj = pill.dataset.subject;
        if (subj === 'all') {
          pill.classList.toggle('active', isAll);
          const totalSpan = pill.querySelector('#totalAllCount');
          if (totalSpan && this.allQuestions.length > 0) totalSpan.textContent = this.allQuestions.length;
        } else if (subj === 'tue_all') {
          pill.classList.toggle('active', isTueAll);
          if (tueCount > 0) pill.innerHTML = `<span class="pill-check">✓</span> [화] 화요일 전체 (${tueCount}제)`;
        } else if (subj === 'wed_all') {
          pill.classList.toggle('active', isWedAll);
          if (wedCount > 0) pill.innerHTML = `<span class="pill-check">✓</span> [수] 수요일 전체 (${wedCount}제)`;
        } else if (subj === 'thu_all') {
          pill.classList.toggle('active', isThuAll);
          if (thuCount > 0) pill.innerHTML = `<span class="pill-check">✓</span> [목] 목요일 전체 (${thuCount}제)`;
        } else if (subj === 'fri_all') {
          pill.classList.toggle('active', isFriAll);
          if (friCount > 0) pill.innerHTML = `<span class="pill-check">✓</span> [금] 금요일 전체 (${friCount}제)`;
        } else if (subj === 'mon_all') {
          pill.classList.toggle('active', isMonAll);
          if (monCount > 0) pill.innerHTML = `<span class="pill-check">✓</span> [월] 월요일 전체 (${monCount}제)`;
        } else {
          pill.classList.toggle('active', this.selectedSubjects.has(subj));
          const subCount = counts[subj];
          if (subCount !== undefined) {
            const check = pill.querySelector('.pill-check');
            const checkHtml = check ? check.outerHTML : '<span class="pill-check">✓</span>';
            const baseText = pill.textContent.replace(/^[\s✓]+/, '').replace(/\s*\(\d+제\)/, '').trim();
            pill.innerHTML = `${checkHtml} ${baseText} (${subCount}제)`;
          }
        }
      });

      if (this.dom.subjectSelectionSummary) {
        if (isAll) {
          this.dom.subjectSelectionSummary.textContent = `(전체 ${this.allSubjects.length}개 강좌 선택됨)`;
        } else if (isTueAll) {
          this.dom.subjectSelectionSummary.textContent = `(화요일 ${tueSubjects.length}개 강좌 선택됨)`;
        } else if (isWedAll) {
          this.dom.subjectSelectionSummary.textContent = `(수요일 ${wedSubjects.length}개 강좌 선택됨)`;
        } else if (isThuAll) {
          this.dom.subjectSelectionSummary.textContent = `(목요일 ${thuSubjects.length}개 강좌 선택됨)`;
        } else if (isFriAll) {
          this.dom.subjectSelectionSummary.textContent = `(금요일 ${friSubjects.length}개 강좌 선택됨)`;
        } else if (isMonAll) {
          this.dom.subjectSelectionSummary.textContent = `(월요일 ${monSubjects.length}개 강좌 선택됨)`;
        } else {
          this.dom.subjectSelectionSummary.textContent = `(${this.selectedSubjects.size}개 강좌 선택됨)`;
        }
      }
    }

    populateYearFilters() {
      let scoped = this.allQuestions.filter(q => this.selectedSubjects.has(q.subject));
      const years = Array.from(new Set(scoped.map(q => q.year)));
      this.dom.yearCheckboxGrid.innerHTML = '';

      years.forEach(year => {
        const count = scoped.filter(q => q.year === year).length;
        const label = document.createElement('label');
        label.className = 'year-checkbox-label';
        const isChecked = this.selectedYears.length === 0 ? true : this.selectedYears.includes(year);

        label.innerHTML = `
          <input type="checkbox" value="${year}" ${isChecked ? 'checked' : ''}>
          <span>${year} (${count})</span>
        `;

        label.querySelector('input').addEventListener('change', () => {
          this.onYearCheckboxChange();
        });

        this.dom.yearCheckboxGrid.appendChild(label);
      });
    }

    onYearCheckboxChange() {
      const checkedInputs = this.dom.yearCheckboxGrid.querySelectorAll('input:checked');
      this.selectedYears = Array.from(checkedInputs).map(inp => inp.value);
      this.saveJSON('gastro_quiz_selected_years', this.selectedYears);

      this.filter = 'custom';
      this.updateFilterPillsUI();
      this.rebuildQuestionPool();
    }

    // --- Filtering & Question Pool ---
    applyFilter(filterType) {
      this.filter = filterType;
      localStorage.setItem('gastro_quiz_filter', filterType);
      this.updateFilterPillsUI();

      if (filterType === 'custom') {
        this.dom.yearSelectorModal.classList.remove('hidden');
      } else {
        this.dom.yearSelectorModal.classList.add('hidden');
      }

      this.rebuildQuestionPool();
    }

    updateFilterPillsUI() {
      this.dom.filterPills.forEach(pill => {
        if (pill.dataset.filter === this.filter) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });
    }

    rebuildQuestionPool() {
      // 1. Multi-select lecture filter (Base pool for current subject selection)
      const basePool = this.allQuestions.filter(q => this.selectedSubjects.has(q.subject));

      // Update pill count statistics based on basePool
      const count14 = basePool.filter(q => q.isRecent14Plus).length;
      const countSameProf = basePool.filter(q => q.isSameProfessor).length;
      const countAll = basePool.length;
      if (this.dom.pool14Count) this.dom.pool14Count.textContent = count14;
      if (this.dom.poolSameProfCount) this.dom.poolSameProfCount.textContent = countSameProf;
      if (this.dom.poolAllCount) this.dom.poolAllCount.textContent = countAll;
      if (this.dom.poolTotalCount) this.dom.poolTotalCount.textContent = countAll;
      if (this.dom.totalAllCount) this.dom.totalAllCount.textContent = this.allQuestions.length;

      // 2. Filter by mode & range
      let pool = [...basePool];
      if (this.currentMode === 'bookmarks') {
        pool = pool.filter(q => this.bookmarks.has(q.id));
      } else {
        if (this.filter === '14plus') {
          pool = pool.filter(q => q.isRecent14Plus);
        } else if (this.filter === 'sameprof') {
          pool = pool.filter(q => q.isSameProfessor);
        } else if (this.filter === 'all') {
          // Keep all in selected subjects
        } else if (this.filter === 'custom') {
          if (this.selectedYears.length > 0) {
            pool = pool.filter(q => this.selectedYears.includes(q.year));
          } else {
            pool = pool.filter(q => q.isRecent14Plus);
          }
        }
      }

      // 3. Shuffle pool
      pool = this.shuffleArray([...pool]);

      // 4. Question Count Limit (10 / 20 / 30 / all)
      if (this.questionCountLimit !== 'all') {
        const limit = parseInt(this.questionCountLimit, 10);
        if (!isNaN(limit) && limit > 0) {
          pool = pool.slice(0, limit);
        }
      }

      this.activeQuestions = pool;
      this.currentIndex = 0;
      this.updateBadges();

      if (this.currentMode === 'exam') {
        this.renderExamView();
      } else {
        this.renderCurrentQuestion();
      }
    }

    shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    // --- Practice Mode Rendering ---
    renderCurrentQuestion() {
      // Check if pool is empty (e.g. wrong/bookmarks)
      if (this.activeQuestions.length === 0) {
        this.dom.practiceView.classList.add('hidden');
        this.dom.emptyListCard.classList.remove('hidden');

        this.dom.emptyTitle.textContent = '저장된 북마크가 없습니다. ⭐';
        this.dom.emptySubtitle.textContent = '문제를 풀다가 나중에 다시 보고 싶은 문제는 상단 [북마크] 버튼(단축키: B)을 눌러 저장해보세요.';
        return;
      }

      this.dom.practiceView.classList.remove('hidden');
      this.dom.emptyListCard.classList.add('hidden');

      const q = this.activeQuestions[this.currentIndex];
      this.isAnswered = false;
      this.selectedOptions.clear();

      // Top bar info
      this.dom.currentQIndex.textContent = this.currentIndex + 1;
      this.dom.totalQCount.textContent = this.activeQuestions.length;
      this.dom.totalPoolCount.textContent = this.activeQuestions.length;
      this.dom.streakCount.textContent = this.streak;

      // Progress fill
      const percent = ((this.currentIndex + 1) / this.activeQuestions.length) * 100;
      this.dom.progressBarFill.style.width = `${percent}%`;

      // Update Accuracy
      const solvedInPool = this.activeQuestions.filter(item => this.history[item.id]);
      this.dom.solvedCount.textContent = solvedInPool.length;
      if (solvedInPool.length > 0) {
        const correctCount = solvedInPool.filter(item => this.history[item.id].isCorrect).length;
        const rate = Math.round((correctCount / solvedInPool.length) * 100);
        this.dom.accuracyText.textContent = `정답률 ${rate}%`;
      } else {
        this.dom.accuracyText.textContent = '정답률 0%';
      }

      // Meta Badges (masked in random mode before answering)
      this.renderQuestionBadges(q, false);


      // Question Title & Unified Stem (Integrating lab findings directly into stem)
      const fullStem = q.passage ? (q.question.includes(q.passage) ? q.question : `${q.question}\n\n${q.passage}`) : q.question;
      this.dom.qTitle.textContent = fullStem;

      // Question Image Box (Single & Multiple Clinical Images)
      const images = (Array.isArray(q.images) && q.images.length > 0) ? q.images : (q.image ? [q.image] : []);
      if (images.length > 0) {
        this.dom.qImageBox.classList.remove('hidden');
        this.dom.qImageBox.innerHTML = images.map((imgSrc, i) => `
          <div class="image-wrapper" data-zoom-src="${imgSrc}" style="margin-bottom: 14px; cursor: zoom-in; display: flex; flex-direction: column; align-items: center;" title="클릭하여 원본 크기로 확대">
            ${images.length > 1 ? `<div style="align-self: flex-start; margin-bottom: 6px; padding: 3px 10px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 12px; color: #a5b4fc; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.02em;">[${i + 1}번 조직 소견]</div>` : ''}
            <img src="${imgSrc}" alt="임상 소견 이미지 ${i + 1}" loading="lazy" style="max-height: 420px; width: auto; max-width: 100%; object-fit: contain; border-radius: 8px;">
          </div>
        `).join('');
      } else {
        this.dom.qImageBox.classList.add('hidden');
        this.dom.qImageBox.innerHTML = '';
      }

      // Passage Box - Deprecated/Merged into question stem as requested
      this.dom.qPassageBox.classList.add('hidden');


      // Bookmark Button State
      if (this.bookmarks.has(q.id)) {
        this.dom.bookmarkBtn.classList.add('active');
        this.dom.bookmarkBtn.querySelector('.btn-text').textContent = '저장됨';
      } else {
        this.dom.bookmarkBtn.classList.remove('active');
        this.dom.bookmarkBtn.querySelector('.btn-text').textContent = '북마크';
      }

      // Options
      this.dom.optionsGrid.innerHTML = '';
      const isMulti = this.isQuestionMultipleChoice(q);
      q.options.forEach((optStr, idx) => {
        const optNum = idx + 1;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `option-btn ${isMulti ? 'option-multi' : ''}`;
        btn.dataset.optNum = optNum;
        btn.setAttribute('role', isMulti ? 'checkbox' : 'radio');
        btn.setAttribute('aria-checked', 'false');

        btn.innerHTML = `
          <div class="option-key-badge">${optNum}</div>
          <div class="option-text">${optStr}</div>
        `;

        btn.addEventListener('click', () => this.toggleOptionSelect(optNum));
        this.dom.optionsGrid.appendChild(btn);
      });

      // Question Memo Box state
      if (this.dom.qMemoInput) {
        const curMemo = this.memos[q.id] || '';
        this.dom.qMemoInput.value = curMemo;
        if (this.dom.memoStatus) {
          this.dom.memoStatus.textContent = curMemo ? '✓ 저장됨' : '';
          this.dom.memoStatus.style.color = '#10b981';
        }
      }
      if (this.dom.qHasMemoBadge) {
        this.dom.qHasMemoBadge.classList.toggle('hidden', !(this.memos[q.id] && this.memos[q.id].trim()));
      }

      // Reset Action Buttons
      this.dom.prevBtn.disabled = this.currentIndex === 0;
      this.dom.checkAnswerBtn.classList.remove('hidden');
      this.dom.nextBtn.classList.add('hidden');
      this.dom.explanationCard.classList.add('hidden');

      // Scroll smoothly to top of card
      this.dom.practiceView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    renderQuestionBadges(q, isAnswered = false) {
      // Is this a random solve across multiple subjects?
      // Active if 2+ subjects are selected or question count is limited (10/20/30)
      const isRandomMode = (this.selectedSubjects.size > 1) || (this.questionCountLimit !== 'all');
      const realSubject = q.subjectName || (q.subject === '화2_간질환진단' ? '[화2] 간질환 진단' : '[화1] 간질환 총론');
      const cleanTargetProf = (q.thisYearProfessor || '').replace(/교수님|교수/g, '').trim();
      const rawPastProf = (q.professor || '').trim();
      const pastProf = rawPastProf.replace(/교수님|교수/g, '').trim();
      const displayPastProf = rawPastProf.includes('교수') ? rawPastProf : `${rawPastProf} 교수님`;
      const displayTargetProf = (q.thisYearProfessor || '').includes('교수') ? q.thisYearProfessor : `${cleanTargetProf} 교수님`;

      // 1. Subject Badge (masked in random mode until answered)
      if (isRandomMode && !isAnswered) {
        this.dom.qSubjectBadge.textContent = '🔒 과목 풀이 후 공개';
        this.dom.qSubjectBadge.className = 'badge subject-badge badge-masked';
        this.dom.qSubjectBadge.title = '문제를 풀고 정답을 확인하면 수업명이 공개됩니다. (클릭하면 힌트로 미리보기)';
        this.dom.qSubjectBadge.dataset.realSubject = realSubject;
        this.dom.qSubjectBadge.dataset.revealed = 'false';
      } else {
        this.dom.qSubjectBadge.textContent = realSubject;
        this.dom.qSubjectBadge.className = (isRandomMode && isAnswered) ? 'badge subject-badge badge-revealed' : 'badge subject-badge';
        this.dom.qSubjectBadge.title = realSubject;
        delete this.dom.qSubjectBadge.dataset.realSubject;
        this.dom.qSubjectBadge.dataset.revealed = 'true';
      }

      // 2. Year / Hakbun Badge
      if (q.year) {
        this.dom.qYearBadge.textContent = q.year;
        this.dom.qYearBadge.classList.remove('hidden');
      } else {
        this.dom.qYearBadge.classList.add('hidden');
      }

      // 3. Original Question Number / Slide Page Badge
      const validQNum = (q.qNumber !== undefined && q.qNumber !== null && q.qNumber !== 'undefined' && String(q.qNumber).trim() !== '') ? q.qNumber : null;
      const qNumText = validQNum ? `원문 ${validQNum}번` : (q.page ? `슬라이드 ${q.page}p` : '');
      if (qNumText) {
        this.dom.qOriginalNumBadge.textContent = qNumText;
        this.dom.qOriginalNumBadge.classList.remove('hidden');
      } else {
        this.dom.qOriginalNumBadge.classList.add('hidden');
      }

      // 4. Professor & Same Professor Indicator
      if (this.dom.qSameProfBadge) {
        if (cleanTargetProf && pastProf) {
          this.dom.qProfBadge.classList.add('hidden');
          this.dom.qSameProfBadge.classList.remove('hidden');
          const isSame = q.isSameProfessor === true || (q.isSameProfessor !== false && cleanTargetProf && pastProf && cleanTargetProf === pastProf);
          if (isSame) {
            this.dom.qSameProfBadge.className = 'badge same-prof-badge';
            if (isRandomMode && !isAnswered) {
              this.dom.qSameProfBadge.innerHTML = `🎯 올해 동일 교수 기출`;
              this.dom.qSameProfBadge.title = `올해 해당 과목을 담당하시는 교수님이 출제하신 기출문제입니다. (풀이 후 교수명 공개)`;
            } else {
              this.dom.qSameProfBadge.innerHTML = `🎯 올해 동일 교수 (${displayTargetProf})`;
              this.dom.qSameProfBadge.title = `올해 해당 과목을 담당하시는 ${displayTargetProf}이 출제하신 기출문제입니다.`;
            }
            if (this.dom.questionCard) this.dom.questionCard.classList.add('card-same-prof');
          } else {
            this.dom.qSameProfBadge.className = 'badge diff-prof-badge';
            if (isRandomMode && !isAnswered) {
              this.dom.qSameProfBadge.innerHTML = `👤 타 교수 기출`;
              this.dom.qSameProfBadge.title = `기출 출제 당시와 올해 교수님이 상이합니다. (풀이 후 교수명 공개)`;
            } else {
              this.dom.qSameProfBadge.innerHTML = `👤 당시 ${displayPastProf} <span class="prof-arrow">→</span> 올해 ${displayTargetProf}`;
              this.dom.qSameProfBadge.title = `기출 출제 당시 담당은 ${displayPastProf}이었으며, 올해 담당은 ${displayTargetProf}입니다.`;
            }
            if (this.dom.questionCard) this.dom.questionCard.classList.remove('card-same-prof');
          }
        } else if (pastProf) {
          this.dom.qSameProfBadge.classList.add('hidden');
          this.dom.qProfBadge.classList.remove('hidden');
          this.dom.qProfBadge.textContent = (isRandomMode && !isAnswered) ? `👤 기출 교수` : `${pastProf} 교수님`;
          if (this.dom.questionCard) this.dom.questionCard.classList.remove('card-same-prof');
        } else if (cleanTargetProf) {
          this.dom.qSameProfBadge.classList.add('hidden');
          this.dom.qProfBadge.classList.remove('hidden');
          this.dom.qProfBadge.textContent = (isRandomMode && !isAnswered) ? `👤 올해 교수 출제` : `${cleanTargetProf} 교수님`;
          if (this.dom.questionCard) this.dom.questionCard.classList.remove('card-same-prof');
        } else {
          this.dom.qSameProfBadge.classList.add('hidden');
          this.dom.qProfBadge.classList.add('hidden');
          if (this.dom.questionCard) this.dom.questionCard.classList.remove('card-same-prof');
        }
      }

      // 5. Multiple Choice Type Badge & Banner
      const isMulti = this.isQuestionMultipleChoice(q);
      const expCount = this.getExpectedAnswerCount(q);
      if (isMulti) {
        this.dom.qMultiTypeBadge.classList.remove('hidden');
        this.dom.qMultiTypeBadge.className = 'badge type-badge multi-type';
        this.dom.qMultiTypeBadge.textContent = expCount ? `복수 정답 (${expCount}개 선택)` : `복수 정답 문항`;
        this.dom.multiSelectNote.classList.remove('hidden');
        this.dom.multiSelectNote.innerHTML = `💡 이 문제는 <strong>복수 정답${expCount ? ` (${expCount}개 선택)` : ''}</strong> 문항입니다. 해당하는 보기를 모두 클릭하여 선택한 후 <strong>[정답 확인]</strong>을 누르세요.`;
      } else {
        this.dom.qMultiTypeBadge.classList.add('hidden');
        this.dom.qMultiTypeBadge.className = 'badge type-badge hidden';
        this.dom.multiSelectNote.classList.add('hidden');
      }
    }

    toggleOptionSelect(optNum) {
      if (this.isAnswered) return;

      const q = this.activeQuestions[this.currentIndex];
      const isMulti = this.isQuestionMultipleChoice(q);

      if (isMulti) {
        if (this.selectedOptions.has(optNum)) {
          this.selectedOptions.delete(optNum);
        } else {
          this.selectedOptions.add(optNum);
        }
      } else {
        if (this.selectedOptions.has(optNum)) {
          this.selectedOptions.delete(optNum);
        } else {
          this.selectedOptions.clear();
          this.selectedOptions.add(optNum);
        }
      }

      // Update UI classes
      const btns = this.dom.optionsGrid.querySelectorAll('.option-btn');
      btns.forEach(btn => {
        const num = parseInt(btn.dataset.optNum, 10);
        const isSelected = this.selectedOptions.has(num);
        if (isSelected) {
          btn.classList.add('selected');
          btn.setAttribute('aria-checked', 'true');
        } else {
          btn.classList.remove('selected');
          btn.setAttribute('aria-checked', 'false');
        }
      });
    }

    checkAnswer() {
      if (this.isAnswered) return;
      if (this.selectedOptions.size === 0) {
        alert('먼저 답안 보기를 하나 이상 선택해주세요!');
        return;
      }

      const q = this.activeQuestions[this.currentIndex];
      this.isAnswered = true;

      // Reveal real subject and professor badges upon solving
      this.renderQuestionBadges(q, true);

      // Grade answer
      const userSelected = Array.from(this.selectedOptions).sort((a, b) => a - b);
      const correctAnswers = (Array.isArray(q.answer) ? [...q.answer] : [q.answer]).sort((a, b) => a - b);
      const isCorrect = JSON.stringify(userSelected) === JSON.stringify(correctAnswers);

      // Save History & Streak
      this.history[q.id] = {
        answered: true,
        userChoice: userSelected,
        isCorrect: isCorrect,
        timestamp: Date.now()
      };
      this.saveJSON('gastro_quiz_history', this.history);

      if (isCorrect) {
        this.streak += 1;
        this.sound.playCorrect();
        if (this.streak > 0 && this.streak % 5 === 0) {
          this.confetti.fire();
        }
      } else {
        this.streak = 0;
        this.sound.playWrong();
      }
      localStorage.setItem('gastro_quiz_streak', this.streak.toString());
      this.updateBadges();

      // Highlight options
      const btns = this.dom.optionsGrid.querySelectorAll('.option-btn');
      btns.forEach(btn => {
        const num = parseInt(btn.dataset.optNum, 10);
        btn.disabled = true;

        if (correctAnswers.includes(num)) {
          btn.classList.add('correct');
        } else if (userSelected.includes(num)) {
          btn.classList.add('incorrect');
        }
      });

      // Show Explanation Card
      this.renderExplanation(q, isCorrect, correctAnswers);

      // Toggle Buttons
      this.dom.checkAnswerBtn.classList.add('hidden');
      this.dom.nextBtn.classList.remove('hidden');

      // Update Streak and Stats UI
      this.dom.streakCount.textContent = this.streak;
    }

    renderExplanation(q, isCorrect, correctAnswers) {
      this.dom.explanationCard.classList.remove('hidden');

      if (isCorrect) {
        this.dom.resultIndicator.className = 'result-indicator correct';
        this.dom.resultIcon.textContent = '✓';
        this.dom.resultTitle.textContent = '정답입니다! 완벽해요 👏';
      } else {
        this.dom.resultIndicator.className = 'result-indicator incorrect';
        this.dom.resultIcon.textContent = '✕';
        this.dom.resultTitle.textContent = '아쉽게도 틀렸습니다. 해설을 확인해보세요!';
      }

      this.dom.correctAnswerText.textContent = `${correctAnswers.join(', ')}번`;

      // 1. Original File Explanation (PAD)
      const fileContent = q.explanationFile || [
        q.explanationOfficial ? `[공식 해설]\n${q.explanationOfficial}` : '',
        q.explanationAuthor ? `[작성자 코멘트]\n${q.explanationAuthor}` : ''
      ].filter(Boolean).join('\n\n') || q.explanation || '';

      if (fileContent && fileContent.trim()) {
        this.dom.fileExpSection.classList.remove('hidden');
        this.dom.fileExpText.textContent = fileContent;
      } else {
        this.dom.fileExpSection.classList.remove('hidden');
        this.dom.fileExpText.textContent = `📌 원문 파일에 별도 해설이 등록되어 있지 않은 문항입니다. (정답: ${correctAnswers.join(', ')}번)`;
      }
    }

    nextQuestion() {
      if (this.currentIndex < this.activeQuestions.length - 1) {
        this.currentIndex++;
        this.renderCurrentQuestion();
      } else {
        // Finished last question
        this.sound.playVictory();
        this.confetti.fire();
        alert('🎉 준비된 모든 문제를 풀었습니다! 수고하셨습니다.');
        this.renderCurrentQuestion();
      }
    }

    prevQuestion() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.renderCurrentQuestion();
      }
    }

    toggleBookmarkCurrent() {
      if (this.activeQuestions.length === 0) return;
      const q = this.activeQuestions[this.currentIndex];

      if (this.bookmarks.has(q.id)) {
        this.bookmarks.delete(q.id);
      } else {
        this.bookmarks.add(q.id);
      }

      this.saveJSON('gastro_quiz_bookmarks', Array.from(this.bookmarks));
      this.updateBadges();

      if (this.bookmarks.has(q.id)) {
        this.dom.bookmarkBtn.classList.add('active');
        this.dom.bookmarkBtn.querySelector('.btn-text').textContent = '저장됨';
      } else {
        this.dom.bookmarkBtn.classList.remove('active');
        this.dom.bookmarkBtn.querySelector('.btn-text').textContent = '북마크';
      }

      // If in bookmarks mode, rebuild
      if (this.currentMode === 'bookmarks') {
        this.rebuildQuestionPool();
      }
    }

    updateBadges() {
      if (this.dom.bookmarkCountBadge) this.dom.bookmarkCountBadge.textContent = this.bookmarks.size;
    }

    // --- Mode Switching ---
    switchMode(mode) {
      this.currentMode = mode;

      this.dom.navTabs.forEach(tab => {
        if (tab.dataset.mode === mode) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });

      // Hide all main views
      this.dom.practiceView.classList.add('hidden');
      this.dom.examView.classList.add('hidden');
      this.dom.examResultView.classList.add('hidden');
      this.dom.emptyListCard.classList.add('hidden');

      if (mode === 'practice' || mode === 'bookmarks') {
        this.rebuildQuestionPool();
      } else if (mode === 'exam') {
        this.dom.examView.classList.remove('hidden');
        this.rebuildQuestionPool();
      }
    }

    // --- Exam Mode Rendering ---
    renderExamView() {
      this.dom.examQuestionsList.innerHTML = '';
      this.dom.examTotalCount.textContent = this.activeQuestions.length;

      this.activeQuestions.forEach((q, qIdx) => {
        const card = document.createElement('div');
        card.className = 'exam-item-card';
        card.id = `examCard_${q.id}`;

        const fullStem = q.passage ? (q.question.includes(q.passage) ? q.question : `${q.question}\n\n${q.passage}`) : q.question;

        let imageHTML = '';
        const images = (Array.isArray(q.images) && q.images.length > 0) ? q.images : (q.image ? [q.image] : []);
        if (images.length > 0) {
          imageHTML = `
            <div class="question-image-box" style="margin-bottom: 14px; display: flex; flex-direction: column; gap: 10px; align-items: center;">
              ${images.map((imgSrc, i) => `
                <div class="image-wrapper" data-zoom-src="${imgSrc}" style="max-height: 380px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; border-radius: 8px; overflow: hidden; cursor: zoom-in; padding: 6px;" title="클릭하여 확대">
                  ${images.length > 1 ? `<div style="align-self: flex-start; margin-bottom: 6px; padding: 2px 8px; background: rgba(99, 102, 241, 0.25); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 10px; color: #a5b4fc; font-size: 0.78rem; font-weight: 700;">[${i + 1}번 조직 소견]</div>` : ''}
                  <img src="${imgSrc}" alt="문제 임상 이미지 ${i + 1}" loading="lazy" style="max-height: 350px; width: auto; max-width: 100%; object-fit: contain;">
                </div>
              `).join('')}
            </div>
          `;
        }

        let optionsHTML = '';
        const isMulti = this.isQuestionMultipleChoice(q);
        const expCount = this.getExpectedAnswerCount(q);

        q.options.forEach((optStr, optIdx) => {
          const optNum = optIdx + 1;
          const inputType = isMulti ? 'checkbox' : 'radio';
          const nameAttr = isMulti ? `exam_q_${q.id}_${optNum}` : `exam_q_${q.id}`;

          optionsHTML += `
            <label class="option-btn ${isMulti ? 'option-multi' : ''}" style="cursor: pointer;">
              <input type="${inputType}" name="${nameAttr}" value="${optNum}" style="margin-top: 4px; accent-color: #0284c7; width: 17px; height: 17px; flex-shrink: 0;">
              <div class="option-text">${optStr}</div>
            </label>
          `;
        });

        const cleanTargetProf = (q.thisYearProfessor || '').replace(' 교수님', '').replace('교수', '').trim();
        const rawPastProf = (q.professor || '').trim();
        const pastProf = rawPastProf.replace(/교수님|교수/g, '').trim();
        const displayPastProf = rawPastProf.includes('교수') ? rawPastProf : `${rawPastProf} 교수님`;
        const displayTargetProf = (q.thisYearProfessor || '').includes('교수') ? q.thisYearProfessor : `${cleanTargetProf} 교수님`;
        const isSame = q.isSameProfessor === true || (q.isSameProfessor !== false && cleanTargetProf && pastProf && cleanTargetProf === pastProf);
        let profBadgeTag = '';
        if (cleanTargetProf && pastProf) {
          profBadgeTag = isSame
            ? `<span class="badge same-prof-badge" title="올해 출제 교수님 일치">🎯 올해 동일 교수 (${displayTargetProf})</span>`
            : `<span class="badge diff-prof-badge" title="출제 당시와 올해 교수님 상이">👤 당시 ${displayPastProf} <span class="prof-arrow">→</span> 올해 ${displayTargetProf}</span>`;
        } else if (pastProf) {
          profBadgeTag = `<span class="badge prof-badge">${displayPastProf}</span>`;
        } else if (cleanTargetProf) {
          profBadgeTag = `<span class="badge prof-badge">${displayTargetProf}</span>`;
        }

        const cardSameProfClass = q.isSameProfessor ? ' card-same-prof' : '';
        card.className = `exam-item-card${cardSameProfClass}`;

        const isRandomExam = this.selectedSubjects.size > 1;
        const subjectTag = isRandomExam
          ? `<span class="badge subject-badge badge-masked" title="시험 제출 후 성적표에서 과목명이 공개됩니다.">🔒 과목 시험후 공개</span>`
          : (q.subjectName ? `<span class="badge subject-badge">${q.subjectName.split(' ')[0]}</span>` : '');
        const yearTag = q.year ? `<span class="badge year-badge">${q.year}</span>` : '';
        const validQNum = (q.qNumber !== undefined && q.qNumber !== null && q.qNumber !== 'undefined' && String(q.qNumber).trim() !== '') ? q.qNumber : null;
        const qNumTag = validQNum ? `<span class="badge qnum-badge">원문 ${validQNum}번</span>` : (q.page ? `<span class="badge qnum-badge">슬라이드 ${q.page}p</span>` : '');
        const multiBadgeTag = isMulti
          ? `<span class="badge type-badge multi-type">복수정답 (${expCount ? expCount + '개' : '모두'} 선택)</span>`
          : '';
        const multiNoteHTML = isMulti
          ? `<p class="multi-select-note" style="margin-bottom: 12px; font-size: 0.86rem;">💡 <strong>복수 정답 (${expCount ? expCount + '개' : '모두'} 선택)</strong>: 해당하는 보기를 모두 체크하세요.</p>`
          : '';

        card.innerHTML = `
          <div class="card-meta">
            <div class="meta-badges">
              ${subjectTag}
              ${yearTag}
              ${profBadgeTag}
              ${qNumTag}
              ${multiBadgeTag}
              <span class="badge qnum-badge">문제 ${qIdx + 1}</span>
            </div>
          </div>
          <h3 class="question-title" style="font-size: 1.05rem; margin-bottom: 14px; white-space: pre-line;">${qIdx + 1}. ${fullStem}</h3>
          ${imageHTML}
          ${multiNoteHTML}
          <div class="options-grid" style="margin-bottom: 0;">
            ${optionsHTML}
          </div>
          <div class="exam-item-feedback hidden" style="margin-top: 14px; padding: 12px; border-radius: 8px; font-size: 0.9rem;"></div>
        `;

        this.dom.examQuestionsList.appendChild(card);
      });
    }

    submitExam() {
      let correctCount = 0;
      const total = this.activeQuestions.length;

      this.activeQuestions.forEach((q, qIdx) => {
        const card = document.getElementById(`examCard_${q.id}`);
        if (!card) return;

        const inputs = card.querySelectorAll('.options-grid input:checked');
        const userSelected = Array.from(inputs).map(inp => parseInt(inp.value, 10)).sort((a, b) => a - b);
        const correctAnswers = (Array.isArray(q.answer) ? [...q.answer] : [q.answer]).sort((a, b) => a - b);
        const isCorrect = JSON.stringify(userSelected) === JSON.stringify(correctAnswers);

        // Feedback banner in exam card
        const feedback = card.querySelector('.exam-item-feedback');
        feedback.classList.remove('hidden');

        if (isCorrect) {
          correctCount++;
          feedback.style.background = 'var(--color-success-bg)';
          feedback.style.color = 'var(--color-success)';
          feedback.innerHTML = `
            <div style="font-weight:700; margin-bottom:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span>✓ 정답입니다! (정답: ${correctAnswers.join(', ')}번)</span>
              <span class="badge subject-badge">${q.subjectName || ''}</span>
            </div>
            <div style="font-size:0.85rem; color:var(--text-primary); margin-bottom:6px; line-height:1.6; white-space:pre-line;"><strong>📄 [해설 원문]</strong>\n${q.explanationFile || q.explanationOfficial || q.explanation || ''}</div>
          `;
        } else {
          feedback.style.background = 'var(--color-danger-bg)';
          feedback.style.color = 'var(--color-danger)';
          feedback.innerHTML = `
            <div style="font-weight:700; margin-bottom:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span>✕ 오답입니다! (제출: ${userSelected.length ? userSelected.join(', ') : '미제출'}번 / 정답: ${correctAnswers.join(', ')}번)</span>
              <span class="badge subject-badge">${q.subjectName || ''}</span>
            </div>
            <div style="font-size:0.85rem; color:var(--text-primary); margin-bottom:6px; line-height:1.6; white-space:pre-line;"><strong>📄 [해설 원문]</strong>\n${q.explanationFile || q.explanationOfficial || q.explanationAuthor || q.explanation || ''}</div>
          `;
        }

      });

      this.updateBadges();

      const score = Math.round((correctCount / total) * 100);
      this.dom.finalScorePercent.textContent = score;
      this.dom.summaryTotal.textContent = total;
      this.dom.summaryCorrect.textContent = correctCount;
      this.dom.summaryWrong.textContent = total - correctCount;
      this.dom.summaryAccuracy.textContent = `${score}%`;

      if (score >= 90) {
        this.dom.summaryVerdict.textContent = '🏆 축하합니다! 간질환 시험 만점권입니다!';
        this.sound.playVictory();
        this.confetti.fire();
      } else if (score >= 70) {
        this.dom.summaryVerdict.textContent = '👏 훌륭합니다! 기본 개념이 잘 잡혀있습니다.';
        this.sound.playVictory();
      } else {
        this.dom.summaryVerdict.textContent = '💪 조금 더 복습해볼까요? 북마크하거나 틀린 문제를 다시 확인해보세요.';
        this.sound.playWrong();
      }

      this.dom.examView.classList.add('hidden');
      this.dom.examResultView.classList.remove('hidden');
      this.dom.examResultView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // --- Event Bindings ---
    bindEvents() {
      // Sound & Theme Toggles
      this.dom.soundToggleBtn.addEventListener('click', () => this.toggleSound());
      this.dom.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

      // Nav Tabs
      this.dom.navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          this.switchMode(tab.dataset.mode);
        });
      });

      // Lecture Pills (Multi-select)
      this.dom.lecturePills.forEach(pill => {
        pill.addEventListener('click', () => {
          this.applySubjectFilter(pill.dataset.subject);
        });
      });

      // Count Pills (10/20/30/all random questions)
      if (this.dom.countPills) {
        this.dom.countPills.forEach(pill => {
          pill.addEventListener('click', () => {
            this.setQuestionCountLimit(pill.dataset.count);
          });
        });
      }

      // Filters
      this.dom.filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
          this.applyFilter(pill.dataset.filter);
        });
      });

      // Question Memo Input (Debounced Auto-save)
      if (this.dom.qMemoInput) {
        let memoDebounce;
        this.dom.qMemoInput.addEventListener('input', () => {
          const q = this.activeQuestions[this.currentIndex];
          if (!q) return;
          const val = this.dom.qMemoInput.value;
          if (this.dom.memoStatus) {
            this.dom.memoStatus.textContent = '저장 중...';
            this.dom.memoStatus.style.color = '#f59e0b';
          }
          clearTimeout(memoDebounce);
          memoDebounce = setTimeout(() => {
            if (val.trim()) {
              this.memos[q.id] = val;
            } else {
              delete this.memos[q.id];
            }
            this.saveJSON('gastro_quiz_memos', this.memos);
            if (this.dom.memoStatus) {
              this.dom.memoStatus.textContent = val.trim() ? '✓ 저장됨' : '';
              this.dom.memoStatus.style.color = '#10b981';
            }
            if (this.dom.qHasMemoBadge) {
              this.dom.qHasMemoBadge.classList.toggle('hidden', !val.trim());
            }
          }, 300);
        });
      }

      // Question Memo Clear Button
      if (this.dom.memoClearBtn) {
        this.dom.memoClearBtn.addEventListener('click', () => {
          const q = this.activeQuestions[this.currentIndex];
          if (!q) return;
          if (this.dom.qMemoInput) {
            this.dom.qMemoInput.value = '';
          }
          delete this.memos[q.id];
          this.saveJSON('gastro_quiz_memos', this.memos);
          if (this.dom.memoStatus) {
            this.dom.memoStatus.textContent = '';
          }
          if (this.dom.qHasMemoBadge) {
            this.dom.qHasMemoBadge.classList.add('hidden');
          }
        });
      }

      this.dom.selectAllYearsBtn.addEventListener('click', () => {
        const checkboxes = this.dom.yearCheckboxGrid.querySelectorAll('input');
        checkboxes.forEach(cb => cb.checked = true);
        this.onYearCheckboxChange();
      });

      this.dom.selectRecentYearsBtn.addEventListener('click', () => {
        const checkboxes = this.dom.yearCheckboxGrid.querySelectorAll('input');
        checkboxes.forEach(cb => {
          const isRecent = parseInt(cb.value.replace(/[^0-9]/g, ''), 10) >= 14;
          cb.checked = isRecent;
        });
        this.onYearCheckboxChange();
      });

      // Actions
      this.dom.prevBtn.addEventListener('click', () => this.prevQuestion());
      this.dom.checkAnswerBtn.addEventListener('click', () => this.checkAnswer());
      this.dom.nextBtn.addEventListener('click', () => this.nextQuestion());
      this.dom.bookmarkBtn.addEventListener('click', () => this.toggleBookmarkCurrent());
      this.dom.shuffleBtn.addEventListener('click', () => {
        this.rebuildQuestionPool();
      });

      // Click masked subject badge to preview hint
      if (this.dom.qSubjectBadge) {
        this.dom.qSubjectBadge.addEventListener('click', () => {
          if (this.dom.qSubjectBadge.dataset.realSubject && this.dom.qSubjectBadge.dataset.revealed === 'false') {
            this.dom.qSubjectBadge.textContent = `💡 ${this.dom.qSubjectBadge.dataset.realSubject}`;
            this.dom.qSubjectBadge.classList.remove('badge-masked');
            this.dom.qSubjectBadge.classList.add('badge-revealed');
            this.dom.qSubjectBadge.dataset.revealed = 'true';
          }
        });
      }

      // Exam Buttons
      this.dom.submitExamBtn.addEventListener('click', () => this.submitExam());
      this.dom.retakeExamBtn.addEventListener('click', () => {
        this.rebuildQuestionPool();
        this.dom.examResultView.classList.add('hidden');
        this.dom.examView.classList.remove('hidden');
      });
      this.dom.backToPracticeBtn.addEventListener('click', () => {
        this.switchMode('practice');
      });

      // Global Keyboard Shortcuts
      window.addEventListener('keydown', (e) => {
        // Only in practice mode and not typing in input
        if (this.currentMode !== 'practice') return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // Keys 1 ~ 5: select option
        if (['1', '2', '3', '4', '5'].includes(e.key)) {
          e.preventDefault();
          this.toggleOptionSelect(parseInt(e.key, 10));
        }

        // Enter: Check Answer
        if (e.key === 'Enter') {
          e.preventDefault();
          if (!this.isAnswered) {
            this.checkAnswer();
          } else {
            this.nextQuestion();
          }
        }

        // Space: Next Question (if answered)
        if (e.code === 'Space') {
          if (this.isAnswered) {
            e.preventDefault();
            this.nextQuestion();
          }
        }

        // Key B: Toggle Bookmark
        if (e.key === 'b' || e.key === 'B' || e.key === 'ㅠ') {
          e.preventDefault();
          this.toggleBookmarkCurrent();
        }

        // Escape: Close Lightbox if open
        if (e.key === 'Escape') {
          const modal = document.getElementById('imageLightboxModal');
          if (modal && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
          }
        }
      });

      // Clinical Image Zoom Lightbox
      document.addEventListener('click', (e) => {
        const wrapper = e.target.closest('.image-wrapper');
        const img = e.target.closest('.image-wrapper img');
        if (wrapper || img) {
          const targetImg = img || wrapper.querySelector('img');
          if (targetImg && targetImg.src) {
            this.openImageLightbox(targetImg.src);
          }
        }
      });
    }

    openImageLightbox(src) {
      let modal = document.getElementById('imageLightboxModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'imageLightboxModal';
        modal.className = 'image-lightbox-modal';
        modal.innerHTML = `
          <div class="image-lightbox-close" title="닫기">&times;</div>
          <img src="" alt="확대 임상 이미지">
        `;
        modal.addEventListener('click', (e) => {
          if (e.target !== modal.querySelector('img')) {
            modal.classList.add('hidden');
          }
        });
        document.body.appendChild(modal);
      }
      modal.querySelector('img').src = src;
      modal.classList.remove('hidden');
    }
  }


  // Bootstrap when DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    window.quizApp = new QuizApp();
  });
})();
