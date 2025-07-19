import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { CheckIcon, XIcon, CameraIcon, AlertTriangleIcon, RefreshCwIcon, SettingsIcon, SmartphoneIcon } from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isScanning: boolean;
  onToggleScanning: () => void;
}

export function QRScanner({ onScan, onError, isScanning, onToggleScanning }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error' | 'permission-denied' | 'initializing'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [isHttps, setIsHttps] = useState(true);

  // Check if running on HTTPS
  useEffect(() => {
    setIsHttps(window.location.protocol === 'https:' || window.location.hostname === 'localhost');
  }, []);

  // Get available cameras on component mount
  useEffect(() => {
    const getCameras = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          // Request basic camera permission first to get labeled devices
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 }
              } 
            });
            // Stop the stream immediately after getting permission
            stream.getTracks().forEach(track => track.stop());
          } catch (error) {
            console.log('Initial camera permission not granted');
          }
          
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cameras = devices.filter(device => device.kind === 'videoinput');
          setAvailableCameras(cameras);
          if (cameras.length > 0) {
            setSelectedCamera(cameras[0].deviceId);
          }
        }
      } catch (error) {
        console.error('Failed to enumerate cameras:', error);
      }
    };
    getCameras();
  }, []);

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      startScanner();
    } else if (!isScanning && scannerRef.current) {
      stopScanner();
    }
  }, [isScanning, selectedCamera]);

  const startScanner = async () => {
    try {
      setScanStatus('initializing');
      setErrorMessage('');

      // Check if camera permissions are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      // Check HTTPS requirement
      if (!isHttps) {
        setScanStatus('error');
        setErrorMessage('Camera access requires HTTPS. Please use a secure connection.');
        return;
      }

      // Clear any existing scanner
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }

      // Create scanner with flexible camera configuration
      const scannerConfig: any = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 1,
        rememberLastUsedCamera: true,
        // More flexible camera constraints
        videoConstraints: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: { ideal: "environment" }, // Prefer back camera on mobile
        }
      };

      // If specific camera is selected, try to use it but with fallback
      if (selectedCamera && availableCameras.length > 1) {
        try {
          // Test if the selected camera is available
          const testStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: selectedCamera } }
          });
          testStream.getTracks().forEach(track => track.stop());
          
          // If successful, use the specific camera
          scannerConfig.videoConstraints = {
            ...scannerConfig.videoConstraints,
            deviceId: { exact: selectedCamera }
          };
        } catch (error) {
          console.warn('Selected camera not available, falling back to default');
          // Fall back to default camera selection
        }
      }

      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        scannerConfig,
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          setScanResult(decodedText);
          setScanStatus('success');
          setRetryCount(0); // Reset retry count on success
          onScan(decodedText);
          
          // Stop scanning after successful scan
          setTimeout(() => {
            onToggleScanning();
          }, 2000);
        },
        (errorMessage) => {
          console.error('QR scan error:', errorMessage);
          
          // Handle specific error types
          if (errorMessage.includes('NotFound') || errorMessage.includes('NotReadable')) {
            setScanStatus('error');
            setErrorMessage(`Camera error: ${errorMessage}. Please try again or check camera permissions.`);
            if (onError) {
              onError(errorMessage);
            }
          } else if (errorMessage.includes('NotAllowed')) {
            setScanStatus('permission-denied');
            setErrorMessage('Camera access was denied. Please allow camera permissions and try again.');
          }
        }
      );

      setScanStatus('scanning');
    } catch (error: any) {
      console.error('Failed to start QR scanner:', error);
      setScanStatus('error');
      
      // Provide more specific error messages
      if (error.name === 'NotAllowedError') {
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser settings.');
        setScanStatus('permission-denied');
      } else if (error.name === 'NotFoundError') {
        setErrorMessage('No camera found. Please check your device has a working camera.');
      } else if (error.name === 'NotReadableError') {
        setErrorMessage('Camera is already in use by another application. Please close other apps using the camera and try again.');
      } else if (error.name === 'OverconstrainedError') {
        setErrorMessage('Camera configuration not supported. Trying with different settings...');
        // Try with more basic constraints
        setTimeout(() => {
          if (retryCount < 2) {
            setRetryCount(prev => prev + 1);
            startScannerWithBasicConstraints();
          }
        }, 1000);
      } else {
        setErrorMessage(`Camera error: ${error.message || 'Unknown error occurred'}`);
      }
    }
  };

  const startScannerWithBasicConstraints = async () => {
    try {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }

      // Use very basic constraints
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1.0,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          showTorchButtonIfSupported: true,
          videoConstraints: {
            width: { min: 320, ideal: 640 },
            height: { min: 240, ideal: 480 },
            facingMode: "environment"
          }
        },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          setScanResult(decodedText);
          setScanStatus('success');
          setRetryCount(0);
          onScan(decodedText);
          setTimeout(() => onToggleScanning(), 2000);
        },
        (errorMessage) => {
          console.error('QR scan error (basic constraints):', errorMessage);
          setScanStatus('error');
          setErrorMessage(`Scanner error: ${errorMessage}`);
        }
      );

      setScanStatus('scanning');
    } catch (error) {
      console.error('Failed to start scanner with basic constraints:', error);
      setScanStatus('error');
      setErrorMessage('Failed to initialize camera. Please check permissions and try again.');
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanStatus('idle');
    setScanResult(null);
    setErrorMessage('');
    setRetryCount(0);
  };

  const handleRetry = () => {
    setScanStatus('idle');
    setErrorMessage('');
    setRetryCount(0);
    if (isScanning) {
      onToggleScanning();
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      console.error('Camera permission request failed:', error);
      if (error.name === 'NotAllowedError') {
        setScanStatus('permission-denied');
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser settings.');
      } else {
        setScanStatus('error');
        setErrorMessage(`Camera error: ${error.message}`);
      }
      return false;
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <CameraIcon className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">QR Code Scanner</h2>
        <p className="text-slate-600 text-sm">
          Scan ticket QR codes to mark attendance
        </p>
      </div>

      {/* HTTPS Warning */}
      {!isHttps && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-800 mb-1">HTTPS Required</h4>
              <p className="text-sm text-amber-700">
                Camera access requires a secure connection (HTTPS). Please use a secure URL.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Camera Selection (if multiple cameras) */}
      {availableCameras.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select Camera ({availableCameras.length})
          </label>
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            {availableCameras.map((camera) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label || `Camera ${camera.deviceId.slice(0, 8)}...`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Scanner Container */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {!isScanning ? (
          <div className="p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <SmartphoneIcon className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Ready to Scan</h3>
            <p className="text-slate-600 text-sm mb-6">
              Point your camera at a ticket QR code to scan
            </p>
            <Button 
              onClick={onToggleScanning} 
              className="w-full h-12 text-base font-medium"
              size="lg"
              disabled={!isHttps}
            >
              <CameraIcon className="h-5 w-5 mr-2" />
              Start Scanning
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Scanner Area */}
            <div className="relative">
              <div id="qr-reader" className="w-full min-h-[300px]"></div>
              
              {/* Loading Overlay */}
              {scanStatus === 'initializing' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="text-center text-white">
                    <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm">Initializing camera...</p>
                    {retryCount > 0 && (
                      <p className="text-xs mt-1">Retry attempt {retryCount}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Success Message */}
            {scanStatus === 'success' && scanResult && (
              <div className="mx-4 mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckIcon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">Successfully Scanned!</span>
                </div>
                <p className="text-sm text-green-700 mt-1 break-all">
                  {scanResult}
                </p>
              </div>
            )}
            
            {/* Permission Denied */}
            {scanStatus === 'permission-denied' && (
              <div className="mx-4 mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-800 mb-2">Camera Permission Required</h4>
                    <p className="text-sm text-amber-700 mb-3">
                      {errorMessage}
                    </p>
                    <div className="space-y-1 text-xs text-amber-600">
                      <p>• Make sure you're on HTTPS or localhost</p>
                      <p>• Click the camera icon in your browser's address bar</p>
                      <p>• Allow camera access when prompted</p>
                      <p>• Refresh the page and try again</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button 
                        onClick={requestCameraPermission} 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                      >
                        <CameraIcon className="h-4 w-4 mr-2" />
                        Request Permission
                      </Button>
                      <Button 
                        onClick={handleRetry} 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                      >
                        <RefreshCwIcon className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Error Message */}
            {scanStatus === 'error' && (
              <div className="mx-4 mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-800 mb-2">Scanner Error</h4>
                    <p className="text-sm text-red-700 mb-3">
                      {errorMessage}
                    </p>
                    <div className="space-y-1 text-xs text-red-600">
                      <p>• Make sure the QR code is clearly visible</p>
                      <p>• Hold the camera steady</p>
                      <p>• Try adjusting the lighting</p>
                      <p>• Check if camera is being used by another app</p>
                      {retryCount > 0 && (
                        <p>• Retry attempts: {retryCount}/2</p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button 
                        onClick={handleRetry} 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                      >
                        <RefreshCwIcon className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                      {retryCount < 2 && (
                        <Button 
                          onClick={startScannerWithBasicConstraints} 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                        >
                          <SettingsIcon className="h-4 w-4 mr-2" />
                          Basic Mode
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Stop Button */}
            <div className="p-4 border-t border-slate-100">
              <Button 
                onClick={onToggleScanning} 
                variant="outline" 
                className="w-full h-12 text-base font-medium"
                size="lg"
              >
                Stop Scanner
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 