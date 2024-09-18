<script lang="ts">
    import { onMount } from "svelte";

    let fullState: number[] = $state([]);
    let state: number[] = $state([]);
    let clientSocket: any = null;
    const originalLength = 1000000;
    const batchSize = 1000;

    const checkedCount = $derived((() => {
        if(!fullState.length) {
            return 0;
        }

        return fullState.reduce((acc, item) => acc + item, 0);
    })());
    
    function unpackState(packedState: Uint8Array, originalLength: number): Uint8Array {
        const unpackedState = new Uint8Array(originalLength);

        for (let i = 0; i < originalLength; i++) {
            const byteIndex = Math.floor(i / 8);
            const bitIndex = i % 8;
            unpackedState[i] = (packedState[byteIndex] & (1 << bitIndex)) ? 1 : 0;
        }

        return unpackedState;
    }

    function onCheckboxInput(event: Event, index: number) {
        if(!clientSocket) {
            return;
        }

        if(!(event.target instanceof HTMLInputElement)) {
            return;
        }

        const isChecked = event.target.checked;
        const buffer = new ArrayBuffer(5);
        const view = new DataView(buffer); 

        event.target.checked = !isChecked;

        view.setUint32(0, index, true); 
        view.setUint8(4, Number(isChecked));

        clientSocket.send(buffer);
    }

    onMount(() => {
        const socket = new WebSocket(`ws://${window.location.hostname}:8080`);
        socket.binaryType = "arraybuffer";

        clientSocket = socket;

        socket.addEventListener("message", (event) => {
            const view = new DataView(event.data);
            
            if (event.data.byteLength === 5) {
                const index = view.getUint32(0, true);
                const value = view.getUint8(4); 

                state[index] = value;
                fullState[index] = value;
                
                return;
            }

            const packedState = new Uint8Array(view.buffer);
            const unpackedState = unpackState(packedState, originalLength);

            fullState = Array.from(unpackedState);
            state = fullState.slice(0, batchSize);
        });


        window.addEventListener("scroll", () => {
            if ((window.innerHeight + Math.round(window.scrollY)) >= document.body.offsetHeight) {
                const nextBatch = fullState.slice(state.length, state.length + batchSize);
                state = [...state, ...nextBatch];
            }
        });
    })
</script>


<main>
    <h1>{checkedCount} checkboxes checked</h1>

    {#each state as item, i}
        <label>
            <input type="checkbox" id={`${i}`} checked={Boolean(item)} oninput={(event) => onCheckboxInput(event, i)} />
        </label>
    {/each}
</main>

<style>
    main {
        min-height: 101vh;
    }

    input[type="checkbox"] {
        appearance: none;
        -webkit-appearance: none;
        display: inline-flex;
        align-content: center;
        justify-content: center;
        padding: 0.2rem;
        border: 0.15rem solid #999;
        border-radius: 0.5rem;
        margin: 0.1rem;
        cursor: pointer;
    }

    input[type="checkbox"]::before {
        content: "";
        width: 1rem;
        height: 1rem;
        clip-path: polygon(20% 0%, 0% 20%, 30% 50%, 0% 80%, 20% 100%, 50% 70%, 80% 100%, 100% 80%, 70% 50%, 100% 20%, 80% 0%, 50% 30%);
        transform: scale(0);
        background-color: orange;
    }

    input[type="checkbox"]:checked::before {
        transform: scale(1);
    }

    input[type="checkbox"]:hover {
        color: black;
    }
</style>