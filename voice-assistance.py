from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/voice', methods=['POST'])
def process_voice():
    data = request.get_json() or {}
    text = data.get('text', '').lower().strip()

    response = {
        "reply": "I didn't catch that. Please repeat your command.",
        "redirect_url": None,
        "action": None,
        "value": None
    }

    # Navigation Actions
    if any(k in text for k in ["navigation", "navigate", "map", "walk"]):
        response["reply"] = "Opening Navigation."
        response["redirect_url"] = "/Snavigation"

    elif any(k in text for k in ["document reader", "reader", "scan"]):
        response["reply"] = "Opening Document Reader."
        response["redirect_url"] = "/documentR"

    elif any(k in text for k in ["summarization", "summary", "summarize"]):
        response["reply"] = "Opening Document Summarization."
        response["redirect_url"] = "/documentS"

    elif any(k in text for k in ["sos", "emergency", "help"]):
        response["reply"] = "Opening Emergency SOS."
        response["redirect_url"] = "/sos"

    elif any(k in text for k in ["home", "dashboard"]):
        response["reply"] = "Going back to Home Dashboard."
        response["redirect_url"] = "/home"

    # Voice Type Settings Actions
    elif "male voice" in text or "male" in text:
        response["reply"] = "Setting voice type to male."
        response["action"] = "set_voice_type"
        response["value"] = "Male"

    elif "female voice" in text or "female" in text:
        response["reply"] = "Setting voice type to female."
        response["action"] = "set_voice_type"
        response["value"] = "Female"

    # Speech Rate Settings Actions
    elif any(k in text for k in ["fast rate", "faster", "speed up", "speak faster"]):
        response["reply"] = "Setting speech rate to fast."
        response["action"] = "set_speech_rate"
        response["value"] = "Fast"

    elif any(k in text for k in ["slow rate", "slower", "speak slower"]):
        response["reply"] = "Setting speech rate to slow."
        response["action"] = "set_speech_rate"
        response["value"] = "Slow"

    elif any(k in text for k in ["normal rate", "normal speed", "reset speed"]):
        response["reply"] = "Setting speech rate to normal."
        response["action"] = "set_speech_rate"
        response["value"] = "Normal"

    # Volume Settings Actions
    elif any(k in text for k in ["increase volume", "volume up", "louder"]):
        response["reply"] = "Increasing volume."
        response["action"] = "adjust_volume"
        response["value"] = "up"

    elif any(k in text for k in ["decrease volume", "volume down", "quieter"]):
        response["reply"] = "Decreasing volume."
        response["action"] = "adjust_volume"
        response["value"] = "down"

    elif "volume" in text:
        numbers = [int(s) for s in text.split() if s.isdigit()]
        if numbers:
            vol_val = max(0, min(100, numbers[0]))
            response["reply"] = f"Setting volume to {vol_val} percent."
            response["action"] = "set_volume_exact"
            response["value"] = vol_val

    return jsonify(response)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)