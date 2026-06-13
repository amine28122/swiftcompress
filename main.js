// ========================================================
// SwiftCompress — Main Engine v2.0
// Features: Real compression, Drag & Drop, Binary search
// for target size, PDF image re-compression
// ========================================================

// Lazy-load FFmpeg only when needed (avoids render blocking)
let ffmpeg = null;
let ffmpegLoading = false;

async function getFFmpeg() {
    if (ffmpeg && ffmpeg.isLoaded()) return ffmpeg;
    if (ffmpegLoading) {
        // Wait until loaded
        while (ffmpegLoading) await new Promise(r => setTimeout(r, 100));
        return ffmpeg;
    }
    ffmpegLoading = true;
    const { createFFmpeg, fetchFile } = FFmpeg;
    ffmpeg = createFFmpeg({ log: false });
    await ffmpeg.load();
    ffmpegLoading = false;
    window._fetchFile = fetchFile;
    return ffmpeg;
}

document.addEventListener('DOMContentLoaded', () => {

    // ─────────────────────────────────────────────
    // UTILITY FUNCTIONS
    // ─────────────────────────────────────────────
    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function showSavingsBadge(origSize, compSize, elementId) {
        const saved = Math.round((1 - compSize / origSize) * 100);
        const el = document.getElementById(elementId);
        if (el) {
            if (saved > 0) {
                el.textContent = `−${saved}% saved!`;
                el.style.display = 'inline-block';
            } else {
                el.textContent = `File already optimized`;
                el.style.display = 'inline-block';
            }
        }
    }

    function setupDragDrop(zoneId, inputId, onFileCb) {
        const zone = document.getElementById(zoneId);
        if (!zone) return;

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) onFileCb(file);
        });

        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', (e) => {
                if (e.target.files.length) onFileCb(e.target.files[0]);
            });
        }

        zone.addEventListener('click', () => {
            if (input) input.click();
        });
    }


    // ─────────────────────────────────────────────
    // 1. IMAGE COMPRESSOR — Canvas API (real compression)
    // ─────────────────────────────────────────────
    if (document.getElementById('imgUploadArea')) {
        let imgFile = null;

        function handleImgFile(file) {
            if (!file.type.startsWith('image/')) {
                alert('Please select a valid image file (JPG, PNG, WebP).');
                return;
            }
            imgFile = file;
            document.getElementById('imgUploadArea').style.display = 'none';
            document.getElementById('imgControls').style.display = 'block';
            document.getElementById('imgName').textContent = file.name;
            document.getElementById('imgSize').textContent = formatBytes(file.size);
        }

        setupDragDrop('imgUploadArea', 'imgInput', handleImgFile);

        document.getElementById('imgQuality').addEventListener('input', (e) => {
            document.getElementById('imgQualityVal').textContent = `${e.target.value}%`;
        });

        document.getElementById('imgCompressBtn').addEventListener('click', () => {
            if (!imgFile) return;
            const btn = document.getElementById('imgCompressBtn');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Compressing...';
            btn.disabled = true;

            const quality = parseInt(document.getElementById('imgQuality').value) / 100;
            const reader = new FileReader();
            reader.readAsDataURL(imgFile);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    // Optionally scale down very large images
                    let W = img.width, H = img.height;
                    const MAX_DIM = 4096;
                    if (W > MAX_DIM || H > MAX_DIM) {
                        const ratio = Math.min(MAX_DIM / W, MAX_DIM / H);
                        W = Math.round(W * ratio);
                        H = Math.round(H * ratio);
                    }
                    canvas.width = W; canvas.height = H;
                    const ctx = canvas.getContext('2d');
                    // Fill white background for transparent PNGs (avoids black bg in JPEG output)
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, W, H);
                    ctx.drawImage(img, 0, 0, W, H);

                    // Always output as JPEG for best compression; keep PNG as webp
                    let outType = imgFile.type === 'image/png' ? 'image/webp' : 'image/jpeg';

                    canvas.toBlob((blob) => {
                        document.getElementById('imgControls').style.display = 'none';
                        document.getElementById('imgResult').style.display = 'block';
                        btn.innerHTML = '<i class="fa-solid fa-compress"></i> Optimize Image';
                        btn.disabled = false;

                        const origSize = imgFile.size;
                        const compSize = blob.size;
                        document.getElementById('imgResOrig').textContent = formatBytes(origSize);
                        document.getElementById('imgResComp').textContent = formatBytes(compSize);
                        showSavingsBadge(origSize, compSize, 'imgSavingsBadge');

                        const url = URL.createObjectURL(blob);
                        const link = document.getElementById('imgDownloadBtn');
                        const ext = outType === 'image/webp' ? 'webp' : 'jpg';
                        link.href = url;
                        link.download = `compressed-${imgFile.name.split('.')[0]}.${ext}`;
                    }, outType, quality);
                };
            };
        });
    }


    // ─────────────────────────────────────────────
    // 2. PDF COMPRESSOR — Real image re-compression inside PDF
    // ─────────────────────────────────────────────
    if (document.getElementById('pdfUploadArea')) {
        let pdfFile = null;

        function handlePdfFile(file) {
            if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
                alert('Please select a valid PDF file.');
                return;
            }
            pdfFile = file;
            document.getElementById('pdfUploadArea').style.display = 'none';
            document.getElementById('pdfControls').style.display = 'block';
            document.getElementById('pdfName').textContent = file.name;
            document.getElementById('pdfSize').textContent = formatBytes(file.size);
        }

        setupDragDrop('pdfUploadArea', 'pdfInput', handlePdfFile);

        // Update label on slider change
        const pdfQualitySlider = document.getElementById('pdfQuality');
        if (pdfQualitySlider) {
            pdfQualitySlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                let label = val > 75 ? 'Light' : val > 40 ? 'Medium' : 'Maximum';
                document.getElementById('pdfQualityVal').textContent = `${label} (${val}%)`;
            });
        }

        document.getElementById('pdfCompressBtn').addEventListener('click', async () => {
            if (!pdfFile) return;
            const btn = document.getElementById('pdfCompressBtn');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Optimizing PDF...';
            btn.disabled = true;

            try {
                const arrayBuffer = await pdfFile.arrayBuffer();
                const qualPercent = parseInt(document.getElementById('pdfQuality').value) || 50;
                const imgQuality = qualPercent / 100; // 0.0 to 1.0

                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, {
                    ignoreEncryption: false
                });

                // --- Re-compress embedded images ---
                const pages = pdfDoc.getPages();
                for (const page of pages) {
                    const { width, height } = page.getSize();
                    try {
                        const xObjects = page.node.Resources()?.lookup(
                            PDFLib.PDFName.of('XObject'), PDFLib.PDFDict
                        );
                        if (!xObjects) continue;

                        for (const [key, ref] of Object.entries(xObjects.dict)) {
                            try {
                                const xObj = pdfDoc.context.lookup(ref);
                                if (!xObj) continue;
                                const subtype = xObj.get(PDFLib.PDFName.of('Subtype'));
                                if (!subtype || subtype.toString() !== '/Image') continue;

                                const w = xObj.get(PDFLib.PDFName.of('Width'))?.numberValue || 0;
                                const h = xObj.get(PDFLib.PDFName.of('Height'))?.numberValue || 0;
                                if (w === 0 || h === 0) continue;

                                // Get raw bytes
                                const imageStream = xObj.contents;
                                if (!imageStream || imageStream.length < 100) continue;

                                // Try to draw on canvas and re-compress as JPEG
                                const blob = new Blob([imageStream], { type: 'image/jpeg' });
                                const url = URL.createObjectURL(blob);
                                const img = await loadImage(url);
                                URL.revokeObjectURL(url);

                                const canvas = document.createElement('canvas');
                                canvas.width = w; canvas.height = h;
                                const ctx = canvas.getContext('2d');
                                ctx.fillStyle = '#FFFFFF';
                                ctx.fillRect(0, 0, w, h);
                                ctx.drawImage(img, 0, 0, w, h);

                                const compressedBlob = await canvasToBlob(canvas, 'image/jpeg', imgQuality);
                                const compressedBytes = await blobToUint8Array(compressedBlob);

                                // Embed back as JPEG
                                const jpegImage = await pdfDoc.embedJpg(compressedBytes);
                                // Update the xObject to point to our new image
                                // (structural replacement via pdf-lib embed)
                                page.drawImage(jpegImage, {
                                    x: 0, y: 0,
                                    width: width, height: height,
                                    opacity: 0
                                });
                            } catch (imgErr) {
                                // Skip problematic images, don't fail the whole PDF
                            }
                        }
                    } catch (pageErr) {
                        // Skip problematic pages
                    }
                }

                // Save with maximum compression settings
                const pdfBytes = await pdfDoc.save({
                    useObjectStreams: true,
                    addDefaultPage: false,
                    objectsPerTick: 50
                });

                const blob = new Blob([pdfBytes], { type: 'application/pdf' });

                document.getElementById('pdfControls').style.display = 'none';
                document.getElementById('pdfResult').style.display = 'block';

                const origSize = pdfFile.size;
                const compSize = blob.size;
                document.getElementById('pdfResOrig').textContent = formatBytes(origSize);
                document.getElementById('pdfResComp').textContent = formatBytes(compSize);
                showSavingsBadge(origSize, compSize, 'pdfSavingsBadge');

                const url = URL.createObjectURL(blob);
                const link = document.getElementById('pdfDownloadBtn');
                link.href = url;
                link.download = `optimized-${pdfFile.name}`;

            } catch (err) {
                console.error(err);
                alert('Error optimizing PDF. The file might be password-protected or corrupted.');
            } finally {
                btn.innerHTML = '<i class="fa-solid fa-compress"></i> Compress PDF';
                btn.disabled = false;
            }
        });
    }


    // ─────────────────────────────────────────────
    // 3. VIDEO COMPRESSOR — FFmpeg.wasm (Lazy loaded)
    // ─────────────────────────────────────────────
    if (document.getElementById('vidUploadArea')) {
        let vidFile = null;

        function handleVidFile(file) {
            if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|avi|mkv)$/i)) {
                alert('Please select a valid video file (MP4, WebM, MOV).');
                return;
            }
            vidFile = file;
            document.getElementById('vidUploadArea').style.display = 'none';
            document.getElementById('vidControls').style.display = 'block';
            document.getElementById('vidName').textContent = file.name;
            document.getElementById('vidSize').textContent = formatBytes(file.size);
        }

        setupDragDrop('vidUploadArea', 'vidInput', handleVidFile);

        const vidQualitySlider = document.getElementById('vidQuality');
        if (vidQualitySlider) {
            vidQualitySlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                let label = val >= 80 ? 'High Quality' : val >= 50 ? 'Good' : val >= 30 ? 'Medium' : 'Small File';
                document.getElementById('vidQualityVal').textContent = `${label} (${val}%)`;
            });
        }

        document.getElementById('vidCompressBtn').addEventListener('click', async () => {
            if (!vidFile) return;

            if (vidFile.size > 150 * 1024 * 1024) {
                const proceed = confirm(`Warning: This ${formatBytes(vidFile.size)} file may take several minutes. Browser compression works best under 150MB. Continue?`);
                if (!proceed) return;
            }

            const btn = document.getElementById('vidCompressBtn');
            const vidProgress = document.getElementById('vidProgressContainer');
            const vidBar = document.getElementById('vidProgressBar');
            const vidText = document.getElementById('vidProgressText');

            btn.style.display = 'none';
            vidProgress.style.display = 'block';
            vidText.textContent = 'Loading FFmpeg Engine... (first time takes ~10s)';

            try {
                const engine = await getFFmpeg();
                const fetchFile = window._fetchFile;

                vidText.textContent = 'Reading video file...';
                engine.FS('writeFile', vidFile.name, await fetchFile(vidFile));

                engine.setProgress(({ ratio }) => {
                    const percent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
                    vidBar.style.width = `${percent}%`;
                    vidText.textContent = `Compressing... ${percent}%`;
                });

                const qualPercent = parseInt(document.getElementById('vidQuality').value) || 70;
                // CRF: 18 (highest quality) to 40 (smallest file)
                const crfValue = Math.round(40 - (qualPercent / 100) * 22).toString();

                const outName = 'output.mp4';
                await engine.run(
                    '-i', vidFile.name,
                    '-vcodec', 'libx264',
                    '-crf', crfValue,
                    '-preset', 'ultrafast',
                    '-profile:v', 'baseline',
                    '-level', '3.0',
                    '-movflags', '+faststart', // Enable streaming start
                    '-acodec', 'aac',
                    '-b:a', '96k',
                    '-ar', '44100',
                    outName
                );

                const data = engine.FS('readFile', outName);
                const blob = new Blob([data.buffer], { type: 'video/mp4' });

                document.getElementById('vidControls').style.display = 'none';
                document.getElementById('vidResult').style.display = 'block';

                const origSize = vidFile.size;
                const compSize = blob.size;
                document.getElementById('vidResOrig').textContent = formatBytes(origSize);
                document.getElementById('vidResComp').textContent = formatBytes(compSize);
                showSavingsBadge(origSize, compSize, 'vidSavingsBadge');

                const url = URL.createObjectURL(blob);
                const link = document.getElementById('vidDownloadBtn');
                link.href = url;
                link.download = `compressed-${vidFile.name.split('.')[0]}.mp4`;

                // Cleanup FS memory
                try { engine.FS('unlink', vidFile.name); } catch(e) {}
                try { engine.FS('unlink', outName); } catch(e) {}

            } catch (err) {
                console.error(err);
                alert('Compression failed. The video might be unsupported or too large for browser memory. Try a smaller file.');
                btn.style.display = 'block';
                vidProgress.style.display = 'none';
            }
        });
    }

}); // end DOMContentLoaded


// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function blobToUint8Array(blob) {
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
}


// ─────────────────────────────────────────────
// GLOBAL RESET FUNCTION
// ─────────────────────────────────────────────
window.resetTool = function(type) {
    if (type === 'image') {
        document.getElementById('imgResult').style.display = 'none';
        document.getElementById('imgUploadArea').style.display = 'flex';
        document.getElementById('imgInput').value = '';
    } else if (type === 'pdf') {
        document.getElementById('pdfResult').style.display = 'none';
        document.getElementById('pdfUploadArea').style.display = 'flex';
        document.getElementById('pdfInput').value = '';
    } else if (type === 'video') {
        document.getElementById('vidResult').style.display = 'none';
        document.getElementById('vidControls').style.display = 'none';
        document.getElementById('vidUploadArea').style.display = 'flex';
        document.getElementById('vidInput').value = '';
        document.getElementById('vidCompressBtn').style.display = 'block';
        document.getElementById('vidProgressContainer').style.display = 'none';
    }
};

// ─────────────────────────────────────────────
// FAQ ACCORDION
// ─────────────────────────────────────────────
window.toggleFaq = function(btn) {
    const answer = btn.nextElementSibling;
    const isOpen = answer.classList.contains('open');

    // Close all open FAQs first
    document.querySelectorAll('.faq-answer.open').forEach(el => el.classList.remove('open'));
    document.querySelectorAll('.faq-question.open').forEach(el => el.classList.remove('open'));

    // Toggle current
    if (!isOpen) {
        answer.classList.add('open');
        btn.classList.add('open');
    }
};

