let historyLog = [];

class Blowfish {
    constructor(key) {
        if (key.length !== 16) throw new Error("Key must be 16 bytes (128 bits)");
        this.P = Array(20).fill(0);
        this.S0 = Array(256).fill(0);
        this.S1 = Array(256).fill(0);
        this.init(key);
    }

    init(key) {
        const piDigits = [
            0x243f6a88, 0x85a308d3, 0x13198a2e, 0x03707344, 0xa4093822,
            0x299f31d0, 0x082efa98, 0xec4e6c89, 0x452821e6, 0x38d01377,
            0xbe5466cf, 0x34e90c6c, 0xc0ac29b7, 0xc97c50dd, 0x3f84d5b5,
            0xb5470917, 0x9216d5d9, 0x8979fb1b, 0xd1310ba6, 0x98dfb5ac
        ];
        for (let i = 0; i < 20; i++) this.P[i] = piDigits[i];
        for (let i = 0; i < 256; i++) {
            this.S0[i] = piDigits[i % 20];
            this.S1[i] = piDigits[(i + 1) % 20];
        }

        let keyBytes = new TextEncoder().encode(key);
        let j = 0;
        for (let i = 0; i < 20; i++) {
            let data = 0;
            for (let k = 0; k < 4; k++) {
                data = (data << 8) | keyBytes[j];
                j = (j + 1) % keyBytes.length;
            }
            this.P[i] ^= data;
        }

        let L = 0, R = 0;
        for (let i = 0; i < 20; i += 2) {
            [L, R] = this.encryptBlock(L, R);
            this.P[i] = L;
            this.P[i + 1] = R;
        }
        for (let i = 0; i < 256; i += 2) {
            [L, R] = this.encryptBlock(L, R);
            this.S0[i] = L;
            this.S0[i + 1] = R;
            [L, R] = this.encryptBlock(L, R);
            this.S1[i] = L;
            this.S1[i + 1] = R;
        }
    }

    F(x) {
        let a = (x >> 24) & 0xff;
        let b = (x >> 16) & 0xff;
        let c = (x >> 8) & 0xff;
        let d = x & 0xff;
        return ((this.S0[a] + this.S1[b]) ^ this.S0[c]) + this.S1[d];
    }

    encryptBlock(L, R) {
        for (let i = 0; i < 18; i += 2) {
            L ^= this.P[i];
            R ^= this.F(L);
            R ^= this.P[i + 1];
            L ^= this.F(R);
        }
        L ^= this.P[18];
        R ^= this.P[19];
        return [R, L];
    }

    decryptBlock(L, R) {
        for (let i = 19; i > 1; i -= 2) {
            L ^= this.P[i];
            R ^= this.F(L);
            R ^= this.P[i - 1];
            L ^= this.F(R);
        }
        L ^= this.P[1];
        R ^= this.P[0];
        return [R, L];
    }

    encrypt(data) {
        let result = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i += 8) {
            let L = (data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3];
            let R = (data[i + 4] << 24) | (data[i + 5] << 16) | (data[i + 6] << 8) | data[i + 7];
            [L, R] = this.encryptBlock(L, R);
            result.set([
                (L >> 24) & 0xff, (L >> 16) & 0xff, (L >> 8) & 0xff, L & 0xff,
                (R >> 24) & 0xff, (R >> 16) & 0xff, (R >> 8) & 0xff, R & 0xff
            ], i);
        }
        return result;
    }

    decrypt(data) {
        let result = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i += 8) {
            let L = (data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3];
            let R = (data[i + 4] << 24) | (data[i + 5] << 16) | (data[i + 6] << 8) | data[i + 7];
            [L, R] = this.decryptBlock(L, R);
            result.set([
                (L >> 24) & 0xff, (L >> 16) & 0xff, (L >> 8) & 0xff, L & 0xff,
                (R >> 24) & 0xff, (R >> 16) & 0xff, (R >> 8) & 0xff, R & 0xff
            ], i);
        }
        return result;
    }
}

async function encryptText() {
    const textInput = document.getElementById('textInput').value;
    const keyInput = document.getElementById('keyInput').value;
    const status = document.getElementById('status');

    if (!textInput) {
        status.textContent = 'Please enter text.';
        status.className = 'error';
        return;
    }
    if (keyInput.length !== 16) {
        status.textContent = 'Key must be 16 characters (128 bits).';
        status.className = 'error';
        return;
    }

    try {
        const data = new TextEncoder().encode(textInput);
        const blowfish = new Blowfish(keyInput);
        const encrypted = blowfish.encrypt(padData(data));
        const encryptedText = btoa(String.fromCharCode(...encrypted));
        document.getElementById('textInput').value = encryptedText;
        status.textContent = 'Text encrypted successfully!';
        status.className = '';
        addToHistory('Encrypt Text', textInput.slice(0, 20) + (textInput.length > 20 ? '...' : ''));
    } catch (e) {
        status.textContent = 'Error: ' + e.message;
        status.className = 'error';
    }
}

async function decryptText() {
    const textInput = document.getElementById('textInput').value;
    const keyInput = document.getElementById('keyInput').value;
    const status = document.getElementById('status');

    if (!textInput) {
        status.textContent = 'Please enter text.';
        status.className = 'error';
        return;
    }
    if (keyInput.length !== 16) {
        status.textContent = 'Key must be 16 characters (128 bits).';
        status.className = 'error';
        return;
    }

    try {
        const data = new Uint8Array(atob(textInput).split('').map(c => c.charCodeAt(0)));
        const blowfish = new Blowfish(keyInput);
        const decrypted = blowfish.decrypt(data);
        const unpadded = unpadData(decrypted);
        const decryptedText = new TextDecoder().decode(unpadded);
        document.getElementById('textInput').value = decryptedText;
        status.textContent = 'Text decrypted successfully!';
        status.className = '';
        addToHistory('Decrypt Text', textInput.slice(0, 20) + (textInput.length > 20 ? '...' : ''));
    } catch (e) {
        status.textContent = 'Error: ' + e.message;
        status.className = 'error';
    }
}

async function encryptFile() {
    const fileInput = document.getElementById('fileInput');
    const keyInput = document.getElementById('keyInput').value;
    const status = document.getElementById('status');

    if (!fileInput.files.length) {
        status.textContent = 'Please select a file.';
        status.className = 'error';
        return;
    }
    if (keyInput.length !== 16) {
        status.textContent = 'Key must be 16 characters (128 bits).';
        status.className = 'error';
        return;
    }

    try {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async () => {
            const data = new Uint8Array(reader.result);
            const blowfish = new Blowfish(keyInput);
            const encrypted = blowfish.encrypt(padData(data));
            downloadFile(encrypted, file.name + '.enc');
            status.textContent = 'File encrypted successfully!';
            status.className = '';
            addToHistory('Encrypt File', file.name);
        };
        reader.readAsArrayBuffer(file);
    } catch (e) {
        status.textContent = 'Error: ' + e.message;
        status.className = 'error';
    }
}

async function decryptFile() {
    const fileInput = document.getElementById('fileInput');
    const keyInput = document.getElementById('keyInput').value;
    const status = document.getElementById('status');

    if (!fileInput.files.length) {
        status.textContent = 'Please select a file.';
        status.className = 'error';
        return;
    }
    if (keyInput.length !== 16) {
        status.textContent = 'Key must be 16 characters (128 bits).';
        status.className = 'error';
        return;
    }

    try {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async () => {
            const data = new Uint8Array(reader.result);
            const blowfish = new Blowfish(keyInput);
            const decrypted = blowfish.decrypt(data);
            const unpadded = unpadData(decrypted);
            const originalName = file.name.replace('.enc', '');
            downloadFile(unpadded, originalName);
            status.textContent = 'File decrypted successfully!';
            status.className = '';
            addToHistory('Decrypt File', file.name);
        };
        reader.readAsArrayBuffer(file);
    } catch (e) {
        status.textContent = 'Error: ' + e.message;
        status.className = 'error';
    }
}

function padData(data) {
    const blockSize = 8;
    const paddingLength = blockSize - (data.length % 8);
    const padded = new Uint8Array(data.length + paddingLength);
    padded.set(data);
    for (let i = data.length; i < padded.length; i++) {
        padded[i] = paddingLength;
    }
    return padded;
}

function unpadData(data) {
    const paddingLength = data[data.length - 1];
    if (paddingLength > 8 || paddingLength === 0) throw new Error('Invalid padding');
    return data.slice(0, data.length - paddingLength);
}

function downloadFile(data, filename) {
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function addToHistory(operation, input) {
    const timestamp = new Date().toLocaleString();
    historyLog.unshift({ operation, input, timestamp });
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    historyLog.forEach(entry => {
        const li = document.createElement('li');
        li.textContent = `[${entry.timestamp}] ${entry.operation}: ${entry.input}`;
        if (entry.operation === 'Encrypt Text') {
            li.classList.add('encrypt-text');
        } else if (entry.operation === 'Decrypt Text') {
            li.classList.add('decrypt-text');
        }
        historyList.appendChild(li);
    });
}

function showHistory() {
    document.getElementById('historyModal').style.display = 'flex';
    updateHistoryDisplay();
}

function closeModal() {
    document.getElementById('historyModal').style.display = 'none';
}