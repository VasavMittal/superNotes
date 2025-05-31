function formatTimestampToShiprocketDate(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000); // Convert seconds to milliseconds
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months start from 0
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

module.exports = {
  formatTimestampToShiprocketDate
};
