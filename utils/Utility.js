export default class Utility {
  static currentDayTimestamps() {
    const now = new Date();

    // Get the start of the day in UTC (00:00:00)
    const startOfDayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const startEpochUTC = startOfDayUTC;

    // Get the end of the day in UTC (23:59:59.999)
    const endOfDayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999);
    const endEpochUTC = endOfDayUTC;

    return {
      startTime: Math.ceil(startEpochUTC / 1000),
      endTime: Math.floor(endEpochUTC / 1000)
    }
  }

  static getPastDaysFromTodayTimestamps(noOfDays) {
    const todayTimestamps = this.currentDayTimestamps();

    return {
      startTime: Math.ceil(todayTimestamps.startTime - ((noOfDays) * 24 * 60 * 60)),
      endTime: Math.floor(todayTimestamps.endTime)
    }
  }

  static convertUTCTimestampToDaysFromToday(utcEpoch) {
    const now = new Date();

    // Get the start of the day in UTC (00:00:00)
    const startOfDayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const startEpochUTC = Math.ceil(startOfDayUTC / 1000);

    const diffInSeconds = startEpochUTC - utcEpoch;
    const diffInDays = Math.floor(diffInSeconds / (24 * 60 * 60));

    return diffInDays;
  }

  static convertUTCTimestampToDate(utcEpoch) {
    const date = new Date(utcEpoch * 1000);

    // Extract the date components
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1; // Months are zero-based
    const day = date.getUTCDate();
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();

    // Format the date as a string
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return {
      year,
      month,
      day,
      hours,
      minutes,
      seconds,
      formattedDate
    }

  }

  static convertEpochRangeToDateList(startEpoch, endEpoch, interval = 1) {
    const dates = [];
    for (let timestamp = startEpoch; timestamp <= endEpoch;) {
      const date = this.convertUTCTimestampToDate(timestamp);
      timestamp = Math.ceil((Date.UTC(date.year, date.month - 1, date.day, 23, 59, 59, 999) + 2) / 1000);
      dates.push(date);
    }

    return dates;
  }

}
