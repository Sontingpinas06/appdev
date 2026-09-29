import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { getRecommendations } from '../api/client';
import { showToast } from '../store/toast';
import type { Measurements, RecommendationResponse } from '../types';

type Method = 'manual' | 'photo';

export default function Sizing() {
    const [method, setMethod] = useState<Method>('manual');
    const [photo, setPhoto] = useState<string | null>(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<RecommendationResponse | null>(null);

    const manualFormRef = useRef<HTMLFormElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const facingRef = useRef<'user' | 'environment'>('environment');
    const resultsRef = useRef<HTMLDivElement>(null);

    // Release the camera when leaving the page.
    useEffect(() => () => stopCamera(), []);

    function stopCamera() {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }

    async function openCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingRef.current,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            setCameraOpen(true);
        } catch (error) {
            console.error('Error accessing camera:', error);
            showToast('Unable to access camera. Please check permissions.', 'error');
        }
    }

    function closeCamera() {
        stopCamera();
        setCameraOpen(false);
    }

    async function switchCamera() {
        facingRef.current = facingRef.current === 'user' ? 'environment' : 'user';
        stopCamera();
        await openCamera();
    }

    function capturePhoto() {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
            (blob) => {
                if (blob) setPhoto(URL.createObjectURL(blob));
                closeCamera();
            },
            'image/jpeg',
            0.95
        );
    }

    function acceptFile(file: File | undefined) {
        if (file && file.type.startsWith('image/')) {
            setPhoto(URL.createObjectURL(file));
        } else {
            showToast('Please select a valid image file', 'error');
        }
    }

    function removePhoto() {
        if (photo) URL.revokeObjectURL(photo);
        setPhoto(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setDragOver(false);
        acceptFile(event.dataTransfer.files[0]);
    }

    async function requestRecommendations(measurements: Measurements) {
        setSubmitting(true);
        try {
            const data = await getRecommendations(measurements);
            setResult(data);
            // Matches the prototype: scroll the results into view once rendered.
            requestAnimationFrame(() =>
                resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
            );
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Something went wrong', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);

        void requestRecommendations({
            studentName: String(form.get('studentName') ?? ''),
            studentId: String(form.get('studentId') ?? ''),
            gender: form.get('gender') as 'Male' | 'Female',
            height: Number(form.get('height')),
            weight: Number(form.get('weight')),
            chest: form.get('chest') ? Number(form.get('chest')) : null,
            waist: form.get('waist') ? Number(form.get('waist')) : null,
            method: 'manual'
        });
    }

    function handlePhotoSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const gender = form.get('photoGender') as 'Male' | 'Female';

        setProcessing(true);

        // AI extraction is still simulated (Phase 5 replaces this).
        window.setTimeout(() => {
            setProcessing(false);
            showToast('AI analysis complete! Measurements extracted successfully.', 'success');

            void requestRecommendations({
                studentName: String(form.get('photoStudentName') ?? ''),
                studentId: '',
                gender,
                height: gender === 'Male' ? 170 + Math.random() * 10 : 160 + Math.random() * 10,
                weight: gender === 'Male' ? 60 + Math.random() * 15 : 50 + Math.random() * 15,
                chest: gender === 'Male' ? 85 + Math.random() * 10 : 80 + Math.random() * 10,
                waist: gender === 'Male' ? 75 + Math.random() * 10 : 65 + Math.random() * 10,
                method: 'photo_scan'
            });
        }, 2000);
    }

    function resetSizing() {
        setResult(null);
        setProcessing(false);
        removePhoto();
        manualFormRef.current?.reset();
    }

    return (
        <section className="section active">
            <div className="container">
                <div className="section-header">
                    <h2>
                        <i className="fas fa-ruler-combined"></i> AI Body Scan Sizing
                    </h2>
                    <p>Get your perfect size recommendation in seconds</p>
                </div>

                <div className="sizing-container">
                    <div className="method-selector">
                        <button
                            className={`method-btn${method === 'manual' ? ' active' : ''}`}
                            onClick={() => setMethod('manual')}
                            id="manual-btn"
                            type="button"
                        >
                            <i className="fas fa-keyboard"></i>
                            <span>Manual Entry</span>
                        </button>
                        <button
                            className={`method-btn${method === 'photo' ? ' active' : ''}`}
                            onClick={() => setMethod('photo')}
                            id="photo-btn"
                            type="button"
                        >
                            <i className="fas fa-camera"></i>
                            <span>Photo Scan</span>
                        </button>
                    </div>

                    {/* Manual entry */}
                    <div id="manual-form" className={`measurement-form${method === 'manual' ? ' active' : ''}`}>
                        <div className="form-card">
                            <h3>Enter Your Measurements</h3>
                            <form id="measurementForm" ref={manualFormRef} onSubmit={handleManualSubmit}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="studentName">
                                            <i className="fas fa-user"></i> Student Name
                                        </label>
                                        <input type="text" id="studentName" name="studentName" required placeholder="Enter full name" />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="studentId">
                                            <i className="fas fa-id-card"></i> Student ID (Optional)
                                        </label>
                                        <input type="text" id="studentId" name="studentId" placeholder="Enter student ID" />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="gender">
                                            <i className="fas fa-venus-mars"></i> Gender
                                        </label>
                                        <select id="gender" name="gender" required defaultValue="">
                                            <option value="" disabled>
                                                Select gender
                                            </option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="height">
                                            <i className="fas fa-arrows-alt-v"></i> Height (cm)
                                        </label>
                                        <input type="number" id="height" name="height" required min="100" max="250" placeholder="e.g., 165" />
                                        <small>Enter your height in centimeters</small>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="weight">
                                            <i className="fas fa-weight"></i> Weight (kg)
                                        </label>
                                        <input type="number" id="weight" name="weight" required min="20" max="200" placeholder="e.g., 55" />
                                        <small>Enter your weight in kilograms</small>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="chest">
                                            <i className="fas fa-ruler-horizontal"></i> Chest (cm) - Optional
                                        </label>
                                        <input type="number" id="chest" name="chest" min="50" max="150" placeholder="e.g., 85" />
                                        <small>Measure around the fullest part of chest</small>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="waist">
                                            <i className="fas fa-ruler-horizontal"></i> Waist (cm) - Optional
                                        </label>
                                        <input type="number" id="waist" name="waist" min="40" max="150" placeholder="e.g., 70" />
                                        <small>Measure around natural waistline</small>
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-primary btn-large" disabled={submitting}>
                                    <i className="fas fa-magic"></i>{' '}
                                    {submitting ? 'Analyzing…' : 'Get Size Recommendations'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Photo scan */}
                    <div id="photo-form" className={`measurement-form${method === 'photo' ? ' active' : ''}`}>
                        <div className="form-card">
                            <h3>
                                <i className="fas fa-camera"></i> Photo Scan for AI Sizing
                            </h3>
                            <div className="photo-upload-area">
                                <div
                                    className="upload-zone"
                                    id="uploadZone"
                                    style={{
                                        display: photo || cameraOpen ? 'none' : undefined,
                                        borderColor: dragOver ? 'var(--primary-color)' : undefined,
                                        background: dragOver ? '#eff6ff' : undefined
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragOver(true);
                                    }}
                                    onDragLeave={(e) => {
                                        e.preventDefault();
                                        setDragOver(false);
                                    }}
                                    onDrop={handleDrop}
                                >
                                    <i className="fas fa-camera"></i>
                                    <h4>Take a Photo or Upload</h4>
                                    <p>For best results, stand straight against a plain background</p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        ref={fileInputRef}
                                        onChange={(e) => acceptFile(e.target.files?.[0])}
                                    />
                                    <div className="photo-buttons">
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                void openCamera();
                                            }}
                                        >
                                            <i className="fas fa-camera"></i> Take Photo
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRef.current?.click();
                                            }}
                                        >
                                            <i className="fas fa-image"></i> Upload Photo
                                        </button>
                                    </div>
                                </div>

                                <div id="cameraView" className="camera-view" style={{ display: cameraOpen ? 'block' : 'none' }}>
                                    <video id="cameraStream" ref={videoRef} autoPlay playsInline></video>
                                    <canvas id="cameraCanvas" ref={canvasRef} style={{ display: 'none' }}></canvas>
                                    <div className="camera-controls">
                                        <button type="button" className="btn btn-danger" onClick={closeCamera}>
                                            <i className="fas fa-times"></i> Cancel
                                        </button>
                                        <button type="button" className="btn btn-primary btn-large" onClick={capturePhoto}>
                                            <i className="fas fa-camera"></i> Capture
                                        </button>
                                        <button type="button" className="btn btn-secondary" onClick={() => void switchCamera()}>
                                            <i className="fas fa-sync"></i> Switch
                                        </button>
                                    </div>
                                </div>

                                <div id="photoPreview" className="photo-preview" style={{ display: photo ? 'block' : 'none' }}>
                                    <img id="previewImage" src={photo ?? ''} alt="Selected scan" />
                                    <button type="button" className="btn btn-danger btn-small" onClick={removePhoto}>
                                        <i className="fas fa-times"></i> Remove
                                    </button>
                                </div>
                            </div>

                            <form id="photoScanForm" onSubmit={handlePhotoSubmit} style={{ display: photo ? undefined : 'none' }}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="photoStudentName">
                                            <i className="fas fa-user"></i> Student Name
                                        </label>
                                        <input type="text" id="photoStudentName" name="photoStudentName" required placeholder="Enter full name" />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="photoGender">
                                            <i className="fas fa-venus-mars"></i> Gender
                                        </label>
                                        <select id="photoGender" name="photoGender" required defaultValue="">
                                            <option value="" disabled>
                                                Select gender
                                            </option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="ai-processing" id="aiProcessing" style={{ display: processing ? 'block' : 'none' }}>
                                    <div className="spinner"></div>
                                    <p>AI is analyzing your photo...</p>
                                </div>

                                <button type="submit" className="btn btn-primary btn-large" disabled={processing || submitting}>
                                    <i className="fas fa-brain"></i> Analyze with AI
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Results */}
                    {result && (
                        <div id="sizing-results" className="sizing-results" ref={resultsRef}>
                            <div className="results-header">
                                <h3>
                                    <i className="fas fa-check-circle"></i> Your Size Recommendations
                                </h3>
                                <button className="btn btn-secondary btn-small" onClick={resetSizing}>
                                    <i className="fas fa-redo"></i> Start Over
                                </button>
                            </div>
                            <div id="recommendationsGrid" className="recommendations-grid">
                                {result.recommendations.map((rec) => {
                                    const badge =
                                        rec.stock > 20
                                            ? { label: 'In Stock', className: 'in-stock' }
                                            : rec.stock > 0
                                              ? { label: `Low Stock (${rec.stock})`, className: 'low-stock' }
                                              : { label: 'Out of Stock', className: 'out-of-stock' };

                                    return (
                                        <div className="recommendation-card" key={rec.uniformId}>
                                            <div className="recommendation-icon">
                                                <i className={`fas ${rec.icon}`}></i>
                                            </div>
                                            <div className="recommendation-info">
                                                <h4>{rec.uniformName}</h4>
                                                <p>
                                                    <i className="fas fa-tag"></i> {rec.category}
                                                </p>
                                                <p>
                                                    <i className="fas fa-dollar-sign"></i> ₱{rec.price.toFixed(2)}
                                                </p>
                                                <span className={`stock-badge ${badge.className}`}>{badge.label}</span>
                                                <p>
                                                    <i className="fas fa-box"></i> {rec.stock} units available
                                                </p>
                                                <div className="confidence-bar">
                                                    <small>Confidence: {rec.confidence.toFixed(0)}%</small>
                                                    <div style={{ background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div className="confidence-fill" style={{ width: `${rec.confidence}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="size-badge">{rec.recommendedSize}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
