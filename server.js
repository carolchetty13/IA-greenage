// =====================================================
// MODULE IMPORTS & CONFIGURATION
// =====================================================
require("dotenv").config();
const express = require("express");
const fs = require("fs");
const multer = require("multer");
const session = require("express-session");
const { createWorker } = require("tesseract.js");
const { spawn } = require("child_process");
const path = require("path");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3000;


// =====================================================
// DATABASE POOL
// =====================================================

const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "greenedge_db",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "greenedge-secret",

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 1000 * 60 * 60
        }
    })
);

app.set("view engine", "ejs");

app.use(express.static("public"));


// =====================================================
// IMAGE UPLOAD SETUP
// =====================================================

const uploadFolder =
    path.join(__dirname, "uploads");

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
}

const upload = multer({
    dest: uploadFolder,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed!"));
        }
    }
});


// =====================================================
// NORMALIZE INDIAN PHONE NUMBER
// =====================================================

function normalizeIndianNumber(phone) {

    let cleanPhone =
        String(phone || "")
            .replace(/\D/g, "");


    if (cleanPhone.length === 10) {

        return "91" + cleanPhone;

    }


    if (
        cleanPhone.length === 11 &&
        cleanPhone.startsWith("0")
    ) {

        return "91" +
            cleanPhone.substring(1);

    }


    if (
        cleanPhone.length === 12 &&
        cleanPhone.startsWith("91")
    ) {

        return cleanPhone;

    }


    return cleanPhone;
}


// =====================================================
// WHATSAPP CLOUD API
// =====================================================

async function sendWhatsAppMessage(
    to,
    templateName,
    languageCode = "en_US",
    parameters = []
) {

    const url =
        `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const cleanNumber =
        normalizeIndianNumber(to);

    const requestBody = {

        messaging_product: "whatsapp",

        to: cleanNumber,

        type: "template",

        template: {

            name: templateName,

            language: {
                code: languageCode
            }
        }
    };


    if (parameters.length > 0) {

        requestBody.template.components = [

            {
                type: "body",

                parameters:
                    parameters.map(value => ({

                        type: "text",

                        text: String(value)

                    }))
            }

        ];
    }


    console.log(
        "📤 WhatsApp Message Request:",
        JSON.stringify(requestBody, null, 2)
    );


    const response = await fetch(
        url,
        {
            method: "POST",

            headers: {

                "Authorization":
                    `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,

                "Content-Type":
                    "application/json"
            },

            body:
                JSON.stringify(requestBody)
        }
    );


    const data =
        await response.json();


    console.log(
        "📩 WhatsApp Message Response:",
        JSON.stringify(data, null, 2)
    );


    if (!response.ok) {

        throw new Error(
            data?.error?.message ||
            "WhatsApp message failed."
        );
    }


    return data;
}


// =====================================================
// WHATSAPP LOCATION API
// =====================================================

async function sendWhatsAppLocation(
    to,
    latitude,
    longitude
) {

    const url =
        `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const cleanNumber =
        normalizeIndianNumber(to);

    const lat = Number(latitude);
    const lng = Number(longitude);


    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
    ) {

        throw new Error(
            "Invalid latitude or longitude."
        );
    }


    const requestBody = {

        messaging_product: "whatsapp",

        to: cleanNumber,

        type: "location",

        location: {

            latitude: lat,

            longitude: lng,

            name: "Emergency Location",

            address: "Current SOS Location"

        }

    };


    console.log(
        "📍 LOCATION REQUEST:",
        JSON.stringify(requestBody, null, 2)
    );


    const response = await fetch(
        url,
        {

            method: "POST",

            headers: {

                Authorization:
                    `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,

                "Content-Type":
                    "application/json"

            },

            body:
                JSON.stringify(requestBody)

        }
    );


    const data =
        await response.json();


    console.log(
        "📍 LOCATION API RESPONSE:",
        JSON.stringify(data, null, 2)
    );


    if (!response.ok) {

        throw new Error(
            data?.error?.message ||
            "WhatsApp location failed."
        );

    }


    return data;

}


// =====================================================
// TEST WHATSAPP
// =====================================================

app.get(
    "/test-whatsapp",
    async (req, res) => {

        try {

            const testNumber =
                "919503791496";


            const result =
                await sendWhatsAppMessage(
                    testNumber,
                    "hello_world",
                    "en_US"
                );


            console.log(
                "✅ Test WhatsApp message sent."
            );


            return res.json({

                success: true,

                message:
                    "WhatsApp message sent successfully.",

                result:
                    result

            });

        }
        catch (error) {

            console.error(
                "❌ Test WhatsApp failed:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }
);


// =====================================================
// HOME / PUBLIC ROUTES
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.render("splash");

    }
);


app.get(
    "/login",
    (req, res) => {

        res.render("login");

    }
);


app.get(
    "/home",
    (req, res) => {

        res.render("home");

    }
);


// =====================================================
// VERIFY OTP
// =====================================================

app.get(
    "/verify-otp",
    (req, res) => {

        res.render(
            "verify-otp"
        );

    }
);


// =====================================================
// RESET PASSWORD
// =====================================================

app.get(
    "/reset-password",
    (req, res) => {

        if (
            !req.session.otpVerified ||
            !req.session.resetUserId
        ) {

            return res.redirect(
                "/forgot-password"
            );

        }


        res.render(
            "reset-password"
        );

    }
);


// =====================================================
// REGISTER
// =====================================================

app.get(
    "/register",
    (req, res) => {

        res.render(
            "register"
        );

    }
);


// =====================================================
// SETTINGS PAGE
// =====================================================

app.get(
    "/setting",
    (req, res) => {

        res.render("setting");

    }
);


// =====================================================
// VOICE & AUDIO SETTINGS BACKEND
// =====================================================

// GET VOICE SETTINGS

app.get(
    "/api/voice-settings",
    (req, res) => {

        try {

            // Check whether settings already exist

            if (req.session.voiceSettings) {

                return res.json({

                    success: true,

                    settings:
                        req.session.voiceSettings

                });

            }


            // Default settings

            const defaultSettings = {

                voiceGuidance: true,

                voiceType: "female",

                speechRate: "normal",

                volume: 70,

                hapticFeedback: true

            };


            // Store default settings

            req.session.voiceSettings =
                defaultSettings;


            return res.json({

                success: true,

                settings:
                    defaultSettings

            });

        }
        catch (error) {

            console.error(
                "❌ Error loading voice settings:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load voice settings."

            });

        }

    }
);


// =====================================================
// SAVE VOICE SETTINGS
// =====================================================

app.post(
    "/api/voice-settings",
    (req, res) => {

        try {

            const {

                voiceGuidance,

                voiceType,

                speechRate,

                volume,

                hapticFeedback

            } = req.body;


            // -----------------------------------------
            // VALIDATE VOICE TYPE
            // -----------------------------------------

            const validVoiceTypes = [

                "female",

                "male",

                "default"

            ];


            if (
                !validVoiceTypes.includes(
                    voiceType
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid voice type."

                });

            }


            // -----------------------------------------
            // VALIDATE SPEECH RATE (ALLOW STRINGS & NUMBERS)
            // -----------------------------------------

            const validRates = ["slow", "normal", "fast"];

            let sanitizedRate = speechRate;

            if (typeof speechRate === "number" || !isNaN(Number(speechRate))) {

                const numRate = Number(speechRate);

                if (numRate < 0.5 || numRate > 2.0) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid speech rate range."

                    });

                }

                sanitizedRate = numRate;

            } else if (!validRates.includes(speechRate)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid speech rate format."

                });

            }


            // -----------------------------------------
            // VALIDATE VOLUME
            // -----------------------------------------

            const volumeValue =
                Number(volume);


            if (
                !Number.isFinite(volumeValue) ||
                volumeValue < 0 ||
                volumeValue > 100
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid volume."

                });

            }


            // -----------------------------------------
            // CREATE SETTINGS OBJECT
            // -----------------------------------------

            const voiceSettings = {

                voiceGuidance:
                    Boolean(voiceGuidance),

                voiceType:
                    voiceType,

                speechRate:
                    sanitizedRate,

                volume:
                    volumeValue,

                hapticFeedback:
                    Boolean(hapticFeedback)

            };


            // -----------------------------------------
            // SAVE IN SESSION
            // -----------------------------------------

            req.session.voiceSettings =
                voiceSettings;


            console.log(
                "✅ Voice settings saved:",
                voiceSettings
            );


            // -----------------------------------------
            // SEND RESPONSE
            // -----------------------------------------

            return res.json({

                success: true,

                message:
                    "Voice settings saved successfully.",

                settings:
                    voiceSettings

            });

        }
        catch (error) {

            console.error(
                "❌ Voice settings error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to save voice settings."

            });

        }

    }
);


// =====================================================
// NAVIGATION & UI PAGES
// =====================================================

app.get(
    "/navigate",
    (req, res) => {

        res.render("navigate");

    }
);


app.get(
    "/profile",
    (req, res) => {

        res.render("profile");

    }
);


app.get(
    "/Snavigation",
    (req, res) => {

        res.render("Snavigation");

    }
);


app.get(
    "/documentR",
    (req, res) => {

        res.render("documentR");

    }
);


app.get(
    "/documentS",
    (req, res) => {

        res.render("documentS");

    }
);


app.get(
    "/navigate6",
    (req, res) => {

        res.render("navigate6");

    }
);


// =====================================================
// DOCUMENT OCR + SUMMARY API
// =====================================================

app.post(
    "/api/document/process",

    upload.single("document"),

    async (req, res) => {

        let filePath = null;


        try {

            // Check image

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    message:
                        "No document image received"

                });

            }


            filePath =
                req.file.path;


            console.log(
                "\n📄 Document received"
            );


            console.log(
                "File:",
                req.file.originalname
            );


            // -----------------------------------------
            // OCR
            // -----------------------------------------

            console.log(
                "🔎 Starting OCR..."
            );


            const worker =
                await createWorker("eng");


            const result =
                await worker.recognize(
                    filePath
                );


            const extractedText =
                result.data.text
                    .replace(/\s+/g, " ")
                    .trim();


            await worker.terminate();


            // -----------------------------------------
            // CHECK OCR RESULT
            // -----------------------------------------

            if (!extractedText) {

                return res.json({

                    success: false,

                    message:
                        "No readable text found in the document",

                    text: "",

                    summary: ""

                });

            }


            // -----------------------------------------
            // SIMPLE SUMMARY
            // -----------------------------------------

            const sentences =
                extractedText.match(
                    /[^.!?]+[.!?]+/g
                ) || [];


            let summary;


            if (sentences.length > 0) {

                summary =
                    sentences
                        .slice(0, 3)
                        .join(" ")
                        .trim();

            }
            else {

                summary =
                    extractedText.substring(
                        0,
                        400
                    );

            }


            console.log(
                "✅ OCR completed"
            );


            console.log(
                "Extracted text:"
            );


            console.log(
                extractedText
            );


            console.log(
                "\nSummary:"
            );


            console.log(
                summary
            );


            // -----------------------------------------
            // SEND RESULT
            // -----------------------------------------

            res.json({

                success: true,

                message:
                    "Document processed successfully",

                text:
                    extractedText,

                summary:
                    summary

            });

        }
        catch (error) {

            console.error(
                "❌ Document processing error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to process the document",

                error:
                    error.message

            });

        }
        finally {

            // Delete temporary image

            if (
                filePath &&
                fs.existsSync(filePath)
            ) {

                fs.unlinkSync(filePath);

            }

        }

    }
);


// =====================================================
// SOS PAGE
// =====================================================

app.get(
    "/sos",
    (req, res) => {

        res.render("sos");

    }
);


// =====================================================
// GET EMERGENCY CONTACT
// =====================================================

app.get(
    "/api/emergency-contact",
    async (req, res) => {

        if (!req.session || !req.session.userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Please login first."

            });

        }


        try {

            const [rows] = await db.query(
                "SELECT name, phone FROM emergency_contacts WHERE user_id = ? LIMIT 1",
                [req.session.userId]
            );


            if (rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "No emergency contact found."

                });

            }


            return res.json({

                success: true,

                contact: rows[0]

            });

        }
        catch (error) {

            console.error(
                "❌ Database query error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Database error occurred."

            });

        }

    }
);


// =====================================================
// DISPATCH EMERGENCY SOS (TEXT + LOCATION)
// =====================================================

app.post(
    "/api/sos/send",
    async (req, res) => {

        try {

            const {
                latitude,
                longitude,
                recipientPhone
            } = req.body;


            if (
                !latitude ||
                !longitude ||
                !recipientPhone
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Latitude, longitude, and recipient phone are required."

                });

            }


            const formattedPhone =
                normalizeIndianNumber(recipientPhone);


            // 1. Send WhatsApp emergency alert template

            await sendWhatsAppMessage(
                formattedPhone,
                "emergency_alert",
                "en_US",
                ["EMERGENCY SOS! User needs immediate assistance."]
            );


            // 2. Send live location

            await sendWhatsAppLocation(
                formattedPhone,
                latitude,
                longitude
            );


            return res.json({

                success: true,

                message:
                    "Emergency SOS alert and location sent successfully!"

            });

        }
        catch (error) {

            console.error(
                "❌ SOS Trigger Error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Failed to dispatch SOS alert."

            });

        }

    }
);


// =====================================================
// PYTHON NAVIGATION
// =====================================================

app.get(
    "/location",
    (req, res) => {

        const pythonScriptPath =
            path.join(
                __dirname,
                "python",
                "navigation.py"
            );


        const python =
            spawn(
                "python",
                [
                    pythonScriptPath
                ]
            );


        python.stdout.on(
            "data",
            (data) => {

                console.log(
                    `Python Output: ${data}`
                );

            }
        );


        python.stderr.on(
            "data",
            (data) => {

                console.error(
                    `Python Error: ${data}`
                );

            }
        );


        python.on(
            "close",
            (code) => {

                console.log(
                    `Python exited with code ${code}`
                );

            }
        );


        return res.send(
            "Voice navigation started. Please speak your destination."
        );

    }
);


// =====================================================
// VOICE ASSISTANT PROXY
// =====================================================

app.post(
    "/api/voice-command",
    async (req, res) => {

        try {

            const response =
                await fetch(
                    "http://127.0.0.1:5000/voice",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                req.body
                            )

                    }
                );


            const data =
                await response.json();


            return res.json(data);

        }
        catch (err) {

            console.error(
                "Flask Voice Server Error:",
                err.message
            );


            return res.status(502).json({

                success: false,

                message:
                    "Voice assistant service is currently unreachable.",

                is_active:
                    req.body.is_active || false

            });

        }

    }
);


// =====================================================
// START SERVER
// =====================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `🚀 Server running at http://localhost:${PORT}`
        );

    }
);