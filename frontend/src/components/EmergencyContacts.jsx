import { useEffect, useState } from "react";
import API from "../api";

function EmergencyContacts() {
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    relation: ""
  });

  const speak = (text) => {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    window.speechSynthesis.speak(speech);
  };

  const fetchContacts = async () => {
    try {
      const res = await API.get("/emergency");
      setContacts(res.data);
    } catch (error) {
      console.log("Error fetching contacts:", error.message);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const addContact = async (e) => {
    e.preventDefault();

    try {
      await API.post("/emergency", form);

      setForm({
        name: "",
        phone: "",
        relation: ""
      });

      fetchContacts();
      speak("Emergency contact added successfully.");
    } catch (error) {
      speak("Error adding emergency contact.");
    }
  };

  const deleteContact = async (id) => {
    try {
      await API.delete(`/emergency/${id}`);
      fetchContacts();
      speak("Emergency contact deleted.");
    } catch (error) {
      speak("Error deleting contact.");
    }
  };

  return (
    <section className="card">
      <h2>Emergency Contacts</h2>

      <form onSubmit={addContact}>
        <input
          type="text"
          placeholder="Contact Name"
          value={form.name}
          onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value
            })
          }
          required
        />

        <input
          type="text"
          placeholder="Phone Number"
          value={form.phone}
          onChange={(e) =>
            setForm({
              ...form,
              phone: e.target.value
            })
          }
          required
        />

        <input
          type="text"
          placeholder="Relation"
          value={form.relation}
          onChange={(e) =>
            setForm({
              ...form,
              relation: e.target.value
            })
          }
          required
        />

        <button type="submit">Add Contact</button>
      </form>

      <div className="list">
        {contacts.map((contact) => (
          <div className="list-item" key={contact._id}>
            <h3>{contact.name}</h3>
            <p>Phone: {contact.phone}</p>
            <p>Relation: {contact.relation}</p>

            <button onClick={() => speak(`Calling ${contact.name}. Phone number is ${contact.phone}`)}>
              🔊 Read Contact
            </button>

            <button className="danger-btn" onClick={() => deleteContact(contact._id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default EmergencyContacts;