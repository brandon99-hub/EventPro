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

  // Get available cameras on component mount
  useEffect(() => {
    const getCameras = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          // First request permission to get camera labels
          try {
            await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (error) {
            // Permission denied, but we can still enumerate devices
            console.log('Camera permission not granted yet');
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

      // Request camera permissions with specific camera if selected
      const constraints = selectedCamera 
        ? { video: { deviceId: { exact: selectedCamera } } }
        : { video: true };

      try {
        await navigator.mediaDevices.getUserMedia(constraints);
      } catch (permissionError: any) {
        console.error('Camera permission denied:', permissionError);
        
        if (permissionError.name === 'NotAllowedError') {
          setScanStatus('permission-denied');
          setErrorMessage('Camera access was denied. Please allow camera permissions in your browser settings.');
        } else if (permissionError.name === 'NotFoundError') {
          setScanStatus('error');
          setErrorMessage('No camera found. Please check your device has a working camera.');
        } else if (permissionError.name === 'NotReadableError') {
          setScanStatus('error');
          setErrorMessage('Camera is already in use by another application. Please close other apps using the camera.');
        } else {
          setScanStatus('error');
          setErrorMessage(`Camera error: ${permissionError.message || 'Unknown error occurred'}`);
        }
        return;
      }

      // Clear any existing scanner
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }

      // Create new scanner with better mobile configuration
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 200, height: 200 }, // Smaller for mobile
          aspectRatio: 1.0,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 1,
          rememberLastUsedCamera: true,
        },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          setScanResult(decodedText);
          setScanStatus('success');
          onScan(decodedText);
          
          // Stop scanning after successful scan
          setTimeout(() => {
            onToggleScanning();
          }, 2000);
        },
        (errorMessage) => {
          console.error('QR scan error:', errorMessage);
          // Don't show every minor error, only significant ones
          if (errorMessage.includes('NotFound') || errorMessage.includes('NotReadable')) {
            setScanStatus('error');
            setErrorMessage(errorMessage);
            if (onError) {
              onError(errorMessage);
            }
          }
        }
      );

      setScanStatus('scanning');
    } catch (error) {
      console.error('Failed to start QR scanner:', error);
      setScanStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start scanner');
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
  };

  const handleRetry = () => {
    setScanStatus('idle');
    setErrorMessage('');
    if (isScanning) {
      onToggleScanning();
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
                    <Button 
                      onClick={handleRetry} 
                      variant="outline" 
                      size="sm"
                      className="mt-3 w-full"
                    >
                      <RefreshCwIcon className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
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
                    </div>
                    <Button 
                      onClick={handleRetry} 
                      variant="outline" 
                      size="sm"
                      className="mt-3 w-full"
                    >
                      <RefreshCwIcon className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
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