export const template = `<div class="clndr-controls">
  <div class="clndr-control-button">
    <span class="clndr-previous-button">previous</span>
  </div>
  <div class="month"><%= month %> <%= year %></div>
  <div class="clndr-control-button rightalign">
    <span class="clndr-next-button">next</span>
  </div>
</div>
<table class="clndr-table" border="0" cellspacing="0" cellpadding="0">
  <thead>
  <tr class="header-days">
    <% for(var i = 0; i < daysOfTheWeek.length; i++) { %>
    <td class="header-day"><%= daysOfTheWeek[i] %></td>
    <% } %>
  </tr>
  </thead>
  <tbody>
  <% for(var i = 0; i < numberOfRows; i++){ %>
  <tr>
    <% for(var j = 0; j < 7; j++){ %>
    <% var d = j + i * 7; %>
    <td class="<%= days[d].classes %>">
      <div class="day-contents"><%= days[d].day %></div>
    </td>
    <% } %>
  </tr>
  <% } %>
  </tbody>
</table>`;

export const defaults = {

  events: [],
  ready: null,
  extras: null,
  render: null,
  moment: null,
  weekOffset: 0,
  constraints: null,
  forceSixRows: null,
  selectedDate: null,
  doneRendering: null,
  daysOfTheWeek: null,
  multiDayEvents: null,
  startWithMonth: null,
  dateParameter: 'date',
  template: '',
  showAdjacentMonths: true,
  trackSelectedDate: false,
  adjacentDaysChangeMonth: false,
  ignoreInactiveDaysInSelection: null,
  lengthOfTime: {
    days: null,
    interval: 1,
    months: null
  },
  clickEvents: {
    click: null,
    today: null,
    nextYear: null,
    nextMonth: null,
    nextInterval: null,
    previousYear: null,
    onYearChange: null,
    previousMonth: null,
    onMonthChange: null,
    previousInterval: null,
    onIntervalChange: null
  },
  targets: {
    day: 'day',
    empty: 'empty',
    nextButton: 'clndr-next-button',
    todayButton: 'clndr-today-button',
    previousButton: 'clndr-previous-button',
    nextYearButton: 'clndr-next-year-button',
    previousYearButton: 'clndr-previous-year-button'
  },
  classes: {
    past: 'past',
    today: 'today',
    event: 'event',
    eventStart: 'event-start',
    eventEnd: 'event-end',
    inactive: 'inactive',
    selected: 'selected',
    lastMonth: 'last-month',
    nextMonth: 'next-month',
    adjacentMonth: 'adjacent-month',
    datePrefix: 'calendar-day-',
    dayOfWeekPrefix: 'calendar-dow-'
  },
};
