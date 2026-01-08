const zipURL = "/MarioVsLuigi-Mobile/data/MarioVsLuigi-WebGL.zip";
const DB_PREFIX = "MarioVsLuigi-WebGL-Files:";
const logElem = document.getElementById("log");

function log(msg, type) {
	let msgElem = document.createElement("p")
	type = type || "log";
	switch (type) {
		case "error":
			msgElem.classList.add("error");
			msgElem.textContent = "ERROR: " + msg;
			console.error(msg);
			break;
		case "warn":
			msgElem.textContent = "WARNING: " + msg;
			msgElem.classList.add("warn");
			console.warn(msg);
			break;
		default:
			msgElem.classList.add("log");
			console.log(msg);
			break;
	}
	msgElem.textContent += msg;
	logElem.appendChild(msgElem);
}

async function ensureServiceWorker() {
	console.log("ensuring")
	if (!navigator.serviceWorker) {
		log("Service workers are not supported.", "error")
		throw new Error("Service worker not supported");
	}

	try {
		const reg = await navigator.serviceWorker.register("./sw.js", {scope: "./"});
	} catch (err) {
		log(err, "error");
		throw err;
	}
	await navigator.serviceWorker.ready;
	log("Service worker ready", "log");
}

async function setInjection(html) {
	await idbKeyval.set("customHTMLInject", html);
	log("Updated injected HTML", "log")
	console.log("Updated injected HTML");
}

async function downloadZip() {
	log("Downloading zip...");

	const res = await fetch(zipURL);
	if (!res.ok) {
		log("Failed to download zip", "error")
		throw new Error("Failed to download zip");
	}

	const blob = await res.blob();
	const zip = await JSZip.loadAsync(blob);

	let fileCount = 0;

	for (const [path, entry] of Object.entries(zip.files)) {
		if (entry.dir) continue;

		// load as arraybuffer to preserve binary data
		const data = await entry.async("arraybuffer");
		const key = DB_PREFIX + path;

		await idbKeyval.set(key, new Blob([data]));
		fileCount++;
	}

	log("Unpacked " + fileCount + " files to IndexedDB", "log");
}

async function loadGame() {
	await setInjection(`
	<style>
		html, body, iframe {
			margin: 0px; 
			padding: 0px; 
			height: 100%;
			width: 100%;
			border: none;
			overflow: hidden;
			overscroll-behavior: none;
			touch-action: none;
		}
		@font-face {
			font-family: NSMBDS;
			src: url(/MarioVsLuigi-Mobile/data/super-mario-ds-original.ttf);
		}

		@font-face {
			font-family: Tomorrow-Medium;
			src: url(/MarioVsLuigi-Mobile/data/Tomorrow-Medium.ttf);
		}
	</style>
	<link rel="stylesheet" href="/MarioVsLuigi-Mobile/css/touchControls.css">
	<script>
		const script = document.createElement("script");
		script.src = "/MarioVsLuigi-Mobile/scripts/smcmobile-1.2.1.js";
		script.async = true;
		// Called when the script is loaded successfully.
		script.onerror = (err) =>
			console.error("Failed to load controls:", err);
		document.addEventListener("DOMContentLoaded", (e) => {
			document.body.appendChild(script);
		});
	</script>
	<base href="./">
	`);
	log("Launching Unity build...", "log");
	// Redirect browser to the Unity index inside the zip
	// The service worker will intercept and serve it
	//window.location.href = "/MarioVsLuigi-WebGL/index.html";
	window.location.href=("./MarioVsLuigi-WebGL/index.html")
}

async function start() {
	log("Booting...", "log");
	try {
		await ensureServiceWorker();

		log("Checking cache...", "log");
		const keys = await idbKeyval.keys();
		const hasFiles = keys.some(k => k.startsWith(DB_PREFIX));

		if (!hasFiles) {
			await downloadZip();
		} else {
			log("Cached files already exist", "warn");
		}

		await loadGame();
	} catch (err) {
		log(err, "error");
	}
};

