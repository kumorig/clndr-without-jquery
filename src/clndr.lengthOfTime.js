/**
 *
 */
export function initLengthOfTime() {

  const {lengthOfTime} = this.options;
  // This used to be a place where we'd figure out the current month,
  // but since we want to open up support for arbitrary lengths of time
  // we're going to store the current range in addition to the current
  // month.
  if (lengthOfTime.months || lengthOfTime.days) {
    // We want to establish intervalStart and intervalEnd, which will
    // keep track of our boundaries. Let's look at the possibilities...
    if (lengthOfTime.months) {
      // Gonna go right ahead and annihilate any chance for bugs here
      lengthOfTime.days = null;

      // The length is specified in months. Is there a start date?
      if (lengthOfTime.startDate) {
        this.intervalStart = startOfMonth(lengthOfTime.startDate );
        console.log('intervalStart', intervalStart);
      } else if (this.options.startWithMonth) {
        this.intervalStart =
          moment(this.options.startWithMonth)
            .startOf('month');
      } else {
        this.intervalStart = moment().startOf('month');
      }

      // Subtract a day so that we are at the end of the interval. We
      // always want intervalEnd to be inclusive.
      this.intervalEnd = moment(this.intervalStart)
        .add(lengthOfTime.months, 'months')
        .subtract(1, 'days');
      this.month = this.intervalStart.clone();
    }
    else if (lengthOfTime.days) {
      // The length is specified in days. Start date?
      if (lengthOfTime.startDate) {
        this.intervalStart =
          moment(lengthOfTime.startDate)
            .startOf('day');
      } else {
        this.intervalStart = moment().weekday(0).startOf('day');
      }

      this.intervalEnd = moment(this.intervalStart)
        .add(lengthOfTime.days - 1, 'days')
        .endOf('day');
      this.month = this.intervalStart.clone();
    }
    // No length of time specified so we're going to default into using the
    // current month as the time period.
  } else {
    this.month = moment().startOf('month');
    this.intervalStart = moment(this.month);
    this.intervalEnd = moment(this.month).endOf('month');
  }
}

