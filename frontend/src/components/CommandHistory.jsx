function CommandHistory({ commands }) {
  return (
    <section className="card">
      <h2>Command History</h2>

      {commands.length === 0 ? (
        <p>No commands yet.</p>
      ) : (
        <div className="list">
          {commands.map((command) => (
            <div className="list-item" key={command._id}>
              <p><strong>Command:</strong> {command.commandText}</p>
              <p><strong>Response:</strong> {command.responseText}</p>
              <p><strong>Type:</strong> {command.commandType}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default CommandHistory;