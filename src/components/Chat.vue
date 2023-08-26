<template>
  <BContainer fluid class="d-flex flex-column min-vh-100" id="ChatContainer">
    <BRow class="flex-shrink-1">
      <BCol class="pt-3 avatar-display">
        <div class="avatar border rounded-3 px-3 d-flex justify-content-center">
          <img :src="avatar" class="rounded-3 flex-grow-0" alt="Dein Avatar" />
          <BButton variant="light" size="lg" class="modify-avatar" @click="modifyAvatar"><i-mdi-cog class="mb-1" /></BButton>
        </div>
      </BCol>
    </BRow>
    <BRow class="messages-container flex-grow-1">
      <BCol class="pt-3">
        <div class="messages border rounded-3 px-3">
          <div v-for="(message, index) in messages" :key="index" :class="message.source">
            <div class="message-box">
              {{ message.text }}
              <template v-if="message.audio">
                <hr />
                <audio controls :id="`MessageAudio${message.messageId}`">
                  <source :src="getAudioSource(message)" type="audio/wav" />
                </audio>
              </template>
            </div>
          </div>
          <div class="avatar" v-if="isLoadingMessage">
            <div class="message-box">
              <div class="loader">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
              </div>
            </div>
          </div>
        </div>
      </BCol>
    </BRow>
    <BRow class="flex-shrink-0">
      <BCol>
        <div class="input-message border rounded-3 p-3 d-flex flex-row">
          <BButton class="flex-shrink-0 me-2" :disabled="isLoadingMessage" variant="danger" size="lg" @click="clearChats">
            <i-mdi-trash-can-outline class="mb-1" /> <span class="d-none d-md-inline">Alle Nachrichten löschen</span>
          </BButton>
          <BButton
            class="flex-grow-1"
            :disabled="isLoadingMessage"
            variant="primary"
            size="lg"
            v-if="!isRecording && !isLoadingMessage"
            @click="startRecording"
          >
            Drücke zum sprechen...
          </BButton>
          <BButton class="flex-grow-1" :disabled="isLoadingMessage" variant="secondary" size="lg" v-if="isRecording || isLoadingMessage" @click="stopRecording">
            Drücke um Nachricht abzusenden...
          </BButton>
        </div>
      </BCol>
    </BRow>
  </BContainer>
</template>

<script lang="ts">
import { HubConnectionBuilder, type IHttpConnectionOptions } from "@microsoft/signalr";
import { storeToRefs, type Store } from "pinia";
import { useStore } from "../stores/settings-store";
import { useMessagesStore } from "../stores/messages-store";
import { Ref, nextTick, ref } from "vue";
import { MessageModel } from "../models/message-model";
const baseUrl = import.meta.env.VITE_SERVICES_BASEURL;

export default {
  name: "Chat",
  setup() {
    const settingsStore = useStore();
    const messagesStore = useMessagesStore();
    const { settings } = storeToRefs(settingsStore);

    function playAudio(audioId) {
      const timer = setInterval(() => {
        const audioElement = document.getElementById(`MessageAudio${audioId}`) as HTMLAudioElement;
        if (audioElement) {
          audioElement.scrollIntoView();
          audioElement.play();
          clearInterval(timer);
        }
      }, 125);
    }

    const connection = new HubConnectionBuilder().withUrl(`${baseUrl}/audiohub`).build();
    const messages: Ref<MessageModel[]> = ref([...messagesStore.messages]);
    const isLoadingMessage = ref(false);

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

          const ownMessageId = messages.value.length;
          const avatarMessageId = ownMessageId + 1;

          const ownMessage: MessageModel = {
            messageId: ownMessageId,
            text: response.understoodText,
            source: "own",
            timestamp: new Date(),
          };
          const avatarMessage: MessageModel = {
            messageId: avatarMessageId,
            text: response.answerText,
            source: "avatar",
            audio: response.base64EncodedMp3,
            timestamp: new Date(),
          };

          messages.value.push(ownMessage);
          messages.value.push(avatarMessage);

          messagesStore.pushMessage(ownMessage);
          messagesStore.pushMessage(avatarMessage);

          playAudio(avatarMessageId);
          isLoadingMessage.value = false;
        });
        connection.invoke("Handshake", "started").catch((err) => console.error(err));
      })
      .catch((err) => console.error(`Error while starting connection: ${err}`));

    return {
      messagesStore,

      avatar: settings.value.avatar,

      isInit: ref(true),
      isRecording: ref(false),
      mediaStream: null as MediaStream | null,
      isClosing: ref(false),
      isClosed: ref(false),
      mediaRecorder: null as MediaRecorder | null,
      connection: connection,
      messages,
      isLoadingMessage,
    };
  },
  mounted() {
    this.scrollMessageViewToBottom();
  },
  methods: {
    startRecording() {
      this.isInit = false;
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
                const base64String = btoa(String.fromCharCode.apply(null, uint8Array));

                this.connection
                  .invoke("TransmitUserAudio", base64String)
                  .catch((err) => console.error(err))
                  .then(() => {
                    if (this.isClosing) {
                      this.isClosed = true;
                      this.isRecording = false;

                      this.connection.invoke("CloseAudioStream").catch((err) => console.error(err));

                      this.mediaRecorder = null;
                      this.isLoadingMessage = true;
                      this.scrollMessageViewToBottom();
                    }
                  });
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
    modifyAvatar() {
      this.$emit("edit-avatar");
    },
    audioChanged(e) {
      console.log("audio changed", e);
    },
    getAudioSource(message) {
      if (message.audio) {
        var binaryAudioData = atob(message.audio);
        var uint8AudioData = new Uint8Array(binaryAudioData.length);
        for (var i = 0; i < binaryAudioData.length; i++) {
          uint8AudioData[i] = binaryAudioData.charCodeAt(i);
        }

        return URL.createObjectURL(new Blob([uint8AudioData.buffer], { type: "audio/wav" }));
      }
    },
    scrollMessageViewToBottom() {
      nextTick(() => {
        const messageView = document.querySelector(".messages");
        if (messageView) {
          messageView.scrollTop = messageView.scrollHeight;
        }
      });
    },
    clearChats() {
      this.messagesStore.clearMessages();
      this.messages.splice(0, this.messages.length);
    },
  },
  watch: {
    messages: {
      handler() {
        this.scrollMessageViewToBottom();
      },
      deep: false,
    },
  },
};
</script>

<style lang="scss">
.avatar-display {
  img {
    max-height: 30vh;
  }

  .modify-avatar {
    position: absolute;
    top: 25px;
    right: 25px;
  }
}

.messages {
  height: 100%;
  max-height: 55vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column; /* Newest items at the bottom */

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

    audio {
      max-width: 100%;
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
    margin-bottom: 10px;
    word-wrap: break-word; /* Word wrapping for longer texts */
  }
}

.input-message {
  display: flex;
  justify-content: center;
  margin: 10px 0;
}

.loader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 50px;
}
.dot {
  width: 10px;
  height: 10px;
  background-color: #007bff; /* Bootstrap primary color */
  border-radius: 50%;
  opacity: 0.4;
  animation: pulse 1.5s infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.5s;
}

.dot:nth-child(3) {
  animation-delay: 1s;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}
</style>
