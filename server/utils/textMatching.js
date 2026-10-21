function normalizeProductName(value) {
  let text = String(value ?? "").trim().toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, " ").trim();
  if (text.endsWith("ies") && text.length > 4) text = text.slice(0, -3) + "y";
  else if (/(tomatoes|potatoes|heroes|echoes)$/.test(text)) text = text.slice(0, -2);
  else if (text.endsWith("s") && !text.endsWith("ss") && text.length > 3) text = text.slice(0, -1);
  return text;
}
function normalizeUnit(unit) { return ({ gram: "g", grams: "g", kg: "kg", kilogram: "kg", kilograms: "kg", litre: "litre", liter: "litre", litres: "litre", liters: "litre", pieces: "piece" }[String(unit || "").toLowerCase()] || String(unit || "").toLowerCase()); }
function unitsCompatible(a,b) { return normalizeUnit(a) === normalizeUnit(b); }
module.exports = { normalizeProductName, normalizeUnit, unitsCompatible };
