importScripts("lib/idb-keyval.js");

const DB_PREFIX = "MarioVsLuigi-WebGL-Files:";
const INJECTION_KEY = "customHTMLInject";

async function getInjectionHTML() {
	return (await idbKeyval.get(INJECTION_KEY)) || "";
}


self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(self.clients.claim());
});


self.addEventListener("fetch", event => {
	const url = new URL(event.request.url);

	if (!url.pathname.includes("MarioVsLuigi-Mobile/MarioVsLuigi-WebGL")) return;

	const key = DB_PREFIX + url.pathname.replace(/^\//, "");

	event.respondWith((async () => {
		const blob = await idbKeyval.get(key);
		if (!blob) return fetch(event.request);

		// Special case: index.html → inject custom content
		if (url.pathname.endsWith("index.html")) {
			const text = await blob.text();
			const inject = await getInjectionHTML();

			// Insert before </head> if possible, else at top
			const modified = text.includes("</head>")
				? text.replace("</head>", `${inject}\n</head>`)
				: inject + "\n" + text;

			return new Response(modified, {
				headers: { "Content-Type": "text/html" }
			});
		}

		// Everything else → serve normally
		return new Response(blob, {
			headers: { "Content-Type": guessMime(url.pathname) }
		});
	})());
});


function guessMime(path) {
	if (path.endsWith(".html")) return "text/html";
	if (path.endsWith(".js")) return "application/javascript";
	if (path.endsWith(".wasm")) return "application/wasm";
	if (path.endsWith(".json")) return "application/json";
	if (path.endsWith(".data")) return "application/octet-stream";
	return "application/octet-stream";
}
