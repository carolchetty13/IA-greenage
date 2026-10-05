// =========================================
// GLOBAL VOICE ASSISTANT ENGINE
// =========================================

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const synthesis = window.speechSynthesis;

let recognition;
let isAssistantActive = true;
let availableVoices = [];

let currentVoiceSettings = {
    voiceGuidance: true,
    voiceType: "female",
    speechRate: 0.9,
    volume: 0.7
};

// Fetch latest voice settings from Express session
async function fetchVoiceSettings() {
    try {
        const response = await fetch('/api/voice-settings');
        const data = await response.json();
        if (data.success && data.settings) {
            currentVoiceSettings.voiceGuidance = data.settings.voiceGuidance;
            currentVoiceSettings.voiceType = data.settings.voiceType || "female";
            currentVoiceSettings.speechRate = parseFloat(data.settings.speechRate) || 0.9;
            currentVoiceSettings.volume = (parseInt(data.settings.volume) || 70) / 100;
        }
    } catch (e) {
        console.log("Using default voice settings.");
    }
}

// Load browser speech synthesis voices
function loadVoices() {
    if (!synthesis) return;
    availableVoices = synthesis.getVoices();
}

if (synthesis) {
    loadVoices();
    if (synthesis.onvoiceschanged !== undefined) {
        synthesis.onvoiceschanged = loadVoices;
    }
}

// Pick requested voice gender/type
function selectVoice(gender) {
    if (!availableVoices.length) loadVoices();
    
    if (gender === "female") {
        return availableVoices.find(v => v.lang.includes("en") && (v.name.includes("Female") || v.name.includes("Zira") || v.name.includes("Google US English") || v.name.includes("Samantha"))) || availableVoices[0];
    } else if (gender === "male") {
        return availableVoices.find(v => v.lang.includes("en") && (v.name.includes("Male") || v.name.includes("David") || v.name.includes("George"))) || availableVoices[0];
    }
    return availableVoices.find(v => v.default) || availableVoices[0];
}

// Speak audio feedback
function speakFeedback(text) {
    if (!text || !synthesis || !currentVoiceSettings.voiceGuidance) return;

    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const selectedVoice = selectVoice(currentVoiceSettings.voiceType);
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    utterance.rate = currentVoiceSettings.speechRate;
    utterance.volume = currentVoiceSettings.volume;
    synthesis.speak(utterance);
}

// Initialize continuous Web Speech recognition
function initGlobalVoice() {
    if (!SpeechRecognition) {
        console.warn("Speech recognition is not supported in this browser.");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = function (event) {
        const lastIndex = event.results.length - 1;
        const command = event.results[lastIndex][0].transcript.trim().toLowerCase();
        console.log("🗣️ Voice Command Heard:", command);
        processGlobalVoiceCommand(command);
    };

    recognition.onerror = function (event) {
        console.warn("Speech Recognition Error:", event.error);
    };

    recognition.onend = function () {
        if (isAssistantActive) {
            try { recognition.start(); } catch (e) {}
        }
    };

    try {
        recognition.start();
        console.log("🎙️ Global Voice Assistant Initialized & Listening...");
    } catch (e) {
        console.error("Failed to start speech recognition:", e);
    }
}

// Process voice commands for navigation and settings
function processGlobalVoiceCommand(cmd) {

    // ----------------------------------------------------
    // 1. BACK COMMAND (Global)
    // ----------------------------------------------------
    if (cmd.includes("go back") || cmd.includes("back page") || cmd.includes("navigate back")) {
        speakFeedback("Going back.");
        setTimeout(() => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = "/home";
            }
        }, 800);
        return;
    }

    // ----------------------------------------------------
    // 2. PAGE NAVIGATION COMMANDS
    // ----------------------------------------------------
    if (cmd.includes("open home") || cmd.includes("go home")) {
        speakFeedback("Going to home screen.");
        setTimeout(() => window.location.href = "/home", 800);
        return;
    }
    if (cmd.includes("open profile") || cmd.includes("go to profile")) {
        speakFeedback("Opening profile.");
        setTimeout(() => window.location.href = "/profile", 800);
        return;
    }
    if (cmd.includes("open navigation") || cmd.includes("go to navigation")) {
        speakFeedback("Opening navigation.");
        setTimeout(() => window.location.href = "/navigate", 800);
        return;
    }
    if (cmd.includes("safe navigation")) {
        speakFeedback("Opening safe navigation.");
        setTimeout(() => window.location.href = "/Snavigation", 800);
        return;
    }
    if (cmd.includes("emergency") || cmd.includes("open sos") || cmd.includes("trigger sos")) {
        speakFeedback("Opening emergency SOS.");
        setTimeout(() => window.location.href = "/sos", 800);
        return;
    }
    if (cmd.includes("document reader") || cmd.includes("read document")) {
        speakFeedback("Opening document reader.");
        setTimeout(() => window.location.href = "/documentR", 800);
        return;
    }
    if (cmd.includes("document summary") || cmd.includes("summarize document")) {
        speakFeedback("Opening document summary.");
        setTimeout(() => window.location.href = "/documentS", 800);
        return;
    }
    if (cmd.includes("open settings") || cmd.includes("go to settings")) {
        speakFeedback("Opening settings.");
        setTimeout(() => window.location.href = "/setting", 800);
        return;
    }

    // ----------------------------------------------------
    // 3. VOICE & AUDIO SETTINGS CONTROLS (Settings Page)
    // ----------------------------------------------------
    
    // Voice Guidance Toggle
    if (cmd.includes("turn off voice guidance") || cmd.includes("disable voice guidance")) {
        updateVoiceSettingControl('voiceGuidance', false);
        speakFeedback("Voice guidance disabled.");
        return;
    }
    if (cmd.includes("turn on voice guidance") || cmd.includes("enable voice guidance")) {
        updateVoiceSettingControl('voiceGuidance', true);
        speakFeedback("Voice guidance enabled.");
        return;
    }

    // Voice Type Selection (Female / Male / Default)
    if (cmd.includes("change voice to female") || cmd.includes("set voice to female") || cmd.includes("female voice")) {
        currentVoiceSettings.voiceType = "female";
        updateVoiceSettingControl('voiceType', "female");
        speakFeedback("Voice type changed to female.");
        return;
    }
    if (cmd.includes("change voice to male") || cmd.includes("set voice to male") || cmd.includes("male voice")) {
        currentVoiceSettings.voiceType = "male";
        updateVoiceSettingControl('voiceType', "male");
        speakFeedback("Voice type changed to male.");
        return;
    }

    // Speech Rate Controls (Slow / Normal / Fast)
    if (cmd.includes("set speech rate to slow") || cmd.includes("speak slower") || cmd.includes("slow speech rate")) {
        currentVoiceSettings.speechRate = 0.7;
        updateVoiceSettingControl('speechRate', "slow");
        speakFeedback("Speech rate set to slow.");
        return;
    }
    if (cmd.includes("set speech rate to normal") || cmd.includes("normal speech rate")) {
        currentVoiceSettings.speechRate = 1.0;
        updateVoiceSettingControl('speechRate', "normal");
        speakFeedback("Speech rate set to normal.");
        return;
    }
    if (cmd.includes("set speech rate to fast") || cmd.includes("speak faster") || cmd.includes("fast speech rate")) {
        currentVoiceSettings.speechRate = 1.3;
        updateVoiceSettingControl('speechRate', "fast");
        speakFeedback("Speech rate set to fast.");
        return;
    }

    // Volume Slider Controls (Volume percentage or level adjustments)
    if (cmd.includes("set volume to") || cmd.includes("change volume to") || cmd.includes("volume")) {
        const match = cmd.match(/\d+/);
        if (match) {
            let volVal = parseInt(match[0]);
            if (volVal >= 0 && volVal <= 100) {
                currentVoiceSettings.volume = volVal / 100;
                updateVoiceSettingControl('volume', volVal);
                speakFeedback(`Volume set to ${volVal} percent.`);
                return;
            }
        }
    }
}

// Helper to update DOM controls on setting.ejs and persist to backend
async function updateVoiceSettingControl(settingKey, value) {
    // 1. Update UI Elements if on setting.ejs page
    const guidanceToggle = document.querySelector('input[name="voiceGuidance"], #voiceGuidanceToggle, .voice-guidance-toggle');
    const voiceTypeSelect = document.querySelector('select[name="voiceType"], #voiceTypeSelect');
    const speechRateSelect = document.querySelector('select[name="speechRate"], #speechRateSelect');
    const volumeSlider = document.querySelector('input[type="range"][name="volume"], #volumeSlider');
    const volumeLabel = document.querySelector('#volumePercentage, .volume-percentage');

    if (settingKey === 'voiceGuidance' && guidanceToggle) {
        guidanceToggle.checked = value;
    } else if (settingKey === 'voiceType' && voiceTypeSelect) {
        voiceTypeSelect.value = value;
    } else if (settingKey === 'speechRate' && speechRateSelect) {
        speechRateSelect.value = value;
    } else if (settingKey === 'volume' && volumeSlider) {
        volumeSlider.value = value;
        if (volumeLabel) volumeLabel.textContent = `${value}%`;
    }

    // 2. Persist updated values to backend session
    try {
        const currentGuidance = guidanceToggle ? guidanceToggle.checked : currentVoiceSettings.voiceGuidance;
        const currentType = voiceTypeSelect ? voiceTypeSelect.value : currentVoiceSettings.voiceType;
        const currentRate = speechRateSelect ? (speechRateSelect.value === 'slow' ? 0.7 : speechRateSelect.value === 'fast' ? 1.3 : 1.0) : currentVoiceSettings.speechRate;
        const currentVol = volumeSlider ? parseInt(volumeSlider.value) : Math.round(currentVoiceSettings.volume * 100);

        await fetch('/api/voice-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                voiceGuidance: currentGuidance,
                voiceType: currentType,
                speechRate: currentRate,
                volume: currentVol,
                hapticFeedback: true
            })
        });
    } catch (e) {
        console.error("Failed to persist voice settings:", e);
    }
}

// Start assistant on DOM ready
window.addEventListener('DOMContentLoaded', async () => {
    await fetchVoiceSettings();
    initGlobalVoice();
});