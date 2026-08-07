import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { HiOutlineArrowDownTray, HiOutlineClipboard } from 'react-icons/hi2';
import { buildUpiLink } from '../../utils/upi';

export default function UpiQr({ qrType = 'dynamic', staticQrUrl, payeeVpa, payeeName, amount, invoiceNumber }) {
  const qrWrapperRef = useRef(null);

  if (qrType === 'static') {
    if (!staticQrUrl) {
      return (
        <p className="rounded-card bg-yellow-50 p-3 text-center text-xs text-yellow-700">
          No static QR uploaded yet. Add one in Settings → Payment, or switch checkout to Dynamic QR.
        </p>
      );
    }
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-brand-200 bg-white p-4">
        <img src={staticQrUrl} alt="Payment QR" className="h-44 w-44 rounded-md object-contain" />
        <p className="text-sm font-semibold text-brand-700">Scan and enter amount manually</p>
        <p className="text-xs text-gray-400">Ask the customer to confirm the amount before paying</p>
      </div>
    );
  }

  if (!payeeVpa) {
    return (
      <p className="rounded-card bg-yellow-50 p-3 text-center text-xs text-yellow-700">
        Add your UPI ID in Settings → Payment Settings to enable QR payments.
      </p>
    );
  }

  const link = buildUpiLink({ payeeVpa, payeeName, amount, invoiceNumber, note: `Bill ${invoiceNumber}` });

  const handleDownload = () => {
    const svg = qrWrapperRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 20, 20, 360, 360);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `upi-qr-${invoiceNumber || 'bill'}.png`;
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(payeeVpa);
      toast.success('UPI ID copied');
    } catch {
      toast.error('Could not copy — long-press the ID instead');
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-brand-200 bg-white p-4">
      <div ref={qrWrapperRef}>
        <QRCodeSVG value={link} size={180} fgColor="#0F5132" className="h-44 w-44 sm:h-48 sm:w-48" />
      </div>
      <p className="text-sm font-semibold text-brand-700">Scan &amp; pay exact amount</p>
      <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-gray-400 active:text-brand-600">
        <span>{payeeVpa}</span>
        <HiOutlineClipboard className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={handleDownload}
        className="mt-1 flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600"
      >
        <HiOutlineArrowDownTray className="h-3.5 w-3.5" />
        Save QR image
      </button>
    </div>
  );
}
