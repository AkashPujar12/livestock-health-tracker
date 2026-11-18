"""
Photo-assistance microservice.

IMPORTANT: this ships with a BASIC image-quality + colour checker, not a trained
disease model. It never names a disease. To upgrade, train/fine-tune a classifier on a
vetted livestock-skin dataset and plug it into `model_predict()` below; keep the
uncertainty wording and the "see a vet" recommendation.
"""
import io
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image

app = FastAPI(title="Livestock photo assistant")


def T(en, kn):
    return {"en": en, "kn": kn}


OBS = {
    "red": T("Reddish or raw-looking area visible.", "ಕೆಂಪು ಅಥವಾ ಹಸಿ ಗಾಯದಂತಹ ಭಾಗ ಕಾಣುತ್ತಿದೆ."),
    "dark": T("Dark patches or scabs visible.", "ಕಪ್ಪು ಕಲೆಗಳು ಅಥವಾ ಹುರುಪು ಕಾಣುತ್ತಿದೆ."),
    "none": T("No obvious redness or dark patches detected by the basic checker.",
              "ಮೂಲ ಪರಿಶೀಲನೆಯಲ್ಲಿ ಸ್ಪಷ್ಟ ಕೆಂಪು ಅಥವಾ ಕಪ್ಪು ಕಲೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ."),
    "poor": T("Photo is blurry or too dark - retake it in good light, close to the affected area.",
              "ಫೋಟೋ ಮಸುಕಾಗಿದೆ ಅಥವಾ ತುಂಬಾ ಕತ್ತಲೆ ಇದೆ - ಉತ್ತಮ ಬೆಳಕಿನಲ್ಲಿ, ಬಾಧಿತ ಭಾಗದ ಹತ್ತಿರದಿಂದ ಮತ್ತೆ ತೆಗೆಯಿರಿ."),
}
CONCERN = T("Possible skin irritation, wound or infection. The cause cannot be confirmed from a photo.",
            "ಚರ್ಮದ ಕಿರಿಕಿರಿ, ಗಾಯ ಅಥವಾ ಸೋಂಕು ಇರಬಹುದು. ಫೋಟೋದಿಂದ ಕಾರಣವನ್ನು ದೃಢಪಡಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.")
PRECAUTIONS = [
    T("Keep the affected area clean and dry.", "ಬಾಧಿತ ಭಾಗವನ್ನು ಸ್ವಚ್ಛ ಮತ್ತು ಒಣಗಿಸಿ ಇಡಿ."),
    T("Do not share grooming or milking equipment between animals.", "ಪ್ರಾಣಿಗಳ ನಡುವೆ ಆರೈಕೆ ಅಥವಾ ಹಾಲು ಕರೆಯುವ ಸಾಧನಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಬೇಡಿ."),
    T("Separate the animal if a contagious condition is suspected.", "ಸಾಂಕ್ರಾಮಿಕ ಎಂದು ಅನುಮಾನವಿದ್ದರೆ ಪ್ರಾಣಿಯನ್ನು ಬೇರೆ ಇಡಿ."),
    T("Wash your hands after handling the animal.", "ಪ್ರಾಣಿಯನ್ನು ಮುಟ್ಟಿದ ನಂತರ ಕೈ ತೊಳೆಯಿರಿ."),
]
EMERGENCY = [
    T("Not eating or drinking for more than 24 hours", "24 ಗಂಟೆಗಳಿಗಿಂತ ಹೆಚ್ಚು ಕಾಲ ತಿನ್ನದಿರುವುದು ಅಥವಾ ಕುಡಿಯದಿರುವುದು"),
    T("Difficulty breathing", "ಉಸಿರಾಟದ ತೊಂದರೆ"),
    T("Heavy bleeding", "ಹೆಚ್ಚು ರಕ್ತಸ್ರಾವ"),
    T("Unable to stand", "ಎದ್ದು ನಿಲ್ಲಲು ಸಾಧ್ಯವಾಗದಿರುವುದು"),
    T("Swollen belly (bloat)", "ಹೊಟ್ಟೆ ಉಬ್ಬುವುದು"),
    T("Very high fever", "ತೀವ್ರ ಜ್ವರ"),
    T("Several animals falling sick at the same time", "ಒಂದೇ ಸಮಯದಲ್ಲಿ ಹಲವು ಪ್ರಾಣಿಗಳು ಅನಾರೋಗ್ಯಕ್ಕೆ ಒಳಗಾಗುವುದು"),
]
DISCLAIMER = T("This is not a diagnosis. Please consult a veterinarian.",
               "ಇದು ರೋಗನಿರ್ಣಯವಲ್ಲ. ದಯವಿಟ್ಟು ಪಶುವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.")


def model_predict(img: Image.Image, species: str):
    """Hook for a real trained model. Return None to use the basic checker only."""
    return None


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/analyze")
async def analyze(image: UploadFile = File(...), species: str = "cow"):
    raw = await image.read()
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Invalid image")
    img.thumbnail((256, 256))
    a = np.asarray(img).astype(float) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    gray = a.mean(-1)

    sharp = float(np.abs(gray[1:-1, 1:-1] * 4 - gray[:-2, 1:-1] - gray[2:, 1:-1]
                         - gray[1:-1, :-2] - gray[1:-1, 2:]).var())
    poor = sharp < 0.0003 or float(gray.mean()) < 0.12
    red = float(((r > 0.55) & (r - g > 0.25) & (r - b > 0.25)).mean())
    dark = float((a.max(-1) < 0.2).mean())

    observations, concerns = [], []
    if poor:
        observations.append(OBS["poor"])
    if red > 0.05:
        observations.append(OBS["red"])
    if dark > 0.15:
        observations.append(OBS["dark"])
    if red > 0.05 or dark > 0.15:
        concerns.append(CONCERN)
    if not observations:
        observations.append(OBS["none"])

    extra = model_predict(img, species)  # optional trained model output
    urgency = "see_vet_soon" if red > 0.2 else "monitor_and_consult_vet"
    return {
        "observations": observations,
        "possibleConcerns": concerns,
        "precautions": PRECAUTIONS,
        "emergencySigns": EMERGENCY,
        "urgency": urgency,
        "vetRecommended": True,
        "confidence": "low",
        "imageQualityPoor": poor,
        "disclaimer": DISCLAIMER,
        "model": extra,
    }
