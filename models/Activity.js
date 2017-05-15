const mongoose = require('mongoose');

// User Schema
const ActivitySchema = mongoose.Schema({
  userId: {
    type: String,
    index: true,
    required: true
  },
  duration: {
    type: Number
  },
  date: {
    type: Date,
    required: true
  },
  distance: {
    type: Number
  },
  note: {
    type: String
  },
  type: {
    type: String,
    enum: ['running', 'bike', 'other', 'fitness'],
    default: 'running',
    required: false
  }
});

const Activity = mongoose.model('Activity', ActivitySchema);
module.exports = Activity;
