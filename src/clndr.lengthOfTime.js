import startOfMonth from 'date-fns/start_of_month';
import parse from 'date-fns/parse';
import isValid from 'date-fns/is_valid';
import endOfMonth from 'date-fns/end_of_month';
import addMonths from 'date-fns/add_months';
import startOfDay from 'date-fns/start_of_day';
import endOfDay from 'date-fns/end_of_day';
import addDays from 'date-fns/add_days';
import subDays from 'date-fns/sub_days';

/**
 * Likely not to work yet!
 */
export function initLengthOfTime() {
  const {lengthOfTime} = this.options;
  // This used to be a place where we'd figure out the current month,
  // but since we want to open up support for arbitrary lengths of time
  // we're going to store the current range in addition to the current
  // month.

  if (lengthOfTime.months || lengthOfTime.days) {
    // We skip this for now
    // We want to establish intervalStart and intervalEnd, which will
    // keep track of our boundaries. Let's look at the possibilities...
    if (lengthOfTime.months) {
      // Gonna go right ahead and annihilate any chance for bugs here
      lengthOfTime.days = null;

      // Defaults
      let startDate = new Date();
      this.intervalStart = startOfMonth(startDate);

      if (lengthOfTime.startDate) {
        startDate = parse(lengthOfTime.startDate);
      } else if (this.options.startWithMonth) {
        startDate = parse(this.options.startWithMonth);
      }
      if (!isValid(startDate)) {
        startDate = new Date();
      }

      this.intervalStart = startOfMonth(startDate);

      // Subtract a day so that we are at the end of the interval. We
      // always want intervalEnd to be inclusive.
      this.intervalEnd = addMonths(this.intervalStart, lengthOfTime.months);
      this.intervalEnd = subDays(this.intervalEnd, 1);
      this.month = new Date(this.intervalStart);
    } else if (lengthOfTime.days) {
      let startDate = new Date();
      this.intervalStart = startOfDay(startDate);

      // The length is specified in days. Start date?
      if (lengthOfTime.startDate) {
        startDate = parse(lengthOfTime.startDate);
      }

      if (!isValid(startDate)) {
        startDate = new Date();
      }

      this.intervalStart = startOfDay(startDate);
      this.intervalEnd = addDays(this.intervalStart, lengthOfTime.days - 1);
      this.intervalEnd = endOfDay(this.intervalStart);
      this.month = new Date(this.intervalStart);
    }
    // No length of time specified so we're going to default into using the
    // current month as the time period.
  } else {
    this.month = startOfMonth(new Date());
    this.intervalStart = new Date(this.month);
    this.intervalEnd = endOfMonth(this.month);
  }
}
