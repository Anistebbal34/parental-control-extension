tf.setBackend("webgl");
tf.ready().then(async () => {
  const modelURL = chrome.runtime.getURL("models/model.json");
  const model = await nsfwjs.load(modelURL);

  window.addEventListener("message", async (event) => {
    if (event.data.type === "CLASSIFY_IMAGE") {
      const img = new Image();
      img.src = event.data.image;
      await img.decode();
      const predictions = await model.classify(img);
      window.parent.postMessage(
        { type: "RESULT", predictions, src: event.data.src },
        "*"
      );
    }
  });
});
