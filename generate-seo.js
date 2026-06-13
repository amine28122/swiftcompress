const fs = require('fs');
const path = require('path');

// 1. The SEO Targets (Long-tail keywords)
const targets = [
    // Image Tools
    { slug: 'compress-jpg-to-100kb', title: 'Compress JPG to 100KB Online Free', h1: 'Compress JPG to 100KB', type: 'image', ext: 'JPG', detail: '100KB' },
    { slug: 'compress-png-for-website', title: 'Compress PNG for Website - Lossless', h1: 'Optimize PNG for Websites', type: 'image', ext: 'PNG', detail: 'Web' },
    { slug: 'reduce-image-size-in-kb', title: 'Reduce Image Size in KB - Privacy First', h1: 'Reduce Image Size in KB', type: 'image', ext: 'Images', detail: 'KB' },
    
    // PDF Tools
    { slug: 'compress-pdf-for-email', title: 'Compress PDF for Email Attachment', h1: 'Compress PDF for Email', type: 'pdf', ext: 'PDF', detail: 'Email' },
    { slug: 'reduce-pdf-size-below-2mb', title: 'Reduce PDF Size Below 2MB Online', h1: 'Reduce PDF Below 2MB', type: 'pdf', ext: 'PDF', detail: '2MB' },
    { slug: 'compress-scanned-pdf', title: 'Compress Scanned PDF Online Free', h1: 'Compress Scanned PDF', type: 'pdf', ext: 'PDF', detail: 'Scanned' },

    // Video Tools
    { slug: 'compress-mp4-for-discord', title: 'Compress MP4 for Discord Under 8MB/25MB', h1: 'Compress MP4 for Discord', type: 'video', ext: 'MP4', detail: 'Discord' },
    { slug: 'reduce-video-size-for-whatsapp', title: 'Reduce Video Size for WhatsApp', h1: 'Reduce Video for WhatsApp', type: 'video', ext: 'Video', detail: 'WhatsApp' },
    { slug: 'compress-webm-online', title: 'Compress WebM Video Online Free', h1: 'Compress WebM Online', type: 'video', ext: 'WebM', detail: 'Online' }
];

// 2. Helper to generate Rich Content (To satisfy AdSense "Thin Content" rule)
function generateRichContent(target) {
    return `
    <section class="premium-seo-section" style="background: white; padding: 4rem 2rem; border-top: 1px solid var(--border-light);">
        <div class="seo-container" style="max-width: 800px; margin: 0 auto; color: var(--text-main);">
            <h2 style="font-family: 'Playfair Display', serif; font-size: 2.5rem; color: var(--border-strong); margin-bottom: 1.5rem;">How to ${target.h1} Securely in 2026</h2>
            
            <p style="font-size: 1.15rem; line-height: 1.8; margin-bottom: 2rem;">
                Looking for a fast, secure, and free way to <strong>${target.h1.toLowerCase()}</strong>? You're in the right place. 
                Whether you need to optimize files for ${target.detail}, save storage space, or speed up your uploads, our client-side optimization engine 
                handles your ${target.ext} files directly within your browser. This means zero data leaves your device, ensuring maximum privacy.
            </p>

            <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: var(--text-main);">Why Optimize ${target.ext} Files?</h3>
            <p style="font-size: 1.1rem; line-height: 1.7; margin-bottom: 1.5rem;">
                Large file sizes can cause significant delays in communication, web loading speeds, and server storage costs. 
                By utilizing advanced WebAssembly algorithms, SwiftCompress reduces your file footprint without sacrificing noticeable quality. 
                This tool is specifically calibrated for users who need to <strong>${target.title.toLowerCase()}</strong> quickly and without installing heavy software.
            </p>

            <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: var(--text-main);">Step-by-Step Guide to ${target.h1}</h3>
            <ul style="font-size: 1.1rem; line-height: 1.7; margin-bottom: 2rem; padding-left: 1.5rem;">
                <li style="margin-bottom: 0.5rem;"><strong>Step 1:</strong> Drag and drop your ${target.ext} file into the secure workspace above.</li>
                <li style="margin-bottom: 0.5rem;"><strong>Step 2:</strong> Adjust the compression slider based on your quality needs.</li>
                <li style="margin-bottom: 0.5rem;"><strong>Step 3:</strong> Click "Compress" and watch the engine optimize your file instantly in your RAM.</li>
                <li style="margin-bottom: 0.5rem;"><strong>Step 4:</strong> Download your optimized file safely.</li>
            </ul>

            <div style="background: var(--bg-main); padding: 2rem; border-radius: 12px; border-left: 4px solid var(--brand-primary);">
                <h4 style="margin-top:0; font-size: 1.25rem;">AdSense Policy & Privacy Commitment</h4>
                <p style="margin-bottom:0; line-height: 1.6;">
                    Unlike traditional cloud-based converters, SwiftCompress processes all ${target.ext} data locally. 
                    We do not store, view, or distribute your content. Our architecture is designed to meet strict enterprise-grade privacy standards 
                    while providing a seamless, ad-supported free experience.
                </p>
            </div>
        </div>
    </section>
    `;
}

// 3. Process each target
targets.forEach(target => {
    // Determine base template
    const templateFile = target.type === 'image' ? 'compress-image.html' : 
                         target.type === 'pdf' ? 'compress-pdf.html' : 'compress-video.html';
    
    let html = fs.readFileSync(path.join(__dirname, templateFile), 'utf8');

    // Replace Title & Description
    html = html.replace(/<title>.*?<\/title>/, `<title>${target.title} — SwiftCompress</title>`);
    html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="Learn how to ${target.h1.toLowerCase()} securely inside your browser. No server uploads. 100% free and private client-side compression.">`);
    
    // Replace OG Tags
    html = html.replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${target.title} — SwiftCompress">`);
    html = html.replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="Learn how to ${target.h1.toLowerCase()} securely inside your browser. No server uploads. 100% free and private client-side compression.">`);
    html = html.replace(/<meta name="twitter:title" content=".*?">/, `<meta name="twitter:title" content="${target.title} — SwiftCompress">`);
    html = html.replace(/<meta name="twitter:description" content=".*?">/, `<meta name="twitter:description" content="Learn how to ${target.h1.toLowerCase()} securely inside your browser. No server uploads. 100% free and private client-side compression.">`);

    
    // Replace Canonical / URL
    html = html.replace(/https:\/\/swiftcompress\.com\/[a-z-]+\.html/g, `https://swiftcompress.com/${target.slug}.html`);

    // Replace H1
    html = html.replace(/<h1 class="hero-title">.*?<\/h1>/, `<h1 class="hero-title">${target.h1.replace(target.detail, `<em>${target.detail}</em>`)}</h1>`);

    // Inject Rich Content (Right before the Footer)
    const richContent = generateRichContent(target);
    html = html.replace('<!-- ======== FOOTER ======== -->', `${richContent}\n\n    <!-- ======== FOOTER ======== -->`);

    // Write the new file
    fs.writeFileSync(path.join(__dirname, `${target.slug}.html`), html);
    console.log(`Created: ${target.slug}.html`);
});

console.log("Programmatic SEO pages generated successfully.");
