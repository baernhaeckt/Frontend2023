<template>
  <BContainer>
    <BRow>
      <BCol> Hello World! </BCol>
      <BButton variant="primary" v-if="!isRecording" @click="startRecording"
        >Start Recording...</BButton
      >
      <BButton variant="primary" v-if="isRecording" @click="stopRecording"
        >Stop Recording...</BButton
      >
    </BRow>
  </BContainer>
</template>

<script lang="ts">
import {
  HubConnectionBuilder,
  type IHttpConnectionOptions,
} from "@microsoft/signalr";
import { ref } from "vue";
const baseUrl = import.meta.env.VITE_SERVICES_BASEURL;

export default {
  name: "HomeView",
  setup() {
    const connection = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/chatHub`)
      .build();

    // Start the connection
    connection
      .start()
      .then(() => {
        console.log("Connection started!");

        // Invoke a hub method to send a message
        connection
          .invoke("SendMessage", "Hello from client!")
          .catch((err) => console.error(`Error while sending message: ${err}`));
      })
      .catch((err) => console.error(`Error while starting connection: ${err}`));

    return {
      isRecording: ref(false),
      mediaRecorder: null as MediaRecorder | null,
      connection: connection,
    };
  },
  methods: {
    startRecording() {
      this.isRecording = true;
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          this.mediaRecorder = new MediaRecorder(stream);

          this.mediaRecorder.ondataavailable = (event) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (reader.readyState === 2) {
                const arrayBuffer = reader.result;
                this.connection
                  .invoke("ReceiveAudio", arrayBuffer)
                  .catch((err) => console.error(err));
              }
            };
            reader.readAsArrayBuffer(event.data);
          };

          this.mediaRecorder.start(1000); // Emit audio data every 1000ms (1s)
        })
        .catch(function (error) {
          console.error("Error accessing the microphone:", error);
        });
    },
    stopRecording() {
      if (this.mediaRecorder) {
        this.mediaRecorder.stop();
      }
      this.isRecording = false;
    },
  },
};
</script>
