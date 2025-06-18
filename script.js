const URL = "https://teachablemachine.withgoogle.com/models/G2FB34AGs/";
let lastPrediction = "";
let recognizer;

let bleDevice;
let bleServer;
let bleService;
let bleCharacteristic;

const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';  // Custom UART service
const CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write

async function connectBLE() {
    try {
        document.getElementById("ble-status").innerText = "BLE: Connecting...";
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: "ESP32" }],
            optionalServices: [SERVICE_UUID]
        });

        bleServer = await bleDevice.gatt.connect();
        bleService = await bleServer.getPrimaryService(SERVICE_UUID);
        bleCharacteristic = await bleService.getCharacteristic(CHARACTERISTIC_UUID);

        document.getElementById("ble-status").innerText = "BLE: Connected to ESP32";
    } catch (error) {
        console.error("BLE Connection failed", error);
        document.getElementById("ble-status").innerText = "BLE: Connection failed";
    }
}

async function sendCommandToESP32(command) {
    if (bleCharacteristic) {
        const encoder = new TextEncoder();
        await bleCharacteristic.writeValue(encoder.encode(command));
    }
}

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
            document.getElementById("current-command").innerText = predictedClass;
            await sendCommandToESP32(predictedClass); // Send over BLE
        }

    }, {
        includeSpectrogram: false,
        probabilityThreshold: 0.75,
        overlapFactor: 0.5,
        invokeCallbackOnNoiseAndUnknown: false
    });
}
