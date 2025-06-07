import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [votingEvents, setVotingEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [candidateVotes, setCandidateVotes] = useState({});
  const [newCandidate, setNewCandidate] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [votingStatus, setVotingStatus] = useState(false);
  const [winner, setWinner] = useState(null);

  // Fetch voting events on mount
  useEffect(() => {
    const fetchVotingEvents = async () => {
      try {
        const response = await axios.get('https://voting-application-dx1w.onrender.com/api/voting-events');
        setVotingEvents(response.data);
      } catch (error) {
        console.error('Error fetching voting events:', error);
      }
    };
    fetchVotingEvents();
  }, []);

  // Fetch data for selected event
  useEffect(() => {
    if (!selectedEvent) return;
    const fetchEventData = async () => {
      try {
        // Fetch transactions
        const txResponse = await axios.get(`https://voting-application-dx1w.onrender.com/api/voting-events/${selectedEvent}/transactions`);
        const txData = txResponse.data;
        setTransactions(txData);

        // Aggregate votes by candidate
        const votes = txData.reduce((acc, tx) => {
          const candidate = tx.candidate;
          acc[candidate] = (acc[candidate] || 0) + 1;
          return acc;
        }, {});
        setCandidateVotes(votes);

        // Fetch voting status
        const statusResponse = await axios.get(`https://voting-application-dx1w.onrender.com/api/voting-events/${selectedEvent}/status`);
        setVotingStatus(statusResponse.data.isActive);

        // Fetch winner if voting is off
        if (!statusResponse.data.isActive) {
          const winnerResponse = await axios.get(`https://voting-application-dx1w.onrender.com/api/voting-events/${selectedEvent}/winner`);
          setWinner(winnerResponse.data.winner);
        } else {
          setWinner(null);
        }
      } catch (error) {
        console.error('Error fetching event data:', error);
      }
    };
    fetchEventData();
  }, [selectedEvent]);

  const createVotingEvent = async () => {
    if (!newEventName) return;
    try {
      const response = await axios.post('https://voting-application-dx1w.onrender.com/api/voting-events', { name: newEventName });
      setVotingEvents([...votingEvents, response.data]);
      setNewEventName('');
      alert('Voting event created successfully!');
    } catch (error) {
      console.error('Error creating voting event:', error);
      alert('Failed to create voting event: ' + error.response.data.error);
    }
  };

  const addCandidate = async () => {
    if (!newCandidate || !selectedEvent) return;
    try {
      await axios.post(`https://voting-application-dx1w.onrender.com/api/voting-events/${selectedEvent}/candidates`, { name: newCandidate });
      setNewCandidate('');
      alert('Candidate added successfully!');
    } catch (error) {
      console.error('Error adding candidate:', error);
      alert('Failed to add candidate: ' + error.response.data.error);
    }
  };

  const startVoting = async () => {
    if (!selectedEvent) return;
    try {
      await axios.post(`https://voting-application-dx1w.onrender.com/api/voting-events/${selectedEvent}/start`);
      setVotingStatus(true);
      setWinner(null);
      alert('Voting started!');
    } catch (error) {
      console.error('Error starting voting:', error);
      alert('Failed to start voting: ' + error.response.data.error);
    }
  };

  const endVoting = async () => {
    if (!selectedEvent) return;
    try {
      await axios.post(`https://voting-application-dx1w.onrender.com/api/voting-events/${selectedEvent}/end`);
      setVotingStatus(false);
      const winnerResponse = await axios.get(`https://voting-application-dx1w.onrender.com/api/voting-events/${selectedEvent}/winner`);
      setWinner(winnerResponse.data.winner);
      alert('Voting ended!');
    } catch (error) {
      console.error('Error ending voting:', error);
      alert('Failed to end voting: ' + error.response.data.error);
    }
  };

  return (
    <div className="App">
      <h1>Organization Dashboard</h1>

      {/* Voting Event Management */}
      <div className="voting-event-controls">
        <h2>Voting Event Management</h2>
        <div className="create-event">
          <input
            type="text"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            placeholder="Enter voting event name (e.g., Division A CR Voting)"
          />
          <button onClick={createVotingEvent}>Create Voting Event</button>
        </div>
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="event-select"
        >
          <option value="">Select a Voting Event</option>
          {votingEvents.map((event) => (
            <option key={event._id} value={event._id}>
              {event.name}
            </option>
          ))}
        </select>
      </div>

      {/* Voting Controls */}
      {selectedEvent && (
        <div className="voting-controls">
          <h2>Voting Controls for {votingEvents.find(e => e._id === selectedEvent)?.name}</h2>
          <p>Current Status: {votingStatus ? 'Voting Active' : 'Voting Inactive'}</p>
          <div className="control-buttons">
            <button onClick={startVoting} disabled={votingStatus}>
              Start Voting
            </button>
            <button onClick={endVoting} disabled={!votingStatus}>
              End Voting
            </button>
          </div>
          <div className="add-candidate">
            <input
              type="text"
              value={newCandidate}
              onChange={(e) => setNewCandidate(e.target.value)}
              placeholder="Enter candidate name"
            />
            <button onClick={addCandidate}>Add Candidate</button>
          </div>
        </div>
      )}

      {/* Winner Section */}
      {selectedEvent && !votingStatus && winner && (
        <div className="winner-section">
          <h2>Winner for {votingEvents.find(e => e._id === selectedEvent)?.name}</h2>
          <p className="winner">{winner}</p>
        </div>
      )}

      {/* Candidate Vote Counts Section */}
      {selectedEvent && (
        <>
          <h2>Candidate Vote Counts</h2>
          {Object.keys(candidateVotes).length === 0 ? (
            <p>No votes recorded yet for this event.</p>
          ) : (
            <table className="vote-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Votes Received</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(candidateVotes).map(([candidate, votes]) => (
                  <tr key={candidate}>
                    <td>{candidate}</td>
                    <td>{votes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Transaction Details Section */}
      {selectedEvent && (
        <>
          <h2>Transaction Details</h2>
          {transactions.length === 0 ? (
            <p>No transactions yet for this event.</p>
          ) : (
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>Voter Address</th>
                  <th>Candidate</th>
                  <th>Transaction Hash</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td>{tx.voter}</td>
                    <td>{tx.candidate}</td>
                    <td>{tx.txHash}</td>
                    <td>{new Date(tx.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

export default App;