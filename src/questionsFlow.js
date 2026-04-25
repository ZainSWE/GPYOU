/* questionsFlow.js — Step-by-step question flow with vertical progress stepper */

const QUESTIONS = [
    {
        id:          'usageInput',
        label:       'Usage',
        text:        'What would you like to use your GPU for?',
        placeholder: 'Gaming, video editing, 3D rendering, AI work...'
    },
    {
        id:          'programsInput',
        label:       'Programs',
        text:        'What programs do you plan to run?',
        placeholder: 'Blender, Premiere Pro, Cyberpunk 2077, Stable Diffusion...'
    },
    {
        id:          'companyInput',
        label:       'Brand',
        text:        'Do you have a GPU manufacturer preference?',
        placeholder: 'NVIDIA, AMD, Intel, or no preference...'
    },
    {
        id:          'budgetInput',
        label:       'Budget',
        text:        "What's your budget or price range?",
        placeholder: '$500–$700, under $1,000, no limit...'
    }
];

let currentStep = 0;
const answers   = ['', '', '', ''];

/* ── Build UI ── */
function buildQuestionFlow() {
    const section = document.getElementById('firstQuestion');
    if (!section) return;

    /* Vertical step track: node → line → node → line … */
    const stepTrackHTML = QUESTIONS.map((q, i) => `
        <div class="step-node ${i === 0 ? 'active' : ''}" data-step="${i}">
            <div class="step-dot">
                <svg class="step-check" width="11" height="11" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="step-num">${i + 1}</span>
            </div>
            <span class="step-step-label">${q.label}</span>
        </div>
        ${i < QUESTIONS.length - 1 ? '<div class="step-line-seg"></div>' : ''}
    `).join('');

    section.innerHTML = `
        <div class="step-progress">
            <div class="step-track">
                ${stepTrackHTML}
            </div>
        </div>

        <div class="question-card" id="question-card">
            <p class="question-prompt" id="question-prompt"></p>
            <div class="prompt-box">
                <input class="user-input" id="current-input" type="text" autocomplete="off" />
            </div>
            <div class="question-nav">
                <button class="nav-back" id="nav-back">← Back</button>
                <button class="nav-next" id="nav-next">Next →</button>
            </div>
        </div>

        <input type="hidden" id="usageInput">
        <input type="hidden" id="programsInput">
        <input type="hidden" id="companyInput">
        <input type="hidden" id="budgetInput">
    `;

    document.getElementById('nav-next').addEventListener('click', nextStep);
    document.getElementById('nav-back').addEventListener('click', prevStep);

    renderStep(0, null);
}

/* ── Render step ── */
function renderStep(step, direction) {
    const q       = QUESTIONS[step];
    const card    = document.getElementById('question-card');
    const prompt  = document.getElementById('question-prompt');
    const input   = document.getElementById('current-input');
    const backBtn = document.getElementById('nav-back');
    const nextBtn = document.getElementById('nav-next');

    /* Update dots */
    document.querySelectorAll('.step-node').forEach((node, i) => {
        node.classList.toggle('active',    i === step);
        node.classList.toggle('completed', i < step);
    });

    /* Update vertical lines */
    document.querySelectorAll('.step-line-seg').forEach((line, i) => {
        line.classList.toggle('filled', i < step);
    });

    /* Animate card */
    const fromX = direction === 'forward' ? 30 : direction === 'back' ? -30 : 0;
    const fromO = direction ? 0 : 1;

    gsap.fromTo(card,
        { opacity: fromO, x: fromX },
        { opacity: 1, x: 0, duration: 0.38, ease: 'power3.out' }
    );

    /* Content */
    prompt.textContent = q.text;
    input.placeholder  = q.placeholder;
    input.value        = answers[step];

    backBtn.style.visibility = step > 0 ? 'visible' : 'hidden';

    const isLast      = step === QUESTIONS.length - 1;
    nextBtn.textContent = isLast ? 'Get Recommendation →' : 'Next →';
    nextBtn.className   = isLast ? 'nav-next nav-submit' : 'nav-next';
    nextBtn.disabled    = false;

    input.onkeydown = (e) => { if (e.key === 'Enter') nextStep(); };

    setTimeout(() => input.focus({ preventScroll: true }), 80);
}

function nextStep() {
    const input = document.getElementById('current-input');
    answers[currentStep] = input.value.trim();

    if (currentStep < QUESTIONS.length - 1) {
        const card = document.getElementById('question-card');
        gsap.to(card, {
            opacity: 0, x: -30, duration: 0.2, ease: 'power2.in',
            onComplete: () => {
                currentStep++;
                renderStep(currentStep, 'forward');
            }
        });
    } else {
        QUESTIONS.forEach((q, i) => {
            const el = document.getElementById(q.id);
            if (el) el.value = answers[i];
        });
        setLoadingState(true);
        askGemini();
    }
}

function prevStep() {
    if (currentStep === 0) return;
    const input = document.getElementById('current-input');
    answers[currentStep] = input.value.trim();

    const card = document.getElementById('question-card');
    gsap.to(card, {
        opacity: 0, x: 30, duration: 0.2, ease: 'power2.in',
        onComplete: () => {
            currentStep--;
            renderStep(currentStep, 'back');
        }
    });
}

function setLoadingState(loading) {
    const btn = document.getElementById('nav-next');
    if (!btn) return;
    if (loading) {
        btn.textContent = 'Analysing...';
        btn.disabled    = true;
    } else {
        btn.textContent = 'Get Recommendation →';
        btn.disabled    = false;
    }
}

document.addEventListener('DOMContentLoaded', buildQuestionFlow);
