document.addEventListener('DOMContentLoaded', function() {
    const blowfish = new Blowfish();
    const keyInput = document.getElementById('key');
    const textInput = document.getElementById('text');
    const fileInput = document.getElementById('file');
    const outputDiv = document.getElementById('output');
    const encryptBtn = document.getElementById('encrypt');
    const decryptBtn = document.getElementById('decrypt');
    const clearBtn = document.getElementById('clear');
    const downloadBtn = document.getElementById('download');

    let currentFile = null;
    let currentFileName = '';

    // Handle file upload
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        currentFileName = file.name;
        const reader = new FileReader();
        
        reader.onload = function(e) {
            currentFile = new Uint8Array(e.target.result);
            textInput.value = "File loaded: " + file.name;
        };
        
        reader.readAsArrayBuffer(file);
    });

    // Encrypt (works for text AND files)
    encryptBtn.addEventListener('click', function() {
        try {
            const key = keyInput.value;
            if (key.length !== 16) {
                alert('Key must be exactly 16 characters!');
                return;
            }

            blowfish.expandKey(key);

            if (currentFile) {
                // Encrypt binary file
                const encrypted = blowfish.encryptBinary(currentFile);
                outputDiv.textContent = "Encrypted file ready to download.";
                currentFile = encrypted;
                downloadBtn.disabled = false;
            } else {
                // Encrypt text
                const encrypted = blowfish.encrypt(textInput.value);
                outputDiv.textContent = encrypted;
            }
        } catch (e) {
            alert('Error: ' + e.message);
        }
    });

    // Decrypt (works for text AND files)
    decryptBtn.addEventListener('click', function() {
        try {
            const key = keyInput.value;
            if (key.length !== 16) {
                alert('Key must be exactly 16 characters!');
                return;
            }

            blowfish.expandKey(key);

            if (currentFile) {
                // Decrypt binary file
                const decrypted = blowfish.decryptBinary(currentFile);
                outputDiv.textContent = "Decrypted file ready to download.";
                currentFile = decrypted;
                downloadBtn.disabled = false;
            } else {
                // Decrypt text
                const decrypted = blowfish.decrypt(textInput.value);
                outputDiv.textContent = decrypted;
            }
        } catch (e) {
            alert('Error: ' + e.message);
        }
    });

    // Download decrypted/encrypted file
    downloadBtn.addEventListener('click', function() {
        if (!currentFile) return;

        const blob = new Blob([currentFile]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFileName;
        a.click();
        URL.revokeObjectURL(url);
    });

    clearBtn.addEventListener('click', function() {
        keyInput.value = '';
        textInput.value = '';
        outputDiv.textContent = '';
        fileInput.value = '';
        currentFile = null;
        downloadBtn.disabled = true;
    });
});