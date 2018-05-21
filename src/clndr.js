import moment from 'moment';
import { format, addDays, isPast, endOfDay, isAfter, isBefore } from 'date-fns';
import * as lodash_templater from 'lodash.template';
import { defaults, template } from './clndr.variables';
import { initLengthOfTime } from './clndr.lengthOfTime';

/**
 *               ~ CLNDR v1.4.7 ~
 * ==============================================
 *       https://github.com/kylestetz/CLNDR
 * ==============================================
 *  Created by kyle stetz (github.com/kylestetz)
 *       & available under the MIT license
 * http://opensource.org/licenses/mit-license.php
 * ==============================================
 *
 * This is the fully-commented development version of CLNDR.
 * For the production version, check out clndr.min.js
 * at https://github.com/kylestetz/CLNDR
 *
 * This work is based on the
 * jQuery lightweight plugin boilerplate
 * Original author: @ajpiano
 * Further changes, comments: @addyosmani
 * Licensed under the MIT license
 */

/**
 * The actual plugin constructor.
 * Parses the events and lengthOfTime options to build a calendar of day
 * objects containing event information from the events array.
 */
function Clndr(element, options) {

  var self = this;
  var dayDiff;
  var constraintEnd;
  var constraintStart;

  this.element = element;
  this.eventListenerCount = 0;

  // Not a full deep merge, but at least some suboptions we can override.
  options.clickEvents = {...defaults.clickEvents, ...options.clickEvents}
  options.targets = {...defaults.targets, ...options.targets}
  options.classes = {...defaults.classes, ...options.classes}

  // Complete the options merge
  this.options = {...defaults, template, ...options};

  // Boolean values used to log if any contraints are met
  this.constraints = {
    next: true,
    today: true,
    previous: true,
    nextYear: true,
    previousYear: true
  };

  // If there are events, we should run them through our
  // addMomentObjectToEvents function which will add a date object that
  // we can use to make life easier. This is only necessary when events
  // are provided on instantiation, since our setEvents function uses
  // addMomentObjectToEvents.
  if (this.options.events.length) {
    if (this.options.multiDayEvents) {
      this.options.events =
        this.addMultiDayMomentObjectsToEvents(this.options.events);
    } else {
      this.options.events =
        this.addMomentObjectToEvents(this.options.events);
    }
  }
  if (this.options.locale) {
    // moment.locale(this.options.locale);
  }

  initLengthOfTime.apply(this);

  if (this.options.startWithMonth) {
    this.month = moment(this.options.startWithMonth).startOf('month');
    this.intervalStart = moment(this.month);
    this.intervalEnd = (this.options.lengthOfTime.days)
      ? moment(this.month)
        .add(this.options.lengthOfTime.days - 1, 'days')
        .endOf('day')
      : moment(this.month).endOf('month');
  }

  // If we've got constraints set, make sure the interval is within them.
  if (this.options.constraints) {
    // First check if the startDate exists & is later than now.
    if (this.options.constraints.startDate) {
      constraintStart = moment(this.options.constraints.startDate);

      // We need to handle the constraints differently for weekly
      // calendars vs. monthly calendars.
      if (this.options.lengthOfTime.days) {
        if (this.intervalStart.isBefore(constraintStart, 'week')) {
          this.intervalStart = constraintStart.startOf('week');
        }

        // If the new interval period is less than the desired length
        // of time, or before the starting interval, then correct it.
        dayDiff = this.intervalStart.diff(this.intervalEnd, 'days');

        if (dayDiff < this.options.lengthOfTime.days
          || this.intervalEnd.isBefore(this.intervalStart)) {
          this.intervalEnd = moment(this.intervalStart)
            .add(this.options.lengthOfTime.days - 1, 'days')
            .endOf('day');
          this.month = this.intervalStart.clone();
        }
      }
      else {
        if (this.intervalStart.isBefore(constraintStart, 'month')) {
          // Try to preserve the date by moving only the month.
          this.intervalStart
            .set('month', constraintStart.month())
            .set('year', constraintStart.year());
          this.month
            .set('month', constraintStart.month())
            .set('year', constraintStart.year());
        }

        // Check if the ending interval is earlier than now.
        if (this.intervalEnd.isBefore(constraintStart, 'month')) {
          this.intervalEnd
            .set('month', constraintStart.month())
            .set('year', constraintStart.year());
        }
      }
    }

    // Make sure the intervalEnd is before the endDate.
    if (this.options.constraints.endDate) {
      constraintEnd = moment(this.options.constraints.endDate);

      // We need to handle the constraints differently for weekly
      // calendars vs. monthly calendars.
      if (this.options.lengthOfTime.days) {
        // The starting interval is after our ending constraint.
        if (this.intervalStart.isAfter(constraintEnd, 'week')) {
          this.intervalStart = moment(constraintEnd)
            .endOf('week')
            .subtract(this.options.lengthOfTime.days - 1, 'days')
            .startOf('day');
          this.intervalEnd = moment(constraintEnd)
            .endOf('week');
          this.month = this.intervalStart.clone();
        }
      }
      else {
        if (this.intervalEnd.isAfter(constraintEnd, 'month')) {
          this.intervalEnd
            .set('month', constraintEnd.month())
            .set('year', constraintEnd.year());
          this.month
            .set('month', constraintEnd.month())
            .set('year', constraintEnd.year());
        }

        // Check if the starting interval is later than the ending.
        if (this.intervalStart.isAfter(constraintEnd, 'month')) {
          this.intervalStart
            .set('month', constraintEnd.month())
            .set('year', constraintEnd.year());
        }
      }
    }
  }

  const actions = {
    'empty': 'onEmptyCalendarBoxClick',
    'day': 'onCalendarDayClick',
    'todayButton': 'today',
    'nextButton': 'nextMonth',
    'previousButton': 'previousMonth',
    'nextYearButton': 'nextYear',
    'previousYearButton': 'previousYear'
  };

  this.onClickHandler = function(event) {
    for (let key in actions) {
      let cssClass = self.options.targets[key];
      if (event.target.classList.contains(cssClass)) {
        self[actions[key]].apply(self, [event]);
        break;
      }
    }
  }

  this._defaults = defaults;
  this._name = this.className;

  // Some first-time initialization -> day of the week offset, template
  // compiling, making and storing some elements we'll need later, and
  // event handling for the controller.
  this.init();
}

/**
 * Calendar initialization.
 * Sets up the days of the week, the rendering function, binds all of the
 * events to the rendered calendar, and then stores the node locally.
 */
Clndr.prototype.init = function() {
  // Create the days of the week using moment's current language setting
  this.daysOfTheWeek = this.options.daysOfTheWeek || [];

  if (!this.options.daysOfTheWeek) {
    this.daysOfTheWeek = [];

    for (var i = 0; i < 7; i++) {
      this.daysOfTheWeek.push(
        moment().weekday(i).format('dd').charAt(0));
    }
  }

  // Shuffle the week if there's an offset
  if (this.options.weekOffset) {
    this.daysOfTheWeek = this.shiftWeekdayLabels(this.options.weekOffset);
  }

  // Use default lodash.template If no render-option was passed in.
  if (!(typeof this.options.render === 'function')) {
    this.compiledClndrTemplate = lodash_templater(this.options.template);
  } else {
    this.options.render.apply(this, this.options.template);
  }

  // We opt to use the passed in element as the container directly.
  this.calendarContainer = this.element;

  // attach event handlers for clicks on buttons/cells
  this.bindEvents();

  // Do a normal render of the calendar template
  this.render();

  // If a ready callback has been provided, call it.
  if (this.options.ready) {
    this.options.ready.apply(this, []);
  }
};

Clndr.prototype.shiftWeekdayLabels = function(offset) {
  var days = this.daysOfTheWeek;

  for (var i = 0; i < offset; i++) {
    days.push(days.shift());
  }

  return days;
};

/**
 * This is where the magic happens. Given a starting date and ending date,
 * an array of calendarDay objects is constructed that contains appropriate
 * events and classes depending on the circumstance.
 */
Clndr.prototype.createDaysObject = function(startDate, endDate) {
  const {events} = this.options;
  // This array will hold numbers for the entire grid (even the blank
  // spaces).
  var daysArray = [],
    date = startDate.clone(),
    lengthOfInterval = endDate.diff(startDate, 'days'),
    diff, dateIterator;

  // This is a helper object so that days can resolve their classes
  // correctly. Don't use it for anything please.
  this._currentIntervalStart = startDate.clone();

  // Filter the events list (if it exists) to events that are happening
  // last month, this month and next month (within the current grid view).
  this.eventsLastMonth = [];
  this.eventsNextMonth = [];
  this.eventsThisInterval = [];
  // Event parsing
  if (events.length) {
    this.eventsThisInterval = events.filter(
      evt => (evt._clndrStartDateObject <= endDate && startDate <= evt._clndrEndDateObject)
    );

    /**
     * Lets save the old filter just in case
     * // var afterEnd = evt._clndrStartDateObject.isAfter(endDate),
     * // var beforeStart = evt._clndrEndDateObject.isBefore(startDate);
     * // return (!(beforeStart || afterEnd));
     */

    if (this.options.showAdjacentMonths) {
      const lastMonth = {};
      lastMonth.start = startDate.clone().subtract(1, 'months').startOf('month');
      lastMonth.end = lastMonth.start.clone().endOf('month');

      const nextMonth = {}
      nextMonth.start = endDate.clone().add(1, 'months').startOf('month');
      nextMonth.end = nextMonth.start.clone().endOf('month');

      /**
       * @param evt
       * @this { start: {Moment}, end: {Moment} }
       * @returns {boolean}
       */
      const rangeFilter = function(evt) {
        return (evt._clndrStartDateObject <= this.end && this.start <= evt._clndrEndDateObject)
      };

      this.eventsLastMonth = events.filter(rangeFilter, lastMonth);
      this.eventsNextMonth = events.filter(rangeFilter, nextMonth);
    }
  }

  // If diff is greater than 0, we'll have to fill in last days of the
  // previous month to account for the empty boxes in the grid. We also
  // need to take into account the weekOffset parameter. None of this
  // needs to happen if the interval is being specified in days rather
  // than months.
  if (!this.options.lengthOfTime.days) {
    diff = date.weekday() - this.options.weekOffset;

    if (diff < 0) {
      diff += 7;
    }

    if (this.options.showAdjacentMonths) {
      for (var i = 1; i <= diff; i++) {
        var day = moment([
          startDate.year(),
          startDate.month(),
          i
        ]).subtract(diff, 'days');
        daysArray.push(
          this.createDayObject(day, this.eventsLastMonth)
        );
      }
    } else {
      for (var i = 0; i < diff; i++) {
        daysArray.push(
          this.calendarDay({
            classes: this.options.targets.empty +
            ' ' + this.options.classes.lastMonth
          }));
      }
    }
  }

  // Now we push all of the days in the interval
  dateIterator = startDate.clone();

  while (dateIterator.isBefore(endDate) || dateIterator.isSame(endDate, 'day')) {
    daysArray.push(
      this.createDayObject(
        dateIterator.clone(),
        this.eventsThisInterval
      ));
    dateIterator.add(1, 'days');
  }

  // ...and if there are any trailing blank boxes, fill those in with the
  // next month first days. Again, we can ignore this if the interval is
  // specified in days.
  if (!this.options.lengthOfTime.days) {
    while (daysArray.length % 7 !== 0) {
      if (this.options.showAdjacentMonths) {
        daysArray.push(
          this.createDayObject(
            dateIterator.clone(),
            this.eventsNextMonth
          ));
      } else {
        daysArray.push(
          this.calendarDay({
            classes: this.options.targets.empty + ' ' +
            this.options.classes.nextMonth
          }));
      }
      dateIterator.add(1, 'days');
    }
  }

  // If we want to force six rows of calendar, now's our Last Chance to
  // add another row. If the 42 seems explicit it's because we're
  // creating a 7-row grid and 6 rows of 7 is always 42!
  if (this.options.forceSixRows && daysArray.length !== 42) {
    while (daysArray.length < 42) {
      if (this.options.showAdjacentMonths) {
        daysArray.push(
          this.createDayObject(
            dateIterator.clone(),
            this.eventsNextMonth
          ));
        dateIterator.add(1, 'days');
      } else {
        daysArray.push(
          this.calendarDay({
            classes: this.options.targets.empty + ' ' +
            this.options.classes.nextMonth
          }));
      }
    }
  }

  return daysArray;
};

Clndr.prototype.createDayObject = function(day, monthEvents) {
  const {classes, targets, lengthOfTime, constraints, selectedDate} = this.options;
  const now = moment();
  const eventsToday = []
  const classesToday = [];
  const properties = {
    isToday: false,
    isInactive: false,
    isAdjacentMonth: false
  };

  // Validate moment date
  if (!day.isValid() && day.hasOwnProperty('_d') && day._d != undefined) {
    day = moment(day._d);
  }

  for (let j = 0; j < monthEvents.length; j++) {
    const start = monthEvents[j]._clndrStartDateObject;
    const end = monthEvents[j]._clndrEndDateObject;
    const dayEnd = day.clone().endOf('day');
    if (start <= dayEnd && day <= end) {
      eventsToday.push(monthEvents[j]);
    }
  }

  if (now.format('YYYY-MM-DD') == day.format('YYYY-MM-DD')) {
    classesToday.push(classes.today);
    properties.isToday = true;
  }

  if (day.isBefore(now, 'day')) {
    classesToday.push(classes.past);
  }

  if (eventsToday.length) {
    // Add class for days with events.
    classesToday.push(classes.event);
    const hasEventStart = eventsToday.some(evt => day.isSame(evt._clndrStartDateObject));
    const hasEventEnd = eventsToday.some(evt => day.isSame(evt._clndrEndDateObject));
    if (hasEventStart) {
      classesToday.push(classes.eventStart);
    }
    if (hasEventEnd) {
      classesToday.push(classes.eventEnd);
    }
  }

  if (!lengthOfTime.days) {
    if (this._currentIntervalStart.month() > day.month()) {
      classesToday.push(classes.adjacentMonth);
      properties.isAdjacentMonth = true;

      this._currentIntervalStart.year() === day.year()
        ? classesToday.push(classes.lastMonth)
        : classesToday.push(classes.nextMonth);
    }
    else if (this._currentIntervalStart.month() < day.month()) {
      classesToday.push(classes.adjacentMonth);
      properties.isAdjacentMonth = true;

      this._currentIntervalStart.year() === day.year()
        ? classesToday.push(classes.nextMonth)
        : classesToday.push(classes.lastMonth);
    }
  }

  // If there are constraints, we need to add the inactive class to the
  // days outside of them
  if (constraints) {
    const isBefore = day.isBefore(moment(constraints.startDate));
    const startMoment = day.isAfter(moment(constraints.endDate));

    if (constraints.startDate && isBefore) {
      classesToday.push(classes.inactive);
      properties.isInactive = true;
    }

    if (constraints.endDate && isAfter) {
      classesToday.push(classes.inactive);
      properties.isInactive = true;
    }
  }

  // Validate moment date
  if (!day.isValid() && day.hasOwnProperty('_d') && day._d != undefined) {
    day = moment(day._d);
  }

  // Check whether the day is "selected"
  const isSame = day.isSame(moment(selectedDate), 'day');
  if (selectedDate && isSame) {
    classesToday.push(classes.selected);
  }

  // We're moving away from using IDs in favor of classes, since when
  // using multiple calendars on a page we are technically violating the
  // uniqueness of IDs.
  classesToday.push(classes.datePrefix + day.format('YYYY-MM-DD'));
  // Day of week
  classesToday.push(classes.dayOfWeekPrefix + day.weekday());
  classesToday.unshift(targets.day);
  return this.calendarDay({
    date: day,
    day: day.date(),
    events: eventsToday,
    properties: properties,
    classes: classesToday.join(' ')
  });
};

Clndr.prototype.render = function() {
  let data = {};
  let end = null;
  let start = null;
  const oneYearFromEnd = this.intervalEnd.clone().add(1, 'years');
  const oneYearAgo = this.intervalStart.clone().subtract(1, 'years');
  let days;
  let months;
  let currentMonth;
  let eventsThisInterval;
  let numberOfRows;

  // Clean house
  while (this.calendarContainer.firstChild) {
    this.calendarContainer.removeChild(this.calendarContainer.firstChild);
  }

  if (this.options.lengthOfTime.days) {
    days = this.createDaysObject(
      this.intervalStart.clone(),
      this.intervalEnd.clone());
    data = {
      days: days,
      months: [],
      year: null,
      month: null,
      eventsLastMonth: [],
      eventsNextMonth: [],
      eventsThisMonth: [],
      extras: this.options.extras,
      daysOfTheWeek: this.daysOfTheWeek,
      intervalEnd: this.intervalEnd.clone(),
      numberOfRows: Math.ceil(days.length / 7),
      intervalStart: this.intervalStart.clone(),
      eventsThisInterval: this.eventsThisInterval
    };
  }
  else if (this.options.lengthOfTime.months) {
    months = [];
    numberOfRows = 0;
    eventsThisInterval = [];

    for (let i = 0; i < this.options.lengthOfTime.months; i++) {
      var currentIntervalStart = this.intervalStart
        .clone()
        .add(i, 'months');
      var currentIntervalEnd = currentIntervalStart
        .clone()
        .endOf('month');
      days = this.createDaysObject(
        currentIntervalStart,
        currentIntervalEnd);
      // Save events processed for each month into a master array of
      // events for this interval
      eventsThisInterval.push(this.eventsThisInterval);
      months.push({
        days: days,
        month: currentIntervalStart
      });
    }

    // Get the total number of rows across all months
    for (let i = 0; i < months.length; i++) {
      numberOfRows += Math.ceil(months[i].days.length / 7);
    }

    data = {
      days: [],
      year: null,
      month: null,
      months: months,
      eventsThisMonth: [],
      numberOfRows: numberOfRows,
      extras: this.options.extras,
      intervalEnd: this.intervalEnd,
      intervalStart: this.intervalStart,
      daysOfTheWeek: this.daysOfTheWeek,
      eventsLastMonth: this.eventsLastMonth,
      eventsNextMonth: this.eventsNextMonth,
      eventsThisInterval: eventsThisInterval,
    };
  }
  else {
    // Get an array of days and blank spaces
    days = this.createDaysObject(
      this.month.clone().startOf('month'),
      this.month.clone().endOf('month'));
    // This is to prevent a scope/naming issue between this.month and
    // data.month
    currentMonth = this.month;

    data = {
      days: days,
      months: [],
      intervalEnd: null,
      intervalStart: null,
      year: this.month.year(),
      eventsThisInterval: null,
      extras: this.options.extras,
      month: this.month.format('MMMM'),
      daysOfTheWeek: this.daysOfTheWeek,
      eventsLastMonth: this.eventsLastMonth,
      eventsNextMonth: this.eventsNextMonth,
      numberOfRows: Math.ceil(days.length / 7),
      eventsThisMonth: this.eventsThisInterval
    };
  }

  this.calendarContainer.innerHTML = this.compiledClndrTemplate(data);

  // If there are constraints, we need to add the 'inactive' class to
  // the controls.
  if (this.options.constraints) {
    // In the interest of clarity we're just going to remove all
    // inactive classes and re-apply them each render.
    const inactiveQuery = this.options.targets.map(c => `${c}.${classes.inactive}`).join(', ');
    const elems = this.calendarContainer.querySelectorAll(inactiveQuery);
    elems.forEach(el => { el.classList.toggle(classes.inactive) });

    // Just like the classes we'll set this internal state to true and
    // handle the disabling below.
    for (var i in this.constraints) {
      this.constraints[i] = true;
    }

    if (this.options.constraints.startDate) {
      start = moment(this.options.constraints.startDate);
    }

    if (this.options.constraints.endDate) {
      end = moment(this.options.constraints.endDate);
    }

    // Deal with the month controls first. Do we have room to go back?
    if (start
      && (start.isAfter(this.intervalStart)
        || start.isSame(this.intervalStart, 'day'))) {
      this.element.find('.' + this.options.targets.previousButton)
        .toggleClass(this.options.classes.inactive, true);
      this.constraints.previous = !this.constraints.previous;
    }

    // Do we have room to go forward?
    if (end
      && (end.isBefore(this.intervalEnd)
        || end.isSame(this.intervalEnd, 'day'))) {
      this.element.find('.' + this.options.targets.nextButton)
        .toggleClass(this.options.classes.inactive, true);
      this.constraints.next = !this.constraints.next;
    }

    // What's last year looking like?
    if (start && start.isAfter(oneYearAgo)) {
      this.element.find('.' + this.options.targets.previousYearButton)
        .toggleClass(this.options.classes.inactive, true);
      this.constraints.previousYear = !this.constraints.previousYear;
    }

    // How about next year?
    if (end && end.isBefore(oneYearFromEnd)) {
      this.element.find('.' + this.options.targets.nextYearButton)
        .toggleClass(this.options.classes.inactive, true);
      this.constraints.nextYear = !this.constraints.nextYear;
    }

    // Today? We could put this in init(), but we want to support the
    // user changing the constraints on a living instance.
    if ((start && start.isAfter(moment(), 'month'))
      || (end && end.isBefore(moment(), 'month'))) {
      this.element.find('.' + this.options.targets.today)
        .toggleClass(this.options.classes.inactive, true);
      this.constraints.today = !this.constraints.today;
    }
  }

  if (this.options.doneRendering) {
    this.options.doneRendering.apply(this, []);
  }
};

/**
 * @this {instanceOf Clndr}
 * @param {MouseEvent} mouseEvent
 */
Clndr.prototype.onCalendarDayClick = function(mouseEvent) {
  const self = this;
  const eventTarget = mouseEvent.target;
  const {
    targets,
    classes,
    clickEvents,
    adjacentDaysChangeMonth,
    trackSelectedDate,
    ignoreInactiveDaysInSelection,
  } = self.options;

  // This one might change
  let {selectedDate} = self.options;

  if (clickEvents.click) {
    const target = self.buildTargetObject(eventTarget, true);
    clickEvents.click.apply(self, [target]);
  }

  // If adjacentDaysChangeMonth is on, we need to change the
  // month here.
  if (adjacentDaysChangeMonth) {
    if (eventTarget.classList.contains(classes.lastMonth)) {
      self.previousMonth();
    }
    else if (eventTarget.classList.contains(classes.nextMonth)) {
      self.nextMonth();
    }
  }

  // if trackSelectedDate is on, we need to handle click on a new day
  if (trackSelectedDate) {
    if (ignoreInactiveDaysInSelection
      && eventTarget.classList.contains(classes.inactive)) {
      return;
    }

    // Remember new selected date (or null)
    selectedDate = this.context.getTargetDateString(eventTarget);

    // Handle "selected" class. This handles more complex templates
    // that may have the selected elements nested.
    const elems = this.context.calendarContainer.querySelectorAll('.' + classes.selected);
    elems.forEach(el => el.classList.remove(classes.selected));
    eventTarget.classList.add(classes.selected);
  }
}

/**
 *
 * @param event
 */
Clndr.prototype.onEmptyCalendarBoxClick = function(event) {
  const self = event.context;
  const eventTarget = event.currentTarget;

  if (self.options.clickEvents.click) {
    const target = self.buildTargetObject(event.currentTarget, false);
    self.options.clickEvents.click.apply(self, [target]);
  }

  if (self.options.adjacentDaysChangeMonth) {
    if (eventTarget.classList.contains(classes.lastMonth)) {
      self.previousMonth();
    }
    else if (eventTarget.classList.contains(classes.nextMonth)) {
      self.nextMonth();
    }
  }
}

Clndr.prototype.bindEvents = function() {
  this.calendarContainer.addEventListener('click', this.onClickHandler);
  this.eventListenerCount += 1;
};

/**
 * If the user provided a click callback we'd like to give them something
 * nice to work with. buildTargetObject takes the DOM element that was
 * clicked and returns an object with the DOM element, events, and the date
 * (if the latter two exist). Currently it is based on the id, however it'd
 * be nice to use a data- attribute in the future.
 */
Clndr.prototype.buildTargetObject = function(currentTarget, targetWasDay) {
  // This is our default target object, assuming we hit an empty day
  // with no events.
  const target = {
    date: null,
    events: [],
    element: currentTarget
  };
  let filterFn;

  // Did we click on a day or just an empty box?
  if (targetWasDay) {
    const dateString = this.getTargetDateString(currentTarget);
    target.date = dateString ? moment(dateString) : null;

    if (this.options.events) {
      if (this.options.multiDayEvents) {

        // https://github.com/kylestetz/CLNDR/issues/294, cheers @alexalexalex-s
        var targetEndDate = target.date ? target.date.clone().endOf('day') : null;
        filterFn = function(evt) {
          return (evt._clndrStartDateObject <= targetEndDate && target.date <= evt._clndrEndDateObject);
        };
      } else {
        filterFn = function(evt) {
          return evt._clndrStartDateObject.format('YYYY-MM-DD') === dateString;
        };
      }
      // Filter the dates down to the ones that match.
      target.events = this.options.events.filter(filterFn);
    }
  }

  return target;
};

/**
 * Get moment date object of the date associated with the given target.
 * This method is meant to be called on ".day" elements.
 * @param {HTMLElement} target
 */
Clndr.prototype.getTargetDateString = function(target) {
  const dayClasses = target.className.split(' ');
  const classes = this.options.classes;
  const classFinder = function(c) {
    return c.indexOf(this.datePrefix) > -1;
  };
  return dayClasses
    .find(classFinder, classes)
    .replace(classes.datePrefix, '');
};

/**
 * Triggers any applicable events given a change in the calendar's start
 * and end dates. ctx contains the current (changed) start and end date,
 * orig contains the original start and end dates.
 */
Clndr.prototype.triggerEvents = function(ctx, orig) {
  var timeOpt = ctx.options.lengthOfTime,
    eventsOpt = ctx.options.clickEvents,
    newInt = {
      end: ctx.intervalEnd,
      start: ctx.intervalStart
    },
    intervalArg = [
      moment(ctx.intervalStart),
      moment(ctx.intervalEnd)
    ],
    monthArg = [moment(ctx.month)],
    nextYear, prevYear, yearChanged,
    nextMonth, prevMonth, monthChanged,
    nextInterval, prevInterval, intervalChanged;

  // We want to determine if any of the change conditions have been
  // hit and then trigger our events based off that.
  nextMonth = newInt.start.isAfter(orig.start)
    && (Math.abs(newInt.start.month() - orig.start.month()) == 1
      || orig.start.month() === 11 && newInt.start.month() === 0);
  prevMonth = newInt.start.isBefore(orig.start)
    && (Math.abs(orig.start.month() - newInt.start.month()) == 1
      || orig.start.month() === 0 && newInt.start.month() === 11);
  monthChanged = newInt.start.month() !== orig.start.month()
    || newInt.start.year() !== orig.start.year();
  nextYear = newInt.start.year() - orig.start.year() === 1
    || newInt.end.year() - orig.end.year() === 1;
  prevYear = orig.start.year() - newInt.start.year() === 1
    || orig.end.year() - newInt.end.year() === 1;
  yearChanged = newInt.start.year() !== orig.start.year();

  // Only configs with a time period will get the interval change event
  if (timeOpt.days || timeOpt.months) {
    nextInterval = newInt.start.isAfter(orig.start);
    prevInterval = newInt.start.isBefore(orig.start);
    intervalChanged = nextInterval || prevInterval;

    if (nextInterval && eventsOpt.nextInterval) {
      eventsOpt.nextInterval.apply(ctx, intervalArg);
    }

    if (prevInterval && eventsOpt.previousInterval) {
      eventsOpt.previousInterval.apply(ctx, intervalArg);
    }

    if (intervalChanged && eventsOpt.onIntervalChange) {
      eventsOpt.onIntervalChange.apply(ctx, intervalArg);
    }
  }
  // @V2-todo see https://github.com/kylestetz/CLNDR/issues/225
  else {
    if (nextMonth && eventsOpt.nextMonth) {
      eventsOpt.nextMonth.apply(ctx, monthArg);
    }

    if (prevMonth && eventsOpt.previousMonth) {
      eventsOpt.previousMonth.apply(ctx, monthArg);
    }

    if (monthChanged && eventsOpt.onMonthChange) {
      eventsOpt.onMonthChange.apply(ctx, monthArg);
    }

    if (nextYear && eventsOpt.nextYear) {
      eventsOpt.nextYear.apply(ctx, monthArg);
    }

    if (prevYear && eventsOpt.previousYear) {
      eventsOpt.previousYear.apply(ctx, monthArg);
    }

    if (yearChanged && eventsOpt.onYearChange) {
      eventsOpt.onYearChange.apply(ctx, monthArg);
    }
  }
};

/**
 *
 * @param options
 * @returns {Clndr}
 */
Clndr.prototype.previousMonth = function() {
  const self = this;
  const yearChanged = null;
  const timeOpt = self.options.lengthOfTime;
  const orig = {end: self.intervalEnd.clone(), start: self.intervalStart.clone()}

  // Before we do anything, check if any constraints are limiting this
  if (!self.constraints.previous) {
    return self;
  }

  if (!timeOpt.days) {
    // Shift the interval by a month (or several months)
    self.intervalStart
      .subtract(timeOpt.interval, 'months')
      .startOf('month');
    self.intervalEnd = self.intervalStart.clone()
      .add(timeOpt.months || timeOpt.interval, 'months')
      .subtract(1, 'days')
      .endOf('month');
    self.month = self.intervalStart.clone();
  }
  else {
    // Shift the interval in days
    self.intervalStart
      .subtract(timeOpt.interval, 'days')
      .startOf('day');
    self.intervalEnd = self.intervalStart.clone()
      .add(timeOpt.days - 1, 'days')
      .endOf('day');
    // @V2-todo Useless, but consistent with API
    self.month = self.intervalStart.clone();
  }

  self.render();

  self.triggerEvents(self, orig);

  return self;
};

/**
 *
 * @returns {*}
 */
Clndr.prototype.nextMonth = function() {
  const self = this;
  const {lengthOfTime} = self.options;
  const orig = {
    end: self.intervalEnd.clone(),
    start: self.intervalStart.clone()
  };

  // Before we do anything, check if any constraints are limiting this
  if (!self.constraints.next) {
    return self;
  }

  if (lengthOfTime.days) {
    // Shift the interval in days
    self.intervalStart
      .add(lengthOfTime.interval, 'days')
      .startOf('day');

    self.intervalEnd = self.intervalStart.clone()
      .add(lengthOfTime.days - 1, 'days')
      .endOf('day');
    // @V2-todo Useless, but consistent with API
    self.month = self.intervalStart.clone();
  }
  else {
    // Shift the interval by a month (or several months)
    self.intervalStart
      .add(lengthOfTime.interval, 'months')
      .startOf('month');
    self.intervalEnd = self.intervalStart.clone()
      .add(lengthOfTime.months || lengthOfTime.interval, 'months')
      .subtract(1, 'days')
      .endOf('month');
    self.month = self.intervalStart.clone();
  }

  self.render();

  self.triggerEvents(self, orig);

  return self;
};

/**
 *
 * @param event (not always an event, but it alwas has a event.context
 */
Clndr.prototype.previousYear = function() {
  const self = this;
  const orig = {
    end: self.intervalEnd.clone(),
    start: self.intervalStart.clone()
  };

  // Before we do anything, check if any constraints are limiting this
  if (!self.constraints.previousYear) {
    return self;
  }

  self.month.subtract(1, 'year');
  self.intervalStart.subtract(1, 'year');
  self.intervalEnd.subtract(1, 'year');
  self.render();

  self.triggerEvents(self, orig);

  return self;
};

Clndr.prototype.nextYear = function() {
  const self = this;
  orig = {
    end: self.intervalEnd.clone(),
    start: self.intervalStart.clone()
  };

  // Before we do anything, check if any constraints are limiting this
  if (!self.constraints.nextYear) {
    return self;
  }

  self.month.add(1, 'year');
  self.intervalStart.add(1, 'year');
  self.intervalEnd.add(1, 'year');
  self.render();

  self.triggerEvents(self, orig);

  return self;
};

Clndr.prototype.today = function(options /*, ctx */) {
  const self = this;
  const orig = {
    end: self.intervalEnd.clone(),
    start: self.intervalStart.clone()
  };

  if (timeOpt.days) {
    // If there was a startDate specified, we should figure out what
    // the weekday is and use that as the starting point of our
    // interval. If not, go to today.weekday(0).
    if (timeOpt.startDate) {
      self.intervalStart = moment()
        .weekday(timeOpt.startDate.weekday())
        .startOf('day');
    } else {
      self.intervalStart = moment().weekday(0).startOf('day');
    }

    self.intervalEnd = self.intervalStart.clone()
      .add(timeOpt.days - 1, 'days')
      .endOf('day');
  }
  else {
    // Set the intervalStart to this month.
    self.intervalStart = moment().startOf('month');
    self.intervalEnd = self.intervalStart.clone()
      .add(timeOpt.months || timeOpt.interval, 'months')
      .subtract(1, 'days')
      .endOf('month');
  }

  // No need to re-render if we didn't change months.
  if (!self.intervalStart.isSame(orig.start)
    || !self.intervalEnd.isSame(orig.end)) {
    self.render();
  }

  // Fire the today event handler regardless of any change
  if (self.options.clickEvents.today) {
    self.options.clickEvents.today.apply(self, [moment(self.month)]);
  }
  self.triggerEvents(self, orig);
};

/**
 * Changes the month. Accepts 0-11 or a full/partial month name e.g. "Jan",
 * "February", "Mar", etc.
 */
Clndr.prototype.setMonth = function(newMonth, options) {
  var timeOpt = this.options.lengthOfTime,
    orig = {
      end: this.intervalEnd.clone(),
      start: this.intervalStart.clone()
    };

  if (timeOpt.days || timeOpt.months) {
    console.log(
      'You are using a custom date interval. Use ' +
      'Clndr.setIntervalStart(startDate) instead.');
    return this;
  }

  this.month.month(newMonth);
  this.intervalStart = this.month.clone().startOf('month');
  this.intervalEnd = this.intervalStart.clone().endOf('month');
  this.render();

  this.triggerEvents(this, orig);

  return this;
};

Clndr.prototype.setYear = function(newYear, options) {
  var orig = {
    end: this.intervalEnd.clone(),
    start: this.intervalStart.clone()
  };

  this.month.year(newYear);
  this.intervalEnd.year(newYear);
  this.intervalStart.year(newYear);
  this.render();

  this.triggerEvents(this, orig);

  return this;
};

/**
 * Sets the start of the time period according to newDate. newDate can be
 * a string or a moment object.
 */
Clndr.prototype.setIntervalStart = function(newDate, options) {
  var timeOpt = this.options.lengthOfTime,
    orig = {
      end: this.intervalEnd.clone(),
      start: this.intervalStart.clone()
    };

  if (!timeOpt.days && !timeOpt.months) {
    console.log(
      'You are using a custom date interval. Use ' +
      'Clndr.setIntervalStart(startDate) instead.');
    return this;
  }

  if (timeOpt.days) {
    this.intervalStart = moment(newDate).startOf('day');
    this.intervalEnd = this.intervalStart.clone()
      .add(timeOpt - 1, 'days')
      .endOf('day');
  } else {
    this.intervalStart = moment(newDate).startOf('month');
    this.intervalEnd = this.intervalStart.clone()
      .add(timeOpt.months || timeOpt.interval, 'months')
      .subtract(1, 'days')
      .endOf('month');
  }

  this.month = this.intervalStart.clone();
  this.render();

  this.triggerEvents(this, orig);

  return this;
};

/**
 * Overwrites extras in the calendar and triggers a render.
 */
Clndr.prototype.setExtras = function(extras) {
  this.options.extras = extras;
  this.render();
  return this;
};

/**
 * Overwrites events in the calendar and triggers a render.
 */
Clndr.prototype.setEvents = function(events) {
  // Go through each event and add a moment object
  if (this.options.multiDayEvents) {
    this.options.events = this.addMultiDayMomentObjectsToEvents(events);
  } else {
    this.options.events = this.addMomentObjectToEvents(events);
  }
  this.render();
  return this;
};

Clndr.prototype.getEvents = function(events) {
  return this.options.events;
}

/**
 * Adds additional events to the calendar and triggers a render.
 */
Clndr.prototype.addEvents = function(events /*, reRender*/) {
  var reRender = (arguments.length > 1)
    ? arguments[1]
    : true;

  // Go through each event and add a moment object
  events = this.options.multiDayEvents ?
    this.addMultiDayMomentObjectsToEvents(events) :
    this.addMomentObjectToEvents(events);

  this.options.events = [...this.options.events, ...events];

  if (reRender) {
    this.render();
  }

  return this;
};

/**
 * Passes all events through a matching function. Any that pass a truth
 * test will be removed from the calendar's events. This triggers a render.
 */
Clndr.prototype.removeEvents = function(matchingFn) {
  for (let i = this.options.events.length - 1; i >= 0; i--) {
    if (matchingFn(this.options.events[i]) == true) {
      this.options.events.splice(i, 1);
    }
  }

  this.render();
  return this;
};

Clndr.prototype.addMomentObjectToEvents = function(events) {
  const {dateParameter} = self.options;
  for (let i = 0; i < events.length; i++) {
    events[i]._clndrStartDateObject = moment(events[i][dateParameter]);
    events[i]._clndrEndDateObject = moment(events[i][dateParameter]);
  }

  return events;
};

/**
 *
 * @param events
 * @returns {*}
 */
Clndr.prototype.addMultiDayMomentObjectsToEvents = function(events) {
  const options = this.options.multiDayEvents;

  return events.map(evt => {

    var end = evt[options.endDate],
      start = evt[options.startDate];

    // If we don't find the startDate OR endDate fields, look for singleDay
    if (!end && !start) {
      evt._clndrEndDateObject = moment(evt[options.singleDay]);
      evt._clndrStartDateObject = moment(evt[options.singleDay]);
    }

    // Otherwise use startDate and endDate, or whichever one is present
    else {
      evt._clndrEndDateObject = moment(end || start);
      evt._clndrStartDateObject = moment(start || end);
    }

    evt.isMultiDayEvent = (evt._clndrEndDateObject.diff(evt._clndrStartDateObject, 'days') > 0);
    return evt;
  })
};

Clndr.prototype.calendarDay = function(options) {
  const defaults = {
    day: '',
    date: null,
    events: [],
    classes: this.options.targets.empty
  };

  return {...defaults, ...options};
};

Clndr.prototype.destroy = function() {
  this.calendarContainer.parent().data('plugin_clndr', null);
  this.options = defaults;
  while (this.calendarContainer.firstChild) {
    this.calendarContainer.removeChild(this.calendarContainer.firstChild);
  }
  this.element = null;
};

function isElement(obj) {
  try {
    //Using W3 DOM2 (works for FF, Opera and Chrome)
    return obj instanceof HTMLElement;
  }
  catch (e) {
    //Browsers not supporting W3 DOM2 don't have HTMLElement and
    //an exception is thrown and we end up here. Testing some
    //properties that all elements have (works on IE7)
    return (typeof obj === 'object') &&
      (obj.nodeType === 1) && (typeof obj.style === 'object') &&
      (typeof obj.ownerDocument === 'object');
  }
}

export function createClndr(elementOrSelector, options) {
  let elem = isElement(elementOrSelector) ? elementOrSelector : document.querySelector(elementOrSelector);
  if (!elem) {
    throw new Error(
      `First argument needs to be an element or a selector  matching at least one element (where first match will be used). 
      \nThe passed in value is: <${typeof elementOrSelector}> ${elementOrSelector}`
    );
  }
  return new Clndr(elem, options);
}