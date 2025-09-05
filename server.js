const express = require('express');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = 5000;

app.use(express.json());

const authenticateUser = (req, res, next) => {
  const userId = req.headers['user-id'];
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  req.userId = userId;
  next();
};

mongoose.connect('mongodb://localhost:27017/civilytix', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log(err));

const userSchema = new mongoose.Schema({
  _id: String,
  email: String,
  paymentStatus: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
  requestHistory: [{
    requestId: String,
    timestamp: Date,
    endpoint: String,
    requestParams: mongoose.Schema.Types.Mixed,
    resultUrl: String
  }]
});
const User = mongoose.model('User', userSchema);

const checkPaymentStatus = async (userId) => {
  const user = await User.findById(userId);
  return user ? user.paymentStatus : 'unpaid';
};

const logRequestToHistory = async (userId, requestData) => {
  await User.findByIdAndUpdate(
    userId,
    { $push: { requestHistory: requestData } },
    { upsert: true, new: true }
  );
};

app.post('/api/data/region', authenticateUser, async (req, res) => {
  try {
    const { center, radius_km, dataType } = req.body;
    const userId = req.userId;

    const paymentStatus = await checkPaymentStatus(userId);
    if (paymentStatus !== 'paid') {
      return res.status(402).json({
        status: 'error',
        message: 'Access denied. Please complete payment to use this feature.'
      });
    }

    const requestId = `req_${uuidv4()}`;
    const fileExtension = dataType === 'potholes' ? 'geojson' : 'tif';
    const downloadUrl = `https://storage.cloud.com/results/${userId}/${requestId}.${fileExtension}`;

    await logRequestToHistory(userId, {
      requestId,
      timestamp: new Date(),
      endpoint: '/api/data/region',
      requestParams: req.body,
      resultUrl: downloadUrl
    });

    res.json({
      status: 'success',
      message: 'Your data is ready for download.',
      requestId,
      downloadUrl
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/data/path', authenticateUser, async (req, res) => {
  try {
    const { start_coords, end_coords, buffer_meters, dataType } = req.body;
    const userId = req.userId;

    const paymentStatus = await checkPaymentStatus(userId);
    if (paymentStatus !== 'paid') {
      return res.status(402).json({
        status: 'error',
        message: 'Access denied. Please complete payment to use this feature.'
      });
    }

    const requestId = `req_${uuidv4()}`;
    const fileExtension = dataType === 'potholes' ? 'geojson' : 'tif';
    const downloadUrl = `https://storage.cloud.com/results/${userId}/${requestId}.${fileExtension}`;

    await logRequestToHistory(userId, {
      requestId,
      timestamp: new Date(),
      endpoint: '/api/data/path',
      requestParams: req.body,
      resultUrl: downloadUrl
    });

    res.json({
      status: 'success',
      message: 'Your data is ready for download.',
      requestId,
      downloadUrl
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user/history', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ history: user.requestHistory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user/history/:requestId', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;
    const requestId = req.params.requestId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const request = user.requestHistory.find(req => req.requestId === requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json({ requestId: request.requestId, downloadUrl: request.resultUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/test/create-user', async (req, res) => {
  try {
    const { userId, email, paymentStatus } = req.body;
    const user = new User({ _id: userId, email, paymentStatus });
    await user.save();
    res.json({ message: 'User created successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// NEW ENDPOINT: Update user payment status
app.post('/api/test/update-payment', async (req, res) => {
  try {
    const { userId, paymentStatus } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      { paymentStatus },
      { new: true }
    );
    res.json({ message: 'Payment status updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
