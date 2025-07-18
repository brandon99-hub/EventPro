import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { CheckIcon, XIcon, CameraIcon, AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isScanning: boolean;
  onToggleScanning: () => void;
}

export function QRScanner({ onScan, onError, isScanning, onToggleScanning }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error' | 'permission-denied'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      startScanner();
    } else if (!isScanning && scannerRef.current) {
      stopScanner();
    }
  }, [isScanning]);

  const startScanner = async () => {
    try {
      // Check if camera permissions are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      // Request camera permissions first
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (permissionError) {
        console.error('Camera permission denied:', permissionError);
        setScanStatus('permission-denied');
        setErrorMessage('Camera permission denied. Please allow camera access and try again.');
        return;
      }

      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 2,
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
          setScanStatus('error');
          setErrorMessage(errorMessage);
          if (onError) {
            onError(errorMessage);
          }
        }
      );
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

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CameraIcon className="h-5 w-5" />
          QR Code Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isScanning ? (
          <div className="text-center py-8">
            <CameraIcon className="h-16 w-16 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 mb-4">
              Click the button below to start scanning QR codes
            </p>
            <Button onClick={onToggleScanning} className="w-full">
              Start Scanner
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div id="qr-reader" className="w-full"></div>
            
            {scanStatus === 'success' && scanResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckIcon className="h-5 w-5" />
                  <span className="font-medium">QR Code Scanned Successfully!</span>
                </div>
                <p className="text-sm text-green-700 mt-1 break-all">
                  {scanResult}
                </p>
              </div>
            )}
            
            {scanStatus === 'permission-denied' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangleIcon className="h-5 w-5" />
                  <span className="font-medium">Camera Permission Required</span>
                </div>
                <p className="text-sm text-amber-700 mt-1 mb-3">
                  {errorMessage}
                </p>
                <div className="space-y-2 text-xs text-amber-600">
                  <p>• Make sure you're on HTTPS or localhost</p>
                  <p>• Click the camera icon in your browser's address bar</p>
                  <p>• Allow camera access when prompted</p>
                  <p>• Refresh the page and try again</p>
                </div>
                <Button 
                  onClick={() => {
                    setScanStatus('idle');
                    setErrorMessage('');
                    onToggleScanning();
                  }} 
                  variant="outline" 
                  size="sm"
                  className="mt-3"
                >
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}
            
            {scanStatus === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <XIcon className="h-5 w-5" />
                  <span className="font-medium">Scan Error</span>
                </div>
                <p className="text-sm text-red-700 mt-1 mb-3">
                  {errorMessage}
                </p>
                <div className="space-y-2 text-xs text-red-600">
                  <p>• Make sure the QR code is clearly visible</p>
                  <p>• Hold the camera steady</p>
                  <p>• Try adjusting the lighting</p>
                </div>
                <Button 
                  onClick={() => {
                    setScanStatus('idle');
                    setErrorMessage('');
                    onToggleScanning();
                  }} 
                  variant="outline" 
                  size="sm"
                  className="mt-3"
                >
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}
            
            <Button 
              onClick={onToggleScanning} 
              variant="outline" 
              className="w-full"
            >
              Stop Scanner
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 