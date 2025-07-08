// Modified Blowfish implementation (128-bit key, 20 rounds, 2 S-boxes)
class Blowfish {
    constructor() {
        // Initialize P-array with 18+2 entries (original uses 18, we use 20)
        this.P = [
            0x243f6a88, 0x85a308d3, 0x13198a2e, 0x03707344, 0xa4093822,
            0x299f31d0, 0x082efa98, 0xec4e6c89, 0x452821e6, 0x38d01377,
            0xbe5466cf, 0x34e90c6c, 0xc0ac29b7, 0xc97c50dd, 0x3f84d5b5,
            0xb5470917, 0x9216d5d9, 0x8979fb1b, 0xd1310ba6, 0x98dfb5ac
        ];
        
        // Initialize 2 S-boxes with 256 entries each (simplified with pattern)
        this.S0 = new Array(256);
        this.S1 = new Array(256);
        
        // Fill S-boxes with sample values (in a real implementation, these would be the actual Blowfish S-box values)
        for (let i = 0; i < 256; i++) {
            this.S0[i] = (i * 0x01010101) ^ 0x55aa55aa;
            this.S1[i] = (i * 0x02020202) ^ 0xaa55aa55;
        }
    }

  // Key expansion (for 128-bit key)
  expandKey(key) {
    if (key.length !== 16) {
      throw new Error("Key must be exactly 16 characters (128 bits)");
    }

    // Convert key to 32-bit words
    let keyWords = [];
    for (let i = 0; i < 4; i++) {
      keyWords[i] =
        (key.charCodeAt(i * 4) << 24) |
        (key.charCodeAt(i * 4 + 1) << 16) |
        (key.charCodeAt(i * 4 + 2) << 8) |
        key.charCodeAt(i * 4 + 3);
    }

    // XOR P-array with key
    for (let i = 0; i < 20; i++) {
      this.P[i] ^= keyWords[i % 4];
    }

    // Encrypt zero string and update P-array
    let l = 0,
      r = 0;
    for (let i = 0; i < 20; i += 2) {
      [l, r] = this.encryptBlock(l, r);
      this.P[i] = l;
      this.P[i + 1] = r;
    }

    // Update S-boxes
    for (let i = 0; i < 256; i += 2) {
      [l, r] = this.encryptBlock(l, r);
      this.S0[i] = l;
      this.S0[i + 1] = r;
    }

    for (let i = 0; i < 256; i += 2) {
      [l, r] = this.encryptBlock(l, r);
      this.S1[i] = l;
      this.S1[i + 1] = r;
    }
  }

  // Feistel function (uses 2 S-boxes)
  feistel(x) {
    const h = this.S0[x >>> 24] + this.S1[(x >>> 16) & 0xff];
    return (h ^ this.S0[(x >>> 8) & 0xff]) + this.S1[x & 0xff];
  }

  // Encrypt a 64-bit block (fixed to use 20 rounds)
    encryptBlock(l, r) {
        for (let i = 0; i < 20; i += 2) {
            l ^= this.P[i];
            r ^= this.feistel(l);
            r ^= this.P[i + 1];
            l ^= this.feistel(r);
        }
        
        // Final swap and XOR with last two P-entries
        const temp = l ^ this.P[20];
        l = r ^ this.P[19];
        r = temp;
        
        return [l, r];
    }
    
    // Decrypt a 64-bit block (fixed to use 20 rounds)
    decryptBlock(l, r) {
        // Initial swap and XOR with last two P-entries
        let temp = l ^ this.P[20];
        l = r ^ this.P[19];
        r = temp;
        
        for (let i = 18; i >= 0; i -= 2) {
            l ^= this.feistel(r);
            l ^= this.P[i + 1];
            r ^= this.feistel(l);
            r ^= this.P[i];
        }
        
        return [l, r];
    }

  // Encrypt string
  encrypt(str) {
    // Pad string to multiple of 8 bytes
    const pad = 8 - (str.length % 8);
    str += String.fromCharCode(pad).repeat(pad);

    let encrypted = "";

    for (let i = 0; i < str.length; i += 8) {
      let l =
        (str.charCodeAt(i) << 24) |
        (str.charCodeAt(i + 1) << 16) |
        (str.charCodeAt(i + 2) << 8) |
        str.charCodeAt(i + 3);

      let r =
        (str.charCodeAt(i + 4) << 24) |
        (str.charCodeAt(i + 5) << 16) |
        (str.charCodeAt(i + 6) << 8) |
        str.charCodeAt(i + 7);

      [l, r] = this.encryptBlock(l, r);

      encrypted += String.fromCharCode(
        (l >>> 24) & 0xff,
        (l >>> 16) & 0xff,
        (l >>> 8) & 0xff,
        l & 0xff,
        (r >>> 24) & 0xff,
        (r >>> 16) & 0xff,
        (r >>> 8) & 0xff,
        r & 0xff
      );
    }

    return btoa(encrypted);
  }

  // Decrypt string
  decrypt(str) {
    const decoded = atob(str);
    let decrypted = "";

    for (let i = 0; i < decoded.length; i += 8) {
      let l =
        (decoded.charCodeAt(i) << 24) |
        (decoded.charCodeAt(i + 1) << 16) |
        (decoded.charCodeAt(i + 2) << 8) |
        decoded.charCodeAt(i + 3);

      let r =
        (decoded.charCodeAt(i + 4) << 24) |
        (decoded.charCodeAt(i + 5) << 16) |
        (decoded.charCodeAt(i + 6) << 8) |
        decoded.charCodeAt(i + 7);

      [l, r] = this.decryptBlock(l, r);

      decrypted += String.fromCharCode(
        (l >>> 24) & 0xff,
        (l >>> 16) & 0xff,
        (l >>> 8) & 0xff,
        l & 0xff,
        (r >>> 24) & 0xff,
        (r >>> 16) & 0xff,
        (r >>> 8) & 0xff,
        r & 0xff
      );
    }

    // Remove padding
    const pad = decrypted.charCodeAt(decrypted.length - 1);
    return decrypted.slice(0, -pad);
  }
  // Encrypt binary data (Uint8Array)
  encryptBinary(data) {
    // Pad data to multiple of 8 bytes
    const pad = 8 - (data.length % 8);
    const padded = new Uint8Array(data.length + pad);
    padded.set(data);
    for (let i = data.length; i < padded.length; i++) {
      padded[i] = pad;
    }

    const result = new Uint8Array(padded.length);

    for (let i = 0; i < padded.length; i += 8) {
      let l =
        (padded[i] << 24) |
        (padded[i + 1] << 16) |
        (padded[i + 2] << 8) |
        padded[i + 3];
      let r =
        (padded[i + 4] << 24) |
        (padded[i + 5] << 16) |
        (padded[i + 6] << 8) |
        padded[i + 7];

      [l, r] = this.encryptBlock(l, r);

      result[i] = (l >>> 24) & 0xff;
      result[i + 1] = (l >>> 16) & 0xff;
      result[i + 2] = (l >>> 8) & 0xff;
      result[i + 3] = l & 0xff;
      result[i + 4] = (r >>> 24) & 0xff;
      result[i + 5] = (r >>> 16) & 0xff;
      result[i + 6] = (r >>> 8) & 0xff;
      result[i + 7] = r & 0xff;
    }

    return result;
  }

  // Decrypt binary data (Uint8Array)
  decryptBinary(data) {
    const result = new Uint8Array(data.length);

    for (let i = 0; i < data.length; i += 8) {
      let l =
        (data[i] << 24) |
        (data[i + 1] << 16) |
        (data[i + 2] << 8) |
        data[i + 3];
      let r =
        (data[i + 4] << 24) |
        (data[i + 5] << 16) |
        (data[i + 6] << 8) |
        data[i + 7];

      [l, r] = this.decryptBlock(l, r);

      result[i] = (l >>> 24) & 0xff;
      result[i + 1] = (l >>> 16) & 0xff;
      result[i + 2] = (l >>> 8) & 0xff;
      result[i + 3] = l & 0xff;
      result[i + 4] = (r >>> 24) & 0xff;
      result[i + 5] = (r >>> 16) & 0xff;
      result[i + 6] = (r >>> 8) & 0xff;
      result[i + 7] = r & 0xff;
    }

    // Remove padding
    const pad = result[result.length - 1];
    return result.slice(0, result.length - pad);
  }
}
