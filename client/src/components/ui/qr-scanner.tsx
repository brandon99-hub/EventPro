import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { CheckIcon, XIcon, CameraIcon } from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isScanning: boolean;
  onToggleScanning: () => void;
}

export function QRScanner({ onScan, onError, isScanning, onToggleScanning }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      startScanner();
    } else if (!isScanning && scannerRef.current) {
      stopScanner();
    }
  }, [isScanning]);

  const startScanner = () => {
    try {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
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
          setScanStatus('error');
          if (onError) {
            onError(errorMessage);
          }
        }
      );
    } catch (error) {
      console.error('Failed to start QR scanner:', error);
      setScanStatus('error');
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanStatus('idle');
    setScanResult(null);
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
            
            {scanStatus === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <XIcon className="h-5 w-5" />
                  <span className="font-medium">Scan Error</span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  Please try again or check camera permissions
                </p>
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