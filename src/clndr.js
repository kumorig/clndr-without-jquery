import parse from 'date-fns/parse';
import format from 'date-fns/format';
import isValid from 'date-fns/is_valid';
import getDay from 'date-fns/get_day';
import addDays from 'date-fns/add_days';
import subDays from 'date-fns/sub_days';
import startOfDay from 'date-fns/start_of_day';
import endOfDay from 'date-fns/end_of_day';
import getMonth from 'date-fns/get_month';
import addMonths from 'date-fns/add_months';
import subMonths from 'date-fns/sub_months';
import startOfMonth from 'date-fns/start_of_month';
import endOfMonth from 'date-fns/end_of_month';
import getYear from 'date-fns/get_year';
import addYears from 'date-fns/add_years';
import subYears from 'date-fns/sub_years';
import isBefore from 'date-fns/is_before';
import isAfter from 'date-fns/is_after';
import isSameDay from 'date-fns/is_same_day';
import differenceInCalendarDays from 'date-fns/difference_in_calendar_days';
import startOfWeek from 'date-fns/start_of_week';
import isSameYear from 'date-fns/is_same_year';
import getDate from 'date-fns/get_date';
import setYear from 'date-fns/set_year';
import endOfWeek from 'date-fns/end_of_week';
import differenceInCalendarMonths from 'date-fns/difference_in_calendar_months';
import isSameMonth from 'date-fns/is_same_month';
import setDay from 'date-fns/set_day';

const isMonthBefore = (date, dateToCompare) => isBefore(startOfMonth(date), startOfMonth(dateToCompare));
const isMonthAfter = (date, dateToCompare) => isAfter(startOfMonth(date), startOfMonth(dateToCompare));
const isWeekBefore = (date, dateToCompare) => isBefore(startOfWeek(date), startOfWeek(dateToCompare));
const isWeekAfter = (date, dateToCompare) => isAfter(startOfWeek(date), startOfWeek(dateToCompare));

import * as lodash_templater from 'lodash.template';
import { defaults, template } from './clndr.variables';
import { initLengthOfTime } from './clndr.lengthOfTime';
import { renderContraints } from './clndr.render';

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

  const self = this;
  var constraintEnd;
  var constraintStart;

  this.element = element;
  this.eventListenerCount = 0;


  // Not a full deep merge, but at least some suboptions we can override.
  // Lets see if we can make this more complete later
  options.clickEvents = { ...defaults.clickEvents, ...options.clickEvents };
  options.targets = { ...defaults.targets, ...options.targets };
  options.classes = { ...defaults.classes, ...options.classes };
  options.locale = { ...defaults.locale, ...options.locale };

  // Complete the options merge
  this.options = { ...defaults, template, ...options };

  // Boolean values used to log if any contraints are met
  this.constraints = {
    next: true,
    today: true,
    previous: true,
    nextYear: true,
    previousYear: true
  };

  // If there are events, we should run them through our
  // addDateToEvents function which will add a date object that
  // we can use to make life easier. This is only necessary when events
  // are provided on instantiation, since our setEvents function uses
  // addDateToEvents.
  if (this.options.events.length) {
    if (this.options.multiDayEvents) {
      this.options.events = this.addDateToMultiDayEvents(this.options.events);
    } else {
      this.options.events = this.addDateToEvents(this.options.events);
    }
  }

  initLengthOfTime.apply(this);

  if (this.options.startWithMonth) {
    this.month = parse(this.options.startWithMonth);
    this.month = startOf(this.month);
    this.intervalStart = new Date(this.month);

    if (this.options.lengthOfTime.days) {
      this.intervalEnd = addDays(this.month, this.options.lengthOfTime.days - 1)
      this.intervalEnd = endOfDay(this.intervalEnd);
    } else {
      this.intervalEnd = endOfDay(this.month);
    }
  }

  // If we've got constraints set, make sure the interval is within them.
  if (this.options.constraints) {
    // First check if the startDate exists & is later than now.
    if (this.options.constraints.startDate) {
      constraintStart = parse(this.options.constraints.startDate);

      // We need to handle the constraints differently for weekly
      // calendars vs. monthly calendars.
      if (this.options.lengthOfTime.days) {
        if (isWeekBefore(this.intervalStart, constraintStart)) {
          this.intervalStart = startOfWeek(constraintStart);
        }

        // If the new interval period is less than the desired length
        // of time, or before the starting interval, then correct it.
        const dayDiff = differenceInCalendarDays(this.intervalStart, this.intervalEnd);
        if (dayDiff < this.options.lengthOfTime.days || isBefore(this.intervalEnd, this.intervalStart)) {
          this.intervalEnd = addDays(this.intervalStart, this.options.lengthOfTime.days - 1);
          this.intervalEnd = endOfDay(this.intervalEnd);
          this.month = new Date(this.intervalStart);
        }
      }
      else {
        if (isMonthBefore(this.intervalStart, constraintStart)) {
          // Try to preserve the date by moving only the month.
          setYear(this.intervalStart, getYear(constraintStart));
          setMonth(this.intervalStart, getMonth(constraintStart));
          setYear(this.month, getYear(constraintStart));
          setMonth(this.month, getMonth(constraintStart));
        }

        // Check if the ending interval is earlier than now.
        if (isMonthBefore(this.intervalEnd, constraintStart)) {
          this.intervalEnd = setMonth(this.intervalEnd, getMonth(constraintStart));
          this.intervalEnd = setYear(this.intervalEnd, getYear(constraintStart));
        }
      }
    }

    // Make sure the intervalEnd is before the endDate.
    if (this.options.constraints.endDate) {
      constraintEnd = new Date(this.options.constraints.endDate);
      // We need to handle the constraints differently for weekly
      // calendars vs. monthly calendars.
      if (this.options.lengthOfTime.days) {
        // The starting interval is after our ending constraint.
        if (isWeekAfter(this.intervalStart, constraintEnd)) {
          this.intervalStart = new Date(constraintEnd);
          this.intervalStart = subDays(this.intervalStart, this.options.lengthOfTime.days - 1);
          this.intervalStart = startOfDay(this.intervalStart);
          this.intervalEnd = endOfWeek(new Date(constraintEnd));
          this.month = new Date(this.intervalStart);
        }
      }
      else {
        if (isMonthAfter(this.intervalEnd, constraintEnd)) {
          this.intervalEnd = setMonth(this.intervalEnd, getMonth(constraintEnd));
          this.intervalEnd = setYear(this.intervalEnd, getYear(constraintEnd));
          this.month = setMonth(this.month, getMonth(constraintEnd));
          this.month = setYear(this.month, getYear(constraintEnd));
        }

        // Check if the starting interval is later than the ending.
        if (isMonthAfter(this.intervalStart, constraintEnd)) {
          this.intervalStart = setMonth(this.intervalStart, getMonth(constraintEnd));
          this.intervalStart = setYear(this.intervalStart, getYear(constraintEnd));
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

  this.onClickHandler = function (event) {
    for (let key in actions) {
      let cssClass = self.options.targets[key];
      if (event.target.classList.contains(cssClass)) {
        self[actions[key]].apply(self, [event]);
        break;
      }
    }
  };

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
Clndr.prototype.init = function () {
  this.daysOfTheWeek = this.options.daysOfTheWeek ||
    [0, 1, 2, 3, 4, 5, 6].map(i => format(setDay(null, i), 'dd', { locale: this.options.locale }));

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

Clndr.prototype.shiftWeekdayLabels = function (offset) {
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
Clndr.prototype.createDaysObject = function (startDate, endDate) {
  const { events } = this.options;
  // This array will hold numbers for the entire grid (even the blank
  // spaces).
  let daysArray = [];
  let date = new Date(startDate);
  let lengthOfInterval = differenceInCalendarDays(endDate, startDate);
  let diff, dateIterator;

  // This is a helper object so that days can resolve their classes
  // correctly. Don't use it for anything please.
  this._currentIntervalStart = new Date(startDate);

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

    if (this.options.showAdjacentMonths) {
      const lastMonth = {};
      lastMonth.start = startOfMonth(subMonths(startDate, 1));
      lastMonth.end = endOfMonth(new Date(lastMonth.start));

      const nextMonth = {};
      nextMonth.start = startOfMonth(addMonths(endDate, 1));
      nextMonth.end = endOfMonth(new Date(nextMonth.start));

      /**
       * @param evt
       * @this { Date , Date }
       * @returns {boolean}
       */
      const rangeFilter = function (evt) {
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
    diff = getDay(date) - this.options.weekOffset;

    if (diff < 0) {
      diff += 7;
    }

    /**
     * Create leading days from previous month.
     */
    if (this.options.showAdjacentMonths) {
      for (let i = 1; i <= diff; i++) {
        let day = new Date(getYear(startDate), getMonth(startDate), i);
        day = subDays(day, diff);
        daysArray.push(
          this.createDayObject(day, this.eventsLastMonth)
        );
      }
    } else {
      for (let i = 0; i < diff; i++) {
        daysArray.push(
          this.calendarDay({
            classes: this.options.targets.empty + ' ' + this.options.classes.lastMonth
          }));
      }
    }
  }

  /**
   * Create current month days
   */
  dateIterator = new Date(startDate);

  while (isBefore(dateIterator, endDate) || isSameDay(dateIterator, endDate)) {
    daysArray.push(
      this.createDayObject(
        new Date(dateIterator),
        this.eventsThisInterval
      ));
    dateIterator = addDays(dateIterator, 1);
  }

  /**
   * Create trailing days, from next month
   * */
  if (!this.options.lengthOfTime.days) {
    while (daysArray.length % 7 !== 0) {
      if (this.options.showAdjacentMonths) {
        daysArray.push(
          this.createDayObject(new Date(dateIterator), this.eventsNextMonth));
      } else {
        daysArray.push(
          this.calendarDay({
            classes: `${this.options.targets.empty} ${this.options.classes.nextMonth}`
          }));
      }
      dateIterator = addDays(dateIterator, 1);

    }
  }

  /*
   * Force six rows...
   */
  if (this.options.forceSixRows && daysArray.length !== 42) {
    while (daysArray.length < 42) {
      if (this.options.showAdjacentMonths) {
        daysArray.push(
          this.createDayObject(
            new Date(dateIterator),
            this.eventsNextMonth
          ));
        addDays(dateIterator, 1);
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

Clndr.prototype.createDayObject = function (day, monthEvents) {

  if (!isValid(day)) {
    throw new Error(`Invalid day passed into createDayObject(): ${day}`)
  }

  const { classes, targets, lengthOfTime, constraints, selectedDate } = this.options;
  const now = new Date();
  const eventsToday = [];
  const classesToday = [];
  const properties = {
    isToday: false,
    isInactive: false,
    isAdjacentMonth: false
  };

  for (let j = 0; j < monthEvents.length; j++) {
    const start = monthEvents[j]._clndrStartDateObject;
    const end = monthEvents[j]._clndrEndDateObject;
    const dayEnd = endOfDay(new Date(day));
    if (start <= dayEnd && day <= end) {
      eventsToday.push(monthEvents[j]);
    }
  }

  if (format(now, 'YYYY-MM-DD') === format(day, 'YYYY-MM-DD')) {
    classesToday.push(classes.today);
    properties.isToday = true;
  }

  if (isBefore(day, startOfDay(now))) {
    classesToday.push(classes.past);
  }

  if (eventsToday.length) {
    // Add class for days with events.
    classesToday.push(classes.event);
    const hasEventStart = eventsToday.some(evt => isSameDay(day, evt._clndrStartDateObject));
    const hasEventEnd = eventsToday.some(evt => isSameDay(day, evt._clndrEndDateObject));
    if (hasEventStart) {
      classesToday.push(classes.eventStart);
    }
    if (hasEventEnd) {
      classesToday.push(classes.eventEnd);
    }
  }

  if (!lengthOfTime.days) {
    if (getMonth(this._currentIntervalStart) > getMonth(day)) {
      classesToday.push(classes.adjacentMonth);
      properties.isAdjacentMonth = true;
      isSameYear(this._currentIntervalStart, day)
        ? classesToday.push(classes.lastMonth)
        : classesToday.push(classes.nextMonth);
    }
    else if (getMonth(this._currentIntervalStart) < getMonth(day)) {
      classesToday.push(classes.adjacentMonth);
      properties.isAdjacentMonth = true;
      isSameYear(this._currentIntervalStart, day)
        ? classesToday.push(classes.nextMonth)
        : classesToday.push(classes.lastMonth);
    }
  }

  // If there are constraints, we need to add the inactive class to the
  // days outside of them
  if (constraints) {

    if (constraints.startDate && isBefore(day, new Date(constraints.startDate))) {
      classesToday.push(classes.inactive);
      properties.isInactive = true;
    }

    if (constraints.endDate && isAfter(day, new Date(constraints.endDate))) {
      classesToday.push(classes.inactive);
      properties.isInactive = true;
    }
  }

  // Check whether the day is "selected"
  if (selectedDate && isSameDay(day, new Date(selectedDate))) {
    classesToday.push(classes.selected);
  }

  // We're moving away from using IDs in favor of classes, since when
  // using multiple calendars on a page we are technically violating the
  // uniqueness of IDs.
  classesToday.push(classes.datePrefix + format(day, 'YYYY-MM-DD'));
  // Day of week
  classesToday.push(classes.dayOfWeekPrefix + getDay(day));
  classesToday.unshift(targets.day);
  return this.calendarDay({
    date: day,
    day: getDate(day),
    events: eventsToday,
    properties: properties,
    classes: classesToday.join(' ')
  });
};

Clndr.prototype.render = function () {
  const { lengthOfTime, extras, constraints, targets, classes, doneRendering } = this.options;

  let data = {};
  let days;
  let months;
  let currentMonth;
  let eventsThisInterval;
  let numberOfRows;

  // Clean house
  while (this.calendarContainer.firstChild) {
    this.calendarContainer.removeChild(this.calendarContainer.firstChild);
  }

  if (lengthOfTime.days) {
    days = this.createDaysObject(
      new Date(this.intervalStart),
      new Date(this.intervalEnd)
    );
    data = {
      days: days,
      months: [],
      year: null,
      month: null,
      eventsLastMonth: [],
      eventsNextMonth: [],
      eventsThisMonth: [],
      extras: extras,
      daysOfTheWeek: this.daysOfTheWeek,
      intervalEnd: new Date(this.intervalEnd),
      numberOfRows: Math.ceil(days.length / 7),
      intervalStart: new Date(this.intervalStart),
      eventsThisInterval: this.eventsThisInterval
    };
  }
  else if (lengthOfTime.months) {
    months = [];
    numberOfRows = 0;
    eventsThisInterval = [];

    for (let i = 0; i < lengthOfTime.months; i++) {
      const currentIntervalStart = addMonths(new Date(this.intervalStart), 1);
      const currentIntervalEnd = endOfMonth(new Date(currentIntervalStart));

      days = this.createDaysObject(
        currentIntervalStart,
        currentIntervalEnd
      );

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
      extras: extras,
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
      startOfMonth(this.month),
      endOfMonth(this.month)
    );
    // This is to prevent a scope/naming issue between this.month and
    // data.month
    currentMonth = this.month;

    data = {
      days: days,
      months: [],
      intervalEnd: null,
      intervalStart: null,
      year: getYear(this.month),
      eventsThisInterval: null,
      extras: extras,
      month: format(this.month, 'MMM', { locale: this.options.locale }),
      daysOfTheWeek: this.daysOfTheWeek,
      eventsLastMonth: this.eventsLastMonth,
      eventsNextMonth: this.eventsNextMonth,
      numberOfRows: Math.ceil(days.length / 7),
      eventsThisMonth: this.eventsThisInterval
    };
  }

  this.calendarContainer.innerHTML = this.compiledClndrTemplate(data);

  if (constraints !== null) {
    renderConstraints.apply(this, [constraints]);
  }

  if (doneRendering) {
    doneRendering.apply(this, []);
  }

};

/**
 * @this {instanceOf Clndr}
 * @param {MouseEvent} mouseEvent
 */
Clndr.prototype.onCalendarDayClick = function (mouseEvent) {
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
  let { selectedDate } = self.options;

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
Clndr.prototype.onEmptyCalendarBoxClick = function (event) {
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

Clndr.prototype.bindEvents = function () {
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
Clndr.prototype.buildTargetObject = function (currentTarget, targetWasDay) {
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
    target.date = dateString ? new Date(dateString) : null;

    if (this.options.events) {
      if (this.options.multiDayEvents) {

        // https://github.com/kylestetz/CLNDR/issues/294, cheers @alexalexalex-s
        const targetEndDate = target.date ? endOfDay(new Date(target.date)) : null;
        filterFn = function (evt) {
          return (evt._clndrStartDateObject <= targetEndDate && target.date <= evt._clndrEndDateObject);
        };
      } else {
        filterFn = function (evt) {
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
 * This method is meant to be called on ".day" elements.
 * @param {HTMLElement} target
 */
Clndr.prototype.getTargetDateString = function (target) {
  const dayClasses = target.className.split(' ');
  const classes = this.options.classes;
  const classFinder = function (c) {
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
Clndr.prototype.triggerEvents = function (ctx, orig) {
  const timeOpt = ctx.options.lengthOfTime;
  const eventsOpt = ctx.options.clickEvents;
  const newInt = {
    end: ctx.intervalEnd,
    start: ctx.intervalStart
  };
  const intervalArg = [
    new Date(ctx.intervalStart),
    new Date(ctx.intervalEnd)
  ];
  const monthArg = [new Date(ctx.month)];
  // We want to determine if any of the change conditions have been
  // hit and then trigger our events based off that.
  const isPast = isBefore(newInt.start, orig.start);
  const isFuture = isAfter(newInt.start, orig.start);

  const nextMonth = isFuture && (differenceInCalendarMonths(newInt.start, orig.start) === 1);
  const prevMonth = isPast && (differenceInCalendarMonths(orig.start, newInt.start) === 1);

  const nextYear =
    differenceInCalendarYears(newInt.start, orig.start) === 1 ||
    differenceInCalendarYears(newInt.end, orig.end) === 1;

  const prevYear =
    differenceInCalendarYears(orig.start, newInt.start) === 1 ||
    differenceInCalendarYears(orig.end, newInt.end) === 1;

  const yearChanged = !isSameYear(newInt.start, orig.start);

  const monthChanged = yearChanged || !isSameMonth(newInt.start, orig.start);

  // Only configs with a time period will get the interval change event
  if (timeOpt.days || timeOpt.months) {
    const nextInterval = newInt.start.isAfter(orig.start);
    const prevInterval = newInt.start.isBefore(orig.start);
    const intervalChanged = nextInterval || prevInterval;
    if (nextInterval && eventsOpt.nextInterval) { eventsOpt.nextInterval.apply(ctx, intervalArg); }
    if (prevInterval && eventsOpt.previousInterval) { eventsOpt.previousInterval.apply(ctx, intervalArg); }
    if (intervalChanged && eventsOpt.onIntervalChange) { eventsOpt.onIntervalChange.apply(ctx, intervalArg); }
  }

  // @V2-todo see https://github.com/kylestetz/CLNDR/issues/225
  else {
    if (nextMonth && eventsOpt.nextMonth) { eventsOpt.nextMonth.apply(ctx, monthArg); }
    if (prevMonth && eventsOpt.previousMonth) { eventsOpt.previousMonth.apply(ctx, monthArg); }
    if (monthChanged && eventsOpt.onMonthChange) { eventsOpt.onMonthChange.apply(ctx, monthArg); }
    if (nextYear && eventsOpt.nextYear) { eventsOpt.nextYear.apply(ctx, monthArg); }
    if (prevYear && eventsOpt.previousYear) { eventsOpt.previousYear.apply(ctx, monthArg); }
    if (yearChanged && eventsOpt.onYearChange) { eventsOpt.onYearChange.apply(ctx, monthArg); }
  }
};

/**
 *
 * @param options
 * @returns {Clndr}
 */
Clndr.prototype.previousMonth = function () {
  const self = this;
  const yearChanged = null;
  const timeOpt = self.options.lengthOfTime;
  const orig = {
    end: new Date(self.intervalEnd),
    start: new Date(self.intervalStart)
  };

  // Before we do anything, check if any constraints are limiting this
  if (!self.constraints.previous) {
    return self;
  }

  if (!timeOpt.days) {
    // Shift the interval by a month (or several months)
    self.intervalStart = startOfMonth(subMonths(self.intervalStart, timeOpt.interval));
    self.intervalEnd = new Date(self.intervalStart);
    self.intervalEnd = addMonths(self.intervalEnd, timeOpt.months || timeOpt.interval);
    self.intervalEnd = subDays(self.intervalEnd, 1);
    self.intervalEnd = endOfMonth(self.intervalEnd);
    self.month = new Date(self.intervalStart);
  }
  else {
    // Shift the interval in days
    self.intervalStart = startOfDay(subDays(self.intervalStart, timeOpt.interval));
    self.intervalEnd = new Date(self.intervalStart);
    self.intervalEnd = addDays(self.intervalEnd, timeOpt.days - 1);
    self.intervalEnd = endOfDay(self.intervalEnd);
    // @V2-todo Useless, but consistent with API
    self.month = new Date(self.intervalStart);
  }

  self.render();
  self.triggerEvents(self, orig);
  return self;
};

/**
 *
 * @returns {*}
 */
Clndr.prototype.nextMonth = function () {
  const self = this;
  const { lengthOfTime } = self.options;
  const orig = {
    end: new Date(self.intervalEnd),
    start: new Date(self.intervalStart)
  };

  // Before we do anything, check if any constraints are limiting this
  if (!self.constraints.next) {
    return self;
  }

  if (lengthOfTime.days) {
    self.intervalStart = addDays(self.intervalStart, lengthOfTime.interval);
    self.intervalStart = startOfDay(self.intervalStart);
    self.intervalEnd = addDays(self.intervalStart, lengthOfTime.days - 1);
    self.intervalEnd = endofDay(self.intervalEnd);
  }
  else {
    self.intervalStart = addMonths(self.intervalStart, lengthOfTime.interval);
    self.intervalStart = startOfMonth(self.intervalStart);
    self.intervalEnd = addMonths(self.intervalStart, lengthOfTime.months || lengthOfTime.interval);
    self.intervalEnd = endOfMonth(subDays(self.intervalEnd, 1));
  }
  self.month = new Date(self.intervalStart);
  self.render();
  self.triggerEvents(self, orig);
  return self;
};

Clndr.prototype.previousYear = function () {
  const self = this;
  const orig = {
    end: new Date(self.intervalEnd),
    start: new Date(self.intervalStart)
  };

  // Before we do anything, check if any constraints are limiting this
  if (!self.constraints.previousYear) { return self; }
  self.month = subYears(self.month, 1);
  self.intervalStart = subYears(self.intervalStart, 1);
  self.intervalEnd = subYears(self.intervalEnd, 1);
  self.render();
  self.triggerEvents(self, orig);
  return self;
};

Clndr.prototype.nextYear = function () {
  const self = this;

  if (!self.constraints.nextYear) {
    return self;
  }

  const orig = { end: new Date(self.intervalEnd), start: new Date(self.intervalStart) };

  self.month = addYears(self.month, 1);
  self.intervalStart = addYears(self.intervalStart, 1);
  self.intervalEnd = addYears(self.intervalEnd, 1);
  self.render();
  self.triggerEvents(self, orig);

  return self;
};

Clndr.prototype.today = function (options /*, ctx */) {
  const self = this;
  const orig = {
    end: new Date(self.intervalEnd),
    start: new Date(self.intervalStart)
  };

  if (timeOpt.days) {
    // If there was a startDate specified, we should figure out what
    // the weekday is and use that as the starting point of our
    // interval. If not, go to today.weekday(0).
    const weekday = (timeOpt.startDate) ? getDay(timeOpt.startDate) : 0;
    self.intervalStart = startOfDay(setDay(new Date(), weekday));
    self.intervalEnd = new Date(self.intervalStart);
    self.intervalEnd = addDays(self.intervalEnd, timeOpt.days - 1);
    self.intervalEnd = endOfDay(self.intervalEnd);
  }
  else {
    // Set the intervalStart to this month.
    self.intervalStart = startOfMonth(new Date());
    self.intervalEnd = new Date(self.intervalStart);
    self.intervalEnd = addMonths(self.intervalEnd, timeOpt.months || timeOpt.interval);
    self.intervalEnd = subDays(self.intervalEnd, 1);
    self.intervalEnd = endOfMonth(self.intervalEnd);
  }

  // No need to re-render if we didn't change months.
  if (!self.intervalStart.isSame(orig.start)
    || !self.intervalEnd.isSame(orig.end)) {
    self.render();
  }

  // Fire the today event handler regardless of any change
  if (self.options.clickEvents.today) {
    self.options.clickEvents.today.apply(self, [new Date(self.month)]);
  }
  self.triggerEvents(self, orig);
};

/**
 *
 */
Clndr.prototype.setMonth = function (newMonth, options) {
  const timeOpt = this.options.lengthOfTime;
  const orig = {
    end: new Date(self.intervalEnd),
    start: new Date(self.intervalStart)
  };

  if (timeOpt.days || timeOpt.months) {
    console.log(
      'You are using a custom date interval. Use ' +
      'Clndr.setIntervalStart(startDate) instead.');
    return this;
  }

  this.month = setMonth(this.month, newMonth);
  this.intervalStart = startOfMonth(new Date(this.month));
  this.intervalEnd = endOfMonth(new Date(this.intervalStart));
  this.render();

  this.triggerEvents(this, orig);

  return this;
};

Clndr.prototype.setYear = function (newYear) {
  const orig = {
    end: new Date(this.intervalEnd),
    start: new Date(this.intervalStart)
  };

  this.month = setYear(this.month, newYear);
  this.intervalEnd = setYear(this.intervalEnd, newYear);
  this.intervalStart = setYear(this.intervalStart, newYear);
  this.render();

  this.triggerEvents(this, orig);

  return this;
};

/**
 * Sets the start of the time period according to newDate.
 */
Clndr.prototype.setIntervalStart = function (newDate) {
  newDate = parse(newDate);
  const { lengthOfTime } = this.options;
  orig = {
    end: new Date(this.intervalEnd),
    start: new Date(this.intervalStart)
  };

  if (!lengthOfTime.days && !lengthOfTime.months) {
    console.log(
      'You are using a custom date interval. Use ' +
      'Clndr.setIntervalStart(startDate) instead.');
    return this;
  }

  if (lengthOfTime.days) {
    this.intervalStart = startOfDay(newDate);
    this.intervalEnd = new Date(this.intervalStart);
    this.intervalEnd = addDays(this.intervalEnd, lengthOfTime - 1);
    this.intervalEnd = endOfDay(this.intervalEnd);
  } else {
    this.intervalStart = startOfMonth(newDate);
    this.intervalEnd = new Date(this.intervalStart);
    this.intervalEnd = addMonths(this.intervalEnd, lengthOfTime.months || lengthOfTime.interval);
    this.intervalEnd = subDays(this.intervalEnd, 1);
    this.intervalEnd = endOfMonth(this.intervalEnd);
  }

  this.month = new Date(this.intervalStart);
  this.render();

  this.triggerEvents(this, orig);

  return this;
};

/**
 * Overwrites extras in the calendar and triggers a render.
 */
Clndr.prototype.setExtras = function (extras) {
  this.options.extras = extras;
  this.render();
  return this;
};

/**
 * Overwrites events in the calendar and triggers a render.
 */
Clndr.prototype.setEvents = function (events) {
  // Go through each event and add Date()
  if (this.options.multiDayEvents) {
    this.options.events = this.addDateToMultiDayEvents(events);
  } else {
    this.options.events = this.addDateToEvents(events);
  }
  this.render();
  return this;
};

Clndr.prototype.getEvents = function (events) {
  return this.options.events;
}

/**
 * Adds additional events to the calendar and triggers a render.
 */
Clndr.prototype.addEvents = function (events /*, reRender*/) {
  var reRender = (arguments.length > 1)
    ? arguments[1]
    : true;

  events = this.options.multiDayEvents ?
    this.addDateToMultiDayEvents(events) :
    this.addDateToEvents(events);

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
Clndr.prototype.removeEvents = function (matchingFn) {
  for (let i = this.options.events.length - 1; i >= 0; i--) {
    if (matchingFn(this.options.events[i]) == true) {
      this.options.events.splice(i, 1);
    }
  }

  this.render();
  return this;
};

Clndr.prototype.addDateToEvents = function (events) {
  const { dateParameter } = self.options;
  for (let i = 0; i < events.length; i++) {
    events[i]._clndrStartDateObject = new Date(events[i][dateParameter]);
    new Date
  }
  return events;
};

/**
 *
 * @param events
 * @returns {*}
 */
Clndr.prototype.addDateToMultiDayEvents = function (events) {
  const options = this.options.multiDayEvents;

  return events.map(evt => {

    var end = evt[options.endDate],
      start = evt[options.startDate];

    // If we don't find the startDate OR endDate fields, look for singleDay
    if (!end && !start) {
      evt._clndrEndDateObject = parse(evt[options.singleDay]);
      evt._clndrStartDateObject = parse(evt[options.singleDay]);
    }

    // Otherwise use startDate and endDate, or whichever one is present
    else {
      evt._clndrEndDateObject = parse(end || start);
      evt._clndrStartDateObject = parse(start || end);
    }

    const diffDays = differenceInCalendarDays(
      evt._clndrStartDateObject,
      evt._clndrEndDateObject
    );
    evt.isMultiDayEvent = (diffDays > 0);
    return evt;
  })
};

Clndr.prototype.calendarDay = function (options) {
  const defaults = {
    day: '',
    date: null,
    events: [],
    classes: this.options.targets.empty
  };

  return { ...defaults, ...options };
};

Clndr.prototype.destroy = function () {
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

export default {
  createClndr: function (elementOrSelector, options) {
    let elem = isElement(elementOrSelector) ? elementOrSelector : document.querySelector(elementOrSelector);
    if (!elem) {
      throw new Error(
        `First argument needs to be an element or a selector  matching at least one element (where first match will be used).
      \nThe passed in value is: <${typeof elementOrSelector}> ${elementOrSelector}`
      );
    }
    return new Clndr(elem, options);
  }
};
