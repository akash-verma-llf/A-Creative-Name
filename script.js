const URL = "https://teachablemachine.withgoogle.com/models/G2FB34AGs/";
let lastPrediction = "";
let recognizer;

let bleDevice = null;
let bleCharacteristic = null;

const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

async function connectBLE() {
    console.log("Connecting to ESP32...");
    const status = document.getElementById("ble-status");
    try {
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: "ESP32" }],
            optionalServices: [SERVICE_UUID]
        });

        const server = await bleDevice.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        bleCharacteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

        status.innerText = "BLE: Connected to ESP32";
        console.log("BLE connected and characteristic ready.");
    } catch (error) {
        console.error("BLE Connection error:", error);
        status.innerText = "BLE: Connection failed";
    }
}

async function sendCommandToESP32(command) {
    const sendStatus = document.getElementById("send-status");

    if (!bleCharacteristic) {
        sendStatus.innerText = "Command send status: ESP32 not connected.";
        console.warn("ESP32 not connected yet.");
        return;
    }

    try {
        const encoder = new TextEncoder();
        await bleCharacteristic.writeValue(encoder.encode(command));
        console.log("Sent to ESP32:", command);
        sendStatus.innerText = `Command send status: "${command}" sent successfully.`;
    } catch (err) {
        console.error("Failed to send command:", err);
        sendStatus.innerText = "Command send status: Failed to send.";
    }
}

async function createModel() {
    const checkpointURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    recognizer = speechCommands.create("BROWSER_FFT", undefined, checkpointURL, metadataURL);
    await recognizer.ensureModelLoaded();
    return recognizer;
}

async function init() {
    const modelStatus = document.getElementById("status");
    const commandStatus = document.getElementById("current-command");

    modelStatus.innerText = "Loading model...";
    const recognizer = await createModel();
    const classLabels = recognizer.wordLabels();
    modelStatus.innerText = "Listening...";

    recognizer.listen(async result => {
        const scores = result.scores;
        let maxScore = -Infinity;
        let predictedClass = "";

        for (let i = 0; i < scores.length; i++) {
            if (scores[i] > maxScore) {
                maxScore = scores[i];
                predictedClass = classLabels[i];
            }
        }

        if (predictedClass !== lastPrediction && maxScore > 0.75) {
            lastPrediction = predictedClass;
            commandStatus.innerText = predictedClass;
            await sendCommandToESP32(predictedClass);
        }

    }, {
        includeSpectrogram: false,
        probabilityThreshold: 0.75,
        overlapFactor: 0.5,
        invokeCallbackOnNoiseAndUnknown: false
    });
}
