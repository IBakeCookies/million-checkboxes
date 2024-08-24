import type { PageServerLoad } from './$types';
import { WebSocket, WebSocketServer } from 'ws';

const state = new Uint8Array(1000000).fill(0);

function packState(state: Uint8Array): Uint8Array {
	const packedLength = Math.ceil(state.length / 8);
	const packedState = new Uint8Array(packedLength);

	for (let i = 0; i < state.length; i++) {
		const byteIndex = Math.floor(i / 8);
		const bitIndex = i % 8;
		if (state[i]) {
			packedState[byteIndex] |= 1 << bitIndex;
		}
	}

	return packedState;
}

const wss = new WebSocketServer({
	port: 8080,
	perMessageDeflate: {
		zlibDeflateOptions: {
			// See zlib defaults.
			chunkSize: 1024,
			memLevel: 7,
			level: 3
		},
		zlibInflateOptions: {
			chunkSize: 10 * 1024
		},
		// Other options settable:
		clientNoContextTakeover: true, // Defaults to negotiated value.
		serverNoContextTakeover: true, // Defaults to negotiated value.
		serverMaxWindowBits: 10, // Defaults to negotiated value.
		// Below options specified as default values.
		concurrencyLimit: 10, // Limits zlib concurrency for perf.
		threshold: 1024 // Size (in bytes) below which messages
		// should not be compressed if context takeover is disabled.
	}
});

export const load: PageServerLoad = ({ params }) => {
	wss.on('connection', (ws) => {
		ws.send(packState(state));

		ws.on('message', (message) => {
			const buffer = new Uint8Array(message).buffer;
			const view = new DataView(buffer);
			const index = view.getUint32(0, true);
			const value = view.getUint8(4);

			state[index] = value;

			wss.clients.forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					const buffer = new ArrayBuffer(5);
					const clientView = new DataView(buffer);

					clientView.setUint32(0, index, true);
					clientView.setUint8(4, value);

					client.send(buffer);
				}
			});
		});
	});
};
