const scanBtn = document.getElementById('scanBtn');
const uploadBtn = document.getElementById('uploadBtn');
const cameraInput = document.getElementById('cameraInput');
const galleryInput = document.getElementById('galleryInput');

const extractedText = document.getElementById('extractedText');
const copyBtn = document.getElementById('copyBtn');

const readAloudBtn = document.getElementById('readAloudBtn');
const readIcon = document.getElementById('readIcon');
const readBtnText = document.getElementById('readBtnText');

const statusMsg = document.getElementById('statusMsg');
const backBtn = document.getElementById('backBtn');


// ==========================================
// BACK BUTTON
// ==========================================

backBtn.addEventListener('click', () => {
    window.history.back();
});


// ==========================================
// SCAN DOCUMENT - OPEN CAMERA
// ==========================================

scanBtn.addEventListener('click', () => {

    // Reset previous image selection
    cameraInput.value = "";

    // Open camera
    cameraInput.click();

});


// ==========================================
// UPLOAD FROM GALLERY
// ==========================================

uploadBtn.addEventListener('click', () => {

    // Reset previous image selection
    galleryInput.value = "";

    // Open gallery
    galleryInput.click();

});


// ==========================================
// CAMERA IMAGE SELECTED
// ==========================================

cameraInput.addEventListener('change', (e) => {

    const file = e.target.files[0];

    if (file) {
        processImage(file);
    }

});


// ==========================================
// GALLERY IMAGE SELECTED
// ==========================================

galleryInput.addEventListener('change', (e) => {

    const file = e.target.files[0];

    if (file) {
        processImage(file);
    }

});


// ==========================================
// OCR - EXTRACT TEXT FROM IMAGE
// ==========================================

async function processImage(file) {

    if (!file) {
        return;
    }

    // Check if selected file is an image
    if (!file.type.startsWith('image/')) {

        statusMsg.innerText = "Please select an image.";

        return;
    }

    extractedText.innerText = "Scanning image...";
    statusMsg.innerText = "Preparing OCR...";

    // Disable buttons while scanning
    scanBtn.disabled = true;
    uploadBtn.disabled = true;

    try {

        const result = await Tesseract.recognize(
            file,
            'eng',
            {

                logger: function (info) {

                    if (info.status === 'recognizing text') {

                        const progress =
                            Math.round(info.progress * 100);

                        statusMsg.innerText =
                            `Scanning... ${progress}%`;

                    } else {

                        statusMsg.innerText =
                            "Processing image...";

                    }

                }

            }
        );

        // Get extracted text
        const text = result.data.text.trim();

        if (text.length > 0) {

            extractedText.innerText = text;

            statusMsg.innerText =
                "✅ Text extracted successfully!";

        } else {

            extractedText.innerText =
                "No readable text found in the image.";

            statusMsg.innerText =
                "Try taking a clearer picture.";

        }

    } catch (error) {

        console.error("OCR Error:", error);

        extractedText.innerText =
            "Failed to extract text. Please try another image.";

        statusMsg.innerText =
            "❌ Error reading image.";

    }

    // Enable buttons again
    scanBtn.disabled = false;
    uploadBtn.disabled = false;
}


// ==========================================
// COPY EXTRACTED TEXT
// ==========================================

copyBtn.addEventListener('click', async () => {

    const textToCopy = extractedText.innerText;

    if (
        !textToCopy ||
        textToCopy === "Processing..." ||
        textToCopy === "Scanning image..." ||
        textToCopy === "No readable text found in the image."
    ) {

        statusMsg.innerText = "No text available to copy.";

        return;
    }

    try {

        await navigator.clipboard.writeText(textToCopy);

        copyBtn.className =
            "fa-solid fa-check copy-icon";

        statusMsg.innerText =
            "✅ Copied to clipboard!";

        setTimeout(() => {

            copyBtn.className =
                "fa-regular fa-copy copy-icon";

            statusMsg.innerText = "";

        }, 2000);

    } catch (error) {

        console.error("Copy Error:", error);

        statusMsg.innerText =
            "Unable to copy text.";

    }

});


// ==========================================
// READ ALOUD / STOP READING
// ==========================================

readAloudBtn.addEventListener('click', () => {

    if (!('speechSynthesis' in window)) {

        alert(
            'Text-to-speech is not supported in your browser.'
        );

        return;
    }


    // If already speaking → STOP
    if (window.speechSynthesis.speaking) {

        window.speechSynthesis.cancel();

        setReadingState(false);

        return;
    }


    const text = extractedText.innerText.trim();


    // Don't read empty/processing text
    if (
        !text ||
        text === "Processing..." ||
        text === "Scanning image..." ||
        text === "No readable text found in the image."
    ) {

        statusMsg.innerText =
            "Please scan a document first.";

        return;
    }


    // Create speech
    const utterance =
        new SpeechSynthesisUtterance(text);


    // Speech settings
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;


    // When reading finishes
    utterance.onend = () => {

        setReadingState(false);

    };


    // If speech gives an error
    utterance.onerror = () => {

        setReadingState(false);

        statusMsg.innerText =
            "Unable to read the text.";

    };


    // Start reading
    window.speechSynthesis.speak(utterance);

    setReadingState(true);

});


// ==========================================
// CHANGE READ BUTTON STATE
// ==========================================

function setReadingState(speaking) {

    if (speaking) {

        readIcon.className =
            "fa-solid fa-square";

        readBtnText.innerText =
            "Stop Reading";

    } else {

        readIcon.className =
            "fa-solid fa-volume-high";

        readBtnText.innerText =
            "Read Aloud";

    }

}