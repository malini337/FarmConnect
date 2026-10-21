const METHOD = "Application checklist: visible produce 20 points, selected-name match 40, Gemini visual appearance score weighted to 20, and quantity plausibility 20 (10 if review recommended, 0 if not assessed). This is not a probability, certification or proof of authenticity.";

function calculateVerificationScore(analysis, language = "en") {
  const tamil = language === "ta";
  const method = tamil ? "செயலி கணக்கிடும் ஆதாரப் பட்டியல்: காட்சி விளைபொருள் 20, தேர்ந்தெடுத்த பெயர் பொருத்தம் 40, காட்சி தோற்ற மதிப்பெண்ணின் 20% பங்களிப்பு (அதிகபட்சம் 20), அளவு பொருத்தம் 20 (மதிப்பாய்வு தேவைப்பட்டால் 10). இது நிகழ்தகவு, சான்றிதழ் அல்லது உண்மைத்தன்மைக்கான ஆதாரம் அல்ல." : METHOD;
  const reasons = [];
  let score = 0;
  if (analysis?.isProduce === true) {
    score += 20;
    reasons.push(tamil ? "படத்தில் விளைபொருள் தெரிகிறது (+20)" : "Produce is visibly present (+20)");
  }
  if (analysis?.productMatchStatus === "match") {
    score += 40;
    reasons.push(tamil ? "கண்டறியப்பட்ட விளைபொருள் பட்டியல் பெயருடன் பொருந்துகிறது (+40)" : "Detected produce matches the selected listing name (+40)");
  }
  const appearance = analysis?.appearanceScore;
  if (Number.isInteger(appearance) && appearance >= 0 && appearance <= 100) {
    const points = Math.round(appearance * 0.2);
    score += points;
    reasons.push(tamil ? `காட்சி தோற்றம் ${points}/20 மதிப்பெண்களை வழங்குகிறது` : `Visible appearance contributes ${points}/20 points`);
  }
  if (analysis?.quantityStatus === "roughly_consistent") {
    score += 20;
    reasons.push(tamil ? "அறிவிக்கப்பட்ட அளவு தோராயமான காட்சி வரம்புடன் ஒத்துள்ளது (+20)" : "Declared quantity is broadly consistent with the uncertain visual range (+20)");
  } else if (analysis?.quantityStatus === "review_recommended") {
    score += 10;
    reasons.push(tamil ? "அளவு ஒப்பீட்டிற்கு கைமுறை மதிப்பாய்வு தேவை (+10/20)" : "Quantity comparison needs manual review (+10/20)");
  } else {
    reasons.push(tamil ? "ஆதாரம் போதவில்லை அல்லது பொருத்தமின்மை இருக்கலாம்; அளவு மதிப்பெண் வழங்கப்படவில்லை" : "No quantity-consistency points: evidence was insufficient or a mismatch was possible");
  }
  if (analysis?.isProduce !== true || analysis?.productMatchStatus !== "match") score = Math.min(score, 40);
  return {
    verificationScore: Math.max(0, Math.min(100, score)),
    verificationScoreReasons: reasons,
    verificationScoreMethod: method,
  };
}

module.exports = { calculateVerificationScore, VERIFICATION_SCORE_METHOD: METHOD };
