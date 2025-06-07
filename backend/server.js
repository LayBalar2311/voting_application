const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));
// backend/server.js
const allowedOrigins = [
  'https://voting-application-user.vercel.app',
  'https://voting-application-admin.vercel.app',
  'https://voting-application-dx1w.onrender.com', // Your backend itself
  'http://localhost:3000' // For local testing
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));
// Voting Event Schema
const votingEventSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const VotingEvent = mongoose.model('VotingEvent', votingEventSchema);

// Candidate Schema
const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  votingEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'VotingEvent', required: true }
});
const Candidate = mongoose.model('Candidate', candidateSchema);

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  txHash: String,
  voter: String,
  candidate: String,
  votingEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'VotingEvent', required: true },
  timestamp: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', transactionSchema);

// API to create a voting event
app.post('/api/voting-events', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).send({ error: 'Voting event name is required' });
  try {
    const votingEvent = new VotingEvent({ name });
    await votingEvent.save();
    res.status(201).send(votingEvent);
  } catch (err) {
    res.status(400).send({ error: 'Voting event already exists or invalid data' });
  }
});

// API to get all voting events
app.get('/api/voting-events', async (req, res) => {
  const votingEvents = await VotingEvent.find();
  res.send(votingEvents);
});

// API to add a candidate to a voting event
app.post('/api/voting-events/:eventId/candidates', async (req, res) => {
  const { eventId } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).send({ error: 'Candidate name is required' });
  try {
    const votingEvent = await VotingEvent.findById(eventId);
    if (!votingEvent) return res.status(404).send({ error: 'Voting event not found' });
    const candidate = new Candidate({ name, votingEvent: eventId });
    await candidate.save();
    res.status(201).send(candidate);
  } catch (err) {
    res.status(400).send({ error: 'Candidate already exists or invalid data' });
  }
});

// API to get candidates for a voting event
app.get('/api/voting-events/:eventId/candidates', async (req, res) => {
  const { eventId } = req.params;
  const candidates = await Candidate.find({ votingEvent: eventId });
  res.send(candidates);
});

// API to start a voting event
app.post('/api/voting-events/:eventId/start', async (req, res) => {
  const { eventId } = req.params;
  try {
    const votingEvent = await VotingEvent.findById(eventId);
    if (!votingEvent) return res.status(404).send({ error: 'Voting event not found' });
    votingEvent.isActive = true;
    votingEvent.updatedAt = Date.now();
    await votingEvent.save();
    res.send({ message: 'Voting started', isActive: true });
  } catch (err) {
    res.status(400).send({ error: 'Failed to start voting' });
  }
});

// API to end a voting event
app.post('/api/voting-events/:eventId/end', async (req, res) => {
  const { eventId } = req.params;
  try {
    const votingEvent = await VotingEvent.findById(eventId);
    if (!votingEvent) return res.status(404).send({ error: 'Voting event not found' });
    votingEvent.isActive = false;
    votingEvent.updatedAt = Date.now();
    await votingEvent.save();
    res.send({ message: 'Voting ended', isActive: false });
  } catch (err) {
    res.status(400).send({ error: 'Failed to end voting' });
  }
});

// API to get voting event status and candidates
app.get('/api/voting-events/:eventId/status', async (req, res) => {
  const { eventId } = req.params;
  try {
    const votingEvent = await VotingEvent.findById(eventId);
    if (!votingEvent) return res.status(404).send({ error: 'Voting event not found' });
    const candidates = await Candidate.find({ votingEvent: eventId });
    res.send({ isActive: votingEvent.isActive, candidates });
  } catch (err) {
    res.status(400).send({ error: 'Failed to fetch status' });
  }
});

// API to save a transaction for a voting event
app.post('/api/voting-events/:eventId/transactions', async (req, res) => {
  const { eventId } = req.params;
  const { txHash, voter, candidate } = req.body;
  try {
    const votingEvent = await VotingEvent.findById(eventId);
    if (!votingEvent || !votingEvent.isActive) {
      return res.status(400).send({ error: 'Voting is not active for this event' });
    }
    const candidateExists = await Candidate.findOne({ name: candidate, votingEvent: eventId });
    if (!candidateExists) {
      return res.status(400).send({ error: 'Invalid candidate for this voting event' });
    }
    const transaction = new Transaction({ txHash, voter, candidate, votingEvent: eventId });
    await transaction.save();
    res.status(201).send(transaction);
  } catch (err) {
    res.status(400).send({ error: 'Failed to save transaction' });
  }
});

// API to get transactions for a voting event
app.get('/api/voting-events/:eventId/transactions', async (req, res) => {
  const { eventId } = req.params;
  const transactions = await Transaction.find({ votingEvent: eventId });
  res.send(transactions);
});

// API to get winner for a voting event
app.get('/api/voting-events/:eventId/winner', async (req, res) => {
  const { eventId } = req.params;
  try {
    const votingEvent = await VotingEvent.findById(eventId);
    if (!votingEvent) return res.status(404).send({ error: 'Voting event not found' });
    if (votingEvent.isActive) {
      return res.status(400).send({ error: 'Voting is still active for this event' });
    }
    const transactions = await Transaction.find({ votingEvent: eventId });
    const votes = transactions.reduce((acc, tx) => {
      acc[tx.candidate] = (acc[tx.candidate] || 0) + 1;
      return acc;
    }, {});
    const winner = Object.keys(votes).reduce((a, b) => (votes[a] > votes[b] ? a : b), null);
    res.send({ winner, votes });
  } catch (err) {
    res.status(400).send({ error: 'Failed to fetch winner' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));