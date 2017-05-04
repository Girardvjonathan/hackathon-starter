const Activity = require('../models/Activity');
const mock = require('../models/MockData');
const moment = require('moment');

function isInt(value) {
  return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
}

const getHighChartOptions = (activities) => {
  const options = {
    title: {
      text: 'Distance by Date',
      x: -20
    },
    xAxis: {},
    yAxis: {
      title: {
        text: 'Kilometer (km)'
      },
      plotLines: [{
        value: 0,
        width: 1,
        color: '#808080'
      }]
    },
    tooltip: {
      shared: false,
      // TODO fix that (must have change with new API)
      formatter: function formatter() {
        let text = '';
        if (this.series.name === 'Distance (km)') {
          text = `${this.x} <br>You have run ${this.y.toFixed(2)} km`;
        } else {
          text = `${this.x} <br>Your pace is ${this.y.toFixed(2)} min/km`;
        }
        return text;
      }
    },
    legend: {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'middle',
      borderWidth: 0
    },
    series: []
  };
  const categories = [];
  const running = { name: 'Distance (km)', data: [] };
  const paces = { name: 'Running Pace (min/km)', data: [] };
  let totalTime = moment.duration();
  let totalDistance = 0;
  activities.forEach((entry) => {
    if (entry.distance != null) {
      const formatedDate = moment(entry.date).locale('en').format('ll');
      categories.push(formatedDate);
      running.data.push(entry.distance);
      totalDistance += entry.distance;
      const minutes = moment.duration(entry.duration).asMinutes();
      // const minutes = new Duration(`${entry.duration}ms`).minutes();
      entry.pace = Math.round((minutes / entry.distance) * 1e2) / 1e2;
      paces.data.push(entry.pace);
      totalTime = moment.duration(totalTime) + moment.duration(entry.duration);
      entry.duration = minutes;
    }
  });
  options.series.push(running);
  options.series.push(paces);
  totalTime = moment.duration(totalTime).asMinutes();
  const averagePaceMin = Math.floor(totalTime / totalDistance);
  const averagePaceSec = Math.floor((totalTime / totalDistance % 1) * 60);
  options.xAxis.categories = categories;
  return [averagePaceMin, averagePaceSec, totalTime, totalDistance, options];
};


/**
 * GET /activities
 * Activities page
 */
exports.getActivities = (req, res, next) => {
  if (!req.user) {
    return res.redirect('/login');
  }

  const week = req.query.week;
  let start = moment('12-25-1990', 'MM-DD-YYYY');
  let end = moment().add(52, 'weeks');
  let previousWeek = -1;
  let nextWeek = 1;
  if (isInt(week)) {
    previousWeek = parseInt(week, 10) - 1;
    nextWeek = parseInt(week, 10) + 1;
    start = moment().add(week, 'weeks').startOf('isoWeek');
    end = moment().add(week, 'weeks').endOf('isoWeek');
  }
  previousWeek = `/activities?week=${previousWeek}`;
  nextWeek = `/activities?week=${nextWeek}`;

  Activity.find({ userId: req.user._id })
    .where('date')
    .gt(start)
    .lt(end)
    .exec((err, activities) => {
      if (err) {
        return next(err);
      }
      activities.sort((a, b) => {
        const c = new Date(a.date);
        const d = new Date(b.date);
        return c - d;
      });
      const [averagePaceMin, averagePaceSec, totalTime, totalDistance, options] = getHighChartOptions(activities);
      res.render('activity/activities', {
        title: 'Activities',
        activities,
        options,
        averagePaceMin,
        averagePaceSec,
        totalTime,
        totalDistance,
        previousWeek,
        nextWeek
      });
    });
};

exports.setMock = (req, res) => {
  if (!req.user) {
    return res.redirect('/login');
  }
  mock.mockData(req.user._id);
  return res.redirect('/activities');
};

exports.createActivity = (req, res) => {
  if (!req.user) {
    return res.redirect('/login');
  }

  if (req.method === 'GET') {
    return res.render('activity/createActivity', {
      title: 'Create Activitie',
      now: moment().format('YYYY-MM-DD')
    });
  }
  req.assert('distance', 'Distance must be greater than 0').isInt().gte(0);
  req.assert('date', 'Enter a valid date').isDate();
  req.assert('unit', 'Bad unit mesure').unitValidator();
  req.assert('hour', 'Hour must be greater than 0').isInt().gte(0);
  req.assert('minute', 'Minutes must be between 0 and 59').isInt().gte(0).lte(59);
  req.assert('seconde', 'Seconds must be between 0 and 59').isInt().gte(0).lte(59);
  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/activity/create');
  }
  Activity.create(new Activity({
    userId: req.user._id,
    duration: moment.duration(`${req.body.hour}:${req.body.minute}:${req.body.seconde}`),
    date: moment(req.body.date),
    distance: req.body.distance,
    note: '',
    type: 'Course'
  }), function () {
    return res.redirect('/activities');
  });
};
