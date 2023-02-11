export function checkPeriodsTime(str) {
    const arrayTimes = str.split(':');
    const minutes = parseInt(arrayTimes[0]);
    const seconds = parseInt(arrayTimes[1]);
    return minutes <= 4 && seconds <= 60;
}
export function addTwoPeriodTimesToGoal(str) {
    const arrayTimes = str.split(':');
    const minutes = parseInt(arrayTimes[0]);
    return minutes + 40 + ':' + arrayTimes[1]
}
export function addTimeToGoal(str,period) {
    const arrayTimes = str.split(':');
    const minutes = parseInt(arrayTimes[0]);
    return period === 2 ? minutes + 20 : minutes + 40;
}

export function getCurrentDate() {
    const newDate = new Date();
    const month = newDate.getMonth() < 10 ? '0' + (newDate.getMonth() + 1) : newDate.getMonth() + 1
    const day = newDate.getUTCDate() === 1 ? newDate.getUTCDate() : newDate.getUTCDate() - 1
    return newDate.getUTCFullYear() + '-' + month + '-' + day;
}