
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './FeatureHub.css';

const API =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function TraceabilityPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ta = language === 'ta';

  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [scanError, setScanError] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTraceabilityRecord() {
      try {
        setError('');
        setRecord(null);

        const response = await fetch(
          `${API}/api/features/trace/${encodeURIComponent(token || '')}`
        );

        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? await response.json() : null;
        if (!data) throw new Error(response.ok ? 'The server returned an unexpected response.' : `Traceability API returned HTTP ${response.status}. Check the backend URL.`);

        if (!response.ok) {
          throw new Error(
            data.message || 'Traceability record not found.'
          );
        }

        if (!cancelled) {
          setRecord(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || 'Could not load the traceability record.'
          );
        }
      }
    }

    if (token) {
      loadTraceabilityRecord();
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (token) return undefined;
    let stopped = false;
    let stream;
    let timer;
    async function startScanner() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not available in this browser. Use your phone camera to scan the QR code, or open a traceability URL directly.');
        if (!('BarcodeDetector' in window)) throw new Error('This browser does not support built-in QR scanning. Try a supported Chromium browser or scan the QR code with your phone camera.');
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped) { stream.getTracks().forEach(track => track.stop()); return; }
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        timer = window.setInterval(async () => {
          if (stopped || !videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const raw = codes.find(code => code.rawValue)?.rawValue;
            if (!raw) return;
            const scanned = new URL(raw, window.location.origin);
            if (scanned.origin !== window.location.origin || !scanned.pathname.startsWith('/trace/')) { setScanError('This QR code is not a FarmConnect traceability URL.'); return; }
            stopped = true;
            window.clearInterval(timer);
            stream?.getTracks().forEach(track => track.stop());
            window.location.assign(scanned.href);
          } catch { /* Ignore one-frame camera decode failures. */ }
        }, 500);
      } catch (e) { if (!stopped) setScanError(e.message || 'Could not start QR scanner.'); }
    }
    startScanner();
    return () => { stopped = true; if (timer) window.clearInterval(timer); stream?.getTracks().forEach(track => track.stop()); };
  }, [token]);

  if (!token) {
    return <main className="fc-trace-page"><button onClick={() => navigate('/')}>← FarmConnect home</button><h1>Scan a FarmConnect QR code</h1><p>Allow camera access and point the camera at a product traceability QR code. This scanner only opens traceability URLs on this site.</p>{scanError && <p role="alert">{scanError}</p>}<video ref={videoRef} autoPlay playsInline muted style={{width:'100%',maxWidth:560,borderRadius:12,background:'#15251a'}}/><p>If camera scanning is unsupported, use your phone camera to scan the QR code or open the printed traceability link.</p></main>;
  }

  const formatDate = (value) => {
    if (!value) {
      return ta ? 'பதிவு செய்யப்படவில்லை' : 'Not recorded';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return ta ? 'பதிவு செய்யப்படவில்லை' : 'Not recorded';
    }

    return date.toLocaleString();
  };

  const notRecorded = ta
    ? 'பதிவு செய்யப்படவில்லை'
    : 'Not recorded';

  if (error) {
    return (
      <main className="fc-trace-page">
        <button onClick={() => navigate('/')}>
          ← {ta ? 'ஃபார்ம்கனெக்ட் முகப்பு' : 'FarmConnect home'}
        </button>

        <h1>
          {ta ? 'பொருள் தடமறிதல்' : 'Product Traceability'}
        </h1>

        <p role="alert">{error}</p>

        <button onClick={() => window.location.reload()}>
          {ta ? 'மீண்டும் முயற்சிக்கவும்' : 'Try again'}
        </button>
      </main>
    );
  }

  if (!record) {
    return (
      <main className="fc-trace-page">
        <button onClick={() => navigate('/')}>
          ← {ta ? 'ஃபார்ம்கனெக்ட் முகப்பு' : 'FarmConnect home'}
        </button>

        <h1>
          {ta ? 'பொருள் தடமறிதல்' : 'Product Traceability'}
        </h1>

        <p>
          {ta
            ? 'தடமறிதல் பதிவு ஏற்றப்படுகிறது…'
            : 'Loading traceability record…'}
        </p>
      </main>
    );
  }

  const product = record.product || {};
  const farmer = product.farmer;

  // Support both string and object formats for farmer details.
  const farmerName =
    typeof farmer === 'string'
      ? farmer
      : farmer?.name || 'Farmer';

  const farmerLocation =
    product.location ||
    (typeof farmer === 'object' ? farmer?.location : '') ||
    notRecorded;

  const certifications = Array.isArray(product.certifications)
    ? product.certifications
    : [];

  const journey = product.journey || {};
  const assessment = product.assessment;
  const recommendation = product.priceRecommendation;

  // The backend uses declaredQuantity, expectedPrice and createdAt.
  // Fallbacks preserve compatibility with older API responses.
  const quantity =
    product.declaredQuantity ?? product.quantity;

  const price =
    product.expectedPrice ?? product.price;

  const listingCreated =
    product.createdAt || product.listingCreatedAt;

  return (
    <main className="fc-trace-page">
      <button onClick={() => navigate('/')}>
        ← {ta ? 'ஃபார்ம்கனெக்ட் முகப்பு' : 'FarmConnect home'}
      </button>

      <h1>
        {ta ? 'பொருள் தடமறிதல்' : 'Product Traceability'}
      </h1>

      <section className="fc-feature-panel">
        <h2>
          {product.name || (ta ? 'பெயரிடப்படாத பொருள்' : 'Unnamed product')}
        </h2>

        <p>
          {ta ? 'வகை' : 'Category'}: {product.category || notRecorded}
        </p>

        <p>
          {ta ? 'விவசாயி' : 'Farmer'}: {farmerName}
        </p>

        <p>
          {ta ? 'இடம்' : 'Location'}: {farmerLocation}
        </p>

        <p>
          {ta ? 'அறுவடை தேதி' : 'Harvest date'}:{' '}
          {product.harvestDate
            ? formatDate(product.harvestDate)
            : notRecorded}
        </p>

        <p>
          {ta ? 'சான்றிதழ் கோரிக்கைகள் (சுயமாக வழங்கப்பட்டவை; சரிபார்க்கப்படவில்லை)' : 'Certification claims (user-entered; unverified)'}:{' '}
          {certifications.length ? certifications.join(', ') : notRecorded}
        </p>
        <p>{ta ? 'பட்டியல் சரிபார்ப்பு நிலை' : 'Listing verification status'}: {product.verificationStatus || 'pending'}</p>
        <p>{ta ? 'சான்றிதழ் நிலை' : 'Certification status'}: {product.certificationStatus || 'unverified'}</p>

        <p>
          {ta
            ? 'பதிவுசெய்யப்பட்ட விநியோகங்கள்'
            : 'Recorded delivered orders'}:{' '}
          {journey.deliveredOrderCount ?? 0}
          {journey.lastRecordedDeliveryAt
            ? ` · ${formatDate(journey.lastRecordedDeliveryAt)}`
            : ''}
        </p>

        <p>
          {ta ? 'பட்டியல் அளவு' : 'Listing quantity'}:{' '}
          {quantity ?? notRecorded}
          {product.unit ? ` ${product.unit}` : ''}
        </p>

        <p>
          {ta ? 'பட்டியல் விலை' : 'Listing price'}:{' '}
          {price != null ? `₹${price}` : notRecorded}
          {product.unit ? `/${product.unit}` : ''}
        </p>

        <p>
          {ta ? 'பட்டியல் உருவாக்கப்பட்டது' : 'Listing created'}:{' '}
          {formatDate(listingCreated)}
        </p>

        {assessment && (
          <>
            <h3>
              {ta
                ? 'பதிவுசெய்யப்பட்ட AI காட்சி மதிப்பீடு'
                : 'Recorded AI visual assessment'}
            </h3>

            <p>
              {ta ? 'தோற்ற மதிப்பெண்' : 'Appearance score'}:{' '}
              {assessment.appearanceScore ?? notRecorded}
            </p>

            <p>
              {ta
                ? 'FarmConnect ஆதார மதிப்பெண்'
                : 'FarmConnect evidence score'}:{' '}
              {assessment.verificationScore ?? notRecorded}
              {assessment.verificationScore != null ? '/100' : ''}
            </p>

            {assessment.scoreMethod && (
              <p>{assessment.scoreMethod}</p>
            )}

            <p>
              {ta ? 'கண்டறியப்பட்ட விளைபொருள்' : 'Detected produce'}:{' '}
              {assessment.detectedProduce || notRecorded}
              {' · '}
              {assessment.productMatchStatus || 'unknown'}
            </p>

            {assessment.visibleQuality && (
              <p>
                {ta ? 'காணப்பட்ட தரம்' : 'Visible quality'}:{' '}
                {assessment.visibleQuality}
              </p>
            )}

            {assessment.observations && (
              <p>{assessment.observations}</p>
            )}

            <p>
              {ta ? 'அளவு நிலை' : 'Quantity status'}:{' '}
              {assessment.quantityStatus || 'not_assessed'}
            </p>

            {assessment.quantityComparison && (
              <p>{assessment.quantityComparison}</p>
            )}

            <p>
              {ta ? 'காணப்பட்ட குறைகள்' : 'Visible issues'}:{' '}
              {Array.isArray(assessment.visibleIssues) &&
              assessment.visibleIssues.length
                ? assessment.visibleIssues.join(', ')
                : notRecorded}
            </p>

            <p>
              {ta ? 'மதிப்பீட்டு தேதி' : 'Assessment date'}:{' '}
              {formatDate(assessment.assessedAt)}
            </p>

            {assessment.limitation && (
              <p>{assessment.limitation}</p>
            )}
          </>
        )}

        {recommendation && (
          <>
            <h3>
              {ta
                ? 'விலை பரிந்துரை'
                : 'Price recommendation'}
            </h3>

            <p>
              {ta ? 'நிலை' : 'Status'}:{' '}
              {recommendation.status || 'insufficient_data'}
            </p>

            {recommendation.suggestedMin != null &&
              recommendation.suggestedMax != null && (
                <p>
                  {ta ? 'பரிந்துரைக்கப்பட்ட விலை வரம்பு' : 'Suggested price range'}:{' '}
                  ₹{recommendation.suggestedMin} – ₹{recommendation.suggestedMax}
                </p>
              )}

            {recommendation.explanation && (
              <p>{recommendation.explanation}</p>
            )}

            {recommendation.referenceSource && (
              <p>
                {ta ? 'குறிப்பு மூலம்' : 'Reference source'}:{' '}
                {recommendation.referenceSource}
              </p>
            )}
          </>
        )}

        <p>
          {ta
            ? 'FarmConnect பதிவுசெய்த தகவல்கள் மட்டுமே காட்டப்படுகின்றன. அறுவடை தேதி, சான்றிதழ் அல்லது விநியோகச் சங்கிலி நிகழ்வுகள் பதிவாகவில்லை என்றால் அவை ஊகிக்கப்படாது.'
            : record.disclaimer ||
              'Only information recorded by FarmConnect is displayed. Missing harvest dates, certifications, or delivery events are not inferred.'}
        </p>
      </section>
    </main>
  );
}
