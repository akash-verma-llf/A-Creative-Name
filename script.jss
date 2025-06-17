const URL = "https://teachablemachine.withgoogle.com/models/G2FB34AGs/";
let lastPrediction = "";
let recognizer;

async function createModel() {
    const checkpointURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    recognizer = speechCommands.create(
        "BROWSER_FFT",
        undefined,
        checkpointURL,
        metadataURL
    );

    await recognizer.ensureModelLoaded();
    return recognizer;
}

async function init() {
    document.getElementById("status").innerText = "Loading model...";
    const recognizer = await createModel();
    const classLabels = recognizer.wordLabels();

    document.getElementById("status").innerText = "Listening...";

    recognizer.listen(result => {
        const scores = result.scores;
        let maxScore = -Infinity;
        let predictedClass = "";

        for (let i = 0; i < scores.length; i++) {
            if (scores[i] > maxScore) {
                maxScore = scores[i];
                predictedClass = classLabels[i];
            }
        }

        // Update UI only if prediction is different and confident
        if (predictedClass !== lastPrediction && maxScore > 0.75) {
            lastPrediction = predictedClass;
            document.getElementById("current-command").innerText = predictedClass;
        }

    }, {
        includeSpectrogram: false,
        probabilityThreshold: 0.75,
        overlapFactor: 0.5,
        invokeCallbackOnNoiseAndUnknown: false
    });
}
