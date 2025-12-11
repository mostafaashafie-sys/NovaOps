// ==============================================================================
// DATE UTILS - utils/date-utils.js
// Date manipulation utilities
// ==============================================================================

function toIsoDate(date) {
    return date.toISOString().slice(0, 10);
}

function toDataverseDate(date) {
    return `${toIsoDate(startOfMonthUTC(date))}T00:00:00Z`;
}

function addMonthsUTC(date, months) {
    const result = new Date(date);
    result.setUTCMonth(result.getUTCMonth() + months);
    return result;
}

function startOfMonthUTC(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonthUTC(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function daysInMonth(date) {
    return endOfMonthUTC(date).getUTCDate();
}

function yearMonthIndex(date) {
    return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function generateMonthSequence(startDate, monthCount) {
    const months = [];
    for (let i = 1; i <= monthCount; i++) {
        const date = addMonthsUTC(startDate, i);
        months.push({
            index: i,
            date: startOfMonthUTC(date),
            isoDate: toDataverseDate(date),
            year: date.getUTCFullYear(),
            month: date.getUTCMonth() + 1,
            yearMonthIndex: yearMonthIndex(date),
            daysInMonth: daysInMonth(date)
        });
    }
    return months;
}

module.exports = {
    toIsoDate,
    toDataverseDate,
    addMonthsUTC,
    startOfMonthUTC,
    endOfMonthUTC,
    daysInMonth,
    yearMonthIndex,
    generateMonthSequence
};
