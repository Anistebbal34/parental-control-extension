// Create hidden iframe pointing to sandbox
const iframe = document.createElement("iframe");
iframe.src = chrome.runtime.getURL("sandbox.html");
iframe.setAttribute("sandbox", "allow-scripts allow-same-origin"); // ✅ REQUIRED!
iframe.style.display = "none";
document.body.appendChild(iframe);
// Store processed images
const processed = new Set();
const MIN_WIDTH = 100;
const MIN_HEIGHT = 100;
const MAX_IMAGES = 50;

// Use IntersectionObserver to lazily classify only visible images
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      classifyImage(entry.target);
      io.unobserve(entry.target); // process once
    }
  });
});

// Find and observe all images
function scanImages() {
  const images = Array.from(document.querySelectorAll("img")).slice(
    0,
    MAX_IMAGES
  );
  images.forEach((img) => io.observe(img));
}

// Debounced scanning (useful when new images are dynamically added)
let debounceTimer = null;
function debounceScan() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(scanImages, 500);
}

// Setup mutation observer to watch for new images
const mutationObserver = new MutationObserver(debounceScan);
mutationObserver.observe(document.body, { childList: true, subtree: true });

// Convert image to base64 and send to sandbox for classification
function classifyImage(image) {
  if (!image?.src || processed.has(image.src)) return;
  if (image.naturalWidth < MIN_WIDTH || image.naturalHeight < MIN_HEIGHT)
    return;

  processed.add(image.src);

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const dataURL = canvas.toDataURL();

  iframe.contentWindow.postMessage(
    {
      type: "CLASSIFY_IMAGE",
      image: dataURL,
      src: image.src,
    },
    "*"
  );
}

// Receive classification results from sandbox
window.addEventListener("message", (event) => {
  if (event.data.type === "RESULT" && event.data.predictions) {
    const top = event.data.predictions[0];
    const matchedImage = document.querySelector(`img[src="${event.data.src}"]`);
    if (
      matchedImage &&
      ["Porn", "Hentai", "Sexy"].includes(top.className) &&
      top.probability > 0.85
    ) {
      matchedImage.style.filter = "blur(12px)";
      matchedImage.title = `NSFW: ${top.className} (${(
        top.probability * 100
      ).toFixed(1)}%)`;
    }
  }
});

// Initial scan
scanImages();
