import React, { useEffect, useState } from "react";
import API from "../api";

function ArticleReader() {
  const [articles, setArticles] = useState([]);
  const [form, setForm] = useState({ title: "", content: "" });

  const fetchArticles = async () => {
    try {
      const { data } = await API.get("/articles");
      setArticles(data);
    } catch (error) {
      console.error("Error fetching articles:", error.message);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addArticle = async (e) => {
    e.preventDefault();
    try {
      await API.post("/articles", form);
      setForm({ title: "", content: "" });
      fetchArticles();
      alert("Article added successfully!");
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Unknown error";
      alert("Error adding article: " + message);
    }
  };

  const readArticle = (title, content) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(`${title}. ${content}`);
    speech.lang = "en-US";
    speech.rate = 0.85;
    speech.volume = 1;
    window.speechSynthesis.speak(speech);
  };

  const stopReading = () => window.speechSynthesis.cancel();

  const deleteArticle = async (id) => {
    try {
      await API.delete(`/articles/${id}`);
      fetchArticles();
      alert("Article deleted successfully!");
    } catch {
      alert("Error deleting article");
    }
  };

  return (
    <div style={styles.card}>
      <h2>Article Reader</h2>
      <p>
        Add article content and click Read Aloud. This helps visually impaired
        users listen to written information.
      </p>

      <form onSubmit={addArticle}>
        <input
          style={styles.input}
          type="text"
          placeholder="Enter article title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <textarea
          style={styles.textarea}
          placeholder="Paste article content here"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          required
        />
        <button style={styles.button} type="submit">
          Add Article
        </button>
      </form>

      <button style={styles.stopButton} onClick={stopReading}>
        Stop Reading
      </button>

      <h3>Saved Articles</h3>

      {articles.length === 0 ? (
        <p>No articles saved yet.</p>
      ) : (
        articles.map((article) => (
          <div style={styles.articleBox} key={article.id}>
            <h3>{article.title}</h3>
            <p>{article.content}</p>
            <button
              style={styles.smallButton}
              onClick={() => readArticle(article.title, article.content)}
            >
              🔊 Read Aloud
            </button>
            <button
              style={styles.deleteButton}
              onClick={() => deleteArticle(article.id)}
            >
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}

const styles = {
  card:        { backgroundColor: "#1f2937", padding: "25px", borderRadius: "15px", maxWidth: "700px", margin: "20px auto", color: "white" },
  input:       { width: "100%", padding: "15px", margin: "10px 0", borderRadius: "8px", border: "none", fontSize: "18px" },
  textarea:    { width: "100%", minHeight: "120px", padding: "15px", margin: "10px 0", borderRadius: "8px", border: "none", fontSize: "18px" },
  button:      { backgroundColor: "#22c55e", color: "black", padding: "15px", fontSize: "18px", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer", width: "100%" },
  stopButton:  { backgroundColor: "#ef4444", color: "white", padding: "12px", fontSize: "16px", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer", marginTop: "12px" },
  articleBox:  { backgroundColor: "#111827", padding: "15px", borderRadius: "10px", marginBottom: "15px", borderLeft: "5px solid #facc15" },
  smallButton: { backgroundColor: "#facc15", color: "black", padding: "10px", fontSize: "16px", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer", marginRight: "10px" },
  deleteButton:{ backgroundColor: "#ef4444", color: "white", padding: "10px", fontSize: "16px", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer" },
};

export default ArticleReader;
