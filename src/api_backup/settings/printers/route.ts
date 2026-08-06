import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { verifyToken } from '@/lib/jwt';

const execAsync = promisify(exec);

function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  return decoded?.userId || null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Default virtual printers as fallbacks
    const defaultPrinters = [
      { name: "UPshop Thermal Receipt-58", status: "Online", port: "USB001" },
      { name: "UPshop Wireless Printer-80", status: "Online", port: "192.168.8.100" },
      { name: "Microsoft Print to PDF", status: "Online", port: "PORTPROMPT:" }
    ];

    if (process.platform !== 'win32') {
      return NextResponse.json(defaultPrinters);
    }

    try {
      const { stdout } = await execAsync('powershell -Command "Get-CimInstance Win32_Printer | Select-Object Name, PrinterStatus, PortName | ConvertTo-Json -Compress"');
      if (stdout && stdout.trim() !== '') {
        const parsed = JSON.parse(stdout.trim());
        const printers = Array.isArray(parsed) ? parsed : [parsed];
        const formatted = printers.map((p: any) => ({
          name: p.Name,
          status: p.PrinterStatus === 3 || p.PrinterStatus === 0 ? 'Online' : 'Offline',
          port: p.PortName || ''
        }));
        return NextResponse.json([...formatted, ...defaultPrinters.filter(d => !formatted.some(f => f.name === d.name))]);
      }
    } catch (e) {
      console.warn("CimInstance failed, using alternative Get-Printer command...");
      try {
        const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name, PrinterStatus, PortName | ConvertTo-Json -Compress"');
        if (stdout && stdout.trim() !== '') {
          const parsed = JSON.parse(stdout.trim());
          const printers = Array.isArray(parsed) ? parsed : [parsed];
          const formatted = printers.map((p: any) => ({
            name: p.Name,
            status: p.PrinterStatus === 0 ? 'Online' : 'Offline',
            port: p.PortName || ''
          }));
          return NextResponse.json([...formatted, ...defaultPrinters.filter(d => !formatted.some(f => f.name === d.name))]);
        }
      } catch (err) {
        console.error("Alternative printers list failed:", err);
      }
    }

    return NextResponse.json(defaultPrinters);
  } catch (error) {
    console.error('Discover printers error:', error);
    return NextResponse.json({ error: 'Failed to query system printers' }, { status: 500 });
  }
}
