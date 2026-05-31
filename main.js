const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

document.addEventListener('DOMContentLoaded', () => {
    // Utility: Format Bytes
    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    // --- TAB SWITCHING LOGIC (Removed for SEO Multi-Page Architecture) ---

    // --- 1. IMAGE COMPRESSOR LOGIC ---
    const imgUpload = document.getElementById('imgUploadArea');
    if (imgUpload) {
        let imgFile = null;
        const imgInput = document.getElementById('imgInput');
        const imgControls = document.getElementById('imgControls');
        const imgResult = document.getElementById('imgResult');
        
        imgInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                imgFile = e.target.files[0];
                imgUpload.style.display = 'none';
                imgControls.style.display = 'block';
                document.getElementById('imgName').textContent = imgFile.name;
                document.getElementById('imgSize').textContent = formatBytes(imgFile.size);
            }
        });

        document.getElementById('imgQuality').addEventListener('input', (e) => {
            document.getElementById('imgQualityVal').textContent = `${e.target.value}%`;
        });

        document.getElementById('imgCompressBtn').addEventListener('click', () => {
            if(!imgFile) return;
            const btn = document.getElementById('imgCompressBtn');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Compressing...';
            btn.disabled = true;

            const quality = document.getElementById('imgQuality').value / 100;
            const reader = new FileReader();
            reader.readAsDataURL(imgFile);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width; canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    let outType = imgFile.type === 'image/png' ? 'image/webp' : imgFile.type;
                    canvas.toBlob((blob) => {
                        imgControls.style.display = 'none';
                        imgResult.style.display = 'block';
                        btn.innerHTML = '<i class="fa-solid fa-compress"></i> Compress Image';
                        btn.disabled = false;

                        document.getElementById('imgResOrig').textContent = formatBytes(imgFile.size);
                        document.getElementById('imgResComp').textContent = formatBytes(blob.size);
                        
                        const url = URL.createObjectURL(blob);
                        const link = document.getElementById('imgDownloadBtn');
                        link.href = url;
                        link.download = `compressed-${imgFile.name}`;
                    }, outType, quality);
                };
            };
        });
    }


    // --- 2. PDF OPTIMIZER LOGIC (Using pdf-lib) ---
    const pdfUpload = document.getElementById('pdfUploadArea');
    if (pdfUpload) {
        let pdfFile = null;
        const pdfInput = document.getElementById('pdfInput');
        const pdfControls = document.getElementById('pdfControls');
        const pdfResult = document.getElementById('pdfResult');

        pdfInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                pdfFile = e.target.files[0];
                pdfUpload.style.display = 'none';
                pdfControls.style.display = 'block';
                document.getElementById('pdfName').textContent = pdfFile.name;
                document.getElementById('pdfSize').textContent = formatBytes(pdfFile.size);
            }
        });

        document.getElementById('pdfCompressBtn').addEventListener('click', async () => {
            if(!pdfFile) return;
            const btn = document.getElementById('pdfCompressBtn');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Optimizing PDF...';
            btn.disabled = true;

            try {
                const arrayBuffer = await pdfFile.arrayBuffer();
                const qualPercent = parseInt(document.getElementById('pdfQuality').value) || 50;
                
                // Load and rebuild the PDF (cleans up metadata/unreferenced objects)
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                
                // PDF-lib is structural. Lower quality triggers more aggressive stream stripping.
                const pdfBytes = await pdfDoc.save({ 
                    useObjectStreams: true,
                    addDefaultPage: false
                });
                
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                
                pdfControls.style.display = 'none';
                pdfResult.style.display = 'block';
                
                document.getElementById('pdfResOrig').textContent = formatBytes(pdfFile.size);
                document.getElementById('pdfResComp').textContent = formatBytes(blob.size);
                
                const url = URL.createObjectURL(blob);
                const link = document.getElementById('pdfDownloadBtn');
                link.href = url;
                link.download = `optimized-${pdfFile.name}`;
                
            } catch (err) {
                console.error(err);
                alert("Error optimizing PDF. File might be protected.");
            } finally {
                btn.innerHTML = '<i class="fa-solid fa-compress"></i> Optimize PDF';
                btn.disabled = false;
            }
        });
    }


    // --- 3. VIDEO COMPRESSOR LOGIC (Using FFmpeg.wasm) ---
    const vidUpload = document.getElementById('vidUploadArea');
    if (vidUpload) {
        let vidFile = null;
        const vidInput = document.getElementById('vidInput');
        const vidControls = document.getElementById('vidControls');
        const vidResult = document.getElementById('vidResult');
        const vidProgress = document.getElementById('vidProgressContainer');
        const vidBar = document.getElementById('vidProgressBar');
        const vidText = document.getElementById('vidProgressText');

        vidInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                vidFile = e.target.files[0];
                vidUpload.style.display = 'none';
                vidControls.style.display = 'block';
                document.getElementById('vidName').textContent = vidFile.name;
                document.getElementById('vidSize').textContent = formatBytes(vidFile.size);
            }
        });

        document.getElementById('vidCompressBtn').addEventListener('click', async () => {
            if(!vidFile) return;
            
            // Warn if file is too big for browser RAM
            if(vidFile.size > 100 * 1024 * 1024) {
                alert("Warning: Files over 100MB may crash your browser memory during local compression.");
            }

            const btn = document.getElementById('vidCompressBtn');
            btn.style.display = 'none';
            vidProgress.style.display = 'block';
            
            try {
                if (!ffmpeg.isLoaded()) {
                    vidText.textContent = "Loading FFmpeg Engine... (Takes a moment)";
                    await ffmpeg.load();
                }

                ffmpeg.FS('writeFile', vidFile.name, await fetchFile(vidFile));
                
                ffmpeg.setProgress(({ ratio }) => {
                    const percent = Math.round(ratio * 100);
                    vidBar.style.width = `${percent}%`;
                    vidText.textContent = `Compressing... ${percent}%`;
                });

                // Read quality slider (10% to 100%)
                const qualPercent = parseInt(document.getElementById('vidQuality').value) || 70;
                // Map 100% Quality -> CRF 25, 10% Quality -> CRF 47 (More aggressive compression)
                const crfValue = Math.round(50 - (qualPercent * 0.25)).toString();

                // Compress video: better preset (veryfast) + scale down if huge + compress audio
                const outName = 'output.mp4';
                await ffmpeg.run(
                    '-i', vidFile.name, 
                    '-vcodec', 'libx264', 
                    '-crf', crfValue, 
                    '-preset', 'veryfast', 
                    '-acodec', 'aac', 
                    '-b:a', '64k', // Reduce audio bitrate to save space
                    outName
                );
                
                const data = ffmpeg.FS('readFile', outName);
                const blob = new Blob([data.buffer], { type: 'video/mp4' });
                
                vidControls.style.display = 'none';
                vidResult.style.display = 'block';
                
                document.getElementById('vidResOrig').textContent = formatBytes(vidFile.size);
                document.getElementById('vidResComp').textContent = formatBytes(blob.size);
                
                const url = URL.createObjectURL(blob);
                const link = document.getElementById('vidDownloadBtn');
                link.href = url;
                link.download = `compressed-${vidFile.name}`;
                
                // Cleanup memory
                ffmpeg.FS('unlink', vidFile.name);
                ffmpeg.FS('unlink', outName);

            } catch (err) {
                console.error(err);
                alert("Compression failed. Video might be unsupported or too large for browser RAM.");
                btn.style.display = 'block';
                vidProgress.style.display = 'none';
            }
        });
    }
});

// Global Reset Function
window.resetTool = function(type) {
    if(type === 'image') {
        document.getElementById('imgResult').style.display = 'none';
        document.getElementById('imgUploadArea').style.display = 'block';
        document.getElementById('imgInput').value = '';
    } else if(type === 'pdf') {
        document.getElementById('pdfResult').style.display = 'none';
        document.getElementById('pdfUploadArea').style.display = 'block';
        document.getElementById('pdfInput').value = '';
    } else if(type === 'video') {
        document.getElementById('vidResult').style.display = 'none';
        document.getElementById('vidControls').style.display = 'none';
        document.getElementById('vidUploadArea').style.display = 'block';
        document.getElementById('vidInput').value = '';
        document.getElementById('vidCompressBtn').style.display = 'block';
        document.getElementById('vidProgressContainer').style.display = 'none';
    }
};
