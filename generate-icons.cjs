const fs = require('fs');
const { createCanvas } = require('canvas');

function generateIcon(size, filename) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Dark purple background
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, size, size);

    // Document icon (white rectangle)
    const docWidth = size * 0.5;
    const docHeight = size * 0.6;
    const docX = (size - docWidth) / 2;
    const docY = size * 0.12;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(docX, docY, docWidth, docHeight, size * 0.05);
    ctx.fill();

    // Text lines
    ctx.fillStyle = '#0f0f23';
    const lineWidth = docWidth * 0.7;
    const lineHeight = size * 0.02;
    const lineX = docX + (docWidth - lineWidth) / 2;

    for (let i = 0; i < 4; i++) {
        const lineY = docY + size * 0.1 + (i * size * 0.08);
        ctx.fillRect(lineX, lineY, lineWidth * (i === 3 ? 0.5 : 1), lineHeight);
    }

    // Purple gradient circle
    const circleR = size * 0.18;
    const circleX = size * 0.72;
    const circleY = size * 0.72;

    const gradient = ctx.createLinearGradient(
        circleX - circleR, circleY - circleR,
        circleX + circleR, circleY + circleR
    );
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#8b5cf6');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.fill();

    // Plus sign
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size * 0.02;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(circleX, circleY - circleR * 0.5);
    ctx.lineTo(circleX, circleY + circleR * 0.5);
    ctx.moveTo(circleX - circleR * 0.5, circleY);
    ctx.lineTo(circleX + circleR * 0.5, circleY);
    ctx.stroke();

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filename, buffer);
    console.log(`Generated ${filename}`);
}

generateIcon(192, 'public/pwa-192x192.png');
generateIcon(512, 'public/pwa-512x512.png');
generateIcon(192, 'public/apple-touch-icon.png');
console.log('Done!');
