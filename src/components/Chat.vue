<template>
  <BContainer fluid class="d-flex flex-column min-vh-100" id="ChatContainer">
    <BRow class="flex-grow-1">
      <BCol class="pt-3">
        <div class="messages border rounded-3 px-3">
          <div
            v-for="(message, index) in messages"
            :key="index"
            :class="message.source"
          >
            <div class="message-box">
              {{ message.text }}
            </div>
          </div>
        </div>
      </BCol>
    </BRow>
    <BRow class="flex-shrink-0">
      <BCol>
        <div class="input-message border rounded-3 p-3">
          <audio id="audio" controls></audio>
          <BButton
            class="w-100"
            variant="primary"
            size="lg"
            v-if="!isRecording"
            @click="startRecording"
          >
            Drücke zum sprechen...
          </BButton>
          <BButton
            class="w-100"
            variant="secondary"
            size="lg"
            v-if="isRecording"
            @click="stopRecording"
          >
            Drücke um Nachricht abzusenden...
          </BButton>
        </div>
      </BCol>
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
  name: "Chat",
  setup() {
    const connection = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/audiohub`)
      .build();

    const messages = ref([
      { text: "Hello!", source: "avatar" },
      { text: "Hi there!", source: "own" },
      { text: "How are you?", source: "avatar" },
      { text: "I'm fine, thanks!", source: "own" },
    ]);

    // Start the connection
    connection
      .start()
      .then(() => {
        console.log("WebSocket Connection started! 🎉");
        connection.on("handshake", (response) => {
          console.log(response);
        });
        connection.on("audioResponse", (response) => {
          console.log(response);
          var audio = document.getElementById("audio") as HTMLAudioElement;

          if (!audio) {
            return;
          }

          var binaryAudioData = atob(response.base64EncodedMp3);
          var uint8AudioData = new Uint8Array(binaryAudioData.length);
          for (var i = 0; i < binaryAudioData.length; i++) {
            uint8AudioData[i] = binaryAudioData.charCodeAt(i);
          }

          var audioBlob = new Blob([uint8AudioData], { type: "audio/wav" });
          audio.src = URL.createObjectURL(audioBlob);
          audio.play();
        });
        connection
          .invoke("Handshake", "started")
          .catch((err) => console.error(err));
      })
      .catch((err) => console.error(`Error while starting connection: ${err}`));

    return {
      isRecording: ref(false),
      mediaStream: null as MediaStream | null,
      isClosing: ref(false),
      isClosed: ref(false),
      mediaRecorder: null as MediaRecorder | null,
      connection: connection,
      messages,
    };
  },
  mounted() {
    const chatContainer = document.getElementById("ChatContainer");
    if (chatContainer) {
      // set container height to explicit window height
      chatContainer.style.height = `${window.innerHeight}px`;
    }
  },
  methods: {
    startRecording() {
      this.isRecording = true;
      this.isClosing = false;
      this.isClosed = false;

      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then((stream) => {
          this.mediaStream = stream;
          this.mediaRecorder = new MediaRecorder(stream);

          this.mediaRecorder.ondataavailable = (event) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (reader.readyState === 2) {
                const uint8Array = new Uint8Array(reader.result as ArrayBuffer);
                const base64String = btoa(
                  String.fromCharCode.apply(null, uint8Array)
                );

                this.connection
                  .invoke("TransmitUserAudio", base64String)
                  .catch((err) => console.error(err));
              }

              if (this.isClosing) {
                this.isClosed = true;
                this.isRecording = false;

                this.connection
                  .invoke("CloseAudioStream")
                  .catch((err) => console.error(err));
                this.mediaRecorder = null;
              }
            };
            reader.readAsArrayBuffer(event.data);
            console.log(event.data);
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
        this.isClosing = true;
      }

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      }
    },
  },
};
</script>

<style lang="scss">
.messages {
  height: 100%;
  max-height: 100%;
  overflow-y: auto;

  .avatar,
  .own {
    display: flex;
    margin: 10px 0;
  }

  .avatar {
    justify-content: flex-start;
    .message-box {
      background-color: #f2f2f2;
    }
  }

  .own {
    justify-content: flex-end;
    .message-box {
      background-color: #0099ff;
      color: white;
    }
  }

  .message-box {
    padding: 10px;
    border-radius: 10px;
    max-width: 80%;
  }
}

.input-message {
  display: flex;
  justify-content: center;
  margin: 10px 0;
}
</style>
