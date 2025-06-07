import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import axios from 'axios';
import './App.css';

// Smart contract details
const contractABI = [
  {
    "inputs": [{"internalType": "string","name": "candidate","type": "string"}],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string","name": "candidate","type": "string"}],
    "name": "getVotes",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];
const contractAddress = '0x1234567890Abcdef1234567890Abcdef12345678'; // From Etherscan

function App() {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [candidate, setCandidate] = useState('');
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [votingEvents, setVotingEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [votingStatus, setVotingStatus] = useState(false);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    const initWeb3 = async () => {
      if (!window.ethereum) {
        setError('MetaMask is not installed. Please install it to use this app.');
        return;
      }

      const web3Instance = new Web3(window.ethereum);
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3Instance.eth.getAccounts();
        if (accounts.length === 0) {
          setError('No accounts found. Please connect an account in MetaMask.');
          return;
        }

        setWeb3(web3Instance);
        setAccount(accounts[0]);
        const contractInstance = new web3Instance.eth.Contract(contractABI, contractAddress);
        setContract(contractInstance);

        // Fetch voting events
        const eventsResponse = await axios.get('https://voting-application-dx1w.onrender.com/api/voting-events');
        setVotingEvents(eventsResponse.data);
      } catch (err) {
        setError('Failed to connect to MetaMask: ' + err.message);
      }
    };

    initWeb3();
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    const fetchEventData = async () => {
      try {
        // Fetch voting status and candidates
        const statusResponse = await axios.get(`https://voting-application-dx1w.onrender.com/api/voting-events/${selectedEvent}/status`);
        setVotingStatus(statusResponse.data.isActive);
        setCandidates(statusResponse.data.candidates.map(c => c.name));

        // Fetch total votes
        const txResponse = await axios.get(`https://voting-application-dx1w.onrender.com/api/voting-events/${selectedEvent}/transactions`);
        setTotalVotes(txResponse.data.length);

        // Fetch winner if voting is off
        if (!statusResponse.data.isActive) {
          const winnerResponse = await axios.get(`https://voting-application-dx1w.onrender.com/api/voting-events/${selectedEvent}/winner`);
          setWinner(winnerResponse.data.winner);
        } else {
          setWinner(null);
        }
      } catch (err) {
        setError('Failed to fetch event data: ' + err.response?.data?.error || err.message);
      }
    };
    fetchEventData();
  }, [selectedEvent]);

  const vote = async () => {
    if (!contract || !candidate || !selectedEvent) {
      setError('Please select a voting event and candidate, and ensure MetaMask is connected.');
      return;
    }
    if (!votingStatus) {
      setError('Voting is not active for this event.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const tx = await contract.methods.vote(candidate).send({ from: account });
      const txData = { txHash: tx.transactionHash, voter: account, candidate };
      await axios.post(`https://voting-application-dx1w.onrender.com/api/voting-events/${selectedEvent}/transactions`, txData);
      alert('Vote successful!');
      setCandidate('');
      setTotalVotes(totalVotes + 1);
    } catch (err) {
      setError('Voting failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="header-row">
        <h1>Voter Portal</h1>
        <p className="account-info">
          Connected Account: {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}
        </p>
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
        <select
          value={candidate}
          onChange={(e) => setCandidate(e.target.value)}
          disabled={loading || !votingStatus || !selectedEvent}
          className="candidate-select"
        >
          <option value="">Select a Candidate</option>
          {candidates.map((cand) => (
            <option key={cand} value={cand}>
              {cand}
            </option>
          ))}
        </select>
        <button onClick={vote} disabled={loading || !votingStatus || !selectedEvent}>
          {loading ? 'Voting...' : 'Cast Vote'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="vote-summary">
        {selectedEvent ? (
          <>
            <p className="total-votes">Total Votes Cast: {totalVotes}</p>
            <p className="voting-status">Status: {votingStatus ? 'Voting Active' : 'Voting Inactive'}</p>
            {!votingStatus && winner && (
              <p className="winner">Winner: {winner}</p>
            )}
            <h2>Available Candidates</h2>
            {candidates.length === 0 ? (
              <p>No candidates available for this event.</p>
            ) : (
              <ul className="candidate-list">
                {candidates.map((cand) => (
                  <li key={cand}>{cand}</li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p>Please select a voting event to view details.</p>
        )}
      </div>
    </div>
  );
}

export default App;