import { useState } from "react";
import API from "../api";

function NavigationHelper() {
  const [destination, setDestination] = useState("");
  const [message, setMessage] = useState("");

  const speak = (text) => {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    window.speechSynthesis.speak(speech);
  };

  const saveNavigation = async (e) => {
    e.preventDefault();

    try {
      await API.post("/navigation", {
        destination
      });

      const reply = `Navigation request saved for ${destination}.`;
      setMessage(reply);
      speak(reply);
      setDestination("");
    } catch (error) {
      const reply = "Error saving navigation request.";
      setMessage(reply);
      speak(reply);
    }
  };

  const openGoogleMaps = () => {
    if (!destination.trim()) {
      speak("Please enter destination first.");
      return;
    }

    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
    window.open(mapUrl, "_blank");
    speak(`Opening map for ${destination}`);
  };

  return (
    <section className="card">
      <h2>Navigation Helper</h2>

      <form onSubmit={saveNavigation}>
        <input
          type="text"
          placeholder="Enter destination, example: hospital near me"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
        />

        <button type="submit">Save Navigation</button>
      </form>

      <button onClick={openGoogleMaps}>
        Open in Google Maps
      </button>

      <p>{message}</p>
    </section>
  );
}

export default NavigationHelper;