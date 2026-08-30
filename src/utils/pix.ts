import QRCode from 'qrcode';

export const PIX_KEY_RAW = '+5573998599213';
export const PIX_KEY_FORMATTED = '+55 (73) 99859-9213';
export const PIX_RECEIVER_NAME = 'MAOS EM OBRA';
export const PIX_CITY = 'BRASIL';

/**
 * Calculates CRC16-CCITT (0xFFFF polynomial 0x1021) for Brazilian Central Bank PIX standards
 */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatEmvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Generates an official Brazilian Central Bank PIX BRCode (EMV standard) payload
 */
export function generatePixPayload(options: {
  key?: string;
  name?: string;
  city?: string;
  amount?: number;
  txId?: string;
  description?: string;
}): string {
  const key = options.key || PIX_KEY_RAW;
  const name = (options.name || PIX_RECEIVER_NAME).normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 25);
  const city = (options.city || PIX_CITY).normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 15);
  const txId = (options.txId || '***').replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) || '***';

  // 00: Payload Format Indicator
  let payload = formatEmvField('00', '01');

  // 01: Point of Initiation Method (12 = dynamic / reusable with amount, 11 = static)
  payload += formatEmvField('01', options.amount && options.amount > 0 ? '12' : '11');

  // 26: Merchant Account Information - PIX
  let merchantInfo = formatEmvField('00', 'br.gov.bcb.pix');
  merchantInfo += formatEmvField('01', key);
  if (options.description) {
    const cleanDesc = options.description.normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 40);
    merchantInfo += formatEmvField('02', cleanDesc);
  }
  payload += formatEmvField('26', merchantInfo);

  // 52: Merchant Category Code
  payload += formatEmvField('52', '0000');

  // 53: Transaction Currency (986 = BRL)
  payload += formatEmvField('53', '986');

  // 54: Transaction Amount (optional if 0)
  if (options.amount && options.amount > 0) {
    payload += formatEmvField('54', options.amount.toFixed(2));
  }

  // 58: Country Code
  payload += formatEmvField('58', 'BR');

  // 59: Merchant Name
  payload += formatEmvField('59', name);

  // 60: Merchant City
  payload += formatEmvField('60', city);

  // 62: Additional Data Field Template (TxID)
  const additionalData = formatEmvField('05', txId);
  payload += formatEmvField('62', additionalData);

  // 63: CRC16 prefix
  const payloadWithCrcPrefix = payload + '6304';
  const checksum = crc16(payloadWithCrcPrefix);

  return payloadWithCrcPrefix + checksum;
}

/**
 * Generates a base64 / data URL QR Code image from a text or PIX payload
 */
export async function generateQrCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 300,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to render QR Code:', err);
    return '';
  }
}
