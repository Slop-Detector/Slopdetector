// Run this script in a browser console to generate icon PNGs
// Or use Node.js with canvas package

function generateIcon(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  
  // Draw circle background
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Draw shield shape
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.15);
  ctx.lineTo(size * 0.8, size * 0.3);
  ctx.lineTo(size * 0.8, size * 0.55);
  ctx.quadraticCurveTo(size * 0.8, size * 0.75, size * 0.5, size * 0.9);
  ctx.quadraticCurveTo(size * 0.2, size * 0.75, size * 0.2, size * 0.55);
  ctx.lineTo(size * 0.2, size * 0.3);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fill();
  
  // Draw stop hand icon
  ctx.fillStyle = '#667eea';
  ctx.font = `bold ${size * 0.35}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✋', size * 0.5, size * 0.52);
  
  return canvas.toDataURL('image/png');
}

// Generate and download icons
[16, 48, 128].forEach(size => {
  const dataUrl = generateIcon(size);
  const link = document.createElement('a');
  link.download = `icon${size}.png`;
  link.href = dataUrl;
  link.click();
});

console.log('Icons generated! Check your downloads folder.');
