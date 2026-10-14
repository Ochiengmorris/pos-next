// no look-alikes: nothing like 0/O or 1/l/I, so a password read aloud or written down survives
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generatePassword(length = 12): string {
  const limit = 256 - (256 % ALPHABET.length); // drop bytes that would bias the choice
  let out = "";
  while (out.length < length) {
    for (const b of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (b < limit && out.length < length)
        out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

// the clipboard API only exists on HTTPS/localhost: report failure instead of throwing
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
