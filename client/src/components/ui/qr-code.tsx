import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from './card';

interface QRCodeDisplayProps {
  value: string;
  title?: string;
  size?: number;
}

export function QRCodeDisplay({ value, title = "QR Code", size = 200 }: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(value, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrDataUrl(dataUrl);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    };

    if (value) {
      generateQR();
    }
  }, [value, size]);

  if (!qrDataUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <img 
          src={qrDataUrl} 
          alt="QR Code" 
          className="border border-slate-200 rounded-lg"
          style={{ width: size, height: size }}
        />
        <p className="text-xs text-slate-500 mt-2 text-center max-w-xs break-all">
          {value}
        </p>
      </CardContent>
    </Card>
  );
} 