/* app.js — Gemini API integration + results page reveal
   No server needed — calls Gemini directly from the browser.
   Get your free API key at: https://aistudio.google.com/app/apikey
*/

const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

let gpuData = [];
let selectedGPU = '';

fetch('dataset/gpuData.json')
    .then(res => res.json())
    .then(data => { gpuData = data; });

/* kept so index.html onload= doesn't throw — server is gone */
function bootServer() {}

async function askGemini() {
    const usageInput    = document.getElementById('usageInput')?.value    || '';
    const programsInput = document.getElementById('programsInput')?.value || '';
    const companyInput  = document.getElementById('companyInput')?.value  || '';
    const budgetInput   = document.getElementById('budgetInput')?.value   || '';

    let context = 'Here is a list of GPU information:\n';
    gpuData.forEach(gpu => {
        context += `Name: ${gpu.Name}\nMemory: ${gpu.Memory}\nCompany: ${gpu.Company}\nPerformance: ${gpu.Performance}\nRelease Date: ${gpu.Date}\nPrice: ${gpu.Price}\n\n`;
    });

    let prompt = `${context}\nHere are the user's preferences:\n`;
    prompt += usageInput.trim()    === '' ? 'Usage preference: I have no preference,\n'                           : `Usage preference: ${usageInput}\n`;
    prompt += programsInput.trim() === '' ? 'Performance Expectations: I have no expectations,\n'                 : `Performance Expectations: ${programsInput}\n`;
    prompt += companyInput.trim()  === '' ? 'Preferred company: I have no preference for manufacturer,\n'         : `Preferred company: ${companyInput}\n`;
    prompt += budgetInput.trim()   === '' ? 'Budget: I have no budget restrictions,\n'                            : `Budget: ${budgetInput}\n`;
    prompt += `--If a preference is unrelated to GPUs, ignore it and assume no preference for that section--
    \nBased on these preferences and ONLY the list of GPUs given, which GPU would you recommend?
    The best GPU that satisfies the preferences without exceeding the budget (if specified).
    Mention the GPU name exactly as it appears in the dataset.
    Give one single short sentence recommending 1 GPU and briefly explain why it suits the user in a conversational, non-robotic way.`;

    try {
        const response = await fetch(GEMINI_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const result = await response.json();
        const answer = result.candidates[0].content.parts[0].text;

        selectedGPU = getGPU(answer);

        document.getElementById('finalRec').innerText = answer;
        document.getElementById('specs').innerText =
            `${selectedGPU.Name} Specifications\n` +
            `─────────────────────────\n` +
            `Company     ${selectedGPU.Company}\n` +
            `VRAM        ${selectedGPU.Memory}\n` +
            `Released    ${selectedGPU.Date}\n` +
            `Avg. Price  $${selectedGPU.Price}\n\n` +
            `${selectedGPU.Performance}`;

        document.getElementById('3dModel').src = `models/${selectedGPU.Name}.glb`;

        const page1 = document.getElementById('page1');
        const page2 = document.getElementById('page2');

        if (window.gsap) {
            gsap.to(page1, {
                opacity: 0, duration: 0.28, ease: 'power2.in',
                onComplete: () => {
                    page1.classList.add('hidden');
                    page1.classList.remove('visible');
                    page2.classList.add('visible');
                    page2.classList.remove('hidden');

                    const tl = gsap.timeline();
                    tl.fromTo('#model',
                        { opacity: 0, y: 20 },
                        { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }
                    )
                    .fromTo('.finalRec',
                        { opacity: 0, x: -14 },
                        { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' },
                        '-=0.15'
                    )
                    .fromTo('.spec-card',
                        { opacity: 0, x: 14 },
                        { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' },
                        '-=0.3'
                    )
                    .fromTo('footer',
                        { opacity: 0 },
                        { opacity: 1, duration: 0.3, ease: 'power2.out' },
                        '-=0.15'
                    );

                    window.scrollTo(0, 0);
                    if (window._lenis) window._lenis.scrollTo(0, { immediate: true });
                }
            });
        } else {
            page1.classList.add('hidden');
            page1.classList.remove('visible');
            page2.classList.add('visible');
            page2.classList.remove('hidden');
        }

    } catch (err) {
        console.error('Gemini request failed:', err);
        if (typeof setLoadingState === 'function') setLoadingState(false);
    }
}

function getGPU(answer) {
    for (const gpu of gpuData) {
        if (answer.toLowerCase().includes(gpu.Name.toLowerCase())) return gpu;
    }
    return { Name: 'Unknown', Company: '—', Memory: '—', Date: '—', Price: '—', Performance: '—' };
}
