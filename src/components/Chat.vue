<template>
  <BContainer fluid class="d-flex flex-column min-vh-100" id="ChatContainer">
    <BRow class="flex-shrink-1">
      <BCol class="pt-3 avatar-display">
        <div class="avatar border rounded-3 px-3 d-flex justify-content-center">
          <img :src="avatar" class="rounded-3 flex-grow-0 avatar-image" alt="Dein Avatar" />
          <BButton variant="light" size="lg" class="modify-avatar" @click="modifyAvatar"><i-mdi-cog class="mb-1" /></BButton>
        </div>
      </BCol>
    </BRow>
    <BRow class="messages-container flex-grow-1">
      <BCol class="pt-3">
        <div class="messages border rounded-3 px-3">
          <div v-for="(message, index) in messages" :key="index" :class="[message.source, { 'is-error': message.isError ?? false }]">
            <div class="message-box">
              <i-mdi-alert-circle-outline class="mb-1" v-if="message.isError" /> {{ message.text }}
              <template v-if="message.audio">
                <hr />
                <audio controls :id="`MessageAudio${message.messageId}`">
                  <source :src="getAudioSource(message)" type="audio/wav" />
                </audio>
              </template>
              <small class="emotions t-small" v-if="message.emotions && message.emotions.length">
                Erkannte Emotionen:
                <span
                  v-for="(emotion, index) in message.emotions.filter((e) => e)"
                  :key="index"
                  class="emotion"
                  :title="emotion.name"
                  v-html="emotion.emojiHtml"
                ></span>
              </small>
              <small class="timestamp" v-if="message.timestamp">{{ message.timestamp }}</small>
            </div>
          </div>
          <div class="avatar" v-if="isLoadingMessage">
            <div class="message-box loader-box">
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
            <template v-if="!isLoadingMessage">Nachricht senden...</template>
            <template v-else>Nachricht übermittlung...</template>
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

    const emotionsClassMap = {
      anger: { name: "wütend", emojiHtml: "&#128545;" },
      anxiety: { name: "ängstlich", emojiHtml: "&#128552;" },
      boredom: { name: "gelangweilt", emojiHtml: "&#128529;" },
      disgust: { name: "angewidert", emojiHtml: "&#128565;" },
      happiness: { name: "glücklich", emojiHtml: "&#128512;" },
      neutral: { name: "neutral", emojiHtml: "&#128528;" },
      sadness: { name: "traurig", emojiHtml: "&#128546;" },
    };

    const connection = new HubConnectionBuilder().withUrl(`${baseUrl}/audiohub`).build();
    const messages: Ref<MessageModel[]> = ref([]);
    const isLoadingMessage = ref(false);
    const getServerMessageTimeout = ref(null);

    // Start the connection
    connection
      .start()
      .then(() => {
        console.log("WebSocket Connection started! 🎉");
        connection.on("handshake", (response) => {
          console.log(response);
        });
        connection.on("emotions", (response) => {
          const predictedEmotions = response.predicted_classes;
          const emotions = predictedEmotions.map((emotion) => emotionsClassMap[emotion]);

          setTimeout(async () => {
            const relatedMessage = messages.value[messages.value.length - 2];
            if (relatedMessage) {
              relatedMessage.emotions = emotions;
              await messagesStore.updateEmotions(relatedMessage.messageId, emotions);
            }
          }, 750);
        });
        connection.on("audioResponse", async (response) => {
          if (getServerMessageTimeout.value) {
            clearTimeout(getServerMessageTimeout.value);
          }

          isLoadingMessage.value = false;

          const ownMessageId = messages.value.length;
          const avatarMessageId = ownMessageId + 1;

          const haveOwnMessage = response.understoodText && response.understoodText.length > 0;
          const ownMessage: MessageModel = {
            messageId: ownMessageId,
            text: response.understoodText,
            source: "own",
            timestamp: new Date().toLocaleTimeString().substring(0, 5),
          };

          const avatarMessage: MessageModel = {
            messageId: avatarMessageId,
            text: response.answerText,
            source: "avatar",
            audio: response.base64EncodedMp3,
            timestamp: new Date().toLocaleTimeString().substring(0, 5),
          };

          if (haveOwnMessage) {
            messages.value.push(ownMessage);
          }

          messages.value.push(avatarMessage);

          if (haveOwnMessage) {
            await messagesStore.pushMessage(ownMessage);
          }

          await messagesStore.pushMessage(avatarMessage);

          playAudio(avatarMessageId);
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
      getServerMessageTimeout,
    };
  },
  async mounted() {
    await this.messagesStore.init();
    this.messages.push(...this.messagesStore.messages);

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
                      this.startMessageLoadingGuard();
                    }
                  });
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
        this.isClosing = true;
      }

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      }
    },
    modifyAvatar() {
      this.$emit("edit-avatar");
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
    startMessageLoadingGuard() {
      this.getServerMessageTimeout = setTimeout(() => {
        if (this.getServerMessageTimeout === null || !this.isLoadingMessage) {
          this.getServerMessageTimeout = null;
          return;
        }

        this.getServerMessageTimeout = null;

        this.isLoadingMessage = false;
        this.messages.push({
          messageId: this.messages.length,
          text: "Es ist leider ein Fehler aufgetreten. Bitte versuche es erneut.",
          source: "avatar",
          timestamp: new Date().toLocaleTimeString().substring(0, 5),
          isError: true,
        });

        this.scrollMessageViewToBottom();
      }, 20000);
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
    max-height: 25vh;

    @media (min-height: 800px) {
      max-height: 30vh;
    }
  }

  .modify-avatar {
    position: absolute;
    top: 25px;
    right: 25px;
  }

  .avatar {
    background: radial-gradient(farthest-side, rgba(255, 255, 255, 0.5) 50%, rgba(255, 31, 39, 0.05) 100%);

    .avatar-image {
      mix-blend-mode: multiply;
    }
  }
}

.messages {
  height: 100%;
  max-height: 54vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column; /* Newest items at the bottom */

  @media (min-height: 800px) {
    max-height: 55vh;
  }

  .avatar,
  .own {
    display: flex;
    margin: 10px 0;

    &:first-child {
      margin-top: auto;
    }
  }

  .avatar {
    justify-content: flex-start;
    .message-box {
      background-color: #f2f2f2;
    }

    audio {
      width: 100%;
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
    min-width: 250px;
    margin-bottom: 10px;
    word-wrap: break-word; /* Word wrapping for longer texts */

    position: relative;
    padding-bottom: calc(10px + 1.7em);

    opacity: 0;
    animation: slideIn 0.3s ease-out forwards;

    .timestamp {
      position: absolute;
      bottom: 10px;
      right: 10px;
    }

    .emotions {
      position: absolute;
      bottom: 10px;
      left: 10px;
    }

    &.loader-box {
      padding-bottom: 10px;
      min-width: 0;
    }
  }

  .is-error {
    animation: shake 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;

    .message-box {
      color: var(--bs-alert-color);
      background-color: var(--bs-danger-bg-subtle);
    }
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
    transform: scale(0);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shake {
  10%,
  90% {
    transform: translate3d(-1px, 0, 0);
  }

  20%,
  80% {
    transform: translate3d(2px, 0, 0);
  }

  30%,
  50%,
  70% {
    transform: translate3d(-4px, 0, 0);
  }

  40%,
  60% {
    transform: translate3d(4px, 0, 0);
  }
}
</style>
