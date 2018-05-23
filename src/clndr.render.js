
import { addYears, isAfter, isBefore, isSameDay, subYears } from 'date-fns';

/**
 * VERY Likely not to work yet!
 */
export function renderConstraints(constraints) {
  const oneYearFromEnd = addYears(new Date(this.intervalEnd), 1);
  const oneYearAgo = subYears(new Date(this.intervalStart), 1);
  console.log('this', this);
  // If there are constraints, we need to add the 'inactive' class to
  // the controls.

  if (!constraints.startDate && !constraints.endDate) {
    return
  }
  if (!constraints.startDate) {
    throw new Error('options.constraints.startDate is missing! ' +
      'Add startDate or set constraints to null to fix.');
  }
  let start = new Date(constraints.startDate);
  let end = new Date(constraints.endDate);

  // In the interest of clarity we're just going to remove all
  // inactive classes and re-apply them each render.
  const inactiveQuery = targets.map(c => `.${c}.${classes.inactive}`).join(', ');
  const elems = this.calendarContainer.querySelectorAll(inactiveQuery);
  elems.forEach(el => { el.classList.toggle(classes.inactive, false) });

  // Just like the classes we'll set this internal state to true and
  // handle the disabling below.
  for (let i in this.constraints) {
    this.constraints[i] = true;
  }

  // Deal with the month controls first. Do we have room to go back?
  if (start && (isAfter(start, this.intervalStart) || isSameDay(start, this.intervalStart))) {
    this.element.querySelector(`.${targets.previousButton}`).classList.toggle(classes.inactive, true);
    this.constraints.previous = !this.constraints.previous;
  }

  // Do we have room to go forward?
  if (end && (isBefore(end, this.intervalEnd) || isSameDay(end, this.intervalEnd))) {
    this.element.querySelector(`.${targets.nextButton}`).classList.toggle(classes.inactive, true);
    this.constraints.next = !this.constraints.next;
  }

  // What's last year looking like?
  if (start && isAfter(start, oneYearAgo)) {
    this.element.querySelector(`.${targets.previousYearButton}`).classList.toggle(classes.inactive, true);
    this.constraints.previousYear = !this.constraints.previousYear;
  }

  // How about next year?
  if (end && isBefore(end, oneYearFromEnd)) {
    this.element.querySelector(`.${targets.nextYearButton}`).classList.toggle(classes.inactive, true);
    this.constraints.nextYear = !this.constraints.nextYear;
  }

  // Today? We could put this in init(), but we want to support the
  // user changing the constraints on a living instance.
  if ((start && isMonthAfter(start, new Date())) || (end && isMonthBefore(end, new Date()))) {
    this.element.querySelector(`.${targets.today}`).classList.toggle(classes.inactive, true);
    this.constraints.today = !this.constraints.today;
  }

}
