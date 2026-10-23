import crypto from 'crypto';
import net from 'net';

export interface VirusScanResult {
  isClean: boolean;
  threatName?: string | null;
  scanEngine: 'heuristic_signature' | 'clamav' | 'virustotal';
  details?: string;
  sha256: string;
}

// Standard EICAR Antivirus Test Signature
const EICAR_SIGNATURE = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

// Dangerous signatures & heuristics
const SUSPICIOUS_PATTERNS = [
  { name: 'EICAR-Test-Signature', pattern: /X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H\+H\*/i },
  { name: 'Suspicious-HTML-Script-Injection', pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/i },
  { name: 'Suspicious-JavaScript-URI', pattern: /javascript\s*:\s*[a-zA-Z0-9_]/i },
  { name: 'PDF-Embedded-Executable-Launch', pattern: /\/(Launch|EmbeddedFiles)\s*<<[\s\S]*?\.(exe|bat|cmd|vbs|ps1)/i },
  { name: 'PDF-Suspicious-Action-JavaScript', pattern: /\/(JavaScript|JS)\s*<<[\s\S]*?eval\(/i },
  { name: 'Suspicious-Shell-Script-Header', pattern: /#!\/(bin|usr\/bin)\/(bash|sh|zsh|python|perl)\s*\n[\s\S]*?(rm\s+-rf|nc\s+-e|curl\s+.*\|\s*sh)/i },
];

/**
 * Synchronous in-memory signature and magic-byte heuristic scanner.
 * Rapidly catches malicious payloads, disguised binaries, and EICAR test vectors.
 */
export function scanBufferHeuristics(
  buffer: Buffer,
  filename: string = '',
  _mimeType: string = ''
): { isClean: boolean; threatName?: string; details?: string } {
  const fileText = buffer.toString('utf8', 0, Math.min(buffer.length, 65536)); // Sample up to 64KB for text analysis

  // 1. EICAR Standard Signature Check
  if (fileText.includes(EICAR_SIGNATURE)) {
    return {
      isClean: false,
      threatName: 'EICAR-Test-Signature.StandardFile',
      details: 'Detected EICAR Standard Antivirus Test File signature.',
    };
  }

  // 2. Disguised Executable Check
  // Windows PE Executable (MZ header: 0x4D, 0x5A) disguised as image or PDF
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext && !['exe', 'dll', 'sys'].includes(ext)) {
      return {
        isClean: false,
        threatName: 'Disguised.Windows.Executable.MZ',
        details: `File has Windows PE (MZ) binary executable header but declared extension ".${ext}".`,
      };
    }
  }

  // Linux ELF Executable header (0x7F, 0x45, 0x4C, 0x46)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x7f &&
    buffer[1] === 0x45 &&
    buffer[2] === 0x4c &&
    buffer[3] === 0x46
  ) {
    return {
      isClean: false,
      threatName: 'Disguised.Linux.ELF.Executable',
      details: 'File contains Linux ELF binary executable format.',
    };
  }

  // Mach-O binary header (0xFE 0xED 0xFA 0xCE or 0xCF, or 0xCA 0xFE 0xBA 0xBE)
  if (buffer.length >= 4) {
    const magic32 = buffer.readUInt32BE(0);
    if (magic32 === 0xfeedface || magic32 === 0xfeedfacf || magic32 === 0xcafebabe) {
      const ext = filename.split('.').pop()?.toLowerCase();
      if (ext && ['pdf', 'png', 'jpg', 'jpeg', 'zip'].includes(ext)) {
        return {
          isClean: false,
          threatName: 'Disguised.MachO.Binary',
          details: 'File contains macOS Mach-O executable header disguised as a document.',
        };
      }
    }
  }

  // 3. Script / Exploit Patterns in Documents and Images
  for (const item of SUSPICIOUS_PATTERNS) {
    if (item.pattern.test(fileText)) {
      return {
        isClean: false,
        threatName: item.name,
        details: `Detected malicious heuristic pattern: ${item.name}`,
      };
    }
  }

  return { isClean: true };
}

/**
 * Scans a buffer using ClamAV daemon if CLAMAV_HOST is configured.
 */
async function scanWithClamAV(buffer: Buffer): Promise<{ isClean: boolean; threatName?: string } | null> {
  const host = process.env.CLAMAV_HOST;
  const port = parseInt(process.env.CLAMAV_PORT || '3310', 10);

  if (!host) return null; // ClamAV daemon not configured

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let response = '';

    socket.setTimeout(5000); // 5 sec timeout

    socket.connect(port, host, () => {
      // ClamAV zINSTREAM command
      socket.write('zINSTREAM\0');
      const chunkSize = 2048;
      for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.subarray(i, i + chunkSize);
        const lenBuf = Buffer.alloc(4);
        lenBuf.writeUInt32BE(chunk.length, 0);
        socket.write(lenBuf);
        socket.write(chunk);
      }
      // Zero-length chunk marks end of stream
      const zeroBuf = Buffer.alloc(4);
      zeroBuf.writeUInt32BE(0, 0);
      socket.write(zeroBuf);
    });

    socket.on('data', (data) => {
      response += data.toString();
    });

    socket.on('end', () => {
      if (response.includes('OK')) {
        resolve({ isClean: true });
      } else if (response.includes('FOUND')) {
        const match = response.match(/stream: (.+) FOUND/);
        resolve({ isClean: false, threatName: match ? match[1] : 'ClamAV.ThreatDetected' });
      } else {
        resolve({ isClean: true });
      }
    });

    socket.on('error', () => {
      resolve(null); // Fallback to heuristic scan
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(null);
    });
  });
}

/**
 * Primary malware inspection function for student uploads.
 * Runs heuristic and signature checks, plus external scanner daemon if configured.
 */
export async function scanFileBuffer(
  buffer: Buffer,
  filename: string = '',
  mimeType: string = ''
): Promise<VirusScanResult> {
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  // 1. Check external ClamAV if available
  const clamResult = await scanWithClamAV(buffer);
  if (clamResult) {
    return {
      isClean: clamResult.isClean,
      threatName: clamResult.threatName || null,
      scanEngine: 'clamav',
      sha256,
      details: clamResult.isClean ? 'ClamAV daemon passed file' : `ClamAV detected threat: ${clamResult.threatName}`,
    };
  }

  // 2. Built-in fast signature & heuristic scanner
  const heuristic = scanBufferHeuristics(buffer, filename, mimeType);
  return {
    isClean: heuristic.isClean,
    threatName: heuristic.threatName || null,
    scanEngine: 'heuristic_signature',
    sha256,
    details: heuristic.details || 'Heuristic inspection clean',
  };
}
