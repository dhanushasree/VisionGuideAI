import { useState } from "react";
import API from "../api";

function VoiceAssistant({ refreshHistory }) {
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState("");

  const speak = (text) => {
    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    speech.rate = 0.9;
    speech.volume = 1;

    window.speechSynthesis.speak(speech);
  };

  const processCommand = async (text) => {
    if (!text.trim()) {
      speak("Please enter or speak a command.");
      return;
    }

    try {
      const res = await API.post("/commands", {
        commandText: text
      });

      setResponse(res.data.responseText);
      speak(res.data.responseText);

      if (refreshHistory) {
        refreshHistory();
      }
    } catch (error) {
      const errorMessage = "Backend is not connected. Please start the backend server.";
      setResponse(errorMessage);
      speak(errorMessage);
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const message = "Speech recognition is not supported in this browser. Please use Google Chrome.";
      setResponse(message);
      speak(message);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.start();

    recognition.onstart = () => {
      setResponse("Listening...");
      speak("Listening");
    };

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      setCommand(spokenText);
      processCommand(spokenText);
    };

    recognition.onerror = () => {
      const message = "Voice recognition failed. Please try again.";
      setResponse(message);
      speak(message);
    };
  };

  return (
    <section className="card">
      <h2>Voice Assistant</h2>
      <p>Speak or type commands like: hello, open emergency, read article, navigate to hospital.</p>

      <button className="voice-btn" onClick={startListening}>
        🎤 Speak Command
      </button>

      <input
        type="text"
        placeholder="Type your command here"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
      />

      <button onClick={() => processCommand(command)}>
        Send Command
      </button>

      <div className="result-box">
        <p><strong>Your Command:</strong> {command}</p>
        <p><strong>Assistant Reply:</strong> {response}</p>
      </div>
    </section>
  );
}

export default VoiceAssistant;